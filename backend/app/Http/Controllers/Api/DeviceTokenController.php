<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\DeviceTokenResource;
use App\Models\DeviceToken;
use App\Models\Store;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class DeviceTokenController extends Controller
{
    public function index(Request $request)
    {
        $query = DeviceToken::where('user_id', $request->user()->id)->latest();

        return $this->success(DeviceTokenResource::collection($query->get()), 'Device tokens loaded');
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'token' => 'required|string|min:16|max:4096',
            'platform' => ['required', Rule::in(['web', 'android', 'ios'])],
            'deviceName' => 'nullable|string|max:255',
            'appVersion' => 'nullable|string|max:100',
            'storeId' => 'nullable|integer|exists:stores,id',
            'store_id' => 'nullable|integer|exists:stores,id',
        ]);

        $storeId = $data['storeId'] ?? $data['store_id'] ?? null;
        if ($storeId && !$this->canAccessStore($request->user(), (int) $storeId)) {
            return $this->error('You do not have access to this store', 403);
        }

        $token = DeviceToken::updateOrCreate(
            ['token_hash' => hash('sha256', $data['token'])],
            [
                'user_id' => $request->user()->id,
                'store_id' => $storeId,
                'token' => $data['token'],
                'platform' => $data['platform'],
                'device_name' => $data['deviceName'] ?? null,
                'app_version' => $data['appVersion'] ?? null,
                'last_seen_at' => now(),
            ]
        );

        return $this->success(new DeviceTokenResource($token), 'Device token registered', 201);
    }

    public function destroy(Request $request, DeviceToken $deviceToken)
    {
        if ($deviceToken->user_id !== $request->user()->id && $request->user()->role !== 'admin') {
            return $this->error('Access denied', 403);
        }

        $deviceToken->delete();

        return $this->success(null, 'Device token removed');
    }

    private function canAccessStore($user, int $storeId): bool
    {
        if ($user->role === 'admin') {
            return true;
        }

        $ownerId = $user->parent_id ?: $user->id;

        return Store::where('id', $storeId)->where('user_id', $ownerId)->exists();
    }
}
