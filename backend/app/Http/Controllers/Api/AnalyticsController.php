<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Order;
use App\Models\Product;
use App\Models\Store;
use App\Models\Buyer;
use App\Models\GlobalCustomer;
use App\Models\AnalyticsEvent;
use App\Models\CustomerNotificationDelivery;
use App\Models\StoreDailyStat;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Carbon\Carbon;

class AnalyticsController extends Controller
{
    public function dashboard(Request $request)
    {
        $startedAt = microtime(true);
        $user = $request->user();
        $isAdmin = $user->role === 'admin';
        $ownerId = $user->parent_id ?: $user->id;
        $storeId = $request->input('store_id', $request->header('X-Store-ID'));

        $query = Order::query();

        if (!$isAdmin) {
            if ($storeId && !Store::whereKey($storeId)->where('user_id', $ownerId)->exists()) {
                return $this->error('The selected store is not available to this account.', 403, null, 'TENANT_ACCESS_DENIED');
            }

            $query->whereHas('store', function($q) use ($ownerId) {
                $q->where('user_id', $ownerId);
            });
        }

        if ($storeId) {
            $query->where('store_id', $storeId);
        }

        $rangeStart = $this->rangeStart($request->input('range'));
        if ($rangeStart) {
            $query->where('created_at', '>=', $rangeStart);
        }

        $cacheKey = implode(':', [
            'analytics',
            $isAdmin ? 'admin' : 'owner-' . $ownerId,
            $storeId ?: 'all',
            $request->input('range', 'default'),
        ]);

        $today = Carbon::today();
        $weekStart = Carbon::now()->startOfWeek();
        $monthStart = Carbon::now()->startOfMonth();
        $yearStart = Carbon::now()->startOfYear();

        // Metrics
        $totalRevenue = (clone $query)->where('status', 'delivered')->sum('total_amount');
        $totalOrders = (clone $query)->count();
        $pendingOrders = (clone $query)->where('status', 'pending')->count();
        $deliveredOrders = (clone $query)->where('status', 'delivered')->count();
        $rejectedOrders = (clone $query)->whereIn('status', ['returned', 'problematic'])->count();

        // Revenue Chart (Last 7 days)
        $revenueChart = Cache::remember($cacheKey . ':revenue-chart', now()->addMinutes(5), fn () => (clone $query)
            ->where('status', 'delivered')
            ->where('created_at', '>=', $rangeStart ?: Carbon::now()->subDays(7))
            ->select(DB::raw('DATE(created_at) as date'), DB::raw('SUM(total_amount) as total'))
            ->groupBy('date')
            ->orderBy('date')
            ->get());

        // Top Products
        $topProducts = Cache::remember($cacheKey . ':top-products', now()->addMinutes(5), fn () => DB::table('order_items')
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->join('products', 'order_items.product_id', '=', 'products.id')
            ->select('products.id', 'products.title', DB::raw('SUM(order_items.quantity) as sold_count'))
            ->where('orders.deleted_at', null)
            ->when($rangeStart, fn ($q) => $q->where('orders.created_at', '>=', $rangeStart))
            ->when(!$isAdmin, function($q) use ($ownerId) {
                $q->whereExists(function($sq) use ($ownerId) {
                    $sq->select(DB::raw(1))
                      ->from('stores')
                      ->whereColumn('stores.id', 'orders.store_id')
                      ->where('stores.user_id', $ownerId);
                });
            })
            ->when($storeId, function($q) use ($storeId) {
                $q->where('orders.store_id', $storeId);
            })
            ->groupBy('products.id', 'products.title')
            ->orderByDesc('sold_count')
            ->limit(5)
            ->get());

        $productScope = Product::query()
            ->when(!$isAdmin, function ($q) use ($ownerId) {
                $q->whereHas('store', fn ($storeQuery) => $storeQuery->where('user_id', $ownerId));
            })
            ->when($storeId, fn ($q) => $q->where('store_id', $storeId));

        $buyerScope = Buyer::withoutGlobalScopes()
            ->when(!$isAdmin, fn ($q) => $q->where('user_id', $ownerId));

        $trafficScope = AnalyticsEvent::query()
            ->when(!$isAdmin, function ($q) use ($ownerId) {
                $q->whereHas('store', fn ($storeQuery) => $storeQuery->where('user_id', $ownerId));
            })
            ->when($storeId, fn ($q) => $q->where('store_id', $storeId));

        $notificationScope = CustomerNotificationDelivery::query()
            ->when(!$isAdmin, function ($q) use ($ownerId) {
                $q->whereHas('campaign.store', fn ($storeQuery) => $storeQuery->where('user_id', $ownerId));
            })
            ->when($storeId, fn ($q) => $q->where('store_id', $storeId));

        $statusCounts = (clone $query)
            ->select('status', DB::raw('COUNT(*) as count'))
            ->groupBy('status')
            ->pluck('count', 'status');

        $trafficByDevice = (clone $trafficScope)
            ->where('event_type', 'visit')
            ->select('device_type', DB::raw('COUNT(*) as count'))
            ->groupBy('device_type')
            ->pluck('count', 'device_type');

        $platform = null;
        if ($isAdmin) {
            $platformTotalOrders = Order::count();
            $platformRejected = Order::whereIn('status', ['returned', 'problematic'])->count();
            $platformDelivered = Order::where('status', 'delivered')->count();

            $platform = [
                'users' => [
                    'total' => \App\Models\User::count(),
                    'newToday' => \App\Models\User::where('created_at', '>=', $today)->count(),
                    'newMonth' => \App\Models\User::where('created_at', '>=', $monthStart)->count(),
                ],
                'stores' => [
                    'total' => Store::count(),
                    'active' => Store::where('status', 'active')->count(),
                    'suspended' => Store::where('status', 'suspended')->count(),
                    'newToday' => Store::where('created_at', '>=', $today)->count(),
                    'newMonth' => Store::where('created_at', '>=', $monthStart)->count(),
                ],
                'orders' => [
                    'total' => $platformTotalOrders,
                    'rejectionRate' => $platformTotalOrders > 0 ? round($platformRejected / $platformTotalOrders * 100, 2) : 0,
                    'deliveryRate' => $platformTotalOrders > 0 ? round($platformDelivered / $platformTotalOrders * 100, 2) : 0,
                ],
                'infrastructure' => [
                    'failedJobs' => DB::table('failed_jobs')->count(),
                    'queuedJobs' => DB::table('jobs')->count(),
                    'storageBytes' => (int) DB::table('media')->whereNull('deleted_at')->sum('file_size'),
                    'redisConfigured' => config('cache.default') === 'redis',
                ],
            ];
        }

        $visits = (clone $trafficScope)->where('event_type', 'visit')->count();
        $uniqueVisitors = (clone $trafficScope)->where('event_type', 'visit')->distinct('visitor_id')->count('visitor_id');
        $checkoutStarts = (clone $trafficScope)->where('event_type', 'checkout_start')->count();
        $notificationCounts = [
            'sent' => (clone $notificationScope)->whereIn('status', ['sent', 'delivered', 'opened', 'clicked'])->count(),
            'delivered' => (clone $notificationScope)->whereNotNull('delivered_at')->count(),
            'opened' => (clone $notificationScope)->whereNotNull('opened_at')->count(),
            'clicked' => (clone $notificationScope)->whereNotNull('clicked_at')->count(),
        ];

        $aggregateSummary = $this->aggregateSummary($rangeStart, $storeId ? (int) $storeId : null, $isAdmin ? null : $ownerId);
        if ($aggregateSummary) {
            $totalRevenue = $aggregateSummary['totalRevenue'];
            $totalOrders = $aggregateSummary['totalOrders'];
            $deliveredOrders = $aggregateSummary['deliveredOrders'];
            $rejectedOrders = $aggregateSummary['rejectedOrders'];
            $visits = $aggregateSummary['visits'];
            $uniqueVisitors = $aggregateSummary['uniqueVisitors'];
            $checkoutStarts = $aggregateSummary['checkoutStarts'];
            $notificationCounts = $aggregateSummary['notifications'];
        }

        $elapsedMs = (int) ((microtime(true) - $startedAt) * 1000);
        if ($elapsedMs > 1500) {
            app(\App\Services\SystemEventService::class)->record('analytics_slow_endpoint', 'Analytics dashboard endpoint was slow.', [
                'duration_ms' => $elapsedMs,
                'store_id' => $storeId,
                'range' => $request->input('range', 'default'),
                'user_id' => $user->id,
            ], 'warning', static::class);
        }

        return $this->success([
            'metrics' => [
                'totalRevenue' => (float) $totalRevenue,
                'totalOrders' => $totalOrders,
                'pendingOrders' => $pendingOrders,
                'ordersToday' => (clone $query)->where('created_at', '>=', $today)->count(),
                'ordersWeek' => (clone $query)->where('created_at', '>=', $weekStart)->count(),
                'ordersMonth' => (clone $query)->where('created_at', '>=', $monthStart)->count(),
                'conversionRate' => $visits > 0 ? round($totalOrders / $visits * 100, 2) : null,
            ],
            'revenue' => [
                'today' => (float) (clone $query)->where('status', 'delivered')->where('created_at', '>=', $today)->sum('total_amount'),
                'week' => (float) (clone $query)->where('status', 'delivered')->where('created_at', '>=', $weekStart)->sum('total_amount'),
                'month' => (float) (clone $query)->where('status', 'delivered')->where('created_at', '>=', $monthStart)->sum('total_amount'),
                'year' => (float) (clone $query)->where('status', 'delivered')->where('created_at', '>=', $yearStart)->sum('total_amount'),
            ],
            'orders' => [
                'waiting' => (int) ($statusCounts['pending'] ?? 0),
                'confirmed' => (int) ($statusCounts['confirmed'] ?? 0),
                'delivered' => $deliveredOrders,
                'rejected' => (int) ($statusCounts['returned'] ?? 0),
                'problem' => (int) ($statusCounts['problematic'] ?? 0),
                'rejectionRate' => $totalOrders > 0 ? round($rejectedOrders / $totalOrders * 100, 2) : 0,
                'deliveryRate' => $totalOrders > 0 ? round($deliveredOrders / $totalOrders * 100, 2) : 0,
            ],
            'products' => [
                'total' => (clone $productScope)->count(),
                'lowStock' => (clone $productScope)->whereHas('variants', fn ($q) => $q->where('is_active', true)->where('stock_quantity', '>', 0)->where('stock_quantity', '<=', 5))->count(),
                'outOfStock' => (clone $productScope)->whereHas('variants', fn ($q) => $q->where('is_active', true)->where('stock_quantity', '<=', 0))->count(),
            ],
            'customers' => [
                'new' => (clone $buyerScope)->where('created_at', '>=', $monthStart)->count(),
                'returning' => (clone $buyerScope)->where('total_orders', '>', 1)->count(),
                'highRisk' => $isAdmin
                    ? GlobalCustomer::where('risk_level', 'high_risk')->count()
                    : (clone $buyerScope)->where('risk_level', 'high_risk')->count(),
            ],
            'traffic' => [
                'visits' => $visits,
                'uniqueVisitors' => $uniqueVisitors,
                'conversionRate' => $visits > 0 ? round($totalOrders / $visits * 100, 2) : null,
                'checkoutStarts' => $checkoutStarts,
                'deviceBreakdown' => $trafficByDevice,
            ],
            'notifications' => [
                'sent' => $notificationCounts['sent'],
                'delivered' => $notificationCounts['delivered'],
                'opened' => $notificationCounts['opened'],
                'clicked' => $notificationCounts['clicked'],
            ],
            'telegram' => [
                'posts' => null,
                'successRate' => null,
                'failures' => null,
            ],
            'revenueChart' => $revenueChart,
            'topProducts' => $topProducts,
            'platform' => $platform,
        ], 'Dashboard analytics loaded');
    }

    public function track(Request $request)
    {
        $data = $request->validate([
            'storeId' => 'nullable|integer|exists:stores,id',
            'storeSlug' => 'nullable|string|max:255',
            'productId' => 'nullable|integer|exists:products,id',
            'campaignId' => 'nullable|integer|exists:customer_notification_campaigns,id',
            'eventType' => 'required|string|in:visit,product_view,checkout_start,campaign_open,campaign_click',
            'visitorId' => 'nullable|string|max:255',
            'deviceType' => 'nullable|string|max:50',
            'locale' => 'nullable|string|max:5',
            'metadata' => 'nullable|array',
        ]);

        $store = null;
        if ($data['storeId'] ?? null) {
            $store = Store::find($data['storeId']);
        } elseif ($data['storeSlug'] ?? null) {
            $store = Store::where('slug', $data['storeSlug'])
                ->orWhere('subdomain', $data['storeSlug'])
                ->orWhere('custom_domain', $data['storeSlug'])
                ->first();
        }

        AnalyticsEvent::create([
            'store_id' => $store?->id,
            'product_id' => $data['productId'] ?? null,
            'campaign_id' => $data['campaignId'] ?? null,
            'event_type' => $data['eventType'],
            'visitor_id' => $data['visitorId'] ?? null,
            'device_type' => $data['deviceType'] ?? null,
            'locale' => $data['locale'] ?? null,
            'metadata' => $data['metadata'] ?? [],
        ]);

        return $this->success(['tracked' => true], 'Analytics event tracked', 201);
    }

    private function rangeStart(?string $range): ?Carbon
    {
        return match ($range) {
            '7d' => Carbon::now()->subDays(7),
            '30d' => Carbon::now()->subDays(30),
            '90d' => Carbon::now()->subDays(90),
            'year' => Carbon::now()->startOfYear(),
            default => null,
        };
    }

    private function aggregateSummary(?Carbon $rangeStart, ?int $storeId, ?int $ownerId): ?array
    {
        if (!$rangeStart || !Schema::hasTable('store_daily_stats')) {
            return null;
        }

        $query = StoreDailyStat::query()
            ->where('stat_date', '>=', $rangeStart->toDateString())
            ->when($storeId, fn ($q) => $q->where('store_id', $storeId))
            ->when($ownerId, function ($q) use ($ownerId) {
                $q->whereHas('store', fn ($storeQuery) => $storeQuery->where('user_id', $ownerId));
            });

        if (!(clone $query)->exists()) {
            return null;
        }

        return [
            'totalRevenue' => (float) (clone $query)->sum('revenue'),
            'totalOrders' => (int) (clone $query)->sum('orders_count'),
            'deliveredOrders' => (int) (clone $query)->sum('delivered_orders_count'),
            'rejectedOrders' => (int) (clone $query)->sum('rejected_orders_count'),
            'visits' => (int) (clone $query)->sum('visits_count'),
            'uniqueVisitors' => (int) (clone $query)->sum('unique_visitors_count'),
            'checkoutStarts' => (int) (clone $query)->sum('checkout_starts_count'),
            'notifications' => [
                'sent' => (int) (clone $query)->sum('notifications_sent_count'),
                'delivered' => (int) (clone $query)->sum('notifications_delivered_count'),
                'opened' => (int) (clone $query)->sum('notifications_opened_count'),
                'clicked' => (int) (clone $query)->sum('notifications_clicked_count'),
            ],
        ];
    }
}
