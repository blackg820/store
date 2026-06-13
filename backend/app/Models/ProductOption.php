<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProductOption extends Model
{
    use HasFactory;

    protected $fillable = [
        'product_id',
        'name',
        'values_json',
        'swatches_json',
        'type',
        'position',
    ];

    protected $casts = [
        'values_json' => 'json',
        'swatches_json' => 'json',
    ];

    public function product()
    {
        return $this->belongsTo(Product::class);
    }
}
