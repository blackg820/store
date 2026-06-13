<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProductDailyStat extends Model
{
    protected $fillable = [
        'store_id',
        'product_id',
        'stat_date',
        'views_count',
        'sold_count',
        'revenue',
    ];

    protected $casts = [
        'stat_date' => 'date',
        'revenue' => 'float',
    ];
}
