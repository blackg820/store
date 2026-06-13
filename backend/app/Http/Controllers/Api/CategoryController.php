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
        $ownerId = $user->parent_id ?: $user->id;

        $query = Category::withoutGlobalScopes();

        if (!$isAdmin) {
            $query->where(function($q) use ($ownerId) {
                $q->whereHas('store', function($sq) use ($ownerId) {
                    $sq->where('user_id', $ownerId);
                })->orWhereNull('store_id');
            });
        }

        if ($request->has('store_id')) {
            $query->where('store_id', $request->store_id);
        }

        $categories = $query->get();

        return CategoryResource::collection($categories);
    }

    public function show(Request $request, $category)
    {
        $user = $request->user();
        $ownerId = $user->parent_id ?: $user->id;
        $category = Category::withoutGlobalScopes()->with('store')->findOrFail($category);

        if ($user->role !== 'admin' && $category->store_id && (int) $category->store->user_id !== (int) $ownerId) {
            return response()->json(['success' => false, 'error' => 'Access denied'], 403);
        }

        return new CategoryResource($category);
    }

    public function store(Request $request)
    {
        $request->validate([
            'storeId' => 'nullable|exists:stores,id',
            'productTypeId' => 'nullable|exists:product_types,id',
            'parentId' => 'nullable|exists:categories,id',
            'name' => 'required|string|max:255',
        ]);

        $user = $request->user();
        $ownerId = $user->parent_id ?: $user->id;
        $storeId = $request->storeId;

        if ($storeId) {
            $store = Store::findOrFail($storeId);
            if ($user->role !== 'admin' && (int) $store->user_id !== (int) $ownerId) {
                return response()->json(['success' => false, 'error' => 'Access denied'], 403);
            }
        } elseif ($user->role !== 'admin') {
            return response()->json(['success' => false, 'error' => 'Store ID is required for non-admins'], 400);
        }

        $category = Category::create([
            'store_id' => $storeId,
            'product_type_id' => $request->productTypeId,
            'parent_id' => $request->parentId,
            'name' => $request->name,
            'slug' => $request->slug ?? str($request->name)->slug(),
            'is_active' => true,
        ]);

        return new CategoryResource($category);
    }

    public function update(Request $request, Category $category)
    {
        $user = $request->user();
        $ownerId = $user->parent_id ?: $user->id;
        if ($user->role !== 'admin' && (!$category->store_id || (int) $category->store->user_id !== (int) $ownerId)) {
            return response()->json(['success' => false, 'error' => 'Access denied'], 403);
        }

        $category->update([
            'product_type_id' => $request->productTypeId ?? $category->product_type_id,
            'parent_id' => $request->parentId ?? $category->parent_id,
            'name' => $request->name ?? $category->name,
            'slug' => $request->slug ?? $category->slug,
            'is_active' => $request->isActive ?? $category->is_active,
        ]);

        return new CategoryResource($category);
    }

    public function destroy(Request $request, Category $category)
    {
        $user = $request->user();
        if ($user->role === 'employee') {
            return response()->json(['success' => false, 'error' => 'Employees can edit categories but cannot delete them.'], 403);
        }

        $ownerId = $user->parent_id ?: $user->id;
        if ($user->role !== 'admin' && (!$category->store_id || (int) $category->store->user_id !== (int) $ownerId)) {
            return response()->json(['success' => false, 'error' => 'Access denied'], 403);
        }

        $category->delete();
        return response()->json(['success' => true]);
    }
}
