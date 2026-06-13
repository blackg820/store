<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class UserLimit extends Model
{
    protected $fillable = [
        'user_id',
        'limits',
        'pricing',
        'base_price_cents',
        'total_price_cents',
        'currency',
    ];

    protected $casts = [
        'limits' => 'array',
        'pricing' => 'array',
        'base_price_cents' => 'integer',
        'total_price_cents' => 'integer',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}
