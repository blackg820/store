<?php

namespace App\Traits;

use App\Models\Scopes\TenantScope;
use Illuminate\Database\Eloquent\Model;

trait HasTenant
{
    /**
     * The "booted" method of the model.
     */
    protected static function booted(): void
    {
        static::addGlobalScope(new \App\Models\Scopes\TenantScope);

        static::addGlobalScope('owner_scope', function (\Illuminate\Database\Eloquent\Builder $builder) {
            if (\Illuminate\Support\Facades\Auth::check()) {
                $user = \Illuminate\Support\Facades\Auth::user();
                if ($user->role !== 'admin') {
                    $ownerId = $user->parent_id ?: $user->id;
                    $builder->whereHas('store', function($q) use ($ownerId) {
                        $q->where('user_id', $ownerId);
                    });
                }
            }
        });

        static::creating(function (Model $model) {
            if (app()->bound('tenant.id') && empty($model->store_id)) {
                $model->store_id = app('tenant.id');
            }
        });
    }
}
