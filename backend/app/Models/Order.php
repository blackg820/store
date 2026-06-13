<?php

namespace App\Models;

use App\Traits\HasTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Order extends Model
{
    use HasFactory, SoftDeletes, HasTenant;

    protected $fillable = [
        'store_id',
        'buyer_id',
        'global_customer_id',
        'group_id',
        'client_reference_id',
        'status',
        'total_amount',
        'delivery_fee',
        'internal_notes',
        'buyer_notes',

        // Customer Info
        'customer_name',
        'customer_phone',

        // Location
        'city_id',
        'region_id',
        'address_details',

        // Shipment
        'package_size_id',
        'items_description',
        'order_notes',

        // Payment
        'cod_amount',

        // Integration Fields
        'alwaseet_order_id',
        'alwaseet_status',
        'alwaseet_qr_link',
        'alwaseet_synced_at',
        'alwaseet_sync_status',
    ];

    protected $casts = [
        'total_amount' => 'decimal:2',
        'delivery_fee' => 'decimal:2',
        'cod_amount' => 'decimal:2',
        'alwaseet_synced_at' => 'datetime',
    ];

    public function isSyncedWithAlWaseet(): bool
    {
        return $this->alwaseet_sync_status === 'sent';
    }

    public function canBeSentToAlWaseet(): bool
    {
        return $this->status === 'confirmed' && $this->alwaseet_sync_status === 'pending';
    }

    public function scopePendingSync($query)
    {
        return $query->where('alwaseet_sync_status', 'pending');
    }

    public function scopeNeedsStatusUpdate($query)
    {
        return $query->where('alwaseet_sync_status', 'sent');
    }

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

    public function items()
    {
        return $this->hasMany(OrderItem::class);
    }
}
