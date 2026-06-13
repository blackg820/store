<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BuyerResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $address = is_array($this->address) ? $this->address : [];

        return [
            'id' => (string) $this->id,
            'name' => $this->name ?? '',
            'phone' => $this->phone ?? '',
            'email' => $this->email ?? '',
            'address' => $address,
            'governorate' => $address['governorate'] ?? '',
            'district' => $address['district'] ?? '',
            'landmark' => $address['landmark'] ?? '',
            'notes' => $this->notes ?? '',
            'globalCustomerId' => $this->global_customer_id ? (string) $this->global_customer_id : null,
            'riskLevel' => $this->globalCustomer?->risk_level ?? $this->risk_level ?? 'normal',
            'risk' => $this->globalCustomer?->risk_level ?? $this->risk_level ?? 'normal',
            'riskScore' => $this->globalCustomer?->risk_level ?? $this->risk_level ?? 'normal',
            'rejectionCount' => (int) ($this->globalCustomer?->rejection_count ?? $this->rejected_orders ?? 0),
            'totalRejections' => (int) ($this->globalCustomer?->total_rejections ?? $this->rejected_orders ?? 0),
            'isBlacklisted' => (bool) $this->is_blacklisted,
            'blacklistReason' => $this->blacklist_reason,
            'totalOrders' => (int) $this->total_orders,
            'createdAt' => $this->created_at?->toISOString(),
        ];
    }
}
