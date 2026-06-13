<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StoreDailyStat extends Model
{
    protected $fillable = [
        'store_id',
        'stat_date',
        'orders_count',
        'delivered_orders_count',
        'rejected_orders_count',
        'revenue',
        'visits_count',
        'unique_visitors_count',
        'checkout_starts_count',
        'notifications_sent_count',
        'notifications_delivered_count',
        'notifications_opened_count',
        'notifications_clicked_count',
        'device_breakdown',
    ];

    protected $casts = [
        'stat_date' => 'date',
        'revenue' => 'float',
        'device_breakdown' => 'array',
    ];

    public function store()
    {
        return $this->belongsTo(Store::class);
    }
}
