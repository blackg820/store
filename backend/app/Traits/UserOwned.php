<?php

namespace App\Traits;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Auth;

trait UserOwned
{
    public static function bootUserOwned()
    {
        static::creating(function ($model) {
            if (Auth::check() && !isset($model->user_id)) {
                $user = Auth::user();
                $model->user_id = $user->parent_id ?: $user->id;
            }
        });

        static::addGlobalScope('user_owned', function (Builder $builder) {
            if (Auth::check()) {
                $user = Auth::user();
                if ($user->role !== 'admin') {
                    $ownerId = $user->parent_id ?: $user->id;
                    $builder->where('user_id', $ownerId);
                }
            }
        });
    }
}
