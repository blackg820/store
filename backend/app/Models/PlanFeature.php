<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PlanFeature extends Model
{
    protected $table = 'plan_features';

    protected $fillable = [
        'plan_id',
        'feature_id',
        'included_quantity',
        'limit_quantity',
        'limit_value',
        'overage_price',
        'price_per_unit_cents',
        'overage_price_cents',
        'is_enabled',
        'hard_limit',
        'reset_interval',
    ];

    protected $casts = [
        'included_quantity' => 'decimal:2',
        'limit_quantity' => 'decimal:2',
        'limit_value' => 'decimal:2',
        'overage_price' => 'decimal:2',
        'price_per_unit_cents' => 'integer',
        'overage_price_cents' => 'integer',
        'is_enabled' => 'boolean',
        'hard_limit' => 'boolean',
    ];

    public function plan()
    {
        return $this->belongsTo(Plan::class);
    }

    public function feature()
    {
        return $this->belongsTo(Feature::class);
    }
}
