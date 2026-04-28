<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\ProductController;
use App\Http\Controllers\Api\MediaController;
use App\Http\Controllers\Api\AnalyticsController;
use App\Http\Controllers\Api\PushSubscriptionController;
use App\Http\Controllers\Api\PublicController;
use App\Http\Controllers\Api\OrderController;
use App\Http\Controllers\Api\StoreController;
use App\Http\Controllers\Api\BuyerController;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

/*
|--------------------------------------------------------------------------
| Authentication Routes
|--------------------------------------------------------------------------
*/
Route::prefix('v1/auth')->group(function () {
    Route::post('/login', function (Request $request) {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            return response()->json([
                'success' => false,
                'error' => 'The provided credentials are incorrect.'
            ], 401);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'success' => true,
            'data' => [
                'accessToken' => $token,
                'refreshToken' => $token, // Sanctum doesn't use refresh tokens by default
                'user' => [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->role,
                    'mode' => $user->mode,
                ]
            ]
        ]);
    });

    Route::post('/refresh', function (Request $request) {
        // Simple passthrough for compatibility
        return response()->json([
            'success' => true,
            'data' => [
                'accessToken' => $request->refreshToken,
                'refreshToken' => $request->refreshToken,
            ]
        ]);
    });

    Route::middleware('auth:api')->get('/user', function (Request $request) {
        return response()->json([
            'success' => true,
            'data' => $request->user()
        ]);
    });
});

/*
|--------------------------------------------------------------------------
| Business Logic Routes
|--------------------------------------------------------------------------
*/
Route::get('/v1/public/store/{slug}', [PublicController::class, 'store']);
Route::get('/v1/public/product/{id}', [PublicController::class, 'product']);

Route::middleware('auth:sanctum')->group(function () {
    Route::get('/v1/dashboard/init', [DashboardController::class, 'init']);
    
    Route::get('/v1/products', [ProductController::class, 'index']);
    Route::post('/v1/products', [ProductController::class, 'store']);
    
    Route::get('/v1/media', [MediaController::class, 'index']);
    Route::post('/v1/media', [MediaController::class, 'store']);
    
    Route::get('/v1/analytics/dashboard', [AnalyticsController::class, 'dashboard']);
    
    Route::post('/v1/push/subscribe', [PushSubscriptionController::class, 'subscribe']);
    Route::post('/v1/push/unsubscribe', [PushSubscriptionController::class, 'unsubscribe']);
    
    Route::get('/v1/orders', [OrderController::class, 'index']);
    Route::post('/v1/orders', [OrderController::class, 'store']);
    
    Route::apiResource('/v1/stores', StoreController::class)->names([
        'index' => 'api.v1.stores.index',
        'store' => 'api.v1.stores.store',
        'show' => 'api.v1.stores.show',
        'update' => 'api.v1.stores.update',
        'destroy' => 'api.v1.stores.destroy',
    ]);
    
    Route::get('/v1/buyers', [BuyerController::class, 'index']);
    Route::post('/v1/buyers', [BuyerController::class, 'store']);
    Route::get('/v1/buyers/{buyer}', [BuyerController::class, 'show']);
});
