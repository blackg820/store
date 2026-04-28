<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Buyer;
use App\Http\Resources\BuyerResource;
use Illuminate\Support\Facades\DB;

class BuyerController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $isAdmin = $user->role === 'admin';

        $query = Buyer::query();

        // Phone lookup (exact match)
        if ($request->has('phone')) {
            $query->where('phone', $request->phone);
        }

        // Tenant isolation via orders
        if (!$isAdmin) {
            $query->whereHas('orders.store', function($q) use ($user) {
                $q->where('user_id', $user->id);
            });
        }

        if ($request->has('risk_level')) {
            $query->where('risk_level', $request->risk_level);
        }

        if ($request->has('blacklisted')) {
            $query->where('is_blacklisted', $request->blacklisted === 'true' ? 1 : 0);
        }

        $buyers = $query->orderBy('created_at', 'desc')->paginate($request->limit ?? 10);

        return BuyerResource::collection($buyers);
    }

    public function store(Request $request)
    {
        $request->validate([
            'phone' => 'required|string|unique:buyers,phone',
            'name' => 'required|string',
        ]);

        $address = [
            'governorate' => $request->governorate ?? '',
            'district' => $request->district ?? '',
            'landmark' => $request->landmark ?? '',
        ];

        $buyer = Buyer::create([
            'phone' => $request->phone,
            'name' => $request->name,
            'address' => $address,
            'risk_level' => 'low',
            'is_blacklisted' => false,
            'total_orders' => 0,
            'rejected_orders' => 0,
        ]);

        return new BuyerResource($buyer);
    }

    public function show(Buyer $buyer)
    {
        $user = auth()->user();
        $isAdmin = $user->role === 'admin';

        if (!$isAdmin) {
            $ownsOrder = $buyer->orders()->whereHas('store', function($q) use ($user) {
                $q->where('user_id', $user->id);
            })->exists();

            if (!$ownsOrder) {
                return response()->json(['success' => false, 'error' => 'Access denied'], 403);
            }
        }

        return new BuyerResource($buyer);
    }
}
