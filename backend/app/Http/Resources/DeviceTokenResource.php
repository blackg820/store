<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class DeviceTokenResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'storeId' => $this->store_id ? (string) $this->store_id : null,
            'platform' => $this->platform,
            'deviceName' => $this->device_name,
            'appVersion' => $this->app_version,
            'lastSeenAt' => $this->last_seen_at?->toISOString(),
            'createdAt' => $this->created_at?->toISOString(),
        ];
    }
}
