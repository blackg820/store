<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
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
            'productTypeId' => (string) $this->product_type_id,
            'categoryId' => $this->category_id ? (string) $this->category_id : null,
            'sku' => $this->sku ?? '',
            'title' => $this->title ?? '',
            'titleAr' => $this->title_ar ?? $this->title ?? '',
            'titleKu' => $this->title_ku ?? $this->title ?? '',
            'description' => $this->description ?? '',
            'descriptionAr' => $this->description_ar ?? '',
            'descriptionKu' => $this->description_ku ?? '',
            'price' => (float) ($this->price ?? 0),
            'costPrice' => (float) ($this->cost_price ?? 0),
            'discount' => (float) ($this->discount ?? 0),
            'deliveryFee' => (float) ($this->delivery_fee ?? 0),
            'needsDeposit' => (bool) ($this->needs_deposit ?? false),
            'depositAmount' => (float) ($this->deposit_amount ?? 0),
            'isActive' => $this->is_active || $this->status === 'active',
            'createdAt' => $this->created_at?->toISOString(),
            'updatedAt' => $this->updated_at?->toISOString(),
            'customData' => $this->custom_data ?? [],
            'media' => $this->media ?? [],
        ];
    }
}
