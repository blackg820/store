<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Store extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'user_id',
        'name',
        'name_ar',
        'slug',
        'whatsapp_number',
        'description',
        'description_ar',
        'logo_url',
        'cover_url',
        'status',
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
    ];

    protected $casts = [
        'theme_settings' => 'json',
        'notification_settings' => 'json',
        'option_presets' => 'json',
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
}
