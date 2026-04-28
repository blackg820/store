<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Order;
use App\Models\Product;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class AnalyticsController extends Controller
{
    public function dashboard(Request $request)
    {
        $user = $request->user();
        $isAdmin = $user->role === 'admin';
        $storeId = $request->store_id;

        $query = Order::query();

        if (!$isAdmin) {
            $query->whereHas('store', function($q) use ($user) {
                $q->where('user_id', $user->id);
            });
        }

        if ($storeId) {
            $query->where('store_id', $storeId);
        }

        // Metrics
        $totalRevenue = (clone $query)->where('status', 'delivered')->sum('total_amount');
        $totalOrders = (clone $query)->count();
        $pendingOrders = (clone $query)->where('status', 'pending')->count();
        
        // Revenue Chart (Last 7 days)
        $revenueChart = (clone $query)
            ->where('status', 'delivered')
            ->where('created_at', '>=', Carbon::now()->subDays(7))
            ->select(DB::raw('DATE(created_at) as date'), DB::raw('SUM(total_amount) as total'))
            ->groupBy('date')
            ->orderBy('date')
            ->get();

        // Top Products
        $topProducts = DB::table('order_items')
            ->join('orders', 'order_items.order_id', '=', 'orders.id')
            ->join('products', 'order_items.product_id', '=', 'products.id')
            ->select('products.id', 'products.name', DB::raw('SUM(order_items.quantity) as sold_count'))
            ->where('orders.deleted_at', null)
            ->when(!$isAdmin, function($q) use ($user) {
                $q->whereExists(function($sq) use ($user) {
                    $sq->select(DB::raw(1))
                      ->from('stores')
                      ->whereColumn('stores.id', 'orders.store_id')
                      ->where('stores.user_id', $user->id);
                });
            })
            ->when($storeId, function($q) use ($storeId) {
                $q->where('orders.store_id', $storeId);
            })
            ->groupBy('products.id', 'products.name')
            ->orderByDesc('sold_count')
            ->limit(5)
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'metrics' => [
                    'totalRevenue' => (float) $totalRevenue,
                    'totalOrders' => $totalOrders,
                    'pendingOrders' => $pendingOrders,
                    'conversionRate' => 3.5, // Mocked for now
                ],
                'revenueChart' => $revenueChart,
                'topProducts' => $topProducts,
            ]
        ]);
    }
}
