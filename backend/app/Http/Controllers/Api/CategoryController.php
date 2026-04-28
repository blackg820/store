<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Category;
use App\Models\Store;
use App\Http\Resources\CategoryResource;

class CategoryController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $isAdmin = $user->role === 'admin';

        $query = Category::query();

        if (!$isAdmin) {
            $query->whereHas('store', function($q) use ($user) {
                $q->where('user_id', $user->id);
            });
        }

        if ($request->has('store_id')) {
            $query->where('store_id', $request->store_id);
        }

        $categories = $query->get();

        return CategoryResource::collection($categories);
    }

    public function store(Request $request)
    {
        $request->validate([
            'storeId' => 'required|exists:stores,id',
            'name' => 'required|string|max:255',
        ]);

        $user = $request->user();
        $store = Store::findOrFail($request->storeId);

        if ($user->role !== 'admin' && $store->user_id !== $user->id) {
            return response()->json(['success' => false, 'error' => 'Access denied'], 403);
        }

        $category = Category::create([
            'store_id' => $store->id,
            'product_type_id' => $request->productTypeId,
            'parent_id' => $request->parentId,
            'name' => $request->name,
            'name_ar' => $request->nameAr ?? $request->name,
            'slug' => $request->slug ?? str($request->name)->slug(),
            'is_active' => true,
        ]);

        return new CategoryResource($category);
    }
}
