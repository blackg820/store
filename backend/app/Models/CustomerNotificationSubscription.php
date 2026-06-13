<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class CustomerNotificationSubscription extends Model
{
    use HasFactory;

    protected $fillable = [
        'store_id',
        'buyer_id',
        'global_customer_id',
        'phone',
        'channel',
        'language',
        'endpoint_hash',
        'endpoint',
        'keys',
        'metadata',
        'subscribed_at',
        'unsubscribed_at',
    ];

    protected $casts = [
        'keys' => 'encrypted:array',
        'metadata' => 'array',
        'subscribed_at' => 'datetime',
        'unsubscribed_at' => 'datetime',
    ];

    protected $hidden = [
        'endpoint',
        'keys',
        'endpoint_hash',
    ];

    public function store()
    {
        return $this->belongsTo(Store::class);
    }

    public function buyer()
    {
        return $this->belongsTo(Buyer::class);
    }

    public function globalCustomer()
    {
        return $this->belongsTo(GlobalCustomer::class);
    }
}
