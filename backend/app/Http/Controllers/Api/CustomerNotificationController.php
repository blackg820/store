<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Jobs\DispatchCustomerNotificationCampaign;
use App\Models\Buyer;
use App\Models\CustomerNotificationCampaign;
use App\Models\CustomerNotificationDelivery;
use App\Models\CustomerNotificationSubscription;
use App\Models\Store;
use App\Services\CustomerRiskService;
use App\Services\SubscriptionService;
use App\Services\SystemEventService;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class CustomerNotificationController extends Controller
{
    public function subscriptions(Request $request)
    {
        $store = $this->authorizedStore($request, $request->integer('storeId'));
        if (!$store) {
            return $this->tenantDenied();
        }

        $subscriptions = CustomerNotificationSubscription::query()
            ->where('store_id', $store->id)
            ->latest()
            ->paginate($request->integer('limit') ?: 20);

        return $this->success($subscriptions, 'Customer notification subscriptions loaded');
    }

    public function subscribe(Request $request)
    {
        $data = $request->validate([
            'storeId' => 'required|integer|exists:stores,id',
            'phone' => 'required|string|max:32',
            'channel' => ['required', Rule::in(['pwa', 'mobile', 'telegram'])],
            'language' => 'nullable|string|in:ar,en,ku',
            'endpoint' => 'nullable|string|max:2000',
            'keys' => 'nullable|array',
            'metadata' => 'nullable|array',
        ]);

        $store = Store::findOrFail($data['storeId']);
        if (($store->status ?? 'inactive') !== 'active') {
            return $this->error('Store is not available.', 403, null, 'STORE_UNAVAILABLE');
        }

        $risk = app(CustomerRiskService::class);
        $phone = $risk->normalizePhone($data['phone']);
        $globalCustomer = $risk->ensureForPhone($phone);
        $buyer = Buyer::withoutGlobalScopes()
            ->where('user_id', $store->user_id)
            ->where('phone', $phone)
            ->first();

        $endpointHash = filled($data['endpoint'] ?? null) ? hash('sha256', $data['endpoint']) : null;
        $identity = [
            'store_id' => $store->id,
            'channel' => $data['channel'],
        ];
        if ($endpointHash) {
            $identity['endpoint_hash'] = $endpointHash;
        } else {
            $identity['phone'] = $phone;
        }

        $subscription = CustomerNotificationSubscription::updateOrCreate(
            $identity,
            [
                'buyer_id' => $buyer?->id,
                'global_customer_id' => $globalCustomer->id,
                'phone' => $phone,
                'endpoint_hash' => $endpointHash,
                'language' => $data['language'] ?? $store->default_language ?? 'ar',
                'endpoint' => $data['endpoint'] ?? null,
                'keys' => $data['keys'] ?? null,
                'metadata' => $data['metadata'] ?? [],
                'subscribed_at' => now(),
                'unsubscribed_at' => null,
            ]
        );

        return $this->success([
            'id' => (string) $subscription->id,
            'channel' => $subscription->channel,
            'language' => $subscription->language,
            'subscribedAt' => $subscription->subscribed_at?->toISOString(),
        ], 'Customer notification subscription saved', 201);
    }

    public function unsubscribe(Request $request)
    {
        $data = $request->validate([
            'storeId' => 'required|integer|exists:stores,id',
            'channel' => ['required', Rule::in(['pwa', 'mobile', 'telegram'])],
            'endpoint' => 'nullable|string|max:2000',
            'phone' => 'nullable|string|max:32',
        ]);

        $query = CustomerNotificationSubscription::where('store_id', $data['storeId'])
            ->where('channel', $data['channel']);

        if ($data['endpoint'] ?? null) {
            $query->where('endpoint_hash', hash('sha256', $data['endpoint']));
        } elseif ($data['phone'] ?? null) {
            $query->where('phone', app(CustomerRiskService::class)->normalizePhone($data['phone']));
        } else {
            return $this->error('Endpoint or phone is required.', 422);
        }

        $query->update(['unsubscribed_at' => now()]);

        return $this->success(['unsubscribed' => true], 'Customer notification subscription removed');
    }

    public function campaigns(Request $request)
    {
        $store = $this->authorizedStore($request, $request->integer('storeId'));
        if (!$store) {
            return $this->tenantDenied();
        }

        $campaigns = CustomerNotificationCampaign::withCount('deliveries')
            ->where('store_id', $store->id)
            ->latest()
            ->paginate($request->integer('limit') ?: 20);

        return $this->success($campaigns, 'Customer notification campaigns loaded');
    }

    public function storeCampaign(Request $request)
    {
        $data = $request->validate([
            'storeId' => 'required|integer|exists:stores,id',
            'name' => 'required|string|max:255',
            'channels' => 'required|array|min:1',
            'channels.*' => [Rule::in(['pwa', 'mobile', 'telegram'])],
            'segment' => 'nullable|array',
            'template' => 'required|array',
            'template.title' => 'required_without:template.translations|string|max:255',
            'template.body' => 'required_without:template.translations|string|max:1000',
            'template.translations' => 'nullable|array',
            'scheduledAt' => 'nullable|date',
            'status' => ['nullable', Rule::in(['draft', 'scheduled'])],
        ]);

        $store = $this->authorizedStore($request, (int) $data['storeId'], true);
        if (!$store) {
            return $this->tenantDenied();
        }

        $scheduledAt = isset($data['scheduledAt']) ? \Carbon\Carbon::parse($data['scheduledAt']) : null;
        $status = $data['status'] ?? 'scheduled';
        $owner = $store->user;
        $subscription = app(SubscriptionService::class);

        if (!$subscription->canUseFeature($owner, 'customer_notifications')) {
            return $this->error('Your plan does not support customer marketing notifications.', 403, null, 'FEATURE_DISABLED');
        }

        if ($scheduledAt && $scheduledAt->isFuture() && !$subscription->canUseFeature($owner, 'scheduled_notifications')) {
            return $this->error('Your plan does not support scheduled customer notifications.', 403, null, 'FEATURE_DISABLED');
        }

        if (!empty($data['template']['translations'] ?? null) && !$subscription->canUseFeature($owner, 'notification_templates')) {
            return $this->error('Your plan does not support translated notification templates.', 403, null, 'FEATURE_DISABLED');
        }

        $campaign = CustomerNotificationCampaign::create([
            'store_id' => $store->id,
            'created_by' => $request->user()->id,
            'name' => $data['name'],
            'status' => $status,
            'channels' => $data['channels'],
            'segment' => $data['segment'] ?? [],
            'template' => $data['template'],
            'scheduled_at' => $scheduledAt,
        ]);

        if ($status !== 'draft') {
            DispatchCustomerNotificationCampaign::dispatch($campaign->id)
                ->delay($scheduledAt && $scheduledAt->isFuture() ? $scheduledAt : now());
        }

        return $this->success($campaign, $status === 'draft' ? 'Customer notification campaign saved as draft' : 'Customer notification campaign scheduled', 201);
    }

    public function deliveries(Request $request, CustomerNotificationCampaign $campaign)
    {
        $store = $this->authorizedStore($request, $campaign->store_id);
        if (!$store) {
            return $this->tenantDenied();
        }

        $deliveries = CustomerNotificationDelivery::where('campaign_id', $campaign->id)
            ->latest()
            ->paginate($request->integer('limit') ?: 50);

        return $this->success($deliveries, 'Customer notification deliveries loaded');
    }

    public function markOpened(Request $request, CustomerNotificationDelivery $delivery)
    {
        $delivery->update([
            'status' => in_array($delivery->status, ['clicked'], true) ? $delivery->status : 'opened',
            'opened_at' => $delivery->opened_at ?: now(),
        ]);

        return $this->success(['opened' => true], 'Notification open tracked');
    }

    public function markClicked(Request $request, CustomerNotificationDelivery $delivery)
    {
        $delivery->update([
            'status' => 'clicked',
            'opened_at' => $delivery->opened_at ?: now(),
            'clicked_at' => $delivery->clicked_at ?: now(),
        ]);

        return $this->success(['clicked' => true], 'Notification click tracked');
    }

    private function authorizedStore(Request $request, ?int $storeId, bool $mutating = false): ?Store
    {
        if (!$storeId || !$request->user()) {
            return null;
        }

        $store = Store::find($storeId);
        if (!$store) {
            return null;
        }

        $user = $request->user();
        if ($user->role === 'admin') {
            return $store;
        }

        if ($mutating && in_array($user->role, ['employee', 'support', 'viewer'], true)) {
            return null;
        }

        $ownerId = $user->parent_id ?: $user->id;

        return (int) $store->user_id === (int) $ownerId ? $store : null;
    }
}
