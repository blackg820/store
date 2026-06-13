<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class GlobalCustomer extends Model
{
    use HasFactory;

    protected $fillable = [
        'phone',
        'rejection_count',
        'risk_level',
        'total_orders',
        'total_rejections',
        'first_order_at',
        'last_order_at',
    ];

    protected $casts = [
        'first_order_at' => 'datetime',
        'last_order_at' => 'datetime',
    ];

    public function buyers()
    {
        return $this->hasMany(Buyer::class);
    }

    public function orders()
    {
        return $this->hasMany(Order::class);
    }

    public static function riskLevelFor(int $rejections): string
    {
        return match (true) {
            $rejections >= 3 => 'high_risk',
            $rejections >= 1 => 'warning',
            default => 'normal',
        };
    }
}
