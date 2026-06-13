<?php

namespace Tests\Feature;

use App\Jobs\AggregateDailyAnalytics;
use App\Jobs\DispatchCustomerNotificationCampaign;
use App\Models\AnalyticsEvent;
use App\Models\CustomerNotificationSubscription;
use App\Models\Order;
use App\Models\Store;
use App\Models\StoreDailyStat;
use App\Models\User;
use App\Services\AnalyticsAggregationService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Bus;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProductionReadinessApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_health_endpoints_are_secret_free(): void
    {
        $this->getJson('/api/v1/ops/health')
            ->assertOk()
            ->assertJsonPath('data.status', 'ok')
            ->assertJsonMissing(['BUNNY_API_KEY', 'TELEGRAM_WEBHOOK_SECRET']);

        $deepHealth = $this->getJson('/api/v1/ops/health/deep');
        $this->assertContains($deepHealth->getStatusCode(), [200, 503]);
        $deepHealth->assertJsonMissing(['BUNNY_API_KEY', 'TELEGRAM_WEBHOOK_SECRET']);
    }

    public function test_customer_notification_campaign_requires_feature_gate(): void
    {
        [$owner, $store] = $this->tenantFixture();
        Sanctum::actingAs($owner);

        $this->postJson('/api/v1/customer-notifications/campaigns', [
            'storeId' => $store->id,
            'name' => 'Blocked',
            'channels' => ['pwa'],
            'template' => ['title' => 'Hello', 'body' => 'World'],
        ], ['X-Store-ID' => (string) $store->id])
            ->assertStatus(403)
            ->assertJsonPath('code', 'FEATURE_DISABLED');
    }

    public function test_customer_notification_campaign_dispatch_is_idempotent(): void
    {
        [$owner, $store] = $this->tenantFixture();
        $owner->update(['mode' => 'unlimited']);
        $subscription = CustomerNotificationSubscription::create([
            'store_id' => $store->id,
            'phone' => '+9647000000010',
            'channel' => 'pwa',
            'language' => 'en',
            'subscribed_at' => now(),
        ]);
        $campaign = \App\Models\CustomerNotificationCampaign::create([
            'store_id' => $store->id,
            'created_by' => $owner->id,
            'name' => 'Idempotent',
            'status' => 'scheduled',
            'channels' => ['pwa'],
            'segment' => [],
            'template' => ['title' => 'Hello', 'body' => 'World'],
        ]);

        (new DispatchCustomerNotificationCampaign($campaign->id))->handle();
        $campaign->update(['status' => 'scheduled']);
        (new DispatchCustomerNotificationCampaign($campaign->id))->handle();

        $this->assertDatabaseCount('customer_notification_deliveries', 1);
        $this->assertDatabaseHas('customer_notification_deliveries', [
            'campaign_id' => $campaign->id,
            'subscription_id' => $subscription->id,
        ]);
    }

    public function test_analytics_aggregation_command_populates_daily_stats(): void
    {
        [$owner, $store] = $this->tenantFixture();
        Order::create([
            'store_id' => $store->id,
            'customer_name' => 'Customer',
            'customer_phone' => '+9647000000020',
            'status' => 'delivered',
            'total_amount' => 2500,
            'created_at' => now()->startOfDay()->addHour(),
        ]);
        AnalyticsEvent::create([
            'store_id' => $store->id,
            'event_type' => 'visit',
            'visitor_id' => 'v-1',
            'device_type' => 'mobile',
            'created_at' => now()->startOfDay()->addHour(),
        ]);

        app(AnalyticsAggregationService::class)->aggregateDate(now());

        $this->assertDatabaseHas('store_daily_stats', [
            'store_id' => $store->id,
            'orders_count' => 1,
            'visits_count' => 1,
        ]);
        $this->assertSame(2500.0, (float) StoreDailyStat::first()->revenue);
    }

    public function test_admin_ops_summary_requires_admin(): void
    {
        [$owner] = $this->tenantFixture();
        Sanctum::actingAs($owner);

        $this->getJson('/api/v1/admin/ops/summary')
            ->assertForbidden();

        $admin = User::factory()->create(['role' => 'admin', 'status' => 'active']);
        Sanctum::actingAs($admin);

        $this->getJson('/api/v1/admin/ops/summary')
            ->assertOk()
            ->assertJsonStructure(['data' => ['queues', 'storage', 'notifications', 'integrations', 'security', 'analytics', 'recentEvents']]);
    }

    public function test_public_analytics_endpoint_is_rate_limited(): void
    {
        [$owner, $store] = $this->tenantFixture();

        for ($i = 0; $i < 241; $i++) {
            $response = $this->postJson('/api/v1/public/analytics/events', [
                'storeId' => $store->id,
                'eventType' => 'visit',
                'visitorId' => 'rate-'.$i,
            ]);
        }

        $response->assertStatus(429);
    }

    public function test_daily_aggregation_job_is_queued(): void
    {
        Bus::fake();

        AggregateDailyAnalytics::dispatch(now()->toDateString());

        Bus::assertDispatched(AggregateDailyAnalytics::class);
    }

    private function tenantFixture(array $storeOverrides = []): array
    {
        $owner = User::factory()->create(['role' => 'store_owner', 'status' => 'active']);
        $store = Store::create(array_merge([
            'user_id' => $owner->id,
            'name' => 'Production Store',
            'slug' => 'production-store',
            'status' => 'active',
            'checkout_enabled' => true,
            'base_currency' => 'IQD',
            'base_language' => 'ar',
            'default_language' => 'ar',
        ], $storeOverrides));

        return [$owner, $store];
    }
}
