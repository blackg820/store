<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'storeId' => (string) $this->store_id,
            'buyerId' => (string) $this->buyer_id,
            'status' => $this->status ?? 'pending',
            'totalAmount' => (float) ($this->total_amount ?? 0),
            'deliveryFee' => (float) ($this->delivery_fee ?? 0),
            'notes' => $this->internal_notes ?? '',
            'createdAt' => $this->created_at?->toISOString(),
            'store' => [
                'name' => $this->store->name ?? 'Store',
            ],
            'buyer' => [
                'name' => $this->buyer->name ?? 'Buyer',
            ],
            'items' => [], // To be populated if needed
        ];
    }
}
