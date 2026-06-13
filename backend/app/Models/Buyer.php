<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Buyer extends Model
{
    use HasFactory, \App\Traits\UserOwned, SoftDeletes;

    protected $fillable = [
        'user_id',
        'global_customer_id',
        'name',
        'phone',
        'email',
        'address',
        'notes',
        'risk_level',
        'is_blacklisted',
        'blacklist_reason',
        'total_orders',
        'rejected_orders',
    ];

    protected $casts = [
        'address' => 'json',
        'is_blacklisted' => 'boolean',
    ];

    public function orders()
    {
        return $this->hasMany(Order::class);
    }

    public function globalCustomer()
    {
        return $this->belongsTo(GlobalCustomer::class);
    }
}
