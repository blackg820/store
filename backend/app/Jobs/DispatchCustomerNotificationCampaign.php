<?php

namespace App\Jobs;

use App\Models\CustomerNotificationCampaign;
use App\Models\CustomerNotificationDelivery;
use App\Models\CustomerNotificationSubscription;
use App\Services\SystemEventService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class DispatchCustomerNotificationCampaign implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(public int $campaignId)
    {
        $this->onQueue('notifications');
    }

    public function handle(): void
    {
        $campaign = CustomerNotificationCampaign::find($this->campaignId);
        if (!$campaign || !in_array($campaign->status, ['scheduled', 'sending'], true)) {
            return;
        }

        $campaign->update(['status' => 'sending']);

        $segment = $campaign->segment ?? [];
        $subscriptions = CustomerNotificationSubscription::query()
            ->where('store_id', $campaign->store_id)
            ->whereNull('unsubscribed_at')
            ->when($campaign->channels, fn ($q) => $q->whereIn('channel', $campaign->channels))
            ->when(data_get($segment, 'riskLevel'), function ($q, $riskLevel) {
                $q->whereHas('globalCustomer', fn ($customerQuery) => $customerQuery->where('risk_level', $riskLevel));
            })
            ->limit((int) data_get($segment, 'limit', 5000))
            ->get();

        foreach ($subscriptions as $subscription) {
            CustomerNotificationDelivery::firstOrCreate(
                [
                    'campaign_id' => $campaign->id,
                    'subscription_id' => $subscription->id,
                ],
                [
                    'store_id' => $campaign->store_id,
                    'buyer_id' => $subscription->buyer_id,
                    'global_customer_id' => $subscription->global_customer_id,
                    'channel' => $subscription->channel,
                    'status' => 'queued',
                    'queued_at' => now(),
                    'metadata' => [
                        'templateLocale' => data_get($campaign->template, 'defaultLocale', $subscription->language),
                    ],
                ]
            );
        }

        // Provider-specific delivery workers can consume queued delivery rows.
        $campaign->update([
            'status' => 'sent',
            'sent_at' => now(),
        ]);
    }

    public function backoff(): array
    {
        return [120, 600, 1800];
    }

    public function failed(\Throwable $exception): void
    {
        $campaign = CustomerNotificationCampaign::find($this->campaignId);
        $campaign?->update(['status' => 'failed']);

        app(SystemEventService::class)->record('notification_campaign_failed', 'Customer notification campaign dispatch failed.', [
            'campaign_id' => $this->campaignId,
            'store_id' => $campaign?->store_id,
            'error' => $exception->getMessage(),
        ], 'error', static::class);
    }
}
