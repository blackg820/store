<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

use Illuminate\Database\Eloquent\Factories\HasFactory;

class Feature extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'name',
        'slug',
        'description',
        'type',
        'unit',
        'reset_interval',
        'is_active',
    ];

    protected $casts = [
        'is_active' => 'boolean',
    ];

    public function plans()
    {
        return $this->belongsToMany(Plan::class, 'plan_features')
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
}
