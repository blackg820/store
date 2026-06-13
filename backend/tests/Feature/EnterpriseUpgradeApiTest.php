<?php

namespace Tests\Feature;

use App\Jobs\DispatchCustomerNotificationCampaign;
use App\Models\Buyer;
use App\Models\CustomerNotificationSubscription;
use App\Models\Order;
use App\Models\Store;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class EnterpriseUpgradeApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_reserved_subdomain_is_rejected(): void
    {
        [$owner] = $this->tenantFixture();
        Sanctum::actingAs($owner);

        $this->getJson('/api/v1/stores/check-domain?subdomain=api')
            ->assertStatus(422)
            ->assertJsonPath('code', 'DOMAIN_NOT_AVAILABLE');
    }

    public function test_verified_custom_domain_resolves_to_store(): void
    {
        [, $store] = $this->tenantFixture([
            'subdomain' => 'demo',
            'custom_domain' => 'shop.example.test',
            'domain_verified_at' => now(),
        ]);

        $this->getJson('/api/v1/public/domain/resolve?host=shop.example.test')
            ->assertOk()
            ->assertJsonPath('data.store.id', (string) $store->id)
            ->assertJsonPath('data.routing.customDomain', 'shop.example.test');
    }

    public function test_customer_risk_updates_when_order_enters_rejected_state(): void
    {
        [$owner, $store] = $this->tenantFixture();
        $buyer = Buyer::withoutGlobalScopes()->create([
            'user_id' => $owner->id,
            'name' => 'Risk Buyer',
            'phone' => '+9647000000000',
            'risk_level' => 'normal',
        ]);
        $order = Order::create([
            'store_id' => $store->id,
            'buyer_id' => $buyer->id,
            'customer_name' => $buyer->name,
            'customer_phone' => $buyer->phone,
            'status' => 'pending',
            'total_amount' => 1000,
        ]);

        Sanctum::actingAs($owner);
        $this->patchJson('/api/v1/orders/'.$order->id.'/status', ['status' => 'returned'], [
            'X-Store-ID' => (string) $store->id,
        ])->assertOk()
            ->assertJsonPath('data.customer.riskLevel', 'warning')
            ->assertJsonPath('data.customer.rejectionCount', 1);
    }

    public function test_customer_notification_subscribe_unsubscribe_and_campaign_dispatch(): void
    {
        Bus::fake();
        [$owner, $store] = $this->tenantFixture();
        $owner->update(['mode' => 'unlimited']);

        $this->postJson('/api/v1/public/customer-notifications/subscribe', [
            'storeId' => $store->id,
            'phone' => '+9647000000001',
            'channel' => 'pwa',
            'language' => 'en',
            'endpoint' => 'https://push.example.test/token',
            'keys' => ['p256dh' => 'hidden', 'auth' => 'hidden'],
        ])->assertCreated()
            ->assertJsonMissing(['endpoint' => 'https://push.example.test/token']);

        $this->assertSame(1, CustomerNotificationSubscription::where('store_id', $store->id)->count());

        Sanctum::actingAs($owner);
        $this->postJson('/api/v1/customer-notifications/campaigns', [
            'storeId' => $store->id,
            'name' => 'Launch',
            'channels' => ['pwa'],
            'template' => ['title' => 'Hello', 'body' => 'World'],
        ], ['X-Store-ID' => (string) $store->id])->assertCreated();

        Bus::assertDispatched(DispatchCustomerNotificationCampaign::class);

        $this->postJson('/api/v1/public/customer-notifications/unsubscribe', [
            'storeId' => $store->id,
            'phone' => '+9647000000001',
            'channel' => 'pwa',
        ])->assertOk();

        $this->assertNotNull(CustomerNotificationSubscription::first()->unsubscribed_at);
    }

    public function test_analytics_event_tracking_and_summary(): void
    {
        [$owner, $store] = $this->tenantFixture();

        $this->postJson('/api/v1/public/analytics/events', [
            'storeId' => $store->id,
            'eventType' => 'visit',
            'visitorId' => 'visitor-1',
            'deviceType' => 'mobile',
        ])->assertCreated();

        Sanctum::actingAs($owner);
        $this->getJson('/api/v1/analytics/dashboard?store_id='.$store->id, [
            'X-Store-ID' => (string) $store->id,
        ])->assertOk()
            ->assertJsonPath('data.traffic.visits', 1)
            ->assertJsonPath('data.traffic.uniqueVisitors', 1);
    }

    private function tenantFixture(array $storeOverrides = []): array
    {
        $owner = User::factory()->create(['role' => 'store_owner', 'status' => 'active']);
        $store = Store::create(array_merge([
            'user_id' => $owner->id,
            'name' => 'Enterprise Store',
            'slug' => 'enterprise-store',
            'status' => 'active',
            'checkout_enabled' => true,
            'base_currency' => 'IQD',
            'base_language' => 'ar',
            'default_language' => 'ar',
        ], $storeOverrides));

        return [$owner, $store];
    }
}
