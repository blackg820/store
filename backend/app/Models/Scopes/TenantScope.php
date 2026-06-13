<?php

namespace App\Models\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;
use Illuminate\Support\Facades\Session;

class TenantScope implements Scope
{
    /**
     * Apply the scope to a given Eloquent query builder.
     */
    public function apply(Builder $builder, Model $model): void
    {
        if (app()->bound('tenant.id')) {
            $builder->where(function($q) use ($model) {
                $q->where($model->getTable() . '.store_id', app('tenant.id'))
                  ->orWhereNull($model->getTable() . '.store_id');
            });
        }
    }
}
