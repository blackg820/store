<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Store;
use App\Models\Product;
use App\Models\Order;
use App\Models\Buyer;
use App\Models\ProductType;
use App\Models\Category;
use App\Models\User;
use App\Models\AuditLog;
use App\Http\Resources\StoreResource;
use App\Http\Resources\ProductResource;
use App\Http\Resources\OrderResource;
use App\Http\Resources\BuyerResource;
use App\Http\Resources\ProductTypeResource;
use App\Http\Resources\CategoryResource;
use Illuminate\Support\Facades\DB;

class DashboardController extends Controller
{
    public function init(Request $request)
    {
        $user = $request->user();
        if (!$user) {
            return response()->json(['success' => false, 'error' => 'Unauthorized'], 401);
        }

        $isAdmin = $user->role === 'admin';
        $userId = $user->id;

        // Data that everyone needs
        $storesQuery = Store::query()->withCount('products');
        if (!$isAdmin) {
            $storesQuery->where('user_id', $userId);
        }
        $stores = $storesQuery->get();

        $productTypes = ProductType::all();
        $categories = Category::all();
        
        $settings = DB::table('global_settings')->pluck('setting_value', 'setting_key');

        // Conditional data
        $products = Product::with('media')->limit(100)->get();
        $orders = Order::with(['store', 'buyer'])->orderBy('created_at', 'desc')->limit(100)->get();
        $buyers = Buyer::orderBy('created_at', 'desc')->limit(100)->get();
        
        $users = [];
        $auditLogs = [];
        $subscriptions = [];

        if ($isAdmin) {
            $users = User::all();
            $auditLogs = AuditLog::orderBy('created_at', 'desc')->limit(100)->get();
            $subscriptions = DB::table('subscriptions')
                ->join('users', 'subscriptions.user_id', '=', 'users.id')
                ->leftJoin('plans', 'subscriptions.plan_code', '=', 'plans.code')
                ->select('subscriptions.*', 'users.name as user_name', 'users.email as user_email', 'plans.price as monthly_price')
                ->get();
        } else {
            // Filter products/orders/buyers if not admin
            // This is partially handled by Global Scopes if we resolve tenant.id
            // But since init returns ALL data for the user's stores, we might need manual filtering
            $storeIds = $stores->pluck('id')->toArray();
            $products = Product::whereIn('store_id', $storeIds)->with('media')->limit(100)->get();
            $orders = Order::whereIn('store_id', $storeIds)->with(['store', 'buyer'])->orderBy('created_at', 'desc')->limit(100)->get();
            $buyers = Buyer::whereHas('orders', function($q) use ($storeIds) {
                $q->whereIn('store_id', $storeIds);
            })->orderBy('created_at', 'desc')->limit(100)->get();
        }

        return response()->json([
            'success' => true,
            'data' => [
                'stores' => StoreResource::collection($stores),
                'products' => ProductResource::collection($products),
                'orders' => OrderResource::collection($orders),
                'buyers' => BuyerResource::collection($buyers),
                'productTypes' => ProductTypeResource::collection($productTypes),
                'categories' => CategoryResource::collection($categories),
                'settings' => $settings,
                'users' => $users, // To be resource-ified later
                'auditLogs' => $auditLogs,
                'subscriptions' => $subscriptions,
            ]
        ]);
    }
}
