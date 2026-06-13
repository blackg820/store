<?php

namespace App\Jobs;

use App\Models\DeviceToken;
use App\Services\PushNotificationService;
use App\Services\SystemEventService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SendDevicePushNotification implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(
        public int $deviceTokenId,
        public array $payload
    ) {
        $this->onQueue('notifications');
    }

    public function backoff(): array
    {
        return [60, 300, 900];
    }

    public function handle(PushNotificationService $pushNotificationService): void
    {
        $deviceToken = DeviceToken::find($this->deviceTokenId);
        if (!$deviceToken) {
            return;
        }

        $result = $pushNotificationService->sendToDevice($deviceToken, $this->payload);

        if ($result['removeToken'] ?? false) {
            Log::info('Removing invalid push device token.', [
                'deviceTokenHash' => substr((string) $deviceToken->token_hash, 0, 12) . '...',
                'reason' => $result['reason'] ?? null,
            ]);
            $deviceToken->delete();
        }

        if (!($result['success'] ?? false) && !($result['removeToken'] ?? false)) {
            $nonRetryable = [
                'unsupported_platform',
                'fcm_not_configured',
                'fcm_auth_unavailable',
                'apns_not_configured',
            ];

            if (!in_array($result['reason'] ?? null, $nonRetryable, true)) {
                throw new \RuntimeException('Push provider delivery failed.');
            }
        }
    }

    public function failed(\Throwable $exception): void
    {
        app(SystemEventService::class)->record('push_delivery_failed', 'Device push notification job failed.', [
            'device_token_id' => $this->deviceTokenId,
            'error' => $exception->getMessage(),
        ], 'error', static::class);
    }
}
