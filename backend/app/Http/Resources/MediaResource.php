<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class MediaResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $metadata = is_array($this->metadata) ? $this->metadata : [];

        return [
            'id' => (string) $this->id,
            'storeId' => $this->store_id ? (string) $this->store_id : null,
            'productId' => $this->product_id ? (string) $this->product_id : null,
            'url' => $this->url,
            'thumbnailUrl' => $this->thumbnail_url,
            'type' => $this->type,
            'mime' => $this->mime_type ?? ($metadata['mime'] ?? null),
            'size' => (int) ($this->file_size ?? 0),
            'width' => $this->width ?? ($metadata['width'] ?? null),
            'height' => $this->height ?? ($metadata['height'] ?? null),
            'sortOrder' => (int) ($this->sort_order ?? 0),
            'isPrimary' => (bool) $this->is_main,
            'isMain' => (bool) $this->is_main,
            'storageProvider' => $this->storage_provider,
            'createdAt' => $this->created_at?->toISOString(),
        ];
    }
}
