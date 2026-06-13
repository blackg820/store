<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductVariantResource extends JsonResource
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
            'title' => $this->title,
            'sku' => $this->sku,
            'priceOverride' => (float) $this->price_override,
            'stockQuantity' => (int) $this->stock_quantity,
            'optionValues' => $this->option_values,
            'combination' => $this->option_values ?: (object) [],
            'price' => (float) ($this->price_override ?? $this->product?->price ?? 0),
            'stock' => (int) $this->stock_quantity,
            'imageId' => $this->image_id,
            'isActive' => (bool) $this->is_active,
        ];
    }
}
