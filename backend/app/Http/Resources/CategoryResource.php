<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CategoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'storeId' => $this->store_id ? (string) $this->store_id : null,
            'productTypeId' => $this->product_type_id ? (string) $this->product_type_id : null,
            'parentId' => $this->parent_id ? (string) $this->parent_id : null,
            'name' => $this->name ?? '',
            'slug' => $this->slug ?? '',
            'isActive' => (bool) $this->is_active,
            'productsCount' => (int) ($this->products_count ?? 0),
        ];
    }
}
