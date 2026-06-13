<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

use Illuminate\Database\Eloquent\Factories\HasFactory;

class Plan extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'name',
        'description',
        'type',
        'billing_model',
        'price',
        'base_price_cents',
        'currency',
        'interval',
        'duration_days',
        'trial_days',
        'status',
        'sort_order',
        'is_public',
    ];

    protected $casts = [
        'price' => 'decimal:2',
        'base_price_cents' => 'integer',
        'duration_days' => 'integer',
        'trial_days' => 'integer',
        'sort_order' => 'integer',
        'is_public' => 'boolean',
    ];

    public function features()
    {
        return $this->belongsToMany(Feature::class, 'plan_features')
            ->withPivot(
                'limit_value',
                'included_quantity',
                'limit_quantity',
                'overage_price',
                'price_per_unit_cents',
                'overage_price_cents',
                'is_enabled',
                'hard_limit',
                'reset_interval'
            )
            ->withTimestamps();
    }

    public function subscriptions()
    {
        return $this->hasMany(Subscription::class);
    }
}
