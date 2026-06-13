<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\ProductType;
use App\Models\Store;
use App\Http\Resources\ProductTypeResource;

class ProductTypeController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $isAdmin = $user->role === 'admin';
        $ownerId = $user->parent_id ?: $user->id;

        $query = ProductType::withoutGlobalScopes();

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

        $types = $query->get();

        return ProductTypeResource::collection($types);
    }

    public function show(Request $request, $productType)
    {
        $user = $request->user();
        $ownerId = $user->parent_id ?: $user->id;
        $type = ProductType::withoutGlobalScopes()->with('store')->findOrFail($productType);

        if ($user->role !== 'admin' && $type->store_id && (int) $type->store->user_id !== (int) $ownerId) {
            return response()->json(['success' => false, 'error' => 'Access denied'], 403);
        }

        return new ProductTypeResource($type);
    }

    public function store(Request $request)
    {
        $request->validate([
            'storeId' => 'nullable|exists:stores,id',
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

        $type = ProductType::create([
            'store_id' => $storeId,
            'name' => $request->name,
            'slug' => $request->slug ?? str($request->name)->slug(),
            'schema' => $request->customFields ?? [],
            'is_active' => true,
        ]);

        return new ProductTypeResource($type);
    }

    public function update(Request $request, ProductType $productType)
    {
        $user = $request->user();
        $ownerId = $user->parent_id ?: $user->id;
        if ($user->role !== 'admin' && (!$productType->store_id || (int) $productType->store->user_id !== (int) $ownerId)) {
            return response()->json(['success' => false, 'error' => 'Access denied'], 403);
        }

        $productType->update([
            'name' => $request->name ?? $productType->name,
            'slug' => $request->slug ?? $productType->slug,
            'schema' => $request->customFields ?? $productType->schema,
            'is_active' => $request->isActive ?? $productType->is_active,
        ]);

        return new ProductTypeResource($productType);
    }

    public function destroy(Request $request, ProductType $productType)
    {
        $user = $request->user();
        if ($user->role === 'employee') {
            return response()->json(['success' => false, 'error' => 'Employees can edit categories but cannot delete them.'], 403);
        }

        $ownerId = $user->parent_id ?: $user->id;
        if ($user->role !== 'admin' && (!$productType->store_id || (int) $productType->store->user_id !== (int) $ownerId)) {
            return response()->json(['success' => false, 'error' => 'Access denied'], 403);
        }

        $productType->delete();
        return response()->json(['success' => true]);
    }
}
