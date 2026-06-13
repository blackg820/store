<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductOptionResource extends JsonResource
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
            'name' => $this->name,
            'values' => $this->values_json ?: [],
            'swatches' => $this->swatches_json ?: (object) [],
            'type' => $this->type ?: 'choice',
            'position' => (int) $this->position,
        ];
    }
}
