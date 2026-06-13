<?php

namespace App\Models;

use App\Traits\HasTenant;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class Product extends Model
{
    use HasFactory, SoftDeletes, HasTenant;

    protected $fillable = [
        'store_id',
        'product_type_id',
        'category_id',
        'sku',
        'product_code',
        'title',
        'slug',
        'description',
        'price',
        'cost_price',
        'discount',
        'delivery_fee',
        'needs_deposit',
        'deposit_amount',
        'is_active',
        'status',
        'custom_data',
        'rating',
        'rating_count',
    ];

    protected $casts = [
        'custom_data' => 'json',
        'price' => 'decimal:2',
        'cost_price' => 'decimal:2',
        'discount' => 'decimal:2',
        'delivery_fee' => 'decimal:2',
        'deposit_amount' => 'decimal:2',
        'rating' => 'decimal:2',
        'is_active' => 'boolean',
        'needs_deposit' => 'boolean',
    ];

    public function store()
    {
        return $this->belongsTo(Store::class);
    }

    public function productType()
    {
        return $this->belongsTo(ProductType::class);
    }

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function media()
    {
        return $this->hasMany(Media::class);
    }

    public function options()
    {
        return $this->hasMany(ProductOption::class)->orderBy('position');
    }

    public function variants()
    {
        return $this->hasMany(ProductVariant::class);
    }

    public function orderItems()
    {
        return $this->hasMany(OrderItem::class);
    }
}
