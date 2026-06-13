<?php

namespace App\Traits;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Session;

trait StoreOwned
{
    public static function bootStoreOwned()
    {
        static::addGlobalScope('store_owned', function (Builder $builder) {
            // For storefront (public access), we scope by the active tenant store
            if (app()->bound('tenant.id')) {
                $builder->where('store_id', app('tenant.id'));
            }
            // For dashboard (authenticated access)
            elseif (Auth::check()) {
                $user = Auth::user();
                if ($user->role !== 'admin') {
                    $ownerId = $user->parent_id ?: $user->id;
                    $builder->whereHas('store', function($q) use ($ownerId) {
                        $q->where('user_id', $ownerId);
                    });
                }
            }
        });
    }
}
