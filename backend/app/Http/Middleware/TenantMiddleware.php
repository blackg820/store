<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Symfony\Component\HttpFoundation\Response;
use App\Models\Store;
use App\Models\User;
use App\Services\SubscriptionService;
use Laravel\Sanctum\PersonalAccessToken;

class TenantMiddleware
{
    /**
     * Handle an incoming request.
     */
    public function handle(Request $request, Closure $next): Response
    {
        app()->forgetInstance('tenant.id');

        $storeId = $request->header('X-Store-ID');
        $storeSlug = $request->header('X-Store-Slug');

        if ($storeId) {
            $user = $this->resolveAuthenticatedUser($request);
            if (!$user) {
                return response()->json([
                    'success' => false,
                    'code' => 'UNAUTHENTICATED_TENANT',
                    'message' => 'Authentication is required to select a store.',
                    'errors' => (object) [],
                    'details' => (object) [],
                ], 401);
            }

            $ownerId = $user->parent_id ?: $user->id;
            $store = Store::withoutGlobalScopes()->find($storeId);

            if (!$store || ($user->role !== 'admin' && (int) $store->user_id !== (int) $ownerId)) {
                return response()->json([
                    'success' => false,
                    'code' => 'TENANT_ACCESS_DENIED',
                    'message' => 'You do not have access to the selected store.',
                    'errors' => (object) [],
                    'details' => (object) [],
                ], 403);
            }

            app()->instance('tenant.id', $store->id);
        } elseif ($storeSlug) {
            $store = Store::withoutGlobalScopes()->where('slug', $storeSlug)->first();
            if ($store) {
                app()->instance('tenant.id', $store->id);
            }
        }

        $user = $this->resolveAuthenticatedUser($request);
        $subscriptionService = app(SubscriptionService::class);

        if ($user && $request->is('api/v1/*') && !$request->is('api/v1/auth/*') && !$request->is('api/v1/billing/*')) {
            $owner = $user->tenantOwner();
            $check = $subscriptionService->checkRecordedUsageLimit($owner, 'api_requests', 1);
            if (!$check['allowed']) {
                return response()->json([
                    'success' => false,
                    'code' => $check['code'] ?? 'PLAN_LIMIT_REACHED',
                    'message' => $check['message'] ?? 'API request limit reached.',
                    'errors' => (object) [],
                    'details' => $check['details'] ?? ['feature' => 'api_requests'],
                    'upgrade' => $check['upgrade'] ?? null,
                ], 429);
            }
        }

        $response = $next($request);

        if ($user && $request->is('api/v1/*') && !$request->is('api/v1/auth/*') && !$request->is('api/v1/billing/*')) {
            $subscriptionService->recordUsage($user, 'api_requests', 1, null, [
                'method' => $request->method(),
                'path' => $request->path(),
            ]);
        }

        return $response;
    }

    private function resolveAuthenticatedUser(Request $request): ?User
    {
        $user = $request->user('sanctum') ?: $request->user();
        if ($user instanceof User) {
            return $user;
        }

        $token = $request->bearerToken();
        if (!$token) {
            return null;
        }

        $accessToken = PersonalAccessToken::findToken($token);
        if (!$accessToken || ($accessToken->expires_at && $accessToken->expires_at->isPast())) {
            return null;
        }

        $tokenable = $accessToken->tokenable;
        if (!$tokenable instanceof User || ($tokenable->status ?? 'active') !== 'active') {
            return null;
        }

        return $tokenable;
    }
}
