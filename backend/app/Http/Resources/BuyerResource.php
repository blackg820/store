<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BuyerResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'name' => $this->name ?? '',
            'phone' => $this->phone ?? '',
            'email' => $this->email ?? '',
            'risk' => $this->risk_level ?? 'low',
            'isBlacklisted' => (bool) $this->is_blacklisted,
            'totalOrders' => (int) $this->total_orders,
            'createdAt' => $this->created_at?->toISOString(),
        ];
    }
}
