<?php

/**
 * ============================================================
 * File     : AlWaseetController.php
 * Path     : app/Http/Controllers/AlWaseetController.php
 * Purpose  : HTTP controller that exposes all Al-Waseet API
 *            operations to your application's own routes.
 *
 * How it works:
 *   1. Every action calls $this->handle() which:
 *        a. Resolves the correct AlWaseetService for the
 *           authenticated user's store via AlWaseetManager
 *        b. Runs the requested API call
 *        c. Returns a uniform JSON response envelope
 *
 *   2. All incoming request data is validated via Laravel's
 *      $request->validate() before being forwarded to the service.
 *
 *   3. Errors from the service or network are caught here and
 *      converted to appropriate HTTP status codes:
 *        502  → Al-Waseet API returned an error
 *        503  → Could not connect to Al-Waseet (timeout/network)
 *        500  → Unexpected internal error
 *
 * Endpoints handled:
 *   GET    /api/alwaseet/cities
 *   GET    /api/alwaseet/regions?city_id=5
 *   GET    /api/alwaseet/package-sizes
 *   GET    /api/alwaseet/order-statuses
 *   GET    /api/alwaseet/orders
 *   POST   /api/alwaseet/orders
 *   PUT    /api/alwaseet/orders/{qrId}
 *   POST   /api/alwaseet/orders/batch
 *   GET    /api/alwaseet/invoices
 *   GET    /api/alwaseet/invoices/{invoiceId}/orders
 *   POST   /api/alwaseet/invoices/{invoiceId}/receive
 *   GET    /api/alwaseet/settings
 *   PUT    /api/alwaseet/settings
 *   POST   /api/alwaseet/settings/test
 * ============================================================
 */

declare(strict_types=1);

namespace App\Http\Controllers;

use App\Services\AlWaseetManager;
use App\Services\AlWaseetService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Log;
use RuntimeException;

final class AlWaseetController extends Controller
{
    public function __construct(
        private readonly AlWaseetManager $manager
    ) {}

    // ─────────────────────────────────────────────────────────────────────────
    //  Supplementary / lookup data
    //  These endpoints provide the IDs required for order creation.
    // ─────────────────────────────────────────────────────────────────────────

    /** GET /api/alwaseet/cities — returns all available delivery cities */
    public function cities(): JsonResponse
    {
        $cached = \App\Models\AlWaseetCity::all();
        if ($cached->isNotEmpty()) {
            return response()->json(['success' => true, 'data' => $cached]);
        }

        return $this->handle(function (AlWaseetService $s) {
            $cities = $s->getCities();
            foreach ($cities as $city) {
                \App\Models\AlWaseetCity::updateOrCreate(
                    ['id' => $city['id']],
                    ['city_name' => $city['city_name']]
                );
            }
            return \App\Models\AlWaseetCity::all();
        });
    }

    /** GET /api/alwaseet/regions?city_id=5 — returns regions within a city */
    public function regions(Request $request): JsonResponse
    {
        $request->validate(['city_id' => ['required', 'integer', 'min:1']]);
        $cityId = (int) $request->city_id;

        $cached = \App\Models\AlWaseetRegion::where('city_id', $cityId)->get();
        if ($cached->isNotEmpty()) {
            return response()->json(['success' => true, 'data' => $cached]);
        }

        return $this->handle(function (AlWaseetService $s) use ($cityId) {
            $regions = $s->getRegions($cityId);
            foreach ($regions as $region) {
                \App\Models\AlWaseetRegion::updateOrCreate(
                    ['id' => $region['id']],
                    ['city_id' => $cityId, 'region_name' => $region['region_name']]
                );
            }
            return \App\Models\AlWaseetRegion::where('city_id', $cityId)->get();
        });
    }

    /** GET /api/alwaseet/package-sizes — returns all package size options */
    public function packageSizes(): JsonResponse
    {
        return $this->handle(fn (AlWaseetService $s) => $s->getPackageSizes());
    }

    /** GET /api/alwaseet/order-statuses — returns all possible order status codes */
    public function orderStatuses(): JsonResponse
    {
        return $this->handle(fn (AlWaseetService $s) => $s->getOrderStatuses());
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Orders
    // ─────────────────────────────────────────────────────────────────────────

    /** GET /api/alwaseet/orders — returns all orders for the store */
    public function orders(): JsonResponse
    {
        return $this->handle(fn (AlWaseetService $s) => $s->getOrders());
    }

    /**
     * POST /api/alwaseet/orders — creates a new delivery order.
     *
     * Validates Iraqi phone format (+9647XXXXXXXXX) and all required
     * fields before forwarding to the service.
     */
    public function createOrder(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'client_name'    => ['required', 'string', 'max:255'],
            'client_mobile'  => ['required', 'string', 'regex:/^\+9647\d{9}$/'],
            'client_mobile2' => ['nullable', 'string', 'regex:/^\+9647\d{9}$/'],
            'city_id'        => ['required', 'integer', 'min:1'],
            'region_id'      => ['required', 'integer', 'min:1'],
            'location'       => ['required', 'string', 'max:500'],
            'type_name'      => ['required', 'string', 'max:255'],
            'items_number'   => ['required', 'integer', 'min:1'],
            'price'          => ['required', 'integer', 'min:0'],
            'package_size'   => ['required', 'integer', 'min:1'],
            'replacement'    => ['required', Rule::in([0, 1, '0', '1'])],
            'merchant_notes' => ['nullable', 'string', 'max:500'],
        ]);

        return $this->handle(
            fn (AlWaseetService $s) => $s->createOrder($validated),
            JsonResponse::HTTP_CREATED
        );
    }

    /**
     * PUT /api/alwaseet/orders/{qrId} — edits an existing order.
     * The qrId from the URL is injected into the payload as qr_id.
     */
    public function editOrder(Request $request, string $qrId): JsonResponse
    {
        $validated = $request->validate([
            'client_name'    => ['required', 'string', 'max:255'],
            'client_mobile'  => ['required', 'string', 'regex:/^\+9647\d{9}$/'],
            'client_mobile2' => ['nullable', 'string', 'regex:/^\+9647\d{9}$/'],
            'city_id'        => ['required', 'integer', 'min:1'],
            'region_id'      => ['required', 'integer', 'min:1'],
            'location'       => ['required', 'string', 'max:500'],
            'type_name'      => ['required', 'string', 'max:255'],
            'items_number'   => ['required', 'integer', 'min:1'],
            'price'          => ['required', 'integer', 'min:0'],
            'package_size'   => ['required', 'integer', 'min:1'],
            'replacement'    => ['required', Rule::in([0, 1, '0', '1'])],
            'merchant_notes' => ['nullable', 'string', 'max:500'],
        ]);

        $validated['qr_id'] = $qrId;

        return $this->handle(fn (AlWaseetService $s) => $s->editOrder($validated));
    }

    /**
     * POST /api/alwaseet/orders/batch — fetches up to 25 orders by ID.
     * Body: { "ids": [11, 23, 75] }
     */
    public function ordersBatch(Request $request): JsonResponse
    {
        $request->validate([
            'ids'   => ['required', 'array', 'min:1', 'max:25'],
            'ids.*' => ['required', 'integer', 'min:1'],
        ]);

        return $this->handle(fn (AlWaseetService $s) => $s->getOrdersByIds($request->ids));
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Invoices  (require Merchant token, not merchant-user token)
    // ─────────────────────────────────────────────────────────────────────────

    /** GET /api/alwaseet/invoices — returns all invoices for this store */
    public function invoices(): JsonResponse
    {
        return $this->handle(fn (AlWaseetService $s) => $s->getMerchantInvoices());
    }

    /** GET /api/alwaseet/invoices/{invoiceId}/orders — invoice + its orders */
    public function invoiceOrders(string $invoiceId): JsonResponse
    {
        return $this->handle(fn (AlWaseetService $s) => $s->getInvoiceOrders($invoiceId));
    }

    /** POST /api/alwaseet/invoices/{invoiceId}/receive — confirm receipt */
    public function receiveInvoice(string $invoiceId): JsonResponse
    {
        return $this->handle(fn (AlWaseetService $s) => $s->receiveInvoice($invoiceId));
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Credential settings
    //  These routes are NOT behind EnsureStoreHasAlWaseet so a store
    //  can save credentials for the very first time.
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * GET /api/alwaseet/settings
     * Returns the store's Al-Waseet configuration status.
     * Never returns raw credentials — only boolean flags and expiry info.
     */
    public function settings(Request $request): JsonResponse
    {
        $store = $request->user()?->store;

        return response()->json([
            'success' => true,
            'data'    => [
                'username'         => $store->alwaseet_username,
                'enabled'          => $store->alwaseet_enabled,
                'has_credentials'  => $store->hasAlWaseetCredentials(),
                'token_expires_at' => $store->alwaseet_token_expires_at?->toIso8601String(),
                'token_valid'      => $store->hasValidAlWaseetToken(),
            ],
        ]);
    }

    /**
     * PUT /api/alwaseet/settings
     * Saves new Al-Waseet credentials for this store.
     * Automatically clears the cached token so the next API call
     * authenticates with the new credentials.
     *
     * Body: { username, password, enabled }
     */
    public function updateSettings(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'username' => ['required', 'string', 'max:255'],
            'password' => ['required', 'string', 'max:255'],
            'enabled'  => ['boolean'],
        ]);

        try {
            $store = $request->user()?->store;
            if (!$store) {
                return response()->json(['success' => false, 'message' => 'Store not found.'], 404);
            }

            $store->alwaseet_username = $validated['username'];
            $store->alwaseet_password = $validated['password'];
            $store->alwaseet_enabled = $validated['enabled'] ?? true;
            $store->save();

            // Clear the cached token so the next request uses the new credentials
            $store->clearAlWaseetToken();
            $this->manager->forget($store->id);

            return response()->json([
                'success' => true,
                'message' => 'Al-Waseet credentials updated.',
            ]);
        } catch (\Exception $e) {
            \Log::error('AlWaseet Update Error: ' . $e->getMessage(), [
                'stack' => $e->getTraceAsString(),
                'user_id' => $request->user()?->id
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to save settings: ' . $e->getMessage(),
            ], 500);
        }
    }

    /**
     * POST /api/alwaseet/settings/test
     * Force-clears the token and attempts a fresh login to verify
     * that the saved credentials are valid.
     * Returns success if the login works, or a 502 error if it fails.
     */
    public function testConnection(): JsonResponse
    {
        return $this->handle(function (AlWaseetService $s) {
            $s->forgetToken();  // clear any cached token first
            $s->getToken();     // attempt fresh login — throws on failure

            return ['message' => 'Connection to Al-Waseet is working correctly.'];
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  Private: shared response helper
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Resolves the store's AlWaseetService, executes $action, and wraps
     * the result in a uniform JSON envelope.
     *
     * All error types are caught here so every endpoint returns a
     * consistent { success, data|message } response regardless of
     * what went wrong.
     *
     * HTTP codes returned on error:
     *   422 → request is valid but store has no credentials (from middleware)
     *   502 → Al-Waseet API returned an error (upstream failure)
     *   503 → Could not connect to Al-Waseet (timeout / DNS failure)
     *   500 → Unexpected internal error
     */
    private function handle(callable $action, int $successStatus = JsonResponse::HTTP_OK): JsonResponse
    {
        try {
            $service = $this->manager->forCurrentStore();
            $data    = $action($service);

            return response()->json(['success' => true, 'data' => $data], $successStatus);

        } catch (RuntimeException $e) {
            return response()->json(
                ['success' => false, 'message' => $e->getMessage()],
                JsonResponse::HTTP_BAD_GATEWAY   // 502 — upstream API error
            );

        } catch (\Illuminate\Http\Client\ConnectionException) {
            return response()->json(
                ['success' => false, 'message' => 'Could not reach the Al-Waseet API. Please try again.'],
                JsonResponse::HTTP_SERVICE_UNAVAILABLE  // 503 — network/timeout
            );

        } catch (\Throwable $e) {
            report($e);  // sends to Laravel's exception handler / Sentry

            return response()->json(
                ['success' => false, 'message' => 'An unexpected error occurred.'],
                JsonResponse::HTTP_INTERNAL_SERVER_ERROR  // 500
            );
        }
    }
}