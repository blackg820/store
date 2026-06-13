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
use App\Models\Plan;
use App\Models\Subscription;
use App\Http\Resources\UserResource;
use App\Http\Resources\StoreResource;
use App\Http\Resources\ProductResource;
use App\Http\Resources\OrderResource;
use App\Http\Resources\SubscriptionResource;
use App\Http\Resources\BuyerResource;
use App\Http\Resources\CategoryResource;
use App\Http\Resources\ProductTypeResource;
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
        $isEmployee = $user->role === 'employee';
        $ownerId = $user->parent_id ?: $user->id;

        // Data that everyone needs
        $storesQuery = Store::query()->withCount('products');
        if (!$isAdmin) {
            $storesQuery->where('user_id', $ownerId);
        }
        $stores = $storesQuery->get();

        $productTypesQuery = ProductType::withoutGlobalScopes();
        $categoriesQuery = Category::withoutGlobalScopes();

        if (!$isAdmin) {
            $productTypesQuery->where(function($q) use ($ownerId) {
                $q->whereHas('store', function($sq) use ($ownerId) {
                    $sq->where('user_id', $ownerId);
                })->orWhereNull('store_id');
            });

            $categoriesQuery->where(function($q) use ($ownerId) {
                $q->whereHas('store', function($sq) use ($ownerId) {
                    $sq->where('user_id', $ownerId);
                })->orWhereNull('store_id');
            });
        }

        $productTypes = $productTypesQuery->get();
        $categories = $categoriesQuery->get();

        $settings = DB::table('global_settings')->pluck('setting_value', 'setting_key');

        // Conditional data
        $products = Product::with('media')->limit(100)->get();
        $orders = Order::with(['store', 'buyer'])->orderBy('created_at', 'desc')->limit(100)->get();
        $buyers = Buyer::orderBy('created_at', 'desc')->limit(100)->get();

        $users = [];
        $auditLogs = [];
        $subscriptions = [];

        if ($isAdmin) {
            $users = User::with('userLimit')->get();
            $auditLogs = AuditLog::orderBy('created_at', 'desc')->limit(100)->get();
            $subscriptions = Subscription::with(['user', 'plan'])->get();
        } else {
            $storeIds = $stores->pluck('id')->toArray();
            $products = Product::whereIn('store_id', $storeIds)->with('media')->limit(100)->get();

            if ($isEmployee) {
                $orders = collect();
                $buyers = collect();
            } else {
                $orders = Order::whereIn('store_id', $storeIds)->with(['store', 'buyer'])->orderBy('created_at', 'desc')->limit(100)->get();
                $buyers = Buyer::whereHas('orders', function($q) use ($storeIds) {
                    $q->whereIn('store_id', $storeIds);
                })->orderBy('created_at', 'desc')->limit(100)->get();

                $subscriptions = Subscription::where('user_id', $ownerId)->with('plan')->get();
            }
        }

        return response()->json([
            'success' => true,
            'data' => [
                'user' => new UserResource($user),
                'stores' => StoreResource::collection($stores),
                'products' => ProductResource::collection($products),
                'orders' => OrderResource::collection($orders),
                'buyers' => BuyerResource::collection($buyers),
                'productTypes' => ProductTypeResource::collection($productTypes),
                'categories' => CategoryResource::collection($categories),
                'settings' => $settings,
                'users' => UserResource::collection($users),
                'auditLogs' => $auditLogs,
                'subscriptions' => SubscriptionResource::collection($subscriptions),
            ]
        ]);
    }
}
