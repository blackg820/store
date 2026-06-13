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
use App\Services\CustomerRiskService;
use Illuminate\Support\Facades\DB;
use App\Events\OrderCreated;
use Illuminate\Validation\Rule;

class OrderController extends Controller
{
    private array $statuses = ['pending', 'confirmed', 'delivered', 'returned', 'problematic'];

    public function index(Request $request)
    {
        $user = $request->user();
        if ($user->role === 'employee') {
            return $this->error('Employees can only manage products and categories.', 403);
        }

        $isAdmin = $user->role === 'admin';
        $ownerId = $user->parent_id ?: $user->id;

        $query = Order::with(['store', 'buyer.globalCustomer', 'globalCustomer', 'items.product']);

        if (!$isAdmin) {
            $query->whereHas('store', function($q) use ($ownerId) {
                $q->where('user_id', $ownerId);
            });
        }

        $storeId = $request->input('store_id', $request->header('X-Store-ID'));
        if ($storeId) {
            $query->where('store_id', $storeId);
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

        return $this->success(OrderResource::collection($orders));
    }

    public function store(\App\Http\Requests\OrderRequest $request)
    {
        $user = $request->user();
        if ($user->role === 'employee') {
            return $this->error('Employees can only manage products and categories.', 403);
        }
        if ($this->isReadOnlyRole($user)) {
            return $this->readOnlyDenied();
        }

        $owner = $user->tenantOwner();

        // Idempotency check for background sync
        if ($request->has('clientReferenceId')) {
            $existing = Order::where('client_reference_id', $request->clientReferenceId)->first();
            if ($existing) {
                return $this->success(new OrderResource($existing));
            }
        }

        $store = Store::findOrFail($request->storeId);
        $buyer = Buyer::findOrFail($request->buyerId);

        if ($user->role !== 'admin' && $store->user_id !== $user->id) {
            if ((int) $store->user_id !== (int) $owner->id) {
                return $this->error('Access denied', 403);
            }
        }

        if ($user->role !== 'admin' && $buyer->user_id && (int) $buyer->user_id !== (int) $owner->id) {
            return $this->error('Access denied', 403);
        }

        if ($buyer->is_blacklisted) {
            return $this->error('Buyer is blacklisted', 403);
        }

        $riskService = app(CustomerRiskService::class);
        $globalCustomer = $riskService->attachBuyer($buyer);

        $order = DB::transaction(function() use ($request, $store, $buyer, $globalCustomer) {
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
                'global_customer_id' => $globalCustomer->id,
                'status' => 'pending',
                'internal_notes' => $request->notes,
                'total_amount' => $totalAmount,

                // Logistics data
                'customer_name' => $request->customerName,
                'customer_phone' => $request->customerPhone,
                'city_id' => $request->cityId,
                'region_id' => $request->regionId,
                'package_size_id' => $request->packageSizeId,
                'items_description' => $request->itemsDescription,
                'address_details' => $request->addressDetails,
                'order_notes' => $request->orderNotes,
                'cod_amount' => $request->codAmount ?? $totalAmount,
                'alwaseet_sync_status' => 'pending',
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
            app(CustomerRiskService::class)->recordOrderCreated($order);

            return $order;
        });

        event(new OrderCreated($order));

        return $this->success(new OrderResource($order->load(['store', 'buyer.globalCustomer', 'globalCustomer', 'items.product'])), 'Order created successfully', 201);
    }

    public function show(Request $request, Order $order)
    {
        if ($request->user()?->role === 'employee') {
            return $this->error('Employees can only manage products and categories.', 403);
        }

        if (!$this->canAccessOrder($request, $order)) {
            return $this->error('Access denied', 403);
        }

        return $this->success(new OrderResource($order->load(['store', 'buyer.globalCustomer', 'globalCustomer', 'items.product'])));
    }

    public function update(Request $request, Order $order)
    {
        if ($request->user()?->role === 'employee') {
            return $this->error('Employees can only manage products and categories.', 403);
        }
        if ($this->isReadOnlyRole($request->user())) {
            return $this->readOnlyDenied();
        }

        if (!$this->canAccessOrder($request, $order)) {
            return $this->error('Access denied', 403);
        }

        $data = $request->validate([
            'status' => ['sometimes', Rule::in($this->statuses)],
            'notes' => 'sometimes|nullable|string',
            'internalNotes' => 'sometimes|nullable|string',
            'buyerNotes' => 'sometimes|nullable|string',
            'customerName' => 'sometimes|nullable|string|max:255',
            'customerPhone' => 'sometimes|nullable|string|max:255',
            'addressDetails' => 'sometimes|nullable|string',
            'orderNotes' => 'sometimes|nullable|string',
            'itemsDescription' => 'sometimes|nullable|string',
            'cityId' => 'sometimes|nullable|integer',
            'regionId' => 'sometimes|nullable|integer',
            'packageSizeId' => 'sometimes|nullable|integer',
            'deliveryFee' => 'sometimes|nullable|numeric|min:0',
            'totalAmount' => 'sometimes|nullable|numeric|min:0',
            'codAmount' => 'sometimes|nullable|numeric|min:0',
        ]);

        $previous = $order->status;
        $order->fill([
            'status' => $data['status'] ?? $order->status,
            'internal_notes' => $data['internalNotes'] ?? $data['notes'] ?? $order->internal_notes,
            'buyer_notes' => $data['buyerNotes'] ?? $order->buyer_notes,
            'customer_name' => $data['customerName'] ?? $order->customer_name,
            'customer_phone' => $data['customerPhone'] ?? $order->customer_phone,
            'address_details' => $data['addressDetails'] ?? $order->address_details,
            'order_notes' => $data['orderNotes'] ?? $order->order_notes,
            'items_description' => $data['itemsDescription'] ?? $order->items_description,
            'city_id' => $data['cityId'] ?? $order->city_id,
            'region_id' => $data['regionId'] ?? $order->region_id,
            'package_size_id' => $data['packageSizeId'] ?? $order->package_size_id,
            'delivery_fee' => $data['deliveryFee'] ?? $order->delivery_fee,
            'total_amount' => $data['totalAmount'] ?? $order->total_amount,
            'cod_amount' => $data['codAmount'] ?? $order->cod_amount,
        ])->save();

        if (($data['status'] ?? null) && $this->enteredRejectedState($previous, $data['status'])) {
            app(CustomerRiskService::class)->recordRejectedOrder($order->fresh(['buyer']));
        }

        return $this->success(new OrderResource($order->fresh()->load(['store', 'buyer.globalCustomer', 'globalCustomer', 'items.product'])), 'Order updated successfully');
    }

    public function updateStatus(Request $request, Order $order)
    {
        if ($request->user()?->role === 'employee') {
            return $this->error('Employees can only manage products and categories.', 403);
        }
        if ($this->isReadOnlyRole($request->user())) {
            return $this->readOnlyDenied();
        }

        if (!$this->canAccessOrder($request, $order)) {
            return $this->error('Access denied', 403);
        }

        $data = $request->validate([
            'status' => ['required', Rule::in($this->statuses)],
        ]);

        $previous = $order->status;
        $order->update(['status' => $data['status']]);

        if ($this->enteredRejectedState($previous, $data['status']) && $order->buyer) {
            app(CustomerRiskService::class)->recordRejectedOrder($order->fresh(['buyer']));
        }

        return $this->success(new OrderResource($order->fresh()->load(['store', 'buyer.globalCustomer', 'globalCustomer', 'items.product'])), 'Order status updated successfully');
    }

    public function destroy(Request $request, Order $order)
    {
        if ($request->user()?->role === 'employee') {
            return $this->error('Employees can only manage products and categories.', 403);
        }
        if ($this->isReadOnlyRole($request->user())) {
            return $this->readOnlyDenied();
        }

        if (!$this->canAccessOrder($request, $order)) {
            return $this->tenantDenied();
        }

        $order->delete();

        return $this->success(null, 'Order deleted successfully');
    }

    public function sendToAlWaseet(Request $request, Order $order)
    {
        $user = $request->user();
        if ($user->role === 'employee') {
            return $this->error('Employees can only manage products and categories.', 403);
        }
        if ($this->isReadOnlyRole($user)) {
            return $this->readOnlyDenied();
        }

        $ownerId = $user->parent_id ?: $user->id;
        if ($user->role !== 'admin' && (int) $order->store->user_id !== (int) $ownerId) {
            return $this->error('Access denied', 403);
        }

        // Feature check
        $subService = app(\App\Services\SubscriptionService::class);
        if (!$subService->canUseFeature($user->tenantOwner(), 'alwaseet_integration')) {
            return $this->error('Your plan does not support Al-Waseet integration.', 403);
        }

        if ($order->status !== 'confirmed') {
            return $this->error('Order must be confirmed before sending to Al-Waseet', 422);
        }

        if ($order->alwaseet_sync_status === 'sent') {
            return $this->error('Order already sent to Al-Waseet', 422);
        }

        // Dispatch background job
        \App\Jobs\PushOrderToAlWaseet::dispatch($order);

        return $this->success(
            new OrderResource($order->load(['store', 'buyer', 'items.product'])),
            'Order push to Al-Waseet initiated.'
        );
    }

    private function canAccessOrder(Request $request, Order $order): bool
    {
        $user = $request->user();
        if (!$user) {
            return false;
        }

        if ($user->role === 'admin') {
            return true;
        }

        $order->loadMissing('store');
        $ownerId = $user->parent_id ?: $user->id;

        return (int) $order->store->user_id === (int) $ownerId;
    }

    private function enteredRejectedState(?string $previous, string $next): bool
    {
        $rejectedStates = ['returned', 'problematic'];

        return !in_array($previous, $rejectedStates, true) && in_array($next, $rejectedStates, true);
    }
}
