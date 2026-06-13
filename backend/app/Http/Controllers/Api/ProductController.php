<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Product;
use App\Models\Store;
use App\Http\Resources\ProductResource;
use App\Http\Resources\CategoryResource;
use App\Http\Resources\ProductTypeResource;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Cache;
use App\Services\TelegramService;
use App\Services\SystemEventService;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $isAdmin = $user->role === 'admin';

        $query = Product::with(['media', 'store', 'productType', 'category', 'options', 'variants']);

        if (!$isAdmin) {
            $ownerId = $user->parent_id ?: $user->id;
            $query->whereHas('store', function($q) use ($ownerId) {
                $q->where('user_id', $ownerId);
            });
        }

        $storeId = $request->input('store_id', $request->header('X-Store-ID'));
        if ($storeId) {
            $query->where('store_id', $storeId);
        }
        if ($request->has('category_id')) {
            $query->where('category_id', $request->category_id);
        }
        if ($request->has('product_type_id')) {
            $query->where('product_type_id', $request->product_type_id);
        }
        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('title', 'like', "%$search%")
                  ->orWhere('description', 'like', "%$search%")
                  ->orWhere('sku', 'like', "%$search%");
            });
        }
        if ($request->has('min_price')) {
            $query->where('price', '>=', $request->min_price);
        }
        if ($request->has('max_price')) {
            $query->where('price', '<=', $request->max_price);
        }

        $products = $query->orderBy('created_at', 'desc')->paginate($request->limit ?? 10);

        return $this->success(ProductResource::collection($products));
    }

    public function store(\App\Http\Requests\ProductRequest $request)
    {
        $user = $request->user();
        if ($this->isReadOnlyRole($user)) {
            return $this->readOnlyDenied();
        }

        $store = Store::findOrFail($request->storeId);

        if ($user->role !== 'admin' && $store->user_id !== ($user->parent_id ?: $user->id)) {
            return $this->error('Access denied', 403);
        }

        // Plan limits check
        $owner = $user->role === 'admin' ? $store->user : ($user->parent_id ? \App\Models\User::find($user->parent_id) : $user);
        $subService = app(\App\Services\SubscriptionService::class);
        $productCount = Product::whereHas('store', function($q) use ($owner) {
            $q->where('user_id', $owner->id);
        })->count();
        $check = $subService->checkLimit($owner, 'products', $productCount);
        if (!$check['allowed']) {
            return $this->limitError($check);
        }

        $product = DB::transaction(function() use ($request, $store) {
            $product = Product::create([
                'store_id' => $store->id,
                'sku' => $request->sku,
                'product_code' => 'P-' . strtoupper(bin2hex(random_bytes(3))),
                'product_type_id' => $request->productTypeId,
                'category_id' => $request->categoryId,
                'title' => $request->title,
                'description' => $request->description ?? '',
                'price' => $request->price,
                'cost_price' => $request->costPrice ?? 0,
                'discount' => $request->discount ?? 0,
                'delivery_fee' => $request->deliveryFee ?? 0,
                'needs_deposit' => $request->needsDeposit ?? false,
                'deposit_amount' => $request->depositAmount ?? 0,
                'custom_data' => $request->customData,
                'is_active' => $request->boolean('isActive', true),
                'status' => $request->status ?? ($request->boolean('isActive', true) ? 'active' : 'inactive'),
            ]);

            // Save Options
            if ($request->has('options')) {
                foreach ($request->options as $index => $opt) {
                    $product->options()->create([
                        'name' => $opt['name'],
                        'type' => $opt['type'] ?? 'choice',
                        'values_json' => $opt['values'],
                        'swatches_json' => $opt['swatches'] ?? null,
                        'position' => $index,
                    ]);
                }
            }

            // Save Variants
            if ($request->has('variants')) {
                foreach ($request->variants as $variant) {
                    $product->variants()->create([
                        'title' => $variant['title'] ?? '',
                        'sku' => $variant['sku'] ?? null,
                        'price_override' => $variant['priceOverride'] ?? null,
                        'stock_quantity' => $variant['stockQuantity'] ?? 0,
                        'option_values' => $variant['optionValues'],
                        'image_id' => $variant['imageId'] ?? null,
                        'is_active' => $variant['isActive'] ?? true,
                    ]);
                }
            }

            if ($request->has('media')) {
                foreach ($request->media as $m) {
                    \App\Models\Media::where('id', $m['id'])->where('store_id', $store->id)->update([
                        'product_id' => $product->id,
                        'is_main' => $m['isMain'] ?? false
                    ]);
                }
            }

            return $product;
        });

        // Trigger Telegram Auto-post
        if ($store->telegram_auto_post) {
            try {
                app(\App\Services\TelegramService::class)->postProduct($product);
            } catch (\Exception $e) {
                Log::error("Telegram auto-post failed: " . $e->getMessage());
            }
        }

        return $this->success(new ProductResource($product->load(['media', 'options', 'variants', 'store', 'category', 'productType'])), 'Product created successfully', 201);
    }

    public function show(Request $request, Product $product)
    {
        $user = $request->user();
        $ownerId = $user->parent_id ?: $user->id;
        $product->loadMissing('store');

        if ($user->role !== 'admin' && (int) $product->store->user_id !== (int) $ownerId) {
            return $this->error('Access denied', 403);
        }

        return $this->success(new ProductResource($product->load(['media', 'options', 'variants', 'store'])));
    }

    public function update(\App\Http\Requests\ProductRequest $request, Product $product)
    {
        $user = $request->user();
        if ($this->isReadOnlyRole($user)) {
            return $this->readOnlyDenied();
        }

        $ownerId = $user->parent_id ?: $user->id;
        if ($user->role !== 'admin' && $product->store->user_id !== $ownerId) {
            return $this->error('Access denied', 403);
        }

        DB::transaction(function() use ($request, $product) {
            $updates = [];
            $fieldMap = [
                'productTypeId' => 'product_type_id',
                'categoryId' => 'category_id',
                'sku' => 'sku',
                'title' => 'title',
                'description' => 'description',
                'price' => 'price',
                'costPrice' => 'cost_price',
                'discount' => 'discount',
                'deliveryFee' => 'delivery_fee',
                'needsDeposit' => 'needs_deposit',
                'depositAmount' => 'deposit_amount',
                'customData' => 'custom_data',
                'isActive' => 'is_active',
                'status' => 'status',
            ];

            foreach ($fieldMap as $input => $column) {
                if ($request->has($input)) {
                    $updates[$column] = $request->input($input);
                }
            }

            if ($updates !== []) {
                $product->update($updates);
            }

            if ($request->has('options')) {
                $product->options()->delete();
                foreach ($request->options as $index => $opt) {
                    $product->options()->create([
                        'name' => $opt['name'],
                        'type' => $opt['type'] ?? 'choice',
                        'values_json' => $opt['values'],
                        'swatches_json' => $opt['swatches'] ?? null,
                        'position' => $index,
                    ]);
                }
            }

            if ($request->has('variants')) {
                $product->variants()->delete();
                foreach ($request->variants as $variant) {
                    $product->variants()->create([
                        'title' => $variant['title'] ?? '',
                        'sku' => $variant['sku'] ?? null,
                        'price_override' => $variant['priceOverride'] ?? null,
                        'stock_quantity' => $variant['stockQuantity'] ?? 0,
                        'option_values' => $variant['optionValues'],
                        'image_id' => $variant['imageId'] ?? null,
                        'is_active' => $variant['isActive'] ?? true,
                    ]);
                }
            }
            if ($request->has('media')) {
                $mediaIds = collect($request->media)->pluck('id')->toArray();
                // Delete media that were removed
                \App\Models\Media::where('product_id', $product->id)
                    ->whereNotIn('id', $mediaIds)
                    ->delete();
                // Link remaining/new media and update is_main
                foreach ($request->media as $m) {
                    \App\Models\Media::where('id', $m['id'])->where('store_id', $product->store_id)->update([
                        'product_id' => $product->id,
                        'is_main' => $m['isMain'] ?? false
                    ]);
                }
            }
        });

        return $this->success(new ProductResource($product->fresh()->load(['media', 'options', 'variants', 'store', 'category', 'productType'])), 'Product updated successfully');
    }

    public function destroy(Request $request, Product $product)
    {
        $user = $request->user();
        if ($user->role === 'employee' || $this->isReadOnlyRole($user)) {
            return $this->error('Your role cannot delete products.', 403, null, 'PERMISSION_DENIED');
        }

        $ownerId = $user->parent_id ?: $user->id;
        if ($user->role !== 'admin' && $product->store->user_id !== $ownerId) {
            return $this->error('Access denied', 403);
        }

        $product->delete();
        return $this->success(null, 'Product deleted successfully');
    }

    public function sendToTelegram(Product $product)
    {
        // Check if user has telegram feature
        $user = auth()->user();
        if ($user->role === 'employee' || $this->isReadOnlyRole($user)) {
            return $this->error('Your role cannot post products to Telegram.', 403, null, 'PERMISSION_DENIED');
        }

        $product->loadMissing('store');
        $ownerId = $user->parent_id ?: $user->id;
        if ($user->role !== 'admin' && (int) $product->store->user_id !== (int) $ownerId) {
            return $this->tenantDenied();
        }

        $owner = $user->parent_id ? \App\Models\User::find($user->parent_id) : $user;
        $subService = app(\App\Services\SubscriptionService::class);
        if (!$subService->canUseFeature($owner, 'telegram_bot')) {
            return $this->error('Your plan does not support Telegram integration.', 403);
        }

        $postingKey = 'telegram:product-posting:' . $product->id;
        if (!Cache::add($postingKey, now()->toISOString(), now()->addMinutes(2))) {
            return $this->error('This product is already being posted to Telegram.', 409, null, 'DUPLICATE_TELEGRAM_POST');
        }

        try {
            $res = app(TelegramService::class)->postProduct($product);
            if ($res && $res->successful()) {
                Cache::put('telegram:product-posted:' . $product->id, now()->toISOString(), now()->addHours(6));
                return $this->success(null, 'Product posted to Telegram');
            }

            app(SystemEventService::class)->record('telegram_failure', 'Telegram product post failed.', [
                'product_id' => $product->id,
                'store_id' => $product->store_id,
                'status' => method_exists($res, 'status') ? $res->status() : null,
            ], 'warning', static::class);
        } finally {
            Cache::forget($postingKey);
        }

        return $this->error('Telegram post failed');
    }

    public function formOptions(Request $request)
    {
        $user = $request->user();
        $storeId = $request->header('X-Store-ID') ?: $request->input('store_id');
        $store = $storeId ? Store::findOrFail($storeId) : null;

        if ($store && $user->role !== 'admin' && (int) $store->user_id !== (int) ($user->parent_id ?: $user->id)) {
            return $this->tenantDenied();
        }

        $ownerId = $user->parent_id ?: $user->id;
        $types = \App\Models\ProductType::withoutGlobalScopes()
            ->when($user->role !== 'admin', fn ($query) => $query->where(function ($scope) use ($ownerId) {
                $scope->whereNull('store_id')->orWhereHas('store', fn ($stores) => $stores->where('user_id', $ownerId));
            }))
            ->when($store, fn ($query) => $query->where(fn ($scope) => $scope->whereNull('store_id')->orWhere('store_id', $store->id)))
            ->get();
        $categories = \App\Models\Category::withoutGlobalScopes()
            ->when($user->role !== 'admin', fn ($query) => $query->where(function ($scope) use ($ownerId) {
                $scope->whereNull('store_id')->orWhereHas('store', fn ($stores) => $stores->where('user_id', $ownerId));
            }))
            ->when($store, fn ($query) => $query->where(fn ($scope) => $scope->whereNull('store_id')->orWhere('store_id', $store->id)))
            ->get();
        $subscriptionService = app(\App\Services\SubscriptionService::class);
        $owner = $user->tenantOwner();
        $storageAllowed = $subscriptionService->canUseFeature($owner, 'storage_gb');
        $productCount = $owner->stores()->withCount('products')->get()->sum('products_count');
        $productLimit = $subscriptionService->checkLimit($owner, 'products', $productCount, 1);

        return $this->success([
            'categories' => CategoryResource::collection($categories),
            'productTypes' => ProductTypeResource::collection($types),
            'product_types' => ProductTypeResource::collection($types),
            'statuses' => ['active', 'inactive', 'draft', 'archived'],
            'currency' => $store?->base_currency ?? 'IQD',
            'optionTemplates' => $store?->option_presets ?? [],
            'storeLimits' => [
                'canCreateProduct' => (bool) ($productLimit['allowed'] ?? false),
                'productLimit' => $productLimit['details'] ?? null,
            ],
            'mediaUploadRules' => [
                'maxBytes' => 50 * 1024 * 1024,
                'maxFilesPerProductRecommended' => 10,
                'mimeTypes' => [
                    'image/jpeg', 'image/pjpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif',
                    'video/mp4', 'video/webm', 'video/quicktime', 'video/x-msvideo',
                ],
            ],
            'permissions' => [
                'canCreateProduct' => !$this->isReadOnlyRole($user),
                'canUploadMedia' => !$this->isReadOnlyRole($user),
                'canDeleteProduct' => !$this->isReadOnlyRole($user) && $user->role !== 'employee',
            ],
            'features' => [
                'mediaStorage' => $storageAllowed,
                'telegramProductPost' => $subscriptionService->canUseFeature($owner, 'telegram_bot'),
            ],
        ], 'Product form options loaded');
    }
}
