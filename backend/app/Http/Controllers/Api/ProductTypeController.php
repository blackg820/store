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

        $query = ProductType::query();

        if (!$isAdmin) {
            $query->where(function($q) use ($user) {
                $q->whereHas('store', function($sq) use ($user) {
                    $sq->where('user_id', $user->id);
                })->orWhereNull('store_id');
            });
        }

        if ($request->has('store_id')) {
            $query->where('store_id', $request->store_id);
        }

        $types = $query->get();

        return ProductTypeResource::collection($types);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
        ]);

        $user = $request->user();
        $storeId = $request->storeId;

        if ($storeId) {
            $store = Store::findOrFail($storeId);
            if ($user->role !== 'admin' && $store->user_id !== $user->id) {
                return response()->json(['success' => false, 'error' => 'Access denied'], 403);
            }
        } elseif ($user->role !== 'admin') {
            return response()->json(['success' => false, 'error' => 'Store ID is required for non-admins'], 400);
        }

        $type = ProductType::create([
            'store_id' => $storeId,
            'name' => $request->name,
            'name_ar' => $request->nameAr ?? $request->name,
            'slug' => $request->slug ?? str($request->name)->slug(),
            'schema' => $request->customFields ?? [],
            'is_active' => true,
        ]);

        return new ProductTypeResource($type);
    }
}
