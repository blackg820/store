<?php

namespace App\Services;

use App\Models\DashboardNotification;
use App\Models\DeviceToken;
use App\Models\Store;
use Firebase\JWT\JWT;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class PushNotificationService
{
    public function queueForNotification(DashboardNotification $notification): int
    {
        $query = DeviceToken::query()
            ->where('user_id', $notification->user_id)
            ->where(function ($scope) use ($notification) {
                $scope->whereNull('store_id');

                if ($notification->store_id) {
                    $scope->orWhere('store_id', $notification->store_id);
                }
            });

        $count = 0;
        $query->each(function (DeviceToken $deviceToken) use ($notification, &$count) {
            \App\Jobs\SendDevicePushNotification::dispatch(
                $deviceToken->id,
                [
                    'title' => $notification->title,
                    'body' => $notification->body,
                    'data' => [
                        'notificationId' => (string) $notification->id,
                        'type' => (string) $notification->type,
                        'storeId' => $notification->store_id ? (string) $notification->store_id : '',
                        'orderId' => $notification->order_id ? (string) $notification->order_id : '',
                    ],
                ]
            );
            $count++;
        });

        return $count;
    }

    public function sendToDevice(DeviceToken $deviceToken, array $payload): array
    {
        return match ($deviceToken->platform) {
            'android', 'web' => $this->sendFcm($deviceToken, $payload),
            'ios' => $this->sendApns($deviceToken, $payload),
            default => ['success' => false, 'removeToken' => false, 'reason' => 'unsupported_platform'],
        };
    }

    private function sendFcm(DeviceToken $deviceToken, array $payload): array
    {
        $projectId = config('services.push.fcm.project_id');
        if (!$projectId) {
            Log::warning('Push delivery skipped: FCM project is not configured.', [
                'deviceTokenHash' => $this->redactedHash($deviceToken),
                'platform' => $deviceToken->platform,
            ]);

            return ['success' => false, 'removeToken' => false, 'reason' => 'fcm_not_configured'];
        }

        $accessToken = $this->fcmAccessToken();
        if (!$accessToken) {
            return ['success' => false, 'removeToken' => false, 'reason' => 'fcm_auth_unavailable'];
        }

        $response = Http::withToken($accessToken)
            ->acceptJson()
            ->post("https://fcm.googleapis.com/v1/projects/{$projectId}/messages:send", [
                'message' => [
                    'token' => $deviceToken->token,
                    'notification' => [
                        'title' => (string) ($payload['title'] ?? ''),
                        'body' => (string) ($payload['body'] ?? ''),
                    ],
                    'data' => $this->stringData($payload['data'] ?? []),
                ],
            ]);

        if ($response->successful()) {
            return ['success' => true, 'removeToken' => false, 'reason' => null];
        }

        $body = $response->json();
        $status = (string) data_get($body, 'error.status', '');
        $message = (string) data_get($body, 'error.message', '');
        $errorCode = (string) collect(data_get($body, 'error.details', []))
            ->pluck('errorCode')
            ->filter()
            ->first();
        $removeToken = in_array($status, ['NOT_FOUND', 'UNREGISTERED'], true)
            || in_array($errorCode, ['UNREGISTERED', 'INVALID_ARGUMENT'], true)
            || str_contains($message, 'registration token is not a valid FCM registration token')
            || str_contains($message, 'Requested entity was not found');

        Log::warning('FCM push delivery failed.', [
            'deviceTokenHash' => $this->redactedHash($deviceToken),
            'status' => $response->status(),
            'providerStatus' => $status ?: null,
            'removeToken' => $removeToken,
        ]);

        return ['success' => false, 'removeToken' => $removeToken, 'reason' => $status ?: 'fcm_error'];
    }

    private function sendApns(DeviceToken $deviceToken, array $payload): array
    {
        $keyId = config('services.push.apns.key_id');
        $teamId = config('services.push.apns.team_id');
        $bundleId = config('services.push.apns.bundle_id');
        $privateKey = $this->apnsPrivateKey();

        if (!$keyId || !$teamId || !$bundleId || !$privateKey) {
            Log::warning('Push delivery skipped: APNs is not configured.', [
                'deviceTokenHash' => $this->redactedHash($deviceToken),
            ]);

            return ['success' => false, 'removeToken' => false, 'reason' => 'apns_not_configured'];
        }

        $jwt = JWT::encode([
            'iss' => $teamId,
            'iat' => time(),
        ], $privateKey, 'ES256', $keyId);

        $host = config('services.push.apns.environment') === 'sandbox'
            ? 'https://api.sandbox.push.apple.com'
            : 'https://api.push.apple.com';

        $response = Http::withToken($jwt)
            ->withHeaders([
                'apns-topic' => $bundleId,
                'apns-push-type' => 'alert',
                'apns-priority' => '10',
            ])
            ->post("{$host}/3/device/{$deviceToken->token}", [
                'aps' => [
                    'alert' => [
                        'title' => (string) ($payload['title'] ?? ''),
                        'body' => (string) ($payload['body'] ?? ''),
                    ],
                    'sound' => 'default',
                ],
                'data' => $this->stringData($payload['data'] ?? []),
            ]);

        if ($response->successful()) {
            return ['success' => true, 'removeToken' => false, 'reason' => null];
        }

        $reason = (string) ($response->json('reason') ?? 'apns_error');
        $removeToken = in_array($reason, ['BadDeviceToken', 'DeviceTokenNotForTopic', 'Unregistered'], true);

        Log::warning('APNs push delivery failed.', [
            'deviceTokenHash' => $this->redactedHash($deviceToken),
            'status' => $response->status(),
            'providerReason' => $reason,
            'removeToken' => $removeToken,
        ]);

        return ['success' => false, 'removeToken' => $removeToken, 'reason' => $reason];
    }

    private function fcmAccessToken(): ?string
    {
        return Cache::remember('push:fcm:access_token', now()->addMinutes(50), function () {
            $credentials = $this->fcmCredentials();
            if (!$credentials || empty($credentials['client_email']) || empty($credentials['private_key'])) {
                Log::warning('FCM service account credentials are not configured.');
                return null;
            }

            $jwt = JWT::encode([
                'iss' => $credentials['client_email'],
                'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
                'aud' => 'https://oauth2.googleapis.com/token',
                'iat' => time(),
                'exp' => time() + 3600,
            ], $credentials['private_key'], 'RS256');

            $response = Http::asForm()->post('https://oauth2.googleapis.com/token', [
                'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                'assertion' => $jwt,
            ]);

            if (!$response->successful()) {
                Log::warning('FCM access token request failed.', ['status' => $response->status()]);
                return null;
            }

            return $response->json('access_token');
        });
    }

    private function fcmCredentials(): ?array
    {
        $json = config('services.push.fcm.service_account_json');
        if ($json) {
            $decoded = json_decode($json, true);
            return is_array($decoded) ? $decoded : null;
        }

        $path = config('services.push.fcm.service_account_path');
        if ($path && is_readable($path)) {
            $decoded = json_decode((string) file_get_contents($path), true);
            return is_array($decoded) ? $decoded : null;
        }

        return null;
    }

    private function apnsPrivateKey(): ?string
    {
        $key = config('services.push.apns.private_key');
        if ($key) {
            return str_replace('\n', "\n", $key);
        }

        $path = config('services.push.apns.private_key_path');
        if ($path && is_readable($path)) {
            return (string) file_get_contents($path);
        }

        return null;
    }

    private function stringData(array $data): array
    {
        return collect($data)
            ->mapWithKeys(fn ($value, $key) => [(string) $key => is_scalar($value) ? (string) $value : json_encode($value)])
            ->all();
    }

    private function redactedHash(DeviceToken $deviceToken): string
    {
        return substr((string) $deviceToken->token_hash, 0, 12) . '...';
    }
}
