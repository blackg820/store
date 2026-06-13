<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\MediaController;
use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\PushSubscriptionController;
use App\Http\Controllers\Api\DeviceTokenController;
use App\Http\Controllers\Api\NotificationController;
use App\Http\Controllers\Api\PublicController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\StoreController;
use App\Http\Controllers\Api\BuyerController;
use App\Http\Controllers\Api\AdminController;
use App\Http\Controllers\Api\EmployeeController;
use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\ProductTypeController;
use App\Http\Controllers\Api\BillingController;
use App\Http\Controllers\Api\CustomerNotificationController;
use App\Http\Controllers\Api\DomainController;
use App\Http\Controllers\Api\OpsController;
use App\Http\Resources\UserResource;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Laravel\Sanctum\PersonalAccessToken;

/*
|--------------------------------------------------------------------------
| Authentication Routes
|--------------------------------------------------------------------------
*/

// Dummy route for middleware redirects
Route::get('/v1/auth/login', function () {
    return response()->json([
        'success' => false,
        'code' => 'UNAUTHENTICATED',
        'message' => 'Authentication is required.',
        'errors' => (object) [],
        'details' => (object) [],
    ], 401);
})->name('login');

Route::prefix('v1/auth')->middleware('throttle:30,1')->group(function () {
    Route::post('/login', function (Request $request) {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            app(\App\Services\SystemEventService::class)->record('suspicious_auth_failure', 'Invalid API login attempt.', [
                'email_hash' => hash('sha256', strtolower((string) $request->email)),
                'ip' => $request->ip(),
            ], 'warning', 'auth.login');

            return response()->json([
                'success' => false,
                'code' => 'INVALID_CREDENTIALS',
                'message' => 'The provided credentials are incorrect.',
                'errors' => (object) [],
                'details' => (object) [],
            ], 401);
        }

        if (($user->status ?? 'active') !== 'active') {
            return response()->json([
                'success' => false,
                'code' => 'ACCOUNT_INACTIVE',
                'message' => 'This account is not active.',
                'errors' => (object) [],
                'details' => (object) [],
            ], 403);
        }

        $token = $user->createToken('auth_token', ['*'], now()->addHours(12))->plainTextToken;
        $refreshToken = $user->createToken('refresh_token', ['refresh'], now()->addDays(30))->plainTextToken;

        return response()->json([
            'success' => true,
            'data' => [
                'accessToken' => $token,
                'refreshToken' => $refreshToken,
                'user' => new UserResource($user->loadMissing(['activeSubscription.plan.features', 'userLimit'])),
            ]
        ]);
    });

    Route::post('/refresh', function (Request $request) {
        $request->validate([
            'refreshToken' => 'required|string',
        ]);

        $refreshToken = PersonalAccessToken::findToken($request->refreshToken);
        if (!$refreshToken || !in_array('refresh', $refreshToken->abilities ?? [], true)) {
            return response()->json([
                'success' => false,
                'code' => 'INVALID_REFRESH_TOKEN',
                'message' => 'Refresh token is invalid.',
                'errors' => (object) [],
                'details' => (object) [],
            ], 401);
        }

        if ($refreshToken->expires_at && $refreshToken->expires_at->isPast()) {
            $refreshToken->delete();
            return response()->json([
                'success' => false,
                'code' => 'EXPIRED_REFRESH_TOKEN',
                'message' => 'Refresh token has expired.',
                'errors' => (object) [],
                'details' => (object) [],
            ], 401);
        }

        $user = $refreshToken->tokenable;
        if (!$user || ($user->status ?? 'active') !== 'active') {
            $refreshToken->delete();
            $user?->tokens()->delete();

            return response()->json([
                'success' => false,
                'code' => 'ACCOUNT_INACTIVE',
                'message' => 'This account is not active.',
                'errors' => (object) [],
                'details' => (object) [],
            ], 403);
        }

        $refreshToken->delete();
        $newAccessToken = $user->createToken('auth_token', ['*'], now()->addHours(12))->plainTextToken;
        $newRefreshToken = $user->createToken('refresh_token', ['refresh'], now()->addDays(30))->plainTextToken;

        return response()->json([
            'success' => true,
            'data' => [
                'accessToken' => $newAccessToken,
                'refreshToken' => $newRefreshToken,
            ]
        ]);
    });

    Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
        return response()->json([
            'success' => true,
            'message' => null,
            'data' => new UserResource($request->user()->loadMissing(['activeSubscription.plan.features', 'userLimit']))
        ]);
    });

    Route::middleware('auth:sanctum')->post('/logout', function (Request $request) {
        $request->validate([
            'refreshToken' => 'sometimes|string',
        ]);

        $user = $request->user();

        if ($request->filled('refreshToken')) {
            $refreshToken = PersonalAccessToken::findToken($request->refreshToken);
            if ($refreshToken && (int) $refreshToken->tokenable_id === (int) $user->id) {
                $refreshToken->delete();
            }
        }

        $request->user()->currentAccessToken()?->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully.',
            'data' => null,
        ]);
    });

    Route::middleware('auth:sanctum')->post('/logout-all', function (Request $request) {
        $request->user()->tokens()->delete();

        return response()->json([
            'success' => true,
            'message' => 'All sessions were revoked.',
            'data' => null,
        ]);
    });
});

/*
|--------------------------------------------------------------------------
| Business Logic Routes
|--------------------------------------------------------------------------
*/
Route::get('/v1/ops/health', [OpsController::class, 'health'])->middleware('throttle:120,1');
Route::get('/v1/ops/health/deep', [OpsController::class, 'deepHealth'])->middleware('throttle:30,1');
Route::get('/v1/public/store/{slug}', [PublicController::class, 'store'])->middleware('throttle:120,1');
Route::get('/v1/public/product/{id}', [PublicController::class, 'product'])->middleware('throttle:120,1');
Route::get('/v1/public/settings', [PublicController::class, 'settings'])->middleware('throttle:120,1');
Route::get('/v1/public/domain/resolve', [DomainController::class, 'resolve'])->middleware('throttle:60,1');
Route::post('/v1/public/analytics/events', [AnalyticsController::class, 'track'])->middleware('throttle:240,1');
Route::post('/v1/public/customer-notifications/subscribe', [CustomerNotificationController::class, 'subscribe'])->middleware('throttle:20,1');
Route::post('/v1/public/customer-notifications/unsubscribe', [CustomerNotificationController::class, 'unsubscribe'])->middleware('throttle:30,1');
Route::post('/v1/public/customer-notifications/deliveries/{delivery}/open', [CustomerNotificationController::class, 'markOpened'])->middleware('throttle:120,1');
Route::post('/v1/public/customer-notifications/deliveries/{delivery}/click', [CustomerNotificationController::class, 'markClicked'])->middleware('throttle:120,1');
Route::post('/v1/public/orders', [PublicController::class, 'submitOrder'])->middleware('throttle:30,1');
Route::post('/v1/billing/calculate', [BillingController::class, 'calculate']);
Route::post('/v1/telegram/webhook', [\App\Http\Controllers\Api\TelegramController::class, 'handleWebhook']);
Route::get('/v1/docs', function () {
    return response()->json([
        'success' => true,
        'data' => [
            'version' => 'v1',
            'basePath' => '/api/v1',
            'auth' => ['POST /auth/login', 'POST /auth/refresh', 'GET /auth/user', 'POST /auth/logout'],
            'dashboard' => ['GET /dashboard/init', 'GET /notifications', 'POST /device-tokens'],
            'stores' => ['GET /stores', 'POST /stores', 'GET /stores/{store}', 'PATCH /stores/{store}', 'PATCH /stores/{store}/status', 'GET /stores/{store}/settings', 'PATCH /stores/{store}/settings', 'GET /public/domain/resolve'],
            'catalog' => ['GET /products', 'POST /products', 'GET /categories', 'GET /product-types'],
            'orders' => ['GET /orders', 'GET /orders/{order}', 'PATCH /orders/{order}/status'],
            'customerNotifications' => ['POST /public/customer-notifications/subscribe', 'GET /customer-notifications/campaigns', 'POST /customer-notifications/campaigns'],
            'analytics' => ['GET /analytics/dashboard', 'POST /public/analytics/events'],
        ],
    ]);
});

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/v1/dashboard/init', [DashboardController::class, 'init']);

    Route::get('/v1/products', [ProductController::class, 'index']);
    Route::get('/v1/products/form-options', [ProductController::class, 'formOptions']);
    Route::post('/v1/products', [ProductController::class, 'store']);
    Route::get('/v1/products/{product}/media', [MediaController::class, 'productIndex']);
    Route::post('/v1/products/{product}/media', [MediaController::class, 'productStore']);
    Route::delete('/v1/products/{product}/media/{media}', [MediaController::class, 'productDestroy']);
    Route::post('/v1/products/{product}/media/reorder', [MediaController::class, 'productReorder']);
    Route::post('/v1/products/{product}/media/{media}/primary', [MediaController::class, 'productPrimary']);
    Route::get('/v1/products/{product}', [ProductController::class, 'show']);
    Route::put('/v1/products/{product}', [ProductController::class, 'update']);
    Route::patch('/v1/products/{product}', [ProductController::class, 'update']);
    Route::delete('/v1/products/{product}', [ProductController::class, 'destroy']);
    Route::post('/v1/products/{product}/telegram', [ProductController::class, 'sendToTelegram']);

    Route::get('/v1/media', [MediaController::class, 'index']);
    Route::post('/v1/media', [MediaController::class, 'store']);
    Route::delete('/v1/media/{media}', [MediaController::class, 'destroy']);
    Route::post('/v1/media/{media}/replace', [MediaController::class, 'replace']);

    Route::get('/v1/analytics/dashboard', [AnalyticsController::class, 'dashboard']);

    Route::get('/v1/billing/current', [BillingController::class, 'current']);
    Route::get('/v1/billing/usage', [BillingController::class, 'usage']);
    Route::post('/v1/billing/checkout-session', [BillingController::class, 'checkoutSession']);

    Route::post('/v1/push/subscribe', [PushSubscriptionController::class, 'subscribe']);
    Route::post('/v1/push/unsubscribe', [PushSubscriptionController::class, 'unsubscribe']);
    Route::get('/v1/device-tokens', [DeviceTokenController::class, 'index']);
    Route::post('/v1/device-tokens', [DeviceTokenController::class, 'store']);
    Route::delete('/v1/device-tokens/{deviceToken}', [DeviceTokenController::class, 'destroy']);

    Route::get('/v1/notifications', [NotificationController::class, 'index']);
    Route::get('/v1/notifications/unread-count', [NotificationController::class, 'unreadCount']);
    Route::post('/v1/notifications/read-all', [NotificationController::class, 'readAll']);
    Route::patch('/v1/notifications/read-all', [NotificationController::class, 'readAll']);
    Route::post('/v1/notifications/{notification}/read', [NotificationController::class, 'markRead']);
    Route::patch('/v1/notifications/{notification}/read', [NotificationController::class, 'markRead']);

    Route::get('/v1/orders', [OrderController::class, 'index']);
    Route::post('/v1/orders', [OrderController::class, 'store']);
    Route::get('/v1/orders/{order}', [OrderController::class, 'show']);
    Route::patch('/v1/orders/{order}', [OrderController::class, 'update']);
    Route::patch('/v1/orders/{order}/status', [OrderController::class, 'updateStatus']);
    Route::post('/v1/orders/{order}/alwaseet', [OrderController::class, 'sendToAlWaseet']);
    Route::delete('/v1/orders/{order}', [OrderController::class, 'destroy']);

    Route::get('/v1/stores/form-options', [StoreController::class, 'formOptions']);
    Route::get('/v1/stores/check-slug', [StoreController::class, 'checkSlug']);
    Route::get('/v1/stores/check-domain', [StoreController::class, 'checkDomain']);
    Route::get('/v1/stores/{store}/settings', [StoreController::class, 'settings']);
    Route::put('/v1/stores/{store}/settings', [StoreController::class, 'updateSettings']);
    Route::patch('/v1/stores/{store}/settings', [StoreController::class, 'updateSettings']);
    Route::patch('/v1/stores/{store}/status', [StoreController::class, 'updateStatus']);
    Route::post('/v1/stores/{store}/open', [StoreController::class, 'open']);
    Route::post('/v1/stores/{store}/close', [StoreController::class, 'close']);
    Route::post('/v1/stores/{store}/toggle-accepting-orders', [StoreController::class, 'toggleAcceptingOrders']);
    Route::post('/v1/stores/{store}/logo', [StoreController::class, 'uploadLogo']);
    Route::delete('/v1/stores/{store}/logo', [StoreController::class, 'deleteLogo']);
    Route::post('/v1/stores/{store}/cover', [StoreController::class, 'uploadCover']);
    Route::delete('/v1/stores/{store}/cover', [StoreController::class, 'deleteCover']);
    Route::get('/v1/stores/{store}/telegram-settings', [StoreController::class, 'telegramSettings']);
    Route::patch('/v1/stores/{store}/telegram-settings', [StoreController::class, 'updateTelegramSettings']);
    Route::post('/v1/stores/{store}/telegram-settings/test', [StoreController::class, 'testTelegramSettings']);
    Route::apiResource('/v1/stores', StoreController::class)->names([
        'index' => 'api.v1.stores.index',
        'store' => 'api.v1.stores.store',
        'show' => 'api.v1.stores.show',
        'update' => 'api.v1.stores.update',
        'destroy' => 'api.v1.stores.destroy',
    ]);
    Route::post('/v1/stores/telegram/validate-bot', [StoreController::class, 'validateTelegramBot']);
    Route::post('/v1/stores/telegram/validate-channel', [StoreController::class, 'validateTelegramChannel']);

    Route::get('/v1/buyers', [BuyerController::class, 'index']);
    Route::post('/v1/buyers', [BuyerController::class, 'store']);
    Route::get('/v1/buyers/{buyer}', [BuyerController::class, 'show']);
    Route::patch('/v1/buyers/{buyer}', [BuyerController::class, 'update']);
    Route::post('/v1/buyers/{buyer}/blacklist', [BuyerController::class, 'blacklist']);
    Route::delete('/v1/buyers/{buyer}/blacklist', [BuyerController::class, 'unblacklist']);

    Route::get('/v1/customer-notifications/subscriptions', [CustomerNotificationController::class, 'subscriptions']);
    Route::get('/v1/customer-notifications/campaigns', [CustomerNotificationController::class, 'campaigns']);
    Route::post('/v1/customer-notifications/campaigns', [CustomerNotificationController::class, 'storeCampaign']);
    Route::get('/v1/customer-notifications/campaigns/{campaign}/deliveries', [CustomerNotificationController::class, 'deliveries']);

    Route::apiResource('/v1/categories', CategoryController::class);
    Route::apiResource('/v1/product-types', ProductTypeController::class);

    Route::patch('/v1/profile', [\App\Http\Controllers\Api\ProfileController::class, 'update']);
    Route::patch('/v1/profile/password', [\App\Http\Controllers\Api\ProfileController::class, 'updatePassword']);

    // Employee routes
    Route::get('/v1/employees', [EmployeeController::class, 'index']);
    Route::post('/v1/employees', [EmployeeController::class, 'store']);
    Route::patch('/v1/employees/{employee}', [EmployeeController::class, 'update']);
    Route::delete('/v1/employees/{employee}', [EmployeeController::class, 'destroy']);

    // Telegram routes
    Route::post('/v1/telegram/link-bot', [\App\Http\Controllers\Api\TelegramController::class, 'linkBot']);
    Route::post('/v1/telegram/setup-webhook', [\App\Http\Controllers\Api\TelegramController::class, 'setupWebhook'])->middleware('can:admin');

    // Al-Waseet integration
    Route::prefix('v1/alwaseet')->middleware('plan.restricted')->controller(\App\Http\Controllers\AlWaseetController::class)->group(function () {
        Route::get ('settings',      'settings');
        Route::put ('settings',      'updateSettings');
        Route::post('settings/test', 'testConnection');

        Route::middleware('alwaseet.configured')->group(function () {
            Route::get('cities',         'cities');
            Route::get('regions',        'regions');
            Route::get('package-sizes',  'packageSizes');
            Route::get('order-statuses', 'orderStatuses');
            Route::get ('orders',           'orders');
            Route::post('orders',           'createOrder');
            Route::post('orders/batch',     'ordersBatch');
            Route::put ('orders/{qrId}',    'editOrder');
            Route::get ('invoices',                     'invoices');
            Route::get ('invoices/{invoiceId}/orders',  'invoiceOrders');
            Route::post('invoices/{invoiceId}/receive', 'receiveInvoice');
        });
    });

    // Admin routes
    Route::middleware('can:admin')->prefix('v1/admin')->group(function () {
        Route::get('/settings', [AdminController::class, 'getSettings']);
        Route::post('/settings', [AdminController::class, 'updateSettings']);
        Route::post('/broadcast', [AdminController::class, 'broadcast']);
        Route::get('/users', [AdminController::class, 'listUsers']);
        Route::post('/users', [AdminController::class, 'storeUser']);
        Route::patch('/users/{user}', [AdminController::class, 'updateUser']);
        Route::put('/users/{user}/limits', [AdminController::class, 'updateUserLimits']);
        Route::delete('/users/{user}', [AdminController::class, 'deleteUser']);
        Route::get('/subscriptions', [AdminController::class, 'listSubscriptions']);
        Route::post('/subscriptions', [AdminController::class, 'storeSubscription']);
        Route::patch('/subscriptions/{subscription}', [AdminController::class, 'updateSubscription']);
        Route::get('/features', [AdminController::class, 'listFeatures']);
        Route::post('/features', [AdminController::class, 'storeFeature']);
        Route::patch('/features/{feature}', [AdminController::class, 'updateFeature']);
        Route::get('/plans', [AdminController::class, 'listPlans']);
        Route::post('/plans', [AdminController::class, 'storePlan']);
        Route::patch('/plans', [AdminController::class, 'updatePlan']);
        Route::patch('/plans/{plan}', [AdminController::class, 'updatePlanById']);
        Route::put('/plans/{plan}/features', [AdminController::class, 'updatePlanFeatures']);
        Route::get('/ops/summary', [OpsController::class, 'summary']);
    });
});
