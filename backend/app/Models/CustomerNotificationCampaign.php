<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CustomerNotificationCampaign extends Model
{
    use HasFactory;

    protected $fillable = [
        'store_id',
        'created_by',
        'name',
        'status',
        'channels',
        'segment',
        'template',
        'scheduled_at',
        'sent_at',
    ];

    protected $casts = [
        'channels' => 'array',
        'segment' => 'array',
        'template' => 'array',
        'scheduled_at' => 'datetime',
        'sent_at' => 'datetime',
    ];

    public function store()
    {
        return $this->belongsTo(Store::class);
    }

    public function deliveries()
    {
        return $this->hasMany(CustomerNotificationDelivery::class, 'campaign_id');
    }
}
