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
            'slug' => $this->slug ?? '',
            'subdomain' => $this->subdomain,
            'customDomain' => $this->custom_domain,
            'domainVerifiedAt' => $this->domain_verified_at?->toISOString(),
            'domainStatus' => $this->custom_domain ? ($this->domain_verified_at ? 'verified' : 'pending') : null,
            'currency' => $this->base_currency ?? 'IQD',
            'whatsappNumber' => $this->whatsapp_number ?? '',
            'description' => $this->description ?? '',
            'bio' => $this->bio ?? '',
            'profileDescription' => $this->bio ?? $this->description ?? '',
            'defaultLanguage' => $this->default_language ?? $this->base_language ?? 'ar',
            'logoUrl' => $this->logo_url,
            'coverUrl' => $this->cover_url,
            'facebookUrl' => $this->facebook_url ?? '',
            'instagramUrl' => $this->instagram_url ?? '',
            'tiktokUrl' => $this->tiktok_url ?? '',
            'youtubeUrl' => $this->youtube_url ?? '',
            'twitterUrl' => $this->twitter_url ?? '',
            'telegramUrl' => $this->telegram_url ?? '',
            'snapchatUrl' => $this->snapchat_url ?? '',
            'websiteUrl' => $this->website_url ?? '',
            'deliveryDays' => (int) ($this->delivery_time ?? 3),
            'telegramChatId' => $this->telegram_chat_id,
            'telegramUserId' => $this->telegram_user_id,
            'telegramGroupId' => $this->telegram_group_id,
            'telegramChannelId' => $this->telegram_channel_id,
            'messageThreadId' => $this->telegram_message_thread_id,
            'telegramMessageThreadId' => $this->telegram_message_thread_id,
            'telegramAutoPost' => (bool) ($this->telegram_auto_post ?? false),
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
            'status' => $this->status ?? 'active',
            'isOpen' => ($this->status ?? 'active') === 'active',
            'checkoutEnabled' => (bool) ($this->checkout_enabled ?? true),
            'isActive' => $this->status === 'active',
            'productCount' => (int) ($this->products_count ?? 0),
            'storageUsage' => (int) ($this->storage_usage ?? 0),
            'createdAt' => $this->created_at?->toISOString(),
        ];
    }
}
