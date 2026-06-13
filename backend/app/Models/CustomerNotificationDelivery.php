<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CustomerNotificationDelivery extends Model
{
    use HasFactory;

    protected $fillable = [
        'campaign_id',
        'store_id',
        'subscription_id',
        'buyer_id',
        'global_customer_id',
        'channel',
        'status',
        'queued_at',
        'delivered_at',
        'opened_at',
        'clicked_at',
        'failure_reason',
        'metadata',
    ];

    protected $casts = [
        'queued_at' => 'datetime',
        'delivered_at' => 'datetime',
        'opened_at' => 'datetime',
        'clicked_at' => 'datetime',
        'metadata' => 'array',
    ];

    public function campaign()
    {
        return $this->belongsTo(CustomerNotificationCampaign::class, 'campaign_id');
    }
}
