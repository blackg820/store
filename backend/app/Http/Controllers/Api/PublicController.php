<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Store;
use App\Models\Product;
use App\Models\Category;
use Illuminate\Support\Facades\DB;

class PublicController extends Controller
{
    public function store(string $slug)
    {
        $store = Store::where('slug', $slug)
            ->where('status', 'active')
            ->whereNull('deleted_at')
            ->firstOrFail();

        // Check if owner is suspended
        if ($store->user->status === 'suspended') {
            abort(403, 'Store owner is suspended');
        }

        // Subscription check (optional based on your business logic)
        // if ($store->user->mode === 'controlled' && ...)

        $products = Product::where('store_id', $store->id)
            ->whereNull('deleted_at')
            ->with(['category', 'productType', 'media' => function($q) {
                $q->where('visibility', 'public')->whereNull('deleted_at');
            }])
            ->orderBy('created_at', 'DESC')
            ->get();

        return response()->json([
            'success' => true,
            'data' => [
                'store' => [
                    'id' => (string) $store->id,
                    'name' => $store->name,
                    'nameAr' => $store->name_ar ?: $store->name,
                    'slug' => $store->slug,
                    'whatsappNumber' => $store->whatsapp_number,
                    'description' => $store->description,
                    'descriptionAr' => $store->description_ar ?: $store->description,
                    'currency' => $store->base_currency,
                    'logoUrl' => $store->logo_url,
                    'coverUrl' => $store->cover_url,
                    'defaultLanguage' => $store->default_language ?: 'ar',
                    'deliveryDays' => (int) ($store->delivery_time ?: 3),
                    'themeSettings' => is_string($store->theme_settings) ? json_decode($store->theme_settings) : $store->theme_settings,
                ],
                'products' => $products->map(function($p) {
                    return [
                        'id' => (string) $p->id,
                        'sku' => $p->sku ?: '',
                        'title' => $p->title,
                        'titleAr' => $p->title_ar ?: $p->title,
                        'description' => $p->description ?: '',
                        'descriptionAr' => $p->description_ar ?: $p->description,
                        'price' => (float) $p->price,
                        'discount' => (float) ($p->discount ?: 0),
                        'deliveryFee' => (float) ($p->delivery_fee ?: 0),
                        'category' => $p->category?->name,
                        'productType' => $p->productType?->name,
                        'media' => $p->media->map(function($m) {
                            return [
                                'id' => (string) $m->id,
                                'url' => $m->url,
                                'type' => $m->type,
                            ];
                        }),
                    ];
                }),
            ]
        ]);
    }

    public function product(string $productId)
    {
        $product = Product::with(['store', 'media' => function($q) {
            $q->where('visibility', 'public')->whereNull('deleted_at');
        }])
        ->whereNull('deleted_at')
        ->findOrFail($productId);

        return response()->json([
            'success' => true,
            'data' => [
                'id' => (string) $product->id,
                'title' => $product->title,
                'titleAr' => $product->title_ar ?: $product->title,
                'description' => $product->description,
                'descriptionAr' => $product->description_ar ?: $product->description,
                'price' => (float) $product->price,
                'store' => [
                    'name' => $product->store->name,
                    'nameAr' => $product->store->name_ar ?: $product->store->name,
                    'logoUrl' => $product->store->logo_url,
                ],
                'imageUrl' => $product->media->firstWhere('type', 'image')?->url ?: $product->store->logo_url,
            ]
        ]);
    }
}
