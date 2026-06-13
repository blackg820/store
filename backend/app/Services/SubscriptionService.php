<?php

namespace App\Services;

use App\Models\Feature;
use App\Models\Plan;
use App\Models\Subscription;
use App\Models\SubscriptionUsage;
use App\Models\User;
use App\Models\UserLimit;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

class SubscriptionService
{
    private const FEATURE_ALIASES = [
        'storage' => 'storage_gb',
        'stores_limit' => 'stores',
        'employees_limit' => 'employees',
        'products_per_store' => 'products',
        'products_limit' => 'products',
        'monthly_orders' => 'orders_per_month',
        'orders' => 'orders_per_month',
        'max_stores' => 'stores',
        'max_products' => 'products',
        'max_employees' => 'employees',
        'telegram_bots' => 'telegram_bot',
        'custom_domains' => 'custom_domain',
        'marketing_notifications' => 'customer_notifications',
        'customer_notification_campaigns' => 'customer_notifications',
        'notification_scheduling' => 'scheduled_notifications',
        'translated_notification_templates' => 'notification_templates',
        'integrations_count' => 'alwaseet_integration',
        'price_per_storage_gb' => 'storage_gb',
        'api_request_limit' => 'api_requests',
    ];

    private const USER_LIMIT_KEYS = [
        'stores' => 'max_stores',
        'products' => 'max_products',
        'employees' => 'max_employees',
        'storage_gb' => 'storage_gb',
        'api_requests' => 'api_requests',
        'telegram_bot' => 'telegram_bots',
        'alwaseet_integration' => 'integrations_count',
        'custom_domain' => 'custom_domains',
    ];

    private const DEFAULT_LIMITS = [
        'max_stores' => 1,
        'max_products' => 50,
        'max_employees' => 0,
        'storage_gb' => 5,
        'api_requests' => 100000,
        'telegram_bots' => 0,
        'integrations_count' => 0,
        'custom_domains' => 0,
    ];

    private const DEFAULT_PRICING = [
        'price_per_store' => 0,
        'price_per_product' => 0,
        'price_per_employee' => 0,
        'price_per_storage_gb' => 0,
        'price_per_telegram_bot' => 0,
        'price_per_integration' => 0,
        'price_per_custom_domain' => 0,
    ];

    public function ownerFor(User $user): User
    {
        return $user->parent ?: $user;
    }

    public function canonicalFeatureCode(string $featureCode): string
    {
        return self::FEATURE_ALIASES[$featureCode] ?? $featureCode;
    }

    public function canUseFeature(User $user, string $featureCode, float $increment = 0): bool
    {
        $user = $this->ownerFor($user);
        $featureCode = $this->canonicalFeatureCode($featureCode);

        if ($featureCode === 'orders_per_month') {
            return true;
        }

        if ($this->hasUnlimitedAccess($user)) {
            return true;
        }

        $userLimit = $this->getUserLimit($user);
        if ($userLimit && $this->usesCustomLimit($featureCode)) {
            return $this->checkUserLimit($userLimit, $featureCode, 0, $increment)['allowed'];
        }

        $subscription = $this->getActiveSubscription($user);
        if (!$subscription) {
            if ($this->usesCustomLimit($featureCode)) {
                return $this->checkDefaultUserLimit($featureCode, 0, $increment)['allowed'];
            }

            return false;
        }

        $feature = $this->findFeature($featureCode);
        if (!$feature) {
            if ($this->usesCustomLimit($featureCode)) {
                return $this->checkDefaultUserLimit($featureCode, 0, $increment)['allowed'];
            }

            return false;
        }

        $planFeature = $this->planFeature($subscription, $feature);
        if (!$planFeature) {
            if ($this->usesCustomLimit($featureCode)) {
                return $this->checkDefaultUserLimit($featureCode, 0, $increment)['allowed'];
            }

            return false;
        }

        if (!$this->pivotEnabled($planFeature)) {
            if ($this->usesCustomLimit($featureCode)) {
                return $this->checkDefaultUserLimit($featureCode, 0, $increment)['allowed'];
            }

            return false;
        }

        if ($this->isBooleanFeature($feature)) {
            return true;
        }

        $limit = $this->pivotLimit($planFeature);
        if ($limit === null) {
            return true;
        }

        if (!$this->pivotHardLimit($planFeature)) {
            return true;
        }

        $currentUsage = $this->getFeatureUsage($subscription, $feature);

        return ($currentUsage + $increment) <= $limit;
    }

    public function recordUsage(User $user, string $featureCode, float $amount = 1, ?string $idempotencyKey = null, array $metadata = []): void
    {
        $user = $this->ownerFor($user);
        $subscription = $this->getActiveSubscription($user);
        $feature = $this->findFeature($featureCode);

        if (!$subscription || !$feature || $amount == 0) {
            return;
        }

        DB::transaction(function () use ($subscription, $feature, $amount, $idempotencyKey, $metadata) {
            if ($idempotencyKey && SchemaSafe::tableExists('usage_records')) {
                $exists = DB::table('usage_records')->where('idempotency_key', $idempotencyKey)->exists();
                if ($exists) {
                    return;
                }

                DB::table('usage_records')->insert([
                    'subscription_id' => $subscription->id,
                    'feature_id' => $feature->id,
                    'idempotency_key' => $idempotencyKey,
                    'quantity' => $amount,
                    'metadata' => json_encode($metadata),
                    'recorded_at' => now(),
                    'created_at' => now(),
                    'updated_at' => now(),
                ]);
            }

            $usage = SubscriptionUsage::firstOrCreate(
                ['subscription_id' => $subscription->id, 'feature_id' => $feature->id],
                ['used_count' => 0, 'last_reset_at' => now()]
            );

            $usage->increment('used_count', $amount);
        });
    }

    public function getFeatureUsage(Subscription $subscription, Feature $feature): float
    {
        return (float) (SubscriptionUsage::where('subscription_id', $subscription->id)
            ->where('feature_id', $feature->id)
            ->value('used_count') ?? 0);
    }

    public function getActiveSubscription(User $user): ?Subscription
    {
        $user = $this->ownerFor($user);

        if ($this->hasUnlimitedAccess($user)) {
            return null;
        }

        $cacheKey = "user_{$user->id}_active_sub_id";
        $subscriptionId = Cache::remember($cacheKey, 300, function () use ($user) {
            return $this->activeSubscriptionQuery($user)->value('id');
        });

        if (!$subscriptionId) {
            Cache::forget("user_{$user->id}_active_sub");
            return null;
        }

        $subscription = Subscription::with('plan.features')->find($subscriptionId);
        if (!$subscription) {
            Cache::forget($cacheKey);
            Cache::forget("user_{$user->id}_active_sub");
            return $this->getActiveSubscription($user);
        }

        return $subscription;
    }

    public function clearCache(User $user): void
    {
        $user = $this->ownerFor($user);
        Cache::forget("user_{$user->id}_active_sub");
        Cache::forget("user_{$user->id}_active_sub_id");
    }

    public function checkLimit(User $user, string $featureCode, float $currentValue, float $increment = 1): array
    {
        $user = $this->ownerFor($user);
        $featureCode = $this->canonicalFeatureCode($featureCode);

        if ($featureCode === 'orders_per_month') {
            return $this->allowed([
                'feature' => $featureCode,
                'used' => $currentValue,
                'limit' => null,
            ]);
        }

        if ($this->hasUnlimitedAccess($user)) {
            return $this->allowed();
        }

        $userLimit = $this->getUserLimit($user);
        if ($userLimit && $this->usesCustomLimit($featureCode)) {
            return $this->checkUserLimit($userLimit, $featureCode, $currentValue, $increment);
        }

        $subscription = $this->getActiveSubscription($user);
        if (!$subscription) {
            if ($this->usesCustomLimit($featureCode)) {
                return $this->checkDefaultUserLimit($featureCode, $currentValue, $increment);
            }

            return $this->denied('NO_ACTIVE_SUBSCRIPTION', 'No active subscription found. Please upgrade your plan.', [
                'feature' => $featureCode,
                'used' => $currentValue,
            ]);
        }

        $feature = $this->findFeature($featureCode);
        if (!$feature) {
            if ($this->usesCustomLimit($featureCode)) {
                return $this->checkDefaultUserLimit($featureCode, $currentValue, $increment);
            }

            return $this->denied('FEATURE_NOT_CONFIGURED', "Feature '{$featureCode}' is not configured.", [
                'feature' => $featureCode,
                'used' => $currentValue,
            ]);
        }

        $planFeature = $this->planFeature($subscription, $feature);
        if (!$planFeature || !$this->pivotEnabled($planFeature)) {
            if ($this->usesCustomLimit($featureCode)) {
                return $this->checkDefaultUserLimit($featureCode, $currentValue, $increment);
            }

            return $this->denied('FEATURE_DISABLED', "Your current plan does not include {$feature->name}.", [
                'feature' => $featureCode,
                'used' => $currentValue,
            ], $this->recommendedPlan($feature, $currentValue + $increment));
        }

        if ($this->isBooleanFeature($feature)) {
            return $this->allowed();
        }

        $limit = $this->pivotLimit($planFeature);
        if ($limit === null || !$this->pivotHardLimit($planFeature)) {
            return $this->allowed([
                'feature' => $featureCode,
                'limit' => $limit,
                'used' => $currentValue,
            ]);
        }

        if (($currentValue + $increment) > $limit) {
            return $this->denied('PLAN_LIMIT_REACHED', "{$feature->name} limit reached.", [
                'feature' => $featureCode,
                'limit' => $limit,
                'used' => $currentValue,
            ], $this->recommendedPlan($feature, $currentValue + $increment));
        }

        return $this->allowed([
            'feature' => $featureCode,
            'limit' => $limit,
            'used' => $currentValue,
        ]);
    }

    public function checkRecordedUsageLimit(User $user, string $featureCode, float $increment = 1): array
    {
        $user = $this->ownerFor($user);
        $subscription = $this->getActiveSubscription($user);
        $feature = $this->findFeature($featureCode);

        if (!$subscription || !$feature) {
            return $this->checkLimit($user, $featureCode, 0, $increment);
        }

        return $this->checkLimit($user, $featureCode, $this->getFeatureUsage($subscription, $feature), $increment);
    }

    public function calculatePlanPrice(Plan $plan, array $quantities = []): array
    {
        $plan->loadMissing('features');

        $baseCents = (int) ($plan->base_price_cents ?: round(((float) $plan->price) * 100));
        $lines = [[
            'type' => 'base',
            'label' => $plan->name,
            'quantity' => 1,
            'unitPriceCents' => $baseCents,
            'amountCents' => $baseCents,
        ]];

        $totalCents = $baseCents;

        foreach ($plan->features as $feature) {
            $code = $feature->code ?: $feature->slug;
            $quantity = (float) ($quantities[$code] ?? 0);
            if ($quantity <= 0 || $this->isBooleanFeature($feature)) {
                continue;
            }

            $included = (float) ($feature->pivot->included_quantity ?? $feature->pivot->limit_value ?? 0);
            $billable = max(0, $quantity - $included);
            $unitCents = (int) ($feature->pivot->price_per_unit_cents ?: $feature->pivot->overage_price_cents ?: round(((float) $feature->pivot->overage_price) * 100));

            if ($billable <= 0 || $unitCents <= 0) {
                continue;
            }

            $amountCents = (int) round($billable * $unitCents);
            $totalCents += $amountCents;
            $lines[] = [
                'type' => 'usage',
                'feature' => $code,
                'label' => $feature->name,
                'quantity' => $billable,
                'unitPriceCents' => $unitCents,
                'amountCents' => $amountCents,
            ];
        }

        return [
            'currency' => $plan->currency ?? 'USD',
            'interval' => $plan->interval ?? 'month',
            'basePriceCents' => $baseCents,
            'totalCents' => $totalCents,
            'total' => round($totalCents / 100, 2),
            'lines' => $lines,
        ];
    }

    public function calculateUserLimitPrice(array $limits = [], array $pricing = [], int $basePriceCents = 0, string $currency = 'USD'): array
    {
        $limits = $this->normalizeUserLimits($limits);
        $pricing = $this->normalizeUserPricing($pricing);

        $lineMap = [
            ['limit' => 'max_stores', 'price' => 'price_per_store', 'label' => 'Stores'],
            ['limit' => 'max_products', 'price' => 'price_per_product', 'label' => 'Products'],
            ['limit' => 'max_employees', 'price' => 'price_per_employee', 'label' => 'Employees'],
            ['limit' => 'storage_gb', 'price' => 'price_per_storage_gb', 'label' => 'Storage GB'],
            ['limit' => 'telegram_bots', 'price' => 'price_per_telegram_bot', 'label' => 'Telegram bots'],
            ['limit' => 'integrations_count', 'price' => 'price_per_integration', 'label' => 'Integrations'],
            ['limit' => 'custom_domains', 'price' => 'price_per_custom_domain', 'label' => 'Custom domains'],
        ];

        $lines = [[
            'type' => 'base',
            'label' => 'Base price',
            'quantity' => 1,
            'unitPriceCents' => max(0, $basePriceCents),
            'amountCents' => max(0, $basePriceCents),
        ]];

        $totalCents = max(0, $basePriceCents);

        foreach ($lineMap as $line) {
            $quantity = max(0, (float) ($limits[$line['limit']] ?? 0));
            $unitCents = max(0, (int) ($pricing[$line['price']] ?? 0));
            $amountCents = (int) round($quantity * $unitCents);

            $totalCents += $amountCents;

            $lines[] = [
                'type' => 'limit',
                'feature' => $line['limit'],
                'label' => $line['label'],
                'quantity' => $quantity,
                'unitPriceCents' => $unitCents,
                'amountCents' => $amountCents,
            ];
        }

        return [
            'currency' => strtoupper($currency ?: 'USD'),
            'interval' => 'month',
            'basePriceCents' => max(0, $basePriceCents),
            'totalCents' => $totalCents,
            'total' => round($totalCents / 100, 2),
            'limits' => $limits,
            'pricing' => $pricing,
            'lines' => $lines,
        ];
    }

    public function upsertUserLimits(User $user, array $limits = [], array $pricing = [], int $basePriceCents = 0, string $currency = 'USD'): UserLimit
    {
        $user = $this->ownerFor($user);
        $invoice = $this->calculateUserLimitPrice($limits, $pricing, $basePriceCents, $currency);

        $userLimit = UserLimit::updateOrCreate(
            ['user_id' => $user->id],
            [
                'limits' => $invoice['limits'],
                'pricing' => $invoice['pricing'],
                'base_price_cents' => $invoice['basePriceCents'],
                'total_price_cents' => $invoice['totalCents'],
                'currency' => $invoice['currency'],
            ]
        );

        $this->clearCache($user);

        return $userLimit;
    }

    public function usageSummary(User $user): array
    {
        $user = $this->ownerFor($user);
        $subscription = $this->getActiveSubscription($user);
        if (!$subscription) {
            return [];
        }

        $subscription->loadMissing('plan.features');

        return $subscription->plan->features->map(function (Feature $feature) use ($subscription) {
            $limit = $this->pivotLimit($feature);
            return [
                'feature' => $feature->code ?: $feature->slug,
                'name' => $feature->name,
                'type' => $feature->type,
                'unit' => $feature->unit,
                'used' => $this->getFeatureUsage($subscription, $feature),
                'limit' => $limit,
                'enabled' => $this->pivotEnabled($feature),
            ];
        })->values()->all();
    }

    private function hasUnlimitedAccess(User $user): bool
    {
        return $user->role === 'admin' || $user->mode === 'unlimited' || $user->subscription_plan === 'unlimited';
    }

    private function getUserLimit(User $user): ?UserLimit
    {
        return UserLimit::where('user_id', $user->id)->first();
    }

    private function usesCustomLimit(string $featureCode): bool
    {
        return array_key_exists($featureCode, self::USER_LIMIT_KEYS);
    }

    private function checkUserLimit(UserLimit $userLimit, string $featureCode, float $currentValue, float $increment = 1): array
    {
        $limitKey = self::USER_LIMIT_KEYS[$featureCode] ?? null;
        if (!$limitKey) {
            return $this->allowed();
        }

        $limits = $this->normalizeUserLimits($userLimit->limits ?? []);
        $limit = (float) ($limits[$limitKey] ?? 0);

        if ($limit < 0) {
            return $this->allowed([
                'feature' => $featureCode,
                'limit' => null,
                'used' => $currentValue,
            ]);
        }

        if (in_array($featureCode, ['telegram_bot', 'alwaseet_integration', 'custom_domain'], true)) {
            if ($limit <= 0) {
                return $this->denied('FEATURE_DISABLED', "This feature is not enabled for this account.", [
                    'feature' => $featureCode,
                    'limit' => 0,
                    'used' => $currentValue,
                ]);
            }

            return $this->allowed([
                'feature' => $featureCode,
                'limit' => $limit,
                'used' => $currentValue,
            ]);
        }

        if (($currentValue + $increment) > $limit) {
            return $this->denied('PLAN_LIMIT_REACHED', "Account limit reached.", [
                'feature' => $featureCode,
                'limit' => $limit,
                'used' => $currentValue,
            ]);
        }

        return $this->allowed([
            'feature' => $featureCode,
            'limit' => $limit,
            'used' => $currentValue,
        ]);
    }

    private function checkDefaultUserLimit(string $featureCode, float $currentValue, float $increment = 1): array
    {
        return $this->checkUserLimit(new UserLimit(['limits' => self::DEFAULT_LIMITS]), $featureCode, $currentValue, $increment);
    }

    private function normalizeUserLimits(array $limits): array
    {
        return array_merge(self::DEFAULT_LIMITS, collect($limits)
            ->only(array_keys(self::DEFAULT_LIMITS))
            ->map(fn ($value) => is_numeric($value) ? (float) $value : 0)
            ->all());
    }

    private function normalizeUserPricing(array $pricing): array
    {
        return array_merge(self::DEFAULT_PRICING, collect($pricing)
            ->only(array_keys(self::DEFAULT_PRICING))
            ->map(fn ($value) => is_numeric($value) ? (int) $value : 0)
            ->all());
    }

    private function activeSubscriptionQuery(User $user)
    {
        return Subscription::where('user_id', $user->id)
            ->whereIn('status', ['active', 'trialing', 'past_due'])
            ->where(function ($q) {
                $q->whereNull('ends_at')
                    ->orWhere('ends_at', '>', now())
                    ->orWhereNull('current_period_end')
                    ->orWhere('current_period_end', '>', now());
            })
            ->latest('id');
    }

    private function findFeature(string $featureCode): ?Feature
    {
        $featureCode = $this->canonicalFeatureCode($featureCode);

        return Feature::where('code', $featureCode)
            ->orWhere('slug', $featureCode)
            ->first();
    }

    private function planFeature(Subscription $subscription, Feature $feature): ?Feature
    {
        $subscription->loadMissing('plan.features');

        return $subscription->plan?->features->firstWhere('id', $feature->id);
    }

    private function pivotEnabled(Feature $planFeature): bool
    {
        return (bool) ($planFeature->pivot->is_enabled ?? true);
    }

    private function pivotLimit(Feature $planFeature): ?float
    {
        $limit = $planFeature->pivot->limit_quantity ?? $planFeature->pivot->limit_value ?? null;

        return $limit === null ? null : (float) $limit;
    }

    private function pivotHardLimit(Feature $planFeature): bool
    {
        return (bool) ($planFeature->pivot->hard_limit ?? true);
    }

    private function isBooleanFeature(Feature $feature): bool
    {
        return $feature->type === 'boolean';
    }

    private function recommendedPlan(Feature $feature, float $needed): ?array
    {
        $plans = Plan::with('features')
            ->where('status', 'active')
            ->orderBy('sort_order')
            ->orderBy('price')
            ->get();

        foreach ($plans as $plan) {
            $planFeature = $plan->features->firstWhere('id', $feature->id);
            if (!$planFeature || !$this->pivotEnabled($planFeature)) {
                continue;
            }

            if ($this->isBooleanFeature($feature) || $this->pivotLimit($planFeature) === null || $this->pivotLimit($planFeature) >= $needed) {
                return [
                    'id' => $plan->id,
                    'code' => $plan->code,
                    'name' => $plan->name,
                ];
            }
        }

        return null;
    }

    private function allowed(array $details = []): array
    {
        return [
            'allowed' => true,
            'code' => 'OK',
            'message' => 'OK',
            'details' => $details,
        ];
    }

    private function denied(string $code, string $message, array $details = [], ?array $upgrade = null): array
    {
        return [
            'allowed' => false,
            'code' => $code,
            'message' => $message,
            'details' => $details,
            'upgrade' => $upgrade ? ['recommendedPlan' => $upgrade] : null,
        ];
    }
}

class SchemaSafe
{
    public static function tableExists(string $table): bool
    {
        try {
            return \Illuminate\Support\Facades\Schema::hasTable($table);
        } catch (\Throwable) {
            return false;
        }
    }
}
