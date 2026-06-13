<?php

/**
 * ============================================================
 * File     : AlWaseetMultiTenantTest.php
 * Path     : tests/Feature/AlWaseetMultiTenantTest.php
 * Purpose  : Feature tests for the multi-tenant Al-Waseet
 *            integration.
 *
 * What is tested:
 *   - Each store gets its own independent token from Al-Waseet
 *   - A valid cached token is reused without hitting /login again
 *   - An expired token triggers an automatic fresh login
 *   - AlWaseetManager returns the same service instance for the
 *     same store within a request (no duplicate DB lookups)
 *   - AlWaseetManager returns different instances for different stores
 *   - Constructing a service for a store with no credentials throws
 *   - A 401 auth error from the API automatically clears the stored token
 *
 * All tests use Http::fake() so NO real HTTP calls are made.
 * The database is reset between tests via RefreshDatabase.
 *
 * Run with: php artisan test --filter AlWaseetMultiTenantTest
 * ============================================================
 */

declare(strict_types=1);

namespace Tests\Feature;

use App\Models\Store;
use App\Services\AlWaseetManager;
use App\Services\AlWaseetService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Client\Request;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class AlWaseetMultiTenantTest extends TestCase
{
    use RefreshDatabase;

    private Store $storeA;
    private Store $storeB;

    protected function setUp(): void
    {
        parent::setUp();

        // Two independent stores with separate Al-Waseet accounts
        $this->storeA = Store::factory()->create([
            'alwaseet_username' => 'merchant_a',
            'alwaseet_password' => 'password_a',
            'alwaseet_enabled'  => true,
        ]);

        $this->storeB = Store::factory()->create([
            'alwaseet_username' => 'merchant_b',
            'alwaseet_password' => 'password_b',
            'alwaseet_enabled'  => true,
        ]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Token isolation — stores must not share tokens
    // ─────────────────────────────────────────────────────────────────────────

    public function test_each_store_gets_its_own_token(): void
    {
        Http::fake([
            '*/merchant/login' => Http::sequence()
                ->push(['status' => true, 'errNum' => 'S000', 'msg' => 'ok', 'data' => ['token' => 'token-for-a']])
                ->push(['status' => true, 'errNum' => 'S000', 'msg' => 'ok', 'data' => ['token' => 'token-for-b']]),
        ]);

        $manager = new AlWaseetManager();
        $tokenA  = $manager->for($this->storeA)->getToken();
        $tokenB  = $manager->for($this->storeB)->getToken();

        $this->assertSame('token-for-a', $tokenA);
        $this->assertSame('token-for-b', $tokenB);
        $this->assertNotSame($tokenA, $tokenB);

        // Tokens must be persisted on the store DB records
        $this->assertSame('token-for-a', $this->storeA->fresh()->alwaseet_token);
        $this->assertSame('token-for-b', $this->storeB->fresh()->alwaseet_token);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Token caching — no unnecessary re-logins
    // ─────────────────────────────────────────────────────────────────────────

    public function test_valid_cached_token_is_reused_without_login(): void
    {
        // Pre-store a valid (non-expired) token
        $this->storeA->storeAlWaseetToken('cached-token', 3600);

        Http::fake(['*/merchant/login' => Http::response(['status' => true, 'data' => ['token' => 'new-token']])]);

        $token = (new AlWaseetManager())->for($this->storeA)->getToken();

        $this->assertSame('cached-token', $token);
        Http::assertNothingSent(); // login must NOT have been called
    }

    public function test_expired_token_triggers_fresh_login(): void
    {
        // Store a token that expired one hour ago
        $this->storeA->update([
            'alwaseet_token'            => 'expired-token',
            'alwaseet_token_expires_at' => now()->subHour(),
        ]);

        Http::fake([
            '*/merchant/login'           => Http::response(['status' => true, 'errNum' => 'S000', 'msg' => 'ok', 'data' => ['token' => 'fresh-token']]),
            '*/merchant/merchant-orders' => Http::response(['status' => true, 'errNum' => 'S000', 'msg' => 'ok', 'data' => []]),
        ]);

        (new AlWaseetManager())->for($this->storeA)->getOrders();

        // Login must have been called to refresh the token
        Http::assertSent(fn (Request $r) => str_contains($r->url(), '/login'));
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Manager instance caching
    // ─────────────────────────────────────────────────────────────────────────

    public function test_manager_returns_same_instance_for_same_store(): void
    {
        $manager = new AlWaseetManager();

        Http::fake(['*/merchant/login' => Http::response(['status' => true, 'errNum' => 'S000', 'msg' => 'ok', 'data' => ['token' => 'tok']])]);

        // Both calls must return the exact same PHP object
        $this->assertSame(
            $manager->for($this->storeA),
            $manager->for($this->storeA)
        );
    }

    public function test_manager_returns_different_instances_for_different_stores(): void
    {
        $manager = new AlWaseetManager();

        $this->assertNotSame(
            $manager->for($this->storeA),
            $manager->for($this->storeB)
        );
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Unconfigured store guard
    // ─────────────────────────────────────────────────────────────────────────

    public function test_throws_when_store_has_no_credentials(): void
    {
        $emptyStore = Store::factory()->create([
            'alwaseet_username' => null,
            'alwaseet_password' => null,
            'alwaseet_enabled'  => false,
        ]);

        $this->expectException(\RuntimeException::class);
        $this->expectExceptionMessageMatches('/no Al-Waseet credentials/');

        new AlWaseetService($emptyStore);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Auto-clear token on auth error
    // ─────────────────────────────────────────────────────────────────────────

    public function test_auth_error_clears_stored_token(): void
    {
        // Start with a seemingly valid token
        $this->storeA->storeAlWaseetToken('stale-token', 3600);

        // API rejects it with a 401
        Http::fake([
            '*/merchant/merchant-orders' => Http::response([
                'status' => false,
                'errNum' => '401',
                'msg'    => 'Unauthenticated',
            ]),
        ]);

        try {
            (new AlWaseetManager())->for($this->storeA)->getOrders();
        } catch (\RuntimeException) {
            // Exception is expected — we just want the side-effect
        }

        // Token must have been wiped from the DB
        $this->assertNull($this->storeA->fresh()->alwaseet_token);
        $this->assertNull($this->storeA->fresh()->alwaseet_token_expires_at);
    }
}