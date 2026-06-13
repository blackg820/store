<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Store;
use App\Models\Product;
use App\Models\Category;
use App\Models\Order;
use App\Models\OrderItem;
use App\Models\Buyer;
use App\Http\Resources\ProductResource;
use App\Services\CustomerRiskService;
use App\Services\DomainTenantService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class PublicController extends Controller
{
    public function store(string $slug)
    {
        $store = $this->resolvePublicStore($slug);

        // Check if owner is suspended
        if ($store->user->status === 'suspended') {
            abort(403, 'Store owner is suspended');
        }

        // Subscription check (optional based on your business logic)
        // if ($store->user->mode === 'controlled' && ...)

        $products = Product::where('store_id', $store->id)
            ->whereNull('deleted_at')
            ->where(function($q) {
                $q->where('is_active', true)->orWhere('status', 'active');
            })
            ->with(['category', 'productType', 'media' => function($q) {
                $q->where('visibility', 'public')->whereNull('deleted_at');
            }, 'options', 'variants'])
            ->orderBy('created_at', 'DESC')
            ->get();

        $categories = Category::withoutGlobalScopes()
            ->where(function($q) use ($store) {
                $q->where('store_id', $store->id)
                  ->orWhereNull('store_id');
            })
            ->where('is_active', true)
            ->withCount(['products' => function($q) use ($store) {
                $q->where('store_id', $store->id)
                    ->whereNull('deleted_at')
                    ->where(function($sub) {
                        $sub->where('is_active', true)->orWhere('status', 'active');
                    });
            }])
            ->orderBy('sort_order', 'ASC')
            ->get();

        $productTypes = \App\Models\ProductType::withoutGlobalScopes()
            ->where(function($q) use ($store) {
                $q->where('store_id', $store->id)
                  ->orWhereNull('store_id');
            })
            ->where('is_active', true)
            ->get();

        $featuredProducts = $products
            ->filter(fn ($product) => (float) ($product->discount ?? 0) > 0 || (bool) data_get($product->custom_data, 'featured', false))
            ->take(8)
            ->values();

        $bestSellers = Product::where('store_id', $store->id)
            ->whereNull('deleted_at')
            ->where(function($q) {
                $q->where('is_active', true)->orWhere('status', 'active');
            })
            ->with(['category', 'productType', 'media' => function($q) {
                $q->where('visibility', 'public')->whereNull('deleted_at');
            }, 'options', 'variants'])
            ->withCount('orderItems')
            ->orderByDesc('order_items_count')
            ->orderByDesc('rating_count')
            ->limit(8)
            ->get();

        $trendingProducts = $products
            ->sortByDesc(fn ($product) => ((float) $product->rating * max(1, (int) $product->rating_count)) + (float) $product->discount)
            ->take(8)
            ->values();

        $lowStockProducts = $products
            ->filter(function($product) {
                return $product->variants->where('is_active', true)->where('stock_quantity', '<=', 5)->where('stock_quantity', '>', 0)->isNotEmpty();
            })
            ->take(6)
            ->values();

        $ratingCount = (int) $products->sum('rating_count');
        $ratingTotal = $products->sum(fn ($product) => (float) $product->rating * (int) $product->rating_count);

        return response()->json([
            'success' => true,
            'data' => [
                'store' => [
                    'id' => (string) $store->id,
                    'name' => $store->name,
                    'slug' => $store->slug,
                    'subdomain' => $store->subdomain,
                    'customDomain' => $store->custom_domain,
                    'domainVerifiedAt' => $store->domain_verified_at?->toISOString(),
                    'whatsappNumber' => $store->whatsapp_number,
                    'description' => $store->description,
                    'currency' => $store->base_currency,
                    'logoUrl' => $store->logo_url,
                    'profilePhotoUrl' => $store->logo_url,
                    'coverUrl' => $store->cover_url,
                    'coverPhotoUrl' => $store->cover_url,
                    'facebookUrl' => $store->facebook_url,
                    'instagramUrl' => $store->instagram_url,
                    'tiktokUrl' => $store->tiktok_url,
                    'youtubeUrl' => $store->youtube_url,
                    'twitterUrl' => $store->twitter_url,
                    'telegramUrl' => $store->telegram_url,
                    'snapchatUrl' => $store->snapchat_url,
                    'websiteUrl' => $store->website_url,
                    'status' => $store->status,
                    'bio' => $store->bio,
                    'isOpen' => $store->status === 'active',
                    'checkoutEnabled' => $store->status === 'active' && (bool) ($store->checkout_enabled ?? true),
                    'defaultLanguage' => $store->default_language ?: 'ar',
                    'deliveryDays' => (int) ($store->delivery_time ?: 3),
                    'themeSettings' => is_string($store->theme_settings) ? json_decode($store->theme_settings) : $store->theme_settings,
                ],
                'products' => ProductResource::collection($products)->resolve(),
                'categories' => \App\Http\Resources\CategoryResource::collection($categories)->resolve(),
                'productTypes' => \App\Http\Resources\ProductTypeResource::collection($productTypes)->resolve(),
                'sections' => [
                    'featuredProducts' => ProductResource::collection($featuredProducts)->resolve(),
                    'bestSellers' => ProductResource::collection($bestSellers)->resolve(),
                    'trendingProducts' => ProductResource::collection($trendingProducts)->resolve(),
                    'categoriesWithCounts' => \App\Http\Resources\CategoryResource::collection($categories)->resolve(),
                    'lowStockProducts' => ProductResource::collection($lowStockProducts)->resolve(),
                    'trustSignals' => [
                        ['label' => 'Secure checkout', 'value' => 'Verified store'],
                        ['label' => 'Delivery', 'value' => ($store->delivery_time ?: 3) . ' days'],
                        ['label' => 'Support', 'value' => $store->whatsapp_number ? 'WhatsApp available' : 'Fast response'],
                    ],
                    'reviewsSummary' => [
                        'averageRating' => $ratingCount > 0 ? round($ratingTotal / $ratingCount, 2) : 0,
                        'reviewCount' => $ratingCount,
                    ],
                ],
            ]
        ]);
    }

    public function product(string $productId)
    {
        $product = Product::with(['store.user', 'media' => function($q) {
            $q->where('visibility', 'public')->whereNull('deleted_at');
        }, 'options', 'variants'])
        ->whereNull('deleted_at')
        ->where(function($q) {
            $q->where('is_active', true)->orWhere('status', 'active');
        })
        ->findOrFail($productId);

        // Check if owner is suspended
        if ($product->store->status !== 'active' || $product->store->user->status === 'suspended') {
            abort(403, 'Store owner is suspended');
        }

        $requestedStoreSlug = request()->query('storeSlug');
        if ($requestedStoreSlug && !in_array($requestedStoreSlug, array_filter([
            $product->store->slug,
            $product->store->subdomain,
            $product->store->custom_domain,
        ]), true)) {
            abort(404);
        }

        return response()->json([
            'success' => true,
            'data' => new ProductResource($product)
        ]);
    }
    public function settings()
    {
        $settings = DB::table('global_settings')->pluck('setting_value', 'setting_key');

        return response()->json([
            'success' => true,
            'data' => [
                'site_name' => $settings['site_name'] ?? 'Storify',
                'site_logo' => $settings['site_logo'] ?? null,
                'saas_contact_whatsapp' => $settings['saas_contact_whatsapp'] ?? null,
            ]
        ]);
    }

    public function submitOrder(Request $request)
    {
        Log::info('SubmitOrder request received', [
            'store_id' => $request->input('storeId'),
            'items_count' => is_array($request->input('items')) ? count($request->input('items')) : 0,
        ]);

        $request->validate([
            'storeId' => 'required',
            'buyerName' => 'required|string|max:255',
            'buyerPhone' => 'required|string|max:32',
            'governorate' => 'required|string',
            'district' => 'required|string',
            'items' => 'required|array|min:1',
            'items.*.productId' => 'required',
            'items.*.quantity' => 'required|integer|min:1|max:100',
            'items.*.options' => 'sometimes|array',
        ]);

        $store = Store::where('id', $request->storeId)
            ->whereNull('deleted_at')
            ->firstOrFail();
        Log::info('Store found', ['store_id' => $store->id]);

        $owner = $store->user;
        if (!$owner || ($owner->status ?? 'active') !== 'active') {
            return response()->json([
                'success' => false,
                'code' => 'STORE_UNAVAILABLE',
                'message' => 'The store is not currently accepting orders (Owner status).',
            ], 403);
        }

        if (($store->status ?? 'inactive') !== 'active' || !($store->checkout_enabled ?? true)) {
            return response()->json([
                'success' => false,
                'code' => 'STORE_CLOSED',
                'message' => 'The store is currently closed/inactive.',
            ], 403);
        }

        // Find or create buyer
        $riskService = app(CustomerRiskService::class);
        $globalCustomer = $riskService->ensureForPhone($request->buyerPhone);
        $buyer = Buyer::withoutGlobalScopes()->firstOrCreate(
            [
                'user_id' => $owner->id,
                'phone' => $riskService->normalizePhone($request->buyerPhone),
            ],
            [
                'name' => $request->buyerName,
                'global_customer_id' => $globalCustomer->id,
                'risk_level' => $globalCustomer->risk_level,
                'address' => [
                    'governorate' => $request->governorate,
                    'district' => $request->district,
                    'landmark' => $request->landmark,
                ],
            ]
        );
        $buyer->fill([
            'name' => $request->buyerName,
            'global_customer_id' => $globalCustomer->id,
            'risk_level' => $globalCustomer->risk_level,
            'address' => [
                'governorate' => $request->governorate,
                'district' => $request->district,
                'landmark' => $request->landmark,
            ],
        ])->save();
        Log::info('Buyer found/created', ['buyer_id' => $buyer->id]);

        if ($buyer->is_blacklisted) {
            Log::warning('Order blocked: Buyer is blacklisted', ['buyer_id' => $buyer->id]);
            return response()->json(['success' => false, 'error' => 'Order blocked'], 403);
        }

        try {
            $order = DB::transaction(function() use ($request, $store, $buyer, $globalCustomer) {
                $totalAmount = 0;
                $totalDeliveryFee = 0;
                $items = [];

                foreach ($request->items as $itemData) {
                    $product = Product::withoutGlobalScopes()
                        ->with(['variants'])
                        ->where('id', $itemData['productId'])
                        ->where('store_id', $store->id)
                        ->whereNull('deleted_at')
                        ->where(function($q) {
                            $q->where('is_active', true)->orWhere('status', 'active');
                        })
                        ->firstOrFail();
                    $qty = (int) $itemData['quantity'];

                    $price = (float) $product->price;
                    $itemOptions = $itemData['options'] ?? [];
                    $matchedVariant = null;

                    // Try to match variant
                    if ($product->variants->count() > 0 && !empty($itemOptions)) {
                        foreach ($product->variants as $variant) {
                            $variantOptions = is_string($variant->option_values) ? json_decode($variant->option_values, true) : $variant->option_values;

                            // Check if all variant options match the selected options
                            $match = true;
                            if (is_array($variantOptions)) {
                                foreach ($variantOptions as $optName => $optValue) {
                                    if (!isset($itemOptions[$optName]) || $itemOptions[$optName] !== $optValue) {
                                        $match = false;
                                        break;
                                    }
                                }
                            } else {
                                $match = false;
                            }

                            if ($match) {
                                $matchedVariant = $variant;
                                if ($variant->price_override !== null) {
                                    $price = (float) $variant->price_override;
                                }
                                break;
                            }
                        }
                    }

                    if ($product->variants->count() > 0) {
                        if (!$matchedVariant || !$matchedVariant->is_active || (int) $matchedVariant->stock_quantity < $qty) {
                            abort(response()->json([
                                'success' => false,
                                'code' => 'PRODUCT_OUT_OF_STOCK',
                                'message' => 'One of the selected product variants is unavailable.',
                                'details' => ['productId' => (string) $product->id],
                            ], 422));
                        }
                    }

                    $finalPrice = $price * (1 - ($product->discount ?? 0) / 100);
                    $totalAmount += $finalPrice * $qty;
                    $totalDeliveryFee += (float) ($product->delivery_fee ?? 0);

                    $items[] = [
                        'productId' => $product->id,
                        'quantity' => $qty,
                        'price' => $finalPrice,
                        'options' => $itemOptions
                    ];
                }

                $order = Order::create([
                    'store_id' => $store->id,
                    'buyer_id' => $buyer->id,
                    'global_customer_id' => $globalCustomer->id,
                    'status' => 'pending',
                    'customer_name' => $request->buyerName,
                    'customer_phone' => $request->buyerPhone,
                    'address_details' => $request->governorate . ' - ' . $request->district . ($request->landmark ? ' (' . $request->landmark . ')' : ''),
                    'buyer_notes' => $request->notes,
                    'total_amount' => $totalAmount + $totalDeliveryFee,
                    'cod_amount' => $totalAmount + $totalDeliveryFee,
                    'delivery_fee' => $totalDeliveryFee,
                    'alwaseet_sync_status' => 'pending',
                ]);

                foreach ($items as $item) {
                    OrderItem::create([
                        'order_id' => $order->id,
                        'product_id' => $item['productId'],
                        'quantity' => $item['quantity'],
                        'unit_price' => $item['price'],
                        'options' => $item['options']
                    ]);
                }

                $buyer->increment('total_orders');
                app(CustomerRiskService::class)->recordOrderCreated($order);

                return $order;
            });
            Log::info('Order created successfully', ['order_id' => $order->id]);
        } catch (\Exception $e) {
            if ($e instanceof \Illuminate\Http\Exceptions\HttpResponseException) {
                return $e->getResponse();
            }

            Log::error('Order creation failed: ' . $e->getMessage(), [
                'exception' => $e,
                'store_id' => $request->input('storeId'),
            ]);
            return response()->json([
                'success' => false,
                'code' => 'ORDER_CREATE_FAILED',
                'message' => 'Order failed'
            ], 500);
        }

        // Trigger notifications
        try {
            event(new \App\Events\OrderCreated($order));
        } catch (\Exception $e) {
            Log::error('Order notification error: ' . $e->getMessage());
        }

        return response()->json([
            'success' => true,
            'id' => $order->id,
            'data' => [
                'id' => (string) $order->id,
                'orderGroupId' => $order->group_id,
                'totalAmount' => (float) $order->total_amount,
                'deliveryFee' => (float) $order->delivery_fee,
            ],
        ]);
    }

    private function resolvePublicStore(string $identifier): Store
    {
        $host = request()->getHost();
        $domainStore = app(DomainTenantService::class)->resolveHost($host);

        $query = Store::query()
            ->where('status', 'active')
            ->whereNull('deleted_at');

        $store = $domainStore ?: (clone $query)
            ->where(function ($q) use ($identifier) {
                $q->where('slug', $identifier)
                    ->orWhere('subdomain', $identifier)
                    ->orWhere('custom_domain', $identifier);
            })
            ->firstOrFail();

        return $store;
    }
}
