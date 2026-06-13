<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;

class EnsureUserHasPlan
{
    /**
     * Handle an incoming request.
     *
     * @param  \Closure(\Illuminate\Http\Request): (\Symfony\Component\HttpFoundation\Response)  $next
     */
    public function handle(Request $request, Closure $next): Response
    {
        $user = $request->user();

        if (!$user) {
            return response()->json(['success' => false, 'error' => 'Unauthenticated'], 401);
        }

        if ($user->role === 'admin') {
            return $next($request);
        }

        // Check for specific feature access if defined in route
        $requiredFeature = $request->route()->getAction('feature');

        if ($requiredFeature) {
            if (!$user->hasFeature($requiredFeature)) {
                return response()->json([
                    'success' => false,
                    'error' => 'Feature Locked',
                    'message' => "Your current plan does not include access to '{$requiredFeature}'."
                ], 403);
            }
        }

        // Generic plan check (must have at least an active subscription)
        if (!$user->activeSubscription()->exists()) {
            return response()->json([
                'success' => false,
                'error' => 'No Active Subscription',
                'message' => 'You need an active subscription to perform this action.'
            ], 403);
        }

        return $next($request);
    }
}
