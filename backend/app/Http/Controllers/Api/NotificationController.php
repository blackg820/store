<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\NotificationResource;
use App\Models\DashboardNotification;
use App\Models\Store;
use Illuminate\Http\Request;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $data = $request->validate([
            'store_id' => 'sometimes|integer|exists:stores,id',
            'storeId' => 'sometimes|integer|exists:stores,id',
            'unread_only' => 'sometimes|boolean',
            'unreadOnly' => 'sometimes|boolean',
            'limit' => 'sometimes|integer|min:1|max:100',
            'page' => 'sometimes|integer|min:1',
        ]);

        $user = $request->user();
        $storeId = $data['store_id'] ?? $data['storeId'] ?? $request->header('X-Store-ID');
        $query = DashboardNotification::query()->latest();

        $this->scopeNotifications($query, $user, $storeId);

        if ($request->boolean('unread_only') || $request->boolean('unreadOnly')) {
            $query->whereNull('read_at');
        }

        $notifications = $query->paginate((int) ($data['limit'] ?? 20));

        return $this->success(NotificationResource::collection($notifications), 'Notifications loaded');
    }

    public function markRead(Request $request, DashboardNotification $notification)
    {
        if (!$this->canAccessNotification($request->user(), $notification)) {
            return $this->error('Access denied', 403);
        }

        $notification->forceFill(['read_at' => $notification->read_at ?? now()])->save();

        return $this->success(new NotificationResource($notification->fresh()), 'Notification marked as read');
    }

    public function unreadCount(Request $request)
    {
        $data = $request->validate([
            'store_id' => 'sometimes|integer|exists:stores,id',
            'storeId' => 'sometimes|integer|exists:stores,id',
        ]);

        $query = DashboardNotification::query()->whereNull('read_at');
        $this->scopeNotifications($query, $request->user(), $data['store_id'] ?? $data['storeId'] ?? $request->header('X-Store-ID'));

        return $this->success(['count' => $query->count()], 'Unread notification count loaded');
    }

    public function readAll(Request $request)
    {
        $data = $request->validate([
            'store_id' => 'sometimes|integer|exists:stores,id',
            'storeId' => 'sometimes|integer|exists:stores,id',
        ]);

        $query = DashboardNotification::query()->whereNull('read_at');
        $this->scopeNotifications($query, $request->user(), $data['store_id'] ?? $data['storeId'] ?? $request->header('X-Store-ID'));

        $updated = $query->update(['read_at' => now(), 'updated_at' => now()]);

        return $this->success(['updated' => $updated], 'Notifications marked as read');
    }

    private function scopeNotifications($query, $user, $storeId = null): void
    {
        if ($user->role === 'admin') {
            if ($storeId) {
                $query->where('store_id', (int) $storeId);
            }

            return;
        }

        $ownerId = $user->parent_id ?: $user->id;
        $ownedStoreIds = Store::where('user_id', $ownerId)->pluck('id');

        if ($storeId) {
            $storeId = (int) $storeId;
            if (!$ownedStoreIds->contains($storeId)) {
                $query->whereRaw('1 = 0');
                return;
            }

            $query->where('store_id', $storeId);
            return;
        }

        $query->where(function ($scope) use ($ownedStoreIds, $ownerId) {
            $scope->whereIn('store_id', $ownedStoreIds)
                ->orWhere('user_id', $ownerId);
        });
    }

    private function canAccessNotification($user, DashboardNotification $notification): bool
    {
        if ($user->role === 'admin') {
            return true;
        }

        $ownerId = $user->parent_id ?: $user->id;

        if ((int) $notification->user_id === (int) $ownerId) {
            return true;
        }

        return $notification->store_id
            && Store::where('id', $notification->store_id)->where('user_id', $ownerId)->exists();
    }
}
