<?php

namespace App\Services;

use App\Models\SystemEvent;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;

class SystemEventService
{
    public function record(string $type, string $message, array $context = [], string $severity = 'warning', ?string $source = null): void
    {
        $safeContext = $this->sanitize($context);

        Log::log($severity === 'critical' ? 'error' : $severity, $message, [
            'type' => $type,
            'source' => $source,
            'context' => $safeContext,
        ]);

        if (!Schema::hasTable('system_events')) {
            return;
        }

        try {
            SystemEvent::create([
                'type' => $type,
                'severity' => $severity,
                'source' => $source,
                'store_id' => $safeContext['store_id'] ?? null,
                'user_id' => $safeContext['user_id'] ?? null,
                'message' => mb_substr($message, 0, 500),
                'metadata' => $safeContext,
                'occurred_at' => now(),
            ]);
        } catch (\Throwable $exception) {
            Log::warning('System event persistence failed.', [
                'type' => $type,
                'error' => $exception->getMessage(),
            ]);
        }
    }

    private function sanitize(array $context): array
    {
        $blocked = ['token', 'secret', 'password', 'api_key', 'authorization', 'payload', 'provider_payload'];
        $safe = [];

        foreach ($context as $key => $value) {
            $normalized = strtolower((string) $key);
            if (str_contains($normalized, 'token') || str_contains($normalized, 'secret') || in_array($normalized, $blocked, true)) {
                $safe[$key] = '[redacted]';
                continue;
            }

            $safe[$key] = is_scalar($value) || $value === null ? $value : '[structured]';
        }

        return $safe;
    }
}
