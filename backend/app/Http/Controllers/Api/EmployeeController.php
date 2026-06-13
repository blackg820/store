<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class EmployeeController extends Controller
{
    public function index(Request $request)
    {
        $owner = $this->tenantOwner($request->user());

        $employees = $owner->employees()->orderBy('created_at', 'desc')->get();

        return response()->json([
            'success' => true,
            'data' => $employees
        ]);
    }

    public function store(Request $request)
    {
        $user = $request->user();
        $owner = $this->tenantOwner($user);
        if ((int) $owner->id !== (int) $user->id) {
            return $this->error('Employees cannot manage employee accounts', 403);
        }

        $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => ['required', Password::defaults()],
        ]);

        $check = app(\App\Services\SubscriptionService::class)
            ->checkLimit($owner, 'employees', $owner->employees()->count());
        if (!$check['allowed']) {
            return $this->limitError($check);
        }

        $employee = User::create([
            'name' => $request->name,
            'email' => $request->email,
            'password' => Hash::make($request->password),
            'role' => 'employee',
            'parent_id' => $owner->id,
            'subscription_plan' => $owner->subscription_plan,
            'status' => 'active',
        ]);

        return response()->json([
            'success' => true,
            'data' => $employee,
            'message' => 'Employee created successfully'
        ]);
    }

    public function update(Request $request, User $employee)
    {
        $user = $request->user();
        $owner = $this->tenantOwner($user);
        if ((int) $owner->id !== (int) $user->id) {
            return $this->error('Employees cannot manage employee accounts', 403);
        }

        if ((int) $employee->parent_id !== (int) $owner->id) {
            return response()->json(['success' => false, 'error' => 'Access denied'], 403);
        }

        $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|string|email|max:255|unique:users,email,' . $employee->id,
            'password' => ['nullable', Password::defaults()],
            'status' => 'sometimes|in:active,inactive',
        ]);

        $shouldRevokeTokens = false;

        $employee->update($request->only(['name', 'email', 'status']));

        if ($request->filled('password')) {
            $employee->update(['password' => Hash::make($request->password)]);
            $shouldRevokeTokens = true;
        }

        if ($request->input('status') === 'inactive') {
            $shouldRevokeTokens = true;
        }

        if ($shouldRevokeTokens) {
            $employee->tokens()->delete();
        }

        return response()->json([
            'success' => true,
            'data' => $employee,
            'message' => 'Employee updated successfully'
        ]);
    }

    public function destroy(Request $request, User $employee)
    {
        $user = $request->user();
        $owner = $this->tenantOwner($user);
        if ((int) $owner->id !== (int) $user->id) {
            return $this->error('Employees cannot manage employee accounts', 403);
        }

        if ((int) $employee->parent_id !== (int) $owner->id) {
            return response()->json(['success' => false, 'error' => 'Access denied'], 403);
        }

        $employee->delete();

        return response()->json([
            'success' => true,
            'message' => 'Employee deleted successfully'
        ]);
    }

    private function tenantOwner(User $user): User
    {
        return $user->tenantOwner();
    }
}
