<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\SchedulerHeartbeat;
use App\Models\SystemEvent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;

class OpsController extends Controller
{
    public function health()
    {
        return $this->success([
            'status' => 'ok',
            'checks' => [
                'app' => ['status' => 'healthy'],
            ],
            'timestamp' => now()->toISOString(),
        ]);
    }

    public function deepHealth()
    {
        $checks = [
            'app' => ['status' => 'healthy'],
            'database' => $this->checkDatabase(),
            'cache' => $this->checkCache(),
            'queue' => $this->checkQueue(),
            'storage' => $this->checkStorage(),
            'bunny' => $this->checkBunny(),
            'scheduler' => $this->checkScheduler(),
        ];

        $healthy = collect($checks)->every(fn ($check) => ($check['status'] ?? 'unhealthy') === 'healthy');

        return response()->json([
            'success' => $healthy,
            'status' => $healthy ? 'ok' : 'degraded',
            'checks' => $checks,
            'timestamp' => now()->toISOString(),
        ], $healthy ? 200 : 503);
    }

    public function summary(Request $request)
    {
        $since = now()->subDay();

        return $this->success([
            'queues' => [
                'pending' => Schema::hasTable('jobs') ? DB::table('jobs')->count() : 0,
                'failed' => Schema::hasTable('failed_jobs') ? DB::table('failed_jobs')->count() : 0,
                'connection' => config('queue.default'),
            ],
            'storage' => [
                'mediaBytes' => Schema::hasTable('media') ? (int) DB::table('media')->whereNull('deleted_at')->sum('file_size') : 0,
                'bunnyConfigured' => $this->bunnyConfigured(),
            ],
            'notifications' => [
                'failedToday' => Schema::hasTable('customer_notification_deliveries')
                    ? DB::table('customer_notification_deliveries')->where('status', 'failed')->where('updated_at', '>=', $since)->count()
                    : 0,
                'queued' => Schema::hasTable('customer_notification_deliveries')
                    ? DB::table('customer_notification_deliveries')->where('status', 'queued')->count()
                    : 0,
            ],
            'integrations' => [
                'telegramFailuresToday' => $this->eventCount('telegram_failure', $since),
                'bunnyFailuresToday' => $this->eventCount('bunny_failure', $since),
            ],
            'security' => [
                'tenantDenialsToday' => $this->eventCount('tenant_access_denied', $since),
                'domainResolutionFailuresToday' => $this->eventCount('domain_resolution_failed', $since),
                'suspiciousAuthFailuresToday' => $this->eventCount('suspicious_auth_failure', $since),
            ],
            'analytics' => [
                'slowEndpointsToday' => $this->eventCount('analytics_slow_endpoint', $since),
                'lastAggregate' => Schema::hasTable('scheduler_heartbeats')
                    ? SchedulerHeartbeat::where('name', 'analytics:aggregate-daily')->value('last_seen_at')
                    : null,
            ],
            'recentEvents' => Schema::hasTable('system_events')
                ? SystemEvent::latest('occurred_at')->limit(20)->get(['id', 'type', 'severity', 'source', 'message', 'metadata', 'occurred_at'])
                : [],
        ], 'Operations summary loaded');
    }

    private function checkDatabase(): array
    {
        try {
            DB::select('select 1');
            return ['status' => 'healthy', 'connection' => config('database.default')];
        } catch (\Throwable $exception) {
            return ['status' => 'unhealthy', 'connection' => config('database.default')];
        }
    }

    private function checkCache(): array
    {
        try {
            $key = 'ops-health:' . uniqid();
            Cache::put($key, 'ok', 30);
            $healthy = Cache::get($key) === 'ok';
            Cache::forget($key);

            return ['status' => $healthy ? 'healthy' : 'unhealthy', 'store' => config('cache.default')];
        } catch (\Throwable $exception) {
            return ['status' => 'unhealthy', 'store' => config('cache.default')];
        }
    }

    private function checkQueue(): array
    {
        return [
            'status' => config('queue.default') ? 'healthy' : 'unhealthy',
            'connection' => config('queue.default'),
            'pending' => Schema::hasTable('jobs') ? DB::table('jobs')->count() : null,
            'failed' => Schema::hasTable('failed_jobs') ? DB::table('failed_jobs')->count() : null,
        ];
    }

    private function checkStorage(): array
    {
        try {
            $disk = config('filesystems.default');
            Storage::disk($disk)->exists('.');

            return ['status' => 'healthy', 'disk' => $disk];
        } catch (\Throwable $exception) {
            return ['status' => 'unhealthy', 'disk' => config('filesystems.default')];
        }
    }

    private function checkBunny(): array
    {
        return [
            'status' => $this->bunnyConfigured() ? 'healthy' : 'degraded',
            'configured' => $this->bunnyConfigured(),
        ];
    }

    private function checkScheduler(): array
    {
        if (!Schema::hasTable('scheduler_heartbeats')) {
            return ['status' => 'degraded', 'lastSeenAt' => null];
        }

        $lastSeen = SchedulerHeartbeat::where('name', 'scheduler')->value('last_seen_at');
        $healthy = $lastSeen && now()->diffInMinutes($lastSeen) <= 10;

        return ['status' => $healthy ? 'healthy' : 'degraded', 'lastSeenAt' => $lastSeen];
    }

    private function bunnyConfigured(): bool
    {
        return filled(config('services.bunny.storage_zone')) && filled(config('services.bunny.pull_zone'));
    }

    private function eventCount(string $type, $since): int
    {
        if (!Schema::hasTable('system_events')) {
            return 0;
        }

        return SystemEvent::where('type', $type)->where('occurred_at', '>=', $since)->count();
    }
}
