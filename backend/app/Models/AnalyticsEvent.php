<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class AnalyticsEvent extends Model
{
    use HasFactory;

    protected $fillable = [
        'store_id',
        'product_id',
        'campaign_id',
        'event_type',
        'visitor_id',
        'device_type',
        'locale',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'array',
    ];

    public function store()
    {
        return $this->belongsTo(Store::class);
    }
}
