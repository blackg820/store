<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class UserResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'name' => $this->name,
            'email' => $this->email,
            'role' => $this->role,
            'permissions' => $this->permissionsForRole($this->role),
            'mode' => $this->mode ?? 'controlled',
            'status' => $this->status ?? 'active',
            'parentId' => $this->parent_id ? (string) $this->parent_id : null,
            'subscriptionPlan' => $this->subscription_plan,
            'subscriptionStatus' => $this->activeSubscription?->status,
            'isActive' => ($this->status ?? 'active') === 'active',
            'subscription' => new SubscriptionResource($this->activeSubscription),
            'userLimit' => $this->whenLoaded('userLimit', fn () => [
                'limits' => $this->userLimit?->limits ?? [],
                'pricing' => $this->userLimit?->pricing ?? [],
                'basePriceCents' => (int) ($this->userLimit?->base_price_cents ?? 0),
                'totalPriceCents' => (int) ($this->userLimit?->total_price_cents ?? 0),
                'currency' => $this->userLimit?->currency ?? 'USD',
            ]),
            'createdAt' => $this->created_at?->toISOString(),
            'updatedAt' => $this->updated_at?->toISOString(),
        ];
    }

    private function permissionsForRole(?string $role): array
    {
        return match ($role) {
            'admin' => ['platform.manage', 'stores.manage', 'catalog.manage', 'orders.manage', 'buyers.manage', 'media.manage', 'billing.manage', 'telegram.manage'],
            'store_owner' => ['stores.manage', 'catalog.manage', 'orders.manage', 'buyers.manage', 'media.manage', 'billing.view', 'telegram.manage'],
            'employee' => ['catalog.manage', 'orders.view'],
            'support' => ['stores.view', 'catalog.view', 'orders.view', 'buyers.view', 'notifications.view'],
            'viewer' => ['stores.view', 'catalog.view', 'orders.view', 'buyers.view', 'notifications.view'],
            default => ['dashboard.view'],
        };
    }
}
