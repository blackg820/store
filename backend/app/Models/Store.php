<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Store extends Model
{
    use HasFactory, SoftDeletes, \App\Traits\UserOwned;

    protected $fillable = [
        'user_id',
        'name',
        'slug',
        'subdomain',
        'custom_domain',
        'domain_verified_at',
        'whatsapp_number',
        'description',
        'bio',
        'default_language',
        'logo_url',
        'cover_url',
        'facebook_url',
        'instagram_url',
        'tiktok_url',
        'youtube_url',
        'twitter_url',
        'telegram_url',
        'snapchat_url',
        'website_url',
        'status',
        'checkout_enabled',
        'base_currency',
        'base_language',
        'theme_settings',
        'notification_settings',
        'option_presets',
        'delivery_time',
        'telegram_token',
        'telegram_user_id',
        'telegram_group_id',
        'telegram_chat_id',
        'telegram_channel_id',
        'telegram_message_thread_id',
        'telegram_auto_post',
        'alwaseet_username',
        'alwaseet_password',
        'alwaseet_token',
        'alwaseet_token_expires_at',
        'alwaseet_enabled',
    ];

    protected $casts = [
        'theme_settings' => 'json',
        'notification_settings' => 'json',
        'option_presets' => 'json',
        'alwaseet_username' => 'encrypted',
        'alwaseet_password' => 'encrypted',
        'alwaseet_token' => 'encrypted',
        'alwaseet_token_expires_at' => 'datetime',
        'alwaseet_enabled' => 'boolean',
        'checkout_enabled' => 'boolean',
        'telegram_auto_post' => 'boolean',
        'domain_verified_at' => 'datetime',
    ];

    protected $hidden = [
        'telegram_token',
        'alwaseet_username',
        'alwaseet_password',
        'alwaseet_token',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function products()
    {
        return $this->hasMany(Product::class);
    }

    public function orders()
    {
        return $this->hasMany(Order::class);
    }

    public function media()
    {
        return $this->hasMany(Media::class);
    }

    public function notificationSubscriptions()
    {
        return $this->hasMany(CustomerNotificationSubscription::class);
    }

    public function notificationCampaigns()
    {
        return $this->hasMany(CustomerNotificationCampaign::class);
    }

    // ─────────────────────────────────────────────────────────────────────────
    //  AlWaseet Helpers
    // ─────────────────────────────────────────────────────────────────────────

    public function hasAlWaseetCredentials(): bool
    {
        return $this->alwaseet_enabled
            && filled($this->alwaseet_username)
            && filled($this->alwaseet_password);
    }

    public function hasValidAlWaseetToken(): bool
    {
        return filled($this->alwaseet_token)
            && $this->alwaseet_token_expires_at !== null
            && $this->alwaseet_token_expires_at->isFuture();
    }

    public function storeAlWaseetToken(string $token, int $ttlSeconds = 43200): void
    {
        $this->update([
            'alwaseet_token'            => $token,
            'alwaseet_token_expires_at' => now()->addSeconds($ttlSeconds),
        ]);
    }

    public function clearAlWaseetToken(): void
    {
        $this->update([
            'alwaseet_token'            => null,
            'alwaseet_token_expires_at' => null,
        ]);
    }
}
