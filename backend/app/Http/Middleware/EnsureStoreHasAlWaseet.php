<?php

/**
 * ============================================================
 * File     : EnsureStoreHasAlWaseet.php
 * Path     : app/Http/Middleware/EnsureStoreHasAlWaseet.php
 * Purpose  : Route middleware that blocks any Al-Waseet API
 *            request if the store has not yet configured its
 *            credentials.
 *
 * Why this middleware exists:
 *   Without it, an unconfigured store would hit the service,
 *   which throws a RuntimeException, which the controller converts
 *   to a generic 502 — confusing for frontend developers.
 *   This middleware intercepts the request earlier and returns a
 *   clear 422 with an actionable hint so the frontend can redirect
 *   the merchant to the settings page.
 *
 * Applied to:  all /api/alwaseet/* routes EXCEPT /settings
 *              (settings must remain open so credentials can be
 *               saved for the first time)
 *
 * Registration:
 *   Laravel 11+ — add to bootstrap/app.php:
 *     ->withMiddleware(function (Middleware $middleware) {
 *         $middleware->alias([
 *             'alwaseet.configured' => EnsureStoreHasAlWaseet::class,
 *         ]);
 *     })
 *
 *   Laravel 10 — add to app/Http/Kernel.php:
 *     protected $routeMiddleware = [
 *         'alwaseet.configured' => EnsureStoreHasAlWaseet::class,
 *     ];
 *
 * Response on failure (HTTP 422):
 *   {
 *     "success": false,
 *     "message": "Al-Waseet is not configured for this store...",
 *     "action":  "configure_alwaseet"
 *   }
 * ============================================================
 */

declare(strict_types=1);

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

final class EnsureStoreHasAlWaseet
{
    public function handle(Request $request, Closure $next): Response
    {
        $store = $request->user()?->store;

        if (! $store || ! $store->hasAlWaseetCredentials()) {
            return response()->json([
                'success' => false,
                'message' => 'Al-Waseet is not configured for this store. Please add your credentials in Settings.',
                'action'  => 'configure_alwaseet',   // hint for the frontend router
            ], Response::HTTP_UNPROCESSABLE_ENTITY);  // 422
        }

        return $next($request);
    }
}