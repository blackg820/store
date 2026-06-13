<?php

namespace App\Http\Controllers;

abstract class Controller
{
    use \App\Traits\ApiResponse;

    protected function isReadOnlyRole($user): bool
    {
        return in_array($user?->role, ['support', 'viewer'], true);
    }

    protected function readOnlyDenied()
    {
        return $this->error('Your role has read-only access.', 403, null, 'READ_ONLY_ROLE');
    }

    protected function tenantDenied()
    {
        app(\App\Services\SystemEventService::class)->record('tenant_access_denied', 'Tenant access denied.', [
            'user_id' => request()->user()?->id,
            'store_id' => request()->header('X-Store-ID') ?: request()->input('store_id') ?: request()->input('storeId'),
            'path' => request()->path(),
        ], 'warning', static::class);

        return $this->error('You do not have access to the selected store.', 403, null, 'TENANT_ACCESS_DENIED');
    }
}
