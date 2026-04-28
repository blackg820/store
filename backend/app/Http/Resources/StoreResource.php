<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class StoreResource extends JsonResource
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
            'userId' => (string) $this->user_id,
            'name' => $this->name ?? '',
            'nameAr' => $this->name_ar ?? $this->name ?? '',
            'slug' => $this->slug ?? '',
            'whatsappNumber' => $this->whatsapp_number ?? '',
            'description' => $this->description ?? '',
            'descriptionAr' => $this->description_ar ?? '',
            'logoUrl' => $this->logo_url,
            'coverUrl' => $this->cover_url,
            'deliveryDays' => (int) ($this->delivery_time ?? 3),
            'telegramToken' => $this->telegram_token ?? '',
            'telegramChatId' => $this->telegram_chat_id,
            'telegramUserId' => $this->telegram_user_id,
            'telegramGroupId' => $this->telegram_group_id,
            'themeSettings' => $this->theme_settings ?? [
                'primaryColor' => '#2563eb',
                'accentColor' => '#3b82f6',
                'backgroundColor' => '#ffffff',
                'fontFamily' => 'Inter',
                'themeName' => 'Default'
            ],
            'notificationSettings' => $this->notification_settings ?? [
                'newOrders' => true,
                'orderConfirmations' => true,
                'statusChanges' => true,
                'riskAlerts' => true,
                'notificationMethod' => 'telegram'
            ],
            'optionPresets' => $this->option_presets ?? [],
            'isActive' => $this->status === 'active',
            'productCount' => (int) ($this->products_count ?? 0),
            'storageUsage' => (int) ($this->storage_usage ?? 0),
            'createdAt' => $this->created_at?->toISOString(),
        ];
    }
}
