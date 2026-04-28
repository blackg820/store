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
            'productTypeId' => (string) $this->product_type_id,
            'parentId' => $this->parent_id ? (string) $this->parent_id : null,
            'name' => $this->name ?? '',
            'nameAr' => $this->name_ar ?? $this->name ?? '',
            'slug' => $this->slug ?? '',
            'isActive' => (bool) $this->is_active,
        ];
    }
}
