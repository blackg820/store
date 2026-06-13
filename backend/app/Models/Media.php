<?php

namespace App\Models;

use App\Traits\HasTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Media extends Model
{
    use HasFactory, SoftDeletes, HasTenant;

    protected $fillable = [
        'store_id',
        'product_id',
        'url',
        'thumbnail_url',
        'file_path',
        'file_size',
        'type',
        'mime_type',
        'width',
        'height',
        'sort_order',
        'is_main',
        'storage_provider',
        'visibility',
        'metadata',
    ];

    protected $casts = [
        'metadata' => 'json',
        'is_main' => 'boolean',
        'file_size' => 'integer',
        'width' => 'integer',
        'height' => 'integer',
        'sort_order' => 'integer',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function store()
    {
        return $this->belongsTo(Store::class);
    }
}
