<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Buyer extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'name',
        'phone',
        'email',
        'address',
        'risk_level',
        'is_blacklisted',
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
}
