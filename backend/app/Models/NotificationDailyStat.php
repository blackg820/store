<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class NotificationDailyStat extends Model
{
    protected $fillable = [
        'store_id',
        'campaign_id',
        'stat_date',
        'queued_count',
        'sent_count',
        'delivered_count',
        'opened_count',
        'clicked_count',
        'failed_count',
        'channel_breakdown',
    ];

    protected $casts = [
        'stat_date' => 'date',
        'channel_breakdown' => 'array',
    ];
}
