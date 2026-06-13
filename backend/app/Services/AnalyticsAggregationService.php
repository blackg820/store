<?php

namespace App\Services;

use App\Models\AnalyticsEvent;
use App\Models\CustomerNotificationDelivery;
use App\Models\NotificationDailyStat;
use App\Models\Order;
use App\Models\PlatformDailyStat;
use App\Models\ProductDailyStat;
use App\Models\Store;
use App\Models\StoreDailyStat;
use App\Models\User;
use Carbon\CarbonInterface;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class AnalyticsAggregationService
{
    public function aggregateDate(CarbonInterface|string $date, ?int $storeId = null): void
    {
        $day = Carbon::parse($date)->startOfDay();
        $nextDay = $day->copy()->addDay();
        $dateValue = $day->toDateString();

        Store::query()
            ->when($storeId, fn ($query) => $query->whereKey($storeId))
            ->select(['id'])
            ->chunkById(100, function ($stores) use ($day, $nextDay, $dateValue) {
                foreach ($stores as $store) {
                    $this->aggregateStore($store->id, $day, $nextDay, $dateValue);
                }
            });

        $this->aggregateProducts($day, $nextDay, $dateValue, $storeId);
        $this->aggregateNotifications($day, $nextDay, $dateValue, $storeId);

        if (!$storeId) {
            $this->aggregatePlatform($day, $nextDay, $dateValue);
        }
    }

    public function pruneRawEvents(int $retentionDays): int
    {
        if ($retentionDays < 1 || !Schema::hasTable('analytics_events')) {
            return 0;
        }

        return AnalyticsEvent::where('created_at', '<', now()->subDays($retentionDays))->delete();
    }

    private function aggregateStore(int $storeId, Carbon $day, Carbon $nextDay, string $dateValue): void
    {
        $orders = Order::query()
            ->where('store_id', $storeId)
            ->whereBetween('created_at', [$day, $nextDay]);

        $events = AnalyticsEvent::query()
            ->where('store_id', $storeId)
            ->whereBetween('created_at', [$day, $nextDay]);

        $deliveries = CustomerNotificationDelivery::query()
            ->where('store_id', $storeId)
            ->whereBetween('created_at', [$day, $nextDay]);

        $deviceBreakdown = (clone $events)
            ->where('event_type', 'visit')
            ->select('device_type', DB::raw('COUNT(*) as count'))
            ->groupBy('device_type')
            ->pluck('count', 'device_type')
            ->all();

        StoreDailyStat::updateOrCreate(
            ['store_id' => $storeId, 'stat_date' => $dateValue],
            [
                'orders_count' => (clone $orders)->count(),
                'delivered_orders_count' => (clone $orders)->where('status', 'delivered')->count(),
                'rejected_orders_count' => (clone $orders)->whereIn('status', ['returned', 'problematic'])->count(),
                'revenue' => (float) (clone $orders)->where('status', 'delivered')->sum('total_amount'),
                'visits_count' => (clone $events)->where('event_type', 'visit')->count(),
                'unique_visitors_count' => (clone $events)->where('event_type', 'visit')->distinct('visitor_id')->count('visitor_id'),
                'checkout_starts_count' => (clone $events)->where('event_type', 'checkout_start')->count(),
                'notifications_sent_count' => (clone $deliveries)->whereIn('status', ['sent', 'delivered', 'opened', 'clicked'])->count(),
                'notifications_delivered_count' => (clone $deliveries)->whereNotNull('delivered_at')->count(),
                'notifications_opened_count' => (clone $deliveries)->whereNotNull('opened_at')->count(),
                'notifications_clicked_count' => (clone $deliveries)->whereNotNull('clicked_at')->count(),
                'device_breakdown' => $deviceBreakdown,
            ]
        );
    }

    private function aggregateProducts(Carbon $day, Carbon $nextDay, string $dateValue, ?int $storeId): void
    {
        $views = AnalyticsEvent::query()
            ->select('store_id', 'product_id', DB::raw('COUNT(*) as views_count'))
            ->whereNotNull('product_id')
            ->where('event_type', 'product_view')
            ->whereBetween('created_at', [$day, $nextDay])
            ->when($storeId, fn ($query) => $query->where('store_id', $storeId))
            ->groupBy('store_id', 'product_id')
            ->get()
            ->keyBy(fn ($row) => $row->store_id . ':' . $row->product_id);

        $sales = DB::table('order_items')
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->select('orders.store_id', 'order_items.product_id', DB::raw('SUM(order_items.quantity) as sold_count'), DB::raw('SUM(order_items.unit_price * order_items.quantity) as revenue'))
            ->whereBetween('orders.created_at', [$day, $nextDay])
            ->when($storeId, fn ($query) => $query->where('orders.store_id', $storeId))
            ->groupBy('orders.store_id', 'order_items.product_id')
            ->get()
            ->keyBy(fn ($row) => $row->store_id . ':' . $row->product_id);

        foreach ($views->keys()->merge($sales->keys())->unique() as $key) {
            $view = $views->get($key);
            $sale = $sales->get($key);
            [$resolvedStoreId, $productId] = array_map('intval', explode(':', $key));

            ProductDailyStat::updateOrCreate(
                ['product_id' => $productId, 'stat_date' => $dateValue],
                [
                    'store_id' => $resolvedStoreId,
                    'views_count' => (int) ($view->views_count ?? 0),
                    'sold_count' => (int) ($sale->sold_count ?? 0),
                    'revenue' => (float) ($sale->revenue ?? 0),
                ]
            );
        }
    }

    private function aggregateNotifications(Carbon $day, Carbon $nextDay, string $dateValue, ?int $storeId): void
    {
        CustomerNotificationDelivery::query()
            ->select('store_id', 'campaign_id')
            ->whereBetween('created_at', [$day, $nextDay])
            ->when($storeId, fn ($query) => $query->where('store_id', $storeId))
            ->groupBy('store_id', 'campaign_id')
            ->chunk(100, function ($groups) use ($day, $nextDay, $dateValue) {
                foreach ($groups as $group) {
                    $query = CustomerNotificationDelivery::where('store_id', $group->store_id)
                        ->where('campaign_id', $group->campaign_id)
                        ->whereBetween('created_at', [$day, $nextDay]);

                    $channels = (clone $query)
                        ->select('channel', DB::raw('COUNT(*) as count'))
                        ->groupBy('channel')
                        ->pluck('count', 'channel')
                        ->all();

                    NotificationDailyStat::updateOrCreate(
                        ['campaign_id' => $group->campaign_id, 'store_id' => $group->store_id, 'stat_date' => $dateValue],
                        [
                            'queued_count' => (clone $query)->where('status', 'queued')->count(),
                            'sent_count' => (clone $query)->whereIn('status', ['sent', 'delivered', 'opened', 'clicked'])->count(),
                            'delivered_count' => (clone $query)->whereNotNull('delivered_at')->count(),
                            'opened_count' => (clone $query)->whereNotNull('opened_at')->count(),
                            'clicked_count' => (clone $query)->whereNotNull('clicked_at')->count(),
                            'failed_count' => (clone $query)->where('status', 'failed')->count(),
                            'channel_breakdown' => $channels,
                        ]
                    );
                }
            });
    }

    private function aggregatePlatform(Carbon $day, Carbon $nextDay, string $dateValue): void
    {
        PlatformDailyStat::updateOrCreate(
            ['stat_date' => $dateValue],
            [
                'users_count' => User::count(),
                'new_users_count' => User::whereBetween('created_at', [$day, $nextDay])->count(),
                'stores_count' => Store::count(),
                'new_stores_count' => Store::whereBetween('created_at', [$day, $nextDay])->count(),
                'orders_count' => Order::whereBetween('created_at', [$day, $nextDay])->count(),
                'failed_jobs_count' => Schema::hasTable('failed_jobs') ? DB::table('failed_jobs')->count() : 0,
                'queued_jobs_count' => Schema::hasTable('jobs') ? DB::table('jobs')->count() : 0,
                'storage_bytes' => Schema::hasTable('media') ? (int) DB::table('media')->whereNull('deleted_at')->sum('file_size') : 0,
            ]
        );
    }
}
