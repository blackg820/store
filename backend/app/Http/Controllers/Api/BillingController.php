<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\SubscriptionResource;
use App\Models\Media;
use App\Models\Plan;
use App\Models\Product;
use App\Models\Store;
use App\Services\SubscriptionService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BillingController extends Controller
{
    public function calculate(Request $request, SubscriptionService $subscriptions)
    {
        $data = $request->validate([
            'planId' => 'nullable',
            'quantities' => 'sometimes|array',
            'limits' => 'sometimes|array',
            'pricing' => 'sometimes|array',
            'basePriceCents' => 'sometimes|integer|min:0',
            'currency' => 'sometimes|string|size:3',
        ]);

        $quantities = $data['quantities'] ?? [];

        if (isset($data['limits']) || isset($data['pricing'])) {
            return $this->success($subscriptions->calculateUserLimitPrice(
                $data['limits'] ?? [],
                $data['pricing'] ?? [],
                (int) ($data['basePriceCents'] ?? 0),
                $data['currency'] ?? 'USD'
            ));
        }

        if (!empty($data['planId'])) {
            $plan = Plan::where('id', $data['planId'])
                ->orWhere('code', $data['planId'])
                ->with('features')
                ->firstOrFail();

            return $this->success($subscriptions->calculatePlanPrice($plan, $quantities));
        }

        $plans = Plan::where('status', 'active')
            ->where('is_public', true)
            ->with('features')
            ->orderBy('sort_order')
            ->orderBy('price')
            ->get()
            ->map(fn (Plan $plan) => [
                'plan' => $this->planPayload($plan),
                'invoice' => $subscriptions->calculatePlanPrice($plan, $quantities),
            ]);

        return $this->success($plans);
    }

    public function current(Request $request, SubscriptionService $subscriptions)
    {
        $owner = $request->user()->tenantOwner();
        $subscription = $subscriptions->getActiveSubscription($owner);

        return $this->success([
            'subscription' => $subscription ? new SubscriptionResource($subscription->load('plan.features')) : null,
            'usage' => $this->liveUsage($owner),
            'limits' => $this->limitsPayload($owner),
            'pricing' => $this->pricingPayload($owner),
            'unlimited' => $owner->role === 'admin' || $owner->mode === 'unlimited',
        ]);
    }

    public function usage(Request $request)
    {
        return $this->success($this->liveUsage($request->user()->tenantOwner()));
    }

    public function checkoutSession(Request $request)
    {
        $data = $request->validate([
            'planId' => 'required',
        ]);

        $plan = Plan::where('id', $data['planId'])
            ->orWhere('code', $data['planId'])
            ->where('status', 'active')
            ->firstOrFail();

        $owner = $request->user()->tenantOwner();
        $checkoutUrlTemplate = config('services.billing.checkout_url') ?: env('BILLING_CHECKOUT_URL');

        if ($checkoutUrlTemplate) {
            $checkoutUrl = strtr($checkoutUrlTemplate, [
                '{plan}' => urlencode((string) $plan->code),
                '{planId}' => urlencode((string) $plan->id),
                '{user}' => urlencode((string) $owner->id),
                '{email}' => urlencode((string) $owner->email),
            ]);

            return $this->success([
                'mode' => 'provider_redirect',
                'provider' => config('services.billing.provider', env('BILLING_PROVIDER', 'external')),
                'plan' => $this->planPayload($plan),
                'checkoutUrl' => $checkoutUrl,
            ], 'Checkout session prepared.');
        }

        $supportPhone = preg_replace('/\D+/', '', (string) DB::table('global_settings')
            ->where('setting_key', 'saas_contact_whatsapp')
            ->value('setting_value'));
        $message = rawurlencode("Upgrade request for {$plan->name} plan. Account: {$owner->email}");

        return $this->success([
            'mode' => 'manual_approval',
            'provider' => 'manual',
            'plan' => $this->planPayload($plan),
            'checkoutUrl' => $supportPhone ? "https://wa.me/{$supportPhone}?text={$message}" : null,
            'instructions' => 'Automated checkout is not configured. Manual approval is available through platform support.',
        ], 'Manual checkout handoff prepared.');
    }

    private function liveUsage($owner): array
    {
        $storeIds = $owner->stores()->pluck('id');

        $storageBytes = (int) Media::whereIn('store_id', $storeIds)->whereNull('deleted_at')->sum('file_size');

        return [
            'storage_gb' => round($storageBytes / 1024 / 1024 / 1024, 4),
            'stores' => $storeIds->count(),
            'employees' => $owner->employees()->count(),
            'products' => Product::whereIn('store_id', $storeIds)->count(),
            'storageUsedGb' => round($storageBytes / 1024 / 1024 / 1024, 4),
            'storesUsed' => $storeIds->count(),
            'employeesUsed' => $owner->employees()->count(),
            'productsUsed' => Product::whereIn('store_id', $storeIds)->count(),
            'telegramBotsUsed' => Store::whereIn('id', $storeIds)
                ->where(function ($query) {
                    $query->whereNotNull('telegram_chat_id')
                        ->orWhereNotNull('telegram_group_id')
                        ->orWhereNotNull('telegram_channel_id')
                        ->orWhereNotNull('telegram_user_id');
                })->count(),
            'integrationsUsed' => Store::whereIn('id', $storeIds)->where('alwaseet_enabled', true)->count(),
            'customDomainsUsed' => 0,
        ];
    }

    private function limitsPayload($owner): array
    {
        $limit = $owner->userLimit;
        $limits = $limit?->limits ?? [];

        return [
            'max_stores' => $limits['max_stores'] ?? $limits['stores'] ?? $limits['maxStores'] ?? null,
            'max_products' => $limits['max_products'] ?? $limits['products'] ?? $limits['maxProducts'] ?? null,
            'max_employees' => $limits['max_employees'] ?? $limits['employees'] ?? $limits['maxEmployees'] ?? null,
            'storage_gb' => $limits['storage_gb'] ?? $limits['storageGb'] ?? null,
            'api_requests' => $limits['api_requests'] ?? $limits['apiRequests'] ?? null,
            'telegram_bots' => $limits['telegram_bots'] ?? $limits['telegramBots'] ?? null,
            'integrations_count' => $limits['integrations_count'] ?? $limits['integrations'] ?? $limits['integrationsCount'] ?? null,
            'custom_domains' => $limits['custom_domains'] ?? $limits['customDomains'] ?? null,
            'maxStores' => $limits['max_stores'] ?? $limits['stores'] ?? $limits['maxStores'] ?? null,
            'maxProducts' => $limits['max_products'] ?? $limits['products'] ?? $limits['maxProducts'] ?? null,
            'maxEmployees' => $limits['max_employees'] ?? $limits['employees'] ?? $limits['maxEmployees'] ?? null,
            'storageGb' => $limits['storage_gb'] ?? $limits['storageGb'] ?? null,
            'apiRequests' => $limits['api_requests'] ?? $limits['apiRequests'] ?? null,
            'telegramBots' => $limits['telegram_bots'] ?? $limits['telegramBots'] ?? null,
            'integrationsCount' => $limits['integrations_count'] ?? $limits['integrations'] ?? $limits['integrationsCount'] ?? null,
            'customDomains' => $limits['custom_domains'] ?? $limits['customDomains'] ?? null,
        ];
    }

    private function pricingPayload($owner): array
    {
        $limit = $owner->userLimit;
        $pricing = $limit?->pricing ?? [];

        return [
            'basePrice' => (int) ($limit?->base_price_cents ?? 0),
            'basePriceCents' => (int) ($limit?->base_price_cents ?? 0),
            'pricePerStore' => (int) ($pricing['stores'] ?? $pricing['pricePerStore'] ?? 0),
            'pricePerProduct' => (int) ($pricing['products'] ?? $pricing['pricePerProduct'] ?? 0),
            'pricePerEmployee' => (int) ($pricing['employees'] ?? $pricing['pricePerEmployee'] ?? 0),
            'pricePerStorageGb' => (int) ($pricing['storage_gb'] ?? $pricing['pricePerStorageGb'] ?? 0),
            'pricePerTelegramBot' => (int) ($pricing['telegram_bots'] ?? $pricing['pricePerTelegramBot'] ?? 0),
            'pricePerIntegration' => (int) ($pricing['integrations'] ?? $pricing['pricePerIntegration'] ?? 0),
            'pricePerCustomDomain' => (int) ($pricing['custom_domains'] ?? $pricing['pricePerCustomDomain'] ?? 0),
            'totalPrice' => (int) ($limit?->total_price_cents ?? 0),
            'totalPriceCents' => (int) ($limit?->total_price_cents ?? 0),
            'currency' => $limit?->currency ?? 'USD',
        ];
    }

    private function planPayload(Plan $plan): array
    {
        return [
            'id' => $plan->id,
            'code' => $plan->code,
            'name' => $plan->name,
            'billingModel' => $plan->billing_model,
            'basePriceCents' => (int) $plan->base_price_cents,
            'currency' => $plan->currency,
            'interval' => $plan->interval,
        ];
    }
}
