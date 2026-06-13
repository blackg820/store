<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Buyer;
use App\Http\Resources\BuyerResource;
use Illuminate\Validation\Rule;

class BuyerController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        if ($user->role === 'employee') {
            return $this->error('Employees can only manage products and categories.', 403, null, 'PERMISSION_DENIED');
        }

        $isAdmin = $user->role === 'admin';

        $query = Buyer::query();

        // Phone lookup (exact match)
        if ($request->has('phone')) {
            $query->where('phone', $request->phone);
        }

        // Tenant isolation via orders
        if (!$isAdmin) {
            $ownerId = $user->parent_id ?: $user->id;
            $query->where(function ($scope) use ($ownerId) {
                $scope->where('user_id', $ownerId)
                    ->orWhereHas('orders.store', function($q) use ($ownerId) {
                        $q->where('user_id', $ownerId);
                    });
            });
        }

        if ($request->has('risk_level')) {
            $query->where('risk_level', $request->risk_level);
        }

        if ($request->has('blacklisted')) {
            $query->where('is_blacklisted', $request->blacklisted === 'true' ? 1 : 0);
        }

        $buyers = $query->orderBy('created_at', 'desc')->paginate($request->limit ?? 10);

        return $this->success(BuyerResource::collection($buyers), 'Buyers loaded');
    }

    public function store(Request $request)
    {
        if ($request->user()?->role === 'employee') {
            return $this->error('Employees can only manage products and categories.', 403, null, 'PERMISSION_DENIED');
        }
        if ($this->isReadOnlyRole($request->user())) {
            return $this->readOnlyDenied();
        }

        $user = $request->user();
        $ownerId = $user->role === 'admin' && $request->filled('userId')
            ? (int) $request->input('userId')
            : (int) ($user->parent_id ?: $user->id);

        $request->validate([
            'userId' => 'sometimes|integer|exists:users,id',
            'phone' => [
                'required',
                'string',
                Rule::unique('buyers', 'phone')->where(fn ($query) => $query->where('user_id', $ownerId)),
            ],
            'name' => 'required|string',
        ]);

        $address = [
            'governorate' => $request->governorate ?? '',
            'district' => $request->district ?? '',
            'landmark' => $request->landmark ?? '',
        ];

        $buyer = Buyer::create([
            'user_id' => $ownerId,
            'phone' => $request->phone,
            'name' => $request->name,
            'address' => $address,
            'risk_level' => 'low',
            'is_blacklisted' => false,
            'total_orders' => 0,
            'rejected_orders' => 0,
        ]);

        return $this->success(new BuyerResource($buyer), 'Buyer created successfully', 201);
    }

    public function show(Buyer $buyer)
    {
        $user = auth()->user();
        if ($user->role === 'employee') {
            return $this->error('Employees can only manage products and categories.', 403, null, 'PERMISSION_DENIED');
        }

        $isAdmin = $user->role === 'admin';

        if (!$isAdmin) {
            $ownerId = $user->parent_id ?: $user->id;
            $ownsOrder = $buyer->orders()->whereHas('store', function($q) use ($ownerId) {
                $q->where('user_id', $ownerId);
            })->exists();

            if ((int) $buyer->user_id !== (int) $ownerId && !$ownsOrder) {
                return $this->tenantDenied();
            }

            }

        return $this->success(new BuyerResource($buyer), 'Buyer loaded');
    }

    public function update(Request $request, Buyer $buyer)
    {
        if (!$this->canManageBuyer($request->user(), $buyer)) {
            return $this->isReadOnlyRole($request->user()) ? $this->readOnlyDenied() : $this->tenantDenied();
        }

        $ownerId = $buyer->user_id ?: ($request->user()->parent_id ?: $request->user()->id);
        $data = $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'phone' => [
                'sometimes',
                'required',
                'string',
                'max:30',
                Rule::unique('buyers', 'phone')->where(fn ($query) => $query->where('user_id', $ownerId))->ignore($buyer->id),
            ],
            'email' => 'nullable|email|max:255',
            'notes' => 'nullable|string|max:5000',
            'riskScore' => 'nullable|string|in:low,medium,high',
            'risk' => 'nullable|string|in:low,medium,high',
            'governorate' => 'nullable|string|max:255',
            'district' => 'nullable|string|max:255',
            'landmark' => 'nullable|string|max:255',
            'address' => 'nullable|array',
        ]);

        $address = $data['address'] ?? $buyer->address ?? [];
        if (array_key_exists('governorate', $data) || array_key_exists('district', $data) || array_key_exists('landmark', $data)) {
            $address = array_merge(is_array($address) ? $address : [], [
                'governorate' => $data['governorate'] ?? ($address['governorate'] ?? ''),
                'district' => $data['district'] ?? ($address['district'] ?? ''),
                'landmark' => $data['landmark'] ?? ($address['landmark'] ?? ''),
            ]);
        }

        $buyer->update([
            'name' => $data['name'] ?? $buyer->name,
            'phone' => $data['phone'] ?? $buyer->phone,
            'email' => array_key_exists('email', $data) ? $data['email'] : $buyer->email,
            'notes' => array_key_exists('notes', $data) ? $data['notes'] : $buyer->notes,
            'risk_level' => $data['riskScore'] ?? $data['risk'] ?? $buyer->risk_level,
            'address' => $address,
        ]);

        return $this->success(new BuyerResource($buyer->fresh()), 'Buyer updated successfully');
    }

    public function blacklist(Request $request, Buyer $buyer)
    {
        if (!$this->canManageBuyer($request->user(), $buyer)) {
            return $this->isReadOnlyRole($request->user()) ? $this->readOnlyDenied() : $this->tenantDenied();
        }

        $data = $request->validate([
            'blacklistReason' => 'nullable|string|max:2000',
            'reason' => 'nullable|string|max:2000',
        ]);

        $buyer->update([
            'is_blacklisted' => true,
            'blacklist_reason' => $data['blacklistReason'] ?? $data['reason'] ?? null,
        ]);

        return $this->success(new BuyerResource($buyer->fresh()), 'Buyer blacklisted successfully');
    }

    public function unblacklist(Request $request, Buyer $buyer)
    {
        if (!$this->canManageBuyer($request->user(), $buyer)) {
            return $this->isReadOnlyRole($request->user()) ? $this->readOnlyDenied() : $this->tenantDenied();
        }

        $buyer->update([
            'is_blacklisted' => false,
            'blacklist_reason' => null,
        ]);

        return $this->success(new BuyerResource($buyer->fresh()), 'Buyer removed from blacklist');
    }

    private function canManageBuyer($user, Buyer $buyer): bool
    {
        if (!$user || $user->role === 'employee' || $this->isReadOnlyRole($user)) {
            return false;
        }

        if ($user->role === 'admin') {
            return true;
        }

        $ownerId = $user->parent_id ?: $user->id;

        if ((int) $buyer->user_id === (int) $ownerId) {
            return true;
        }

        return $buyer->orders()->whereHas('store', function ($query) use ($ownerId) {
            $query->where('user_id', $ownerId);
        })->exists();
    }
}
