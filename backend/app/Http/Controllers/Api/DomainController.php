<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\StoreResource;
use App\Services\DomainTenantService;
use App\Services\SystemEventService;
use Illuminate\Http\Request;

class DomainController extends Controller
{
    public function resolve(Request $request, DomainTenantService $service)
    {
        $host = $request->query('host', $request->getHost());
        $store = $service->resolveHost((string) $host);

        if (!$store || ($store->status ?? 'inactive') !== 'active') {
            app(SystemEventService::class)->record('domain_resolution_failed', 'Store domain resolution failed.', [
                'host_hash' => hash('sha256', strtolower((string) $host)),
                'ip' => $request->ip(),
            ], 'warning', static::class);

            return $this->error('No active store was found for this host.', 404, null, 'STORE_DOMAIN_NOT_FOUND');
        }

        return $this->success([
            'store' => new StoreResource($store),
            'routing' => [
                'host' => $host,
                'slug' => $store->slug,
                'subdomain' => $store->subdomain,
                'customDomain' => $store->custom_domain,
            ],
        ], 'Store domain resolved');
    }
}
