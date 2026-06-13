<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AlWaseetRegion extends Model
{
    protected $fillable = ['id', 'city_id', 'region_name'];
    public $incrementing = false;

    public function city()
    {
        return $this->belongsTo(AlWaseetCity::class, 'city_id');
    }
}
