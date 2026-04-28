<?php

namespace App\Services;

use Firebase\JWT\JWT;
use Firebase\JWT\Key;
use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Log;

class JwtGuard
{
    public function __invoke(Request $request)
    {
        $token = $request->bearerToken();

        if (!$token) {
            return null;
        }

        try {
            $secret = env('JWT_SECRET');
            if (!$secret) {
                return null;
            }

            $decoded = JWT::decode($token, new Key($secret, 'HS256'));
            
            // Validate issuer if needed
            if (isset($decoded->iss) && $decoded->iss !== 'storify') {
                return null;
            }

            if (isset($decoded->userId)) {
                return User::find($decoded->userId);
            }
        } catch (\Exception $e) {
            Log::error('JWT Verification failed: ' . $e->getMessage());
            return null;
        }

        return null;
    }
}
