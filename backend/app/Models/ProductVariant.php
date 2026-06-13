<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProductVariant extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'title',
        'sku',
        'price_override',
        'stock_quantity',
        'option_values',
        'image_id',
        'is_active',
    ];

    protected $casts = [
        'option_values' => 'json',
        'price_override' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }

    public function image()
    {
        return $this->belongsTo(Media::class, 'image_id');
    }
}
