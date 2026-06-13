<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class NotificationResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $metadata = is_array($this->metadata) ? $this->metadata : [];

        return [
            'id' => (string) $this->id,
            'type' => $this->type,
            'title' => $this->title,
            'body' => $this->body,
            'severity' => $this->severity ?? ($metadata['severity'] ?? 'info'),
            'storeId' => $this->store_id ? (string) $this->store_id : null,
            'orderId' => $this->order_id ? (string) $this->order_id : null,
            'readAt' => $this->read_at?->toISOString(),
            'createdAt' => $this->created_at?->toISOString(),
            'actionRoute' => $this->action_route ?? ($metadata['actionRoute'] ?? null),
            'metadata' => $this->safeMetadata($metadata),
        ];
    }

    private function safeMetadata($metadata): array
    {
        $metadata = is_array($metadata) ? $metadata : [];
        $blocked = ['token', 'botToken', 'telegramToken', 'apiKey', 'secret', 'password', 'raw', 'providerResponse'];

        foreach ($blocked as $key) {
            unset($metadata[$key]);
        }

        return $metadata;
    }
}
