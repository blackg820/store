<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class AlWaseetCity extends Model
{
    protected $fillable = ['id', 'city_name'];
    public $incrementing = false;

    public function regions()
    {
        return $this->hasMany(AlWaseetRegion::class, 'city_id');
    }
}
