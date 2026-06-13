<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\User;
use App\Models\Plan;
use App\Models\Feature;
use App\Models\DashboardNotification;
use App\Models\Store;
use App\Models\Subscription;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use App\Http\Resources\UserResource;
use App\Http\Resources\SubscriptionResource;
use App\Services\SubscriptionService;
use Illuminate\Validation\Rule;

class AdminController extends Controller
{
    public function getSettings()
    {
        $settings = DB::table('global_settings')->pluck('setting_value', 'setting_key');
        return response()->json(['success' => true, 'data' => $settings]);
    }

    public function updateSettings(Request $request)
    {
        $settings = $request->input('settings', []);

        foreach ($settings as $key => $value) {
            DB::table('global_settings')->updateOrInsert(
                ['setting_key' => $key],
                ['setting_value' => $value, 'updated_at' => now()]
            );
        }

        return response()->json(['success' => true]);
    }

    public function broadcast(Request $request)
    {
        $data = $request->validate([
            'title' => 'nullable|string|max:255',
            'message' => 'required|string|max:4000',
            'storeIds' => 'sometimes|array',
            'storeIds.*' => 'integer|exists:stores,id',
        ]);

        $query = Store::query();
        if (!empty($data['storeIds'])) {
            $query->whereIn('id', $data['storeIds']);
        }

        $stores = $query->get();
        $telegramSent = 0;
        $notificationsCreated = 0;
        $title = $data['title'] ?? 'Platform announcement';

        foreach ($stores as $store) {
            DashboardNotification::create([
                'user_id' => $store->user_id,
                'store_id' => $store->id,
                'type' => 'admin.broadcast',
                'title' => $title,
                'body' => $data['message'],
                'metadata' => ['source' => 'admin.broadcast'],
            ]);
            $notificationsCreated++;

            if (app(\App\Services\NotificationService::class)->sendTelegramNotification(
                $store,
                '<b>' . e($title) . '</b>' . "\n" . e($data['message']),
                'adminBroadcast'
            )) {
                $telegramSent++;
            }
        }

        return response()->json([
            'success' => true,
            'data' => [
                'stores' => $stores->count(),
                'notificationsCreated' => $notificationsCreated,
                'telegramSent' => $telegramSent,
            ],
            'message' => 'Broadcast queued for stores.',
        ]);
    }

    public function listUsers()
    {
        return response()->json(['success' => true, 'data' => UserResource::collection(User::with('userLimit')->get())]);
    }

    public function storeUser(Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|email|unique:users,email',
            'password' => 'required|string|min:8',
            'role' => 'required|in:admin,store_owner',
            'isActive' => 'sometimes|boolean',
            'status' => 'sometimes|in:active,suspended',
            'mode' => 'sometimes|in:controlled,unlimited',
            'planId' => 'nullable|string',
            'billingInterval' => 'nullable|in:monthly,yearly',
            'quantities' => 'sometimes|array',
            'limits' => 'sometimes|array',
            'pricing' => 'sometimes|array',
            'basePriceCents' => 'sometimes|integer|min:0',
            'currency' => 'sometimes|string|size:3',
        ]);

        $user = DB::transaction(function () use ($data) {
            $status = $data['status'] ?? (($data['isActive'] ?? true) ? 'active' : 'suspended');
            $plan = null;

            if (($data['role'] ?? null) === 'store_owner' && !empty($data['planId'])) {
                $plan = Plan::where('code', $data['planId'])
                    ->orWhere('id', $data['planId'])
                    ->firstOrFail();
            }

            $user = User::create([
                'name' => $data['name'],
                'email' => $data['email'],
                'password' => Hash::make($data['password']),
                'role' => $data['role'],
                'mode' => $data['mode'] ?? 'controlled',
                'status' => $status,
                'subscription_plan' => (($data['role'] ?? null) === 'store_owner' && (isset($data['limits']) || isset($data['pricing'])))
                    ? 'custom'
                    : $plan?->code,
            ]);

            if (($data['role'] ?? null) === 'store_owner' && (isset($data['limits']) || isset($data['pricing']))) {
                app(SubscriptionService::class)->upsertUserLimits(
                    $user,
                    $data['limits'] ?? [],
                    $data['pricing'] ?? [],
                    (int) ($data['basePriceCents'] ?? 0),
                    $data['currency'] ?? 'USD'
                );
            }

            if ($plan) {
                $interval = $data['billingInterval'] ?? ($plan->interval === 'year' ? 'yearly' : 'monthly');
                $startsAt = now();
                $endsAt = $interval === 'yearly'
                    ? $startsAt->copy()->addYear()
                    : $startsAt->copy()->addDays((int) ($plan->duration_days ?: 30));
                $invoice = app(SubscriptionService::class)->calculatePlanPrice($plan->load('features'), $data['quantities'] ?? []);

                Subscription::create([
                    'user_id' => $user->id,
                    'plan_id' => $plan->id,
                    'plan_code' => $plan->code,
                    'starts_at' => $startsAt,
                    'ends_at' => $endsAt,
                    'status' => $status === 'active' ? 'active' : 'inactive',
                    'metadata' => [
                        'created_by_admin' => true,
                        'billing_interval' => $interval,
                        'quantities' => $data['quantities'] ?? [],
                        'invoice' => $invoice,
                    ],
                ]);

                app(SubscriptionService::class)->clearCache($user);
            }

            return $user->fresh(['subscriptions.plan', 'userLimit']);
        });

        return response()->json(['success' => true, 'data' => new UserResource($user)]);
    }

    public function updateUserLimits(Request $request, User $user)
    {
        if ($user->role !== 'store_owner') {
            return response()->json([
                'success' => false,
                'code' => 'INVALID_LIMIT_TARGET',
                'message' => 'Custom limits can only be assigned to store owner accounts.',
            ], 422);
        }

        $data = $request->validate([
            'limits' => 'required|array',
            'pricing' => 'required|array',
            'basePriceCents' => 'sometimes|integer|min:0',
            'currency' => 'sometimes|string|size:3',
        ]);

        $limit = app(SubscriptionService::class)->upsertUserLimits(
            $user,
            $data['limits'] ?? [],
            $data['pricing'] ?? [],
            (int) ($data['basePriceCents'] ?? 0),
            $data['currency'] ?? 'USD'
        );

        $user->forceFill(['subscription_plan' => 'custom'])->save();

        return response()->json([
            'success' => true,
            'data' => [
                'limits' => $limit->limits ?? [],
                'pricing' => $limit->pricing ?? [],
                'basePriceCents' => (int) $limit->base_price_cents,
                'totalPriceCents' => (int) $limit->total_price_cents,
                'currency' => $limit->currency,
            ],
        ]);
    }

    public function updateUser(Request $request, User $user)
    {
        $data = $request->validate([
            'name' => 'sometimes|string|max:255',
            'email' => 'sometimes|email|unique:users,email,' . $user->id,
            'role' => 'sometimes|in:admin,store_owner',
            'status' => 'sometimes|in:active,suspended',
            'isActive' => 'sometimes|boolean',
            'password' => 'sometimes|nullable|string|min:8',
        ]);

        $shouldRevokeTokens = false;

        if (array_key_exists('isActive', $data) && !array_key_exists('status', $data)) {
            $data['status'] = $data['isActive'] ? 'active' : 'suspended';
        }

        $user->update(collect($data)->only(['name', 'email', 'role', 'status'])->all());

        if ($request->filled('password')) {
            $user->update(['password' => Hash::make($request->password)]);
            $shouldRevokeTokens = true;
        }

        if ($request->input('status') === 'suspended') {
            $shouldRevokeTokens = true;
        }

        if ($shouldRevokeTokens) {
            $user->tokens()->delete();
        }

        return response()->json(['success' => true, 'data' => new UserResource($user)]);
    }

    public function deleteUser(User $user)
    {
        $user->delete();
        return response()->json(['success' => true]);
    }

    public function listSubscriptions()
    {
        $subscriptions = Subscription::with(['user', 'plan'])->get();
        return response()->json(['success' => true, 'data' => SubscriptionResource::collection($subscriptions)]);
    }

    public function listPlans()
    {
        $plans = Plan::with('features')
            ->orderBy('sort_order')
            ->orderBy('price')
            ->get()
            ->map(fn (Plan $plan) => $this->planPayload($plan));

        return response()->json(['success' => true, 'data' => $plans]);
    }

    public function listFeatures()
    {
        $features = Feature::orderBy('name')->get()->map(fn (Feature $feature) => $this->featurePayload($feature));

        return response()->json(['success' => true, 'data' => $features]);
    }

    public function storeFeature(Request $request)
    {
        $data = $request->validate([
            'code' => 'required|string|max:100|unique:features,code',
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'type' => ['required', Rule::in(['boolean', 'limit', 'usage', 'metered'])],
            'unit' => 'nullable|string|max:50',
            'resetInterval' => 'nullable|string|max:50',
            'isActive' => 'sometimes|boolean',
        ]);

        $feature = Feature::create([
            'code' => $data['code'],
            'slug' => $data['code'],
            'name' => $data['name'],
            'description' => $data['description'] ?? null,
            'type' => $data['type'],
            'unit' => $data['unit'] ?? null,
            'reset_interval' => $data['resetInterval'] ?? null,
            'is_active' => $data['isActive'] ?? true,
        ]);

        return response()->json(['success' => true, 'data' => $this->featurePayload($feature)], 201);
    }

    public function updateFeature(Request $request, Feature $feature)
    {
        $data = $request->validate([
            'code' => ['sometimes', 'string', 'max:100', Rule::unique('features', 'code')->ignore($feature->id)],
            'name' => 'sometimes|string|max:255',
            'description' => 'nullable|string',
            'type' => ['sometimes', Rule::in(['boolean', 'limit', 'usage', 'metered'])],
            'unit' => 'nullable|string|max:50',
            'resetInterval' => 'nullable|string|max:50',
            'isActive' => 'sometimes|boolean',
        ]);

        $feature->fill([
            'code' => $data['code'] ?? $feature->code,
            'slug' => $data['code'] ?? $feature->slug,
            'name' => $data['name'] ?? $feature->name,
            'description' => array_key_exists('description', $data) ? $data['description'] : $feature->description,
            'type' => $data['type'] ?? $feature->type,
            'unit' => array_key_exists('unit', $data) ? $data['unit'] : $feature->unit,
            'reset_interval' => array_key_exists('resetInterval', $data) ? $data['resetInterval'] : $feature->reset_interval,
            'is_active' => $data['isActive'] ?? $feature->is_active,
        ])->save();

        return response()->json(['success' => true, 'data' => $this->featurePayload($feature->fresh())]);
    }

    public function storeSubscription(Request $request)
    {
        $request->validate([
            'userId' => 'required|exists:users,id',
            'planId' => 'required|string', // corresponds to plan_code or plan_id
            'startDate' => 'required|date',
            'endDate' => 'required|date',
        ]);

        $plan = Plan::where('code', $request->planId)->orWhere('id', $request->planId)->firstOrFail();

        $subscription = Subscription::create([
            'user_id' => $request->userId,
            'plan_id' => $plan->id,
            'plan_code' => $plan->code,
            'starts_at' => $request->startDate,
            'ends_at' => $request->endDate,
            'status' => 'active',
        ]);

        app(SubscriptionService::class)->clearCache($subscription->user);

        return response()->json(['success' => true, 'data' => ['id' => $subscription->id]]);
    }

    public function updateSubscription(Request $request, Subscription $subscription)
    {
        $data = $request->validate([
            'planId' => 'sometimes|string',
            'status' => 'sometimes|string',
            'endDate' => 'sometimes|date',
        ]);

        if (isset($data['planId'])) {
            $plan = Plan::where('code', $data['planId'])->orWhere('id', $data['planId'])->firstOrFail();
            $subscription->plan_id = $plan->id;
            $subscription->plan_code = $plan->code;
        }

        if (isset($data['status'])) $subscription->status = $data['status'];
        if (isset($data['endDate'])) $subscription->ends_at = $data['endDate'];

        $subscription->save();
        app(SubscriptionService::class)->clearCache($subscription->user);

        return response()->json(['success' => true]);
    }

    public function storePlan(Request $request)
    {
        $data = $this->validatePlan($request);

        $plan = DB::transaction(function () use ($data) {
            $plan = Plan::create($this->planAttributes($data));

            if (isset($data['features'])) {
                $this->syncPlanFeatures($plan, $data['features']);
            }

            return $plan;
        });

        return response()->json(['success' => true, 'data' => $this->planPayload($plan->load('features'))], 201);
    }

    public function updatePlanById(Request $request, Plan $plan)
    {
        $data = $this->validatePlan($request, $plan);

        DB::transaction(function () use ($plan, $data) {
            $plan->update($this->planAttributes($data, $plan));

            if (isset($data['features'])) {
                $this->syncPlanFeatures($plan, $data['features']);
            }
        });

        return response()->json(['success' => true, 'data' => $this->planPayload($plan->fresh()->load('features'))]);
    }

    public function updatePlanFeatures(Request $request, Plan $plan)
    {
        $data = $request->validate([
            'features' => 'required|array',
            'features.*.featureId' => 'nullable|exists:features,id',
            'features.*.code' => 'nullable|string',
            'features.*.slug' => 'nullable|string',
            'features.*.isEnabled' => 'required|boolean',
            'features.*.includedQuantity' => 'nullable|numeric|min:0',
            'features.*.limitQuantity' => 'nullable|numeric|min:0',
            'features.*.limit' => 'nullable|numeric|min:0',
            'features.*.pricePerUnitCents' => 'nullable|integer|min:0',
            'features.*.overagePriceCents' => 'nullable|integer|min:0',
            'features.*.hardLimit' => 'sometimes|boolean',
            'features.*.resetInterval' => 'nullable|string|max:50',
        ]);

        $this->syncPlanFeatures($plan, $data['features']);

        return response()->json(['success' => true, 'data' => $this->planPayload($plan->fresh()->load('features'))]);
    }

    public function updatePlan(Request $request)
    {
        $request->validate(['id' => 'required|exists:plans,id']);

        return $this->updatePlanById($request, Plan::findOrFail($request->id));
    }

    private function validatePlan(Request $request, ?Plan $plan = null): array
    {
        $required = $plan ? 'sometimes' : 'required';

        return $request->validate([
            'code' => [$required, 'string', 'max:100', Rule::unique('plans', 'code')->ignore($plan?->id)],
            'name' => [$required, 'string', 'max:255'],
            'description' => 'nullable|string',
            'billingModel' => ['sometimes', Rule::in(['fixed', 'usage', 'hybrid'])],
            'basePriceCents' => 'sometimes|integer|min:0',
            'price' => 'sometimes|numeric|min:0',
            'currency' => 'sometimes|string|size:3',
            'interval' => 'sometimes|string|max:20',
            'duration_days' => 'sometimes|integer|min:1',
            'trialDays' => 'sometimes|integer|min:0',
            'status' => 'sometimes|in:active,inactive,archived',
            'isPublic' => 'sometimes|boolean',
            'sortOrder' => 'sometimes|integer',
            'features' => 'sometimes|array',
            'features.*.featureId' => 'nullable|exists:features,id',
            'features.*.code' => 'nullable|string',
            'features.*.slug' => 'nullable|string',
            'features.*.isEnabled' => 'required_with:features|boolean',
            'features.*.includedQuantity' => 'nullable|numeric|min:0',
            'features.*.limitQuantity' => 'nullable|numeric|min:0',
            'features.*.limit' => 'nullable|numeric|min:0',
            'features.*.pricePerUnitCents' => 'nullable|integer|min:0',
            'features.*.overagePriceCents' => 'nullable|integer|min:0',
            'features.*.hardLimit' => 'sometimes|boolean',
            'features.*.resetInterval' => 'nullable|string|max:50',
        ]);
    }

    private function planAttributes(array $data, ?Plan $plan = null): array
    {
        $basePriceCents = $data['basePriceCents'] ?? ($plan?->base_price_cents ?? null);
        $price = $data['price'] ?? ($basePriceCents !== null ? round($basePriceCents / 100, 2) : $plan?->price);

        if ($basePriceCents === null) {
            $basePriceCents = (int) round(((float) ($price ?? 0)) * 100);
        }

        return [
            'code' => $data['code'] ?? $plan?->code,
            'name' => $data['name'] ?? $plan?->name,
            'description' => array_key_exists('description', $data) ? $data['description'] : $plan?->description,
            'type' => $data['billingModel'] ?? $plan?->type ?? 'fixed',
            'billing_model' => $data['billingModel'] ?? $plan?->billing_model ?? 'fixed',
            'price' => $price ?? 0,
            'base_price_cents' => $basePriceCents,
            'currency' => strtoupper($data['currency'] ?? $plan?->currency ?? 'USD'),
            'interval' => $data['interval'] ?? $plan?->interval ?? 'month',
            'duration_days' => $data['duration_days'] ?? $plan?->duration_days ?? 30,
            'trial_days' => $data['trialDays'] ?? $plan?->trial_days ?? 0,
            'status' => $data['status'] ?? $plan?->status ?? 'active',
            'is_public' => $data['isPublic'] ?? $plan?->is_public ?? true,
            'sort_order' => $data['sortOrder'] ?? $plan?->sort_order ?? 0,
        ];
    }

    private function syncPlanFeatures(Plan $plan, array $features): void
    {
        $allFeatures = Feature::all()->keyBy(fn (Feature $feature) => $feature->code ?: $feature->slug);
        $syncData = [];

        foreach ($features as $featureData) {
            $feature = null;
            if (!empty($featureData['featureId'])) {
                $feature = Feature::find($featureData['featureId']);
            }
            if (!$feature) {
                $code = $featureData['code'] ?? $featureData['slug'] ?? null;
                $feature = $code ? ($allFeatures[$code] ?? null) : null;
            }
            if (!$feature) {
                continue;
            }

            $limit = $featureData['limitQuantity'] ?? $featureData['limit'] ?? null;
            $included = $featureData['includedQuantity'] ?? $limit;

            $syncData[$feature->id] = [
                'included_quantity' => $included,
                'limit_quantity' => $limit,
                'limit_value' => $limit,
                'price_per_unit_cents' => $featureData['pricePerUnitCents'] ?? 0,
                'overage_price_cents' => $featureData['overagePriceCents'] ?? 0,
                'overage_price' => isset($featureData['overagePriceCents'])
                    ? round($featureData['overagePriceCents'] / 100, 2)
                    : 0,
                'hard_limit' => $featureData['hardLimit'] ?? true,
                'reset_interval' => $featureData['resetInterval'] ?? $feature->reset_interval,
                'is_enabled' => $featureData['isEnabled'],
            ];
        }

        $plan->features()->sync($syncData);
    }

    private function planPayload(Plan $plan): array
    {
        return [
            'id' => $plan->id,
            'code' => $plan->code,
            'name' => $plan->name,
            'description' => $plan->description,
            'billingModel' => $plan->billing_model ?? $plan->type,
            'price' => (float) $plan->price,
            'basePriceCents' => (int) $plan->base_price_cents,
            'currency' => $plan->currency,
            'interval' => $plan->interval,
            'durationDays' => (int) $plan->duration_days,
            'trialDays' => (int) $plan->trial_days,
            'status' => $plan->status,
            'isPublic' => (bool) $plan->is_public,
            'sortOrder' => (int) $plan->sort_order,
            'features' => $plan->features->map(function (Feature $feature) {
                return [
                    ...$this->featurePayload($feature),
                    'isEnabled' => (bool) ($feature->pivot->is_enabled ?? true),
                    'includedQuantity' => $feature->pivot->included_quantity ?? null,
                    'limitQuantity' => $feature->pivot->limit_quantity ?? $feature->pivot->limit_value ?? null,
                    'limit' => $feature->pivot->limit_quantity ?? $feature->pivot->limit_value ?? null,
                    'pricePerUnitCents' => (int) ($feature->pivot->price_per_unit_cents ?? 0),
                    'overagePriceCents' => (int) ($feature->pivot->overage_price_cents ?? 0),
                    'hardLimit' => (bool) ($feature->pivot->hard_limit ?? true),
                    'resetInterval' => $feature->pivot->reset_interval ?? $feature->reset_interval,
                ];
            })->values(),
        ];
    }

    private function featurePayload(Feature $feature): array
    {
        return [
            'id' => $feature->id,
            'code' => $feature->code ?: $feature->slug,
            'slug' => $feature->slug,
            'name' => $feature->name,
            'description' => $feature->description,
            'type' => $feature->type,
            'unit' => $feature->unit,
            'resetInterval' => $feature->reset_interval,
            'isActive' => (bool) $feature->is_active,
        ];
    }
}
