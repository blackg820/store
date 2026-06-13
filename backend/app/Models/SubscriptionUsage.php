<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class SubscriptionUsage extends Model
{
    protected $table = 'subscription_usages';

    protected $fillable = [
        'subscription_id',
        'feature_id',
        'used_count',
        'last_reset_at',
    ];

    protected $casts = [
        'used_count' => 'decimal:2',
        'last_reset_at' => 'datetime',
    ];

    public function subscription()
    {
        return $this->belongsTo(Subscription::class);
    }

    public function feature()
    {
        return $this->belongsTo(Feature::class);
    }
}
