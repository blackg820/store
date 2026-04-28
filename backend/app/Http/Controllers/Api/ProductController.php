<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Product;
use App\Models\Store;
use App\Http\Resources\ProductResource;
use Illuminate\Support\Facades\DB;

class ProductController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $isAdmin = $user->role === 'admin';

        $query = Product::with(['media', 'store', 'productType', 'category']);

        if (!$isAdmin) {
            $query->whereHas('store', function($q) use ($user) {
                $q->where('user_id', $user->id);
            });
        }

        if ($request->has('store_id')) {
            $query->where('store_id', $request->store_id);
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

        return ProductResource::collection($products);
    }

    public function store(Request $request)
    {
        $request->validate([
            'storeId' => 'required|exists:stores,id',
            'title' => 'required|string',
            'price' => 'required|numeric',
        ]);

        $user = $request->user();
        $store = Store::findOrFail($request->storeId);

        if ($user->role !== 'admin' && $store->user_id !== $user->id) {
            return response()->json(['success' => false, 'error' => 'Access denied'], 403);
        }

        // Logic for product creation...
        // This is where we'd add plan limit checks etc.

        $product = DB::transaction(function() use ($request, $store) {
            $product = Product::create([
                'store_id' => $store->id,
                'sku' => $request->sku,
                'product_code' => 'P-' . strtoupper(bin2hex(random_bytes(3))),
                'product_type_id' => $request->productTypeId,
                'category_id' => $request->categoryId,
                'title' => $request->title,
                'title_ar' => $request->titleAr ?? $request->title,
                'title_ku' => $request->titleKu ?? $request->title,
                'description' => $request->description ?? '',
                'description_ar' => $request->descriptionAr ?? '',
                'description_ku' => $request->descriptionKu ?? '',
                'price' => $request->price,
                'cost_price' => $request->costPrice ?? 0,
                'discount' => $request->discount ?? 0,
                'delivery_fee' => $request->deliveryFee ?? 0,
                'needs_deposit' => $request->needsDeposit ?? false,
                'deposit_amount' => $request->depositAmount ?? 0,
                'custom_data' => $request->customData,
                'is_active' => true,
            ]);

            // Save options, variants, media... (omitted for brevity in this step, but should be implemented)
            
            return $product;
        });

        return new ProductResource($product);
    }
}
