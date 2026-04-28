<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Store;
use App\Models\Buyer;
use App\Models\Product;
use App\Http\Resources\OrderResource;
use Illuminate\Support\Facades\DB;
use App\Events\OrderCreated;

class OrderController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $isAdmin = $user->role === 'admin';

        $query = Order::with(['store', 'buyer', 'items.product']);

        if (!$isAdmin) {
            $query->whereHas('store', function($q) use ($user) {
                $q->where('user_id', $user->id);
            });
        }

        if ($request->has('store_id')) {
            $query->where('store_id', $request->store_id);
        }
        if ($request->has('status')) {
            $query->where('status', $request->status);
        }
        if ($request->has('buyer_id')) {
            $query->where('buyer_id', $request->buyer_id);
        }
        if ($request->has('start_date')) {
            $query->where('created_at', '>=', $request->start_date);
        }
        if ($request->has('end_date')) {
            $query->where('created_at', '<=', $request->end_date);
        }

        $orders = $query->orderBy('created_at', 'desc')->paginate($request->limit ?? 10);

        return OrderResource::collection($orders);
    }

    public function store(Request $request)
    {
        $request->validate([
            'storeId' => 'required|exists:stores,id',
            'buyerId' => 'required|exists:buyers,id',
        ]);

        $user = $request->user();
        
        // Idempotency check for background sync
        if ($request->has('clientReferenceId')) {
            $existing = Order::where('client_reference_id', $request->clientReferenceId)->first();
            if ($existing) {
                return new OrderResource($existing);
            }
        }

        $store = Store::findOrFail($request->storeId);
        $buyer = Buyer::findOrFail($request->buyerId);

        if ($user->role !== 'admin' && $store->user_id !== $user->id) {
            return response()->json(['success' => false, 'error' => 'Access denied'], 403);
        }

        if ($buyer->is_blacklisted) {
            return response()->json(['success' => false, 'error' => 'Buyer is blacklisted'], 403);
        }

        $order = DB::transaction(function() use ($request, $store, $buyer) {
            $totalAmount = 0;
            $unitPrice = 0;
            $productId = $request->productId;
            if ($productId) {
                $product = Product::where('id', $productId)->where('store_id', $store->id)->firstOrFail();
                $qty = $request->quantity ?? 1;
                $unitPrice = $product->price * (1 - ($product->discount ?? 0) / 100);
                $totalAmount = round($unitPrice * $qty, 2);
            }

            $order = Order::create([
                'client_reference_id' => $request->clientReferenceId,
                'store_id' => $store->id,
                'buyer_id' => $buyer->id,
                'status' => 'pending',
                'internal_notes' => $request->notes,
                'total_amount' => $totalAmount,
            ]);

            if ($productId) {
                OrderItem::create([
                    'order_id' => $order->id,
                    'product_id' => $productId,
                    'quantity' => $request->quantity ?? 1,
                    'unit_price' => $unitPrice,
                ]);
            }

            $buyer->increment('total_orders');

            return $order;
        });

        event(new OrderCreated($order));

        return new OrderResource($order);
    }
}
