<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductTypeResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'storeId' => $this->store_id ? (string) $this->store_id : null,
            'name' => $this->name ?? '',
            'slug' => $this->slug ?? '',
            'customFields' => $this->schema ?? [],
            'isActive' => (bool) $this->is_active,
        ];
    }
}
