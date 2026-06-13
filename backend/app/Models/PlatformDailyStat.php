<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class PlatformDailyStat extends Model
{
    protected $fillable = [
        'stat_date',
        'users_count',
        'new_users_count',
        'stores_count',
        'new_stores_count',
        'orders_count',
        'failed_jobs_count',
        'queued_jobs_count',
        'storage_bytes',
    ];

    protected $casts = [
        'stat_date' => 'date',
    ];
}
