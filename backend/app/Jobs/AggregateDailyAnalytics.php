<?php

namespace App\Jobs;

use App\Services\AnalyticsAggregationService;
use App\Services\SystemEventService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class AggregateDailyAnalytics implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(public string $date, public ?int $storeId = null)
    {
        $this->onQueue('analytics');
    }

    public function backoff(): array
    {
        return [120, 600, 1800];
    }

    public function handle(AnalyticsAggregationService $aggregation): void
    {
        $aggregation->aggregateDate($this->date, $this->storeId);
    }

    public function failed(\Throwable $exception): void
    {
        app(SystemEventService::class)->record('analytics_aggregation_failed', 'Daily analytics aggregation failed.', [
            'date' => $this->date,
            'store_id' => $this->storeId,
            'error' => $exception->getMessage(),
        ], 'error', static::class);
    }
}
