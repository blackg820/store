<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Models\Store;

class TenantMiddleware
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        $storeId = $request->header('X-Store-ID');
        $storeSlug = $request->header('X-Store-Slug');

        if ($storeId) {
            app()->instance('tenant.id', $storeId);
        } elseif ($storeSlug) {
            $store = Store::where('slug', $storeSlug)->first();
            if ($store) {
                app()->instance('tenant.id', $store->id);
            }
        }

        return $next($request);
    }
}
