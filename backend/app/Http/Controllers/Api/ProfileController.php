<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;
use App\Http\Resources\UserResource;

class ProfileController extends Controller
{
    public function update(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users,email,' . $user->id,
        ]);

        $user->update([
            'name' => $request->name,
            'email' => $request->email,
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Profile updated successfully',
            'data' => new UserResource($user->fresh()->loadMissing(['activeSubscription.plan.features', 'userLimit']))
        ]);
    }

    public function updatePassword(Request $request)
    {
        $user = $request->user();

        $request->validate([
            'currentPassword' => 'required',
            'newPassword' => ['required', 'string', Password::min(8)],
        ]);

        if (!Hash::check($request->currentPassword, $user->password)) {
            return $this->error('The current password you provided is incorrect.', 422, [
                'currentPassword' => ['The current password you provided is incorrect.'],
            ], 'INVALID_CURRENT_PASSWORD');
        }

        $user->update([
            'password' => Hash::make($request->newPassword)
        ]);

        $user->tokens()->delete();

        return response()->json([
            'success' => true,
            'code' => 'SESSION_REVOKED',
            'message' => 'Password updated successfully. Please sign in again.',
            'data' => ['sessionRevoked' => true],
        ]);
    }
}
