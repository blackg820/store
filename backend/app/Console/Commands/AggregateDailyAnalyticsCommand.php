<?php

namespace App\Console\Commands;

use App\Services\AnalyticsAggregationService;
use Carbon\CarbonPeriod;
use Illuminate\Console\Command;
use Illuminate\Support\Carbon;

class AggregateDailyAnalyticsCommand extends Command
{
    protected $signature = 'analytics:aggregate-daily {--date=} {--from=} {--to=} {--store=} {--retention-days=180}';

    protected $description = 'Aggregate raw analytics, orders, product, notification, and platform metrics into daily stat tables.';

    public function handle(AnalyticsAggregationService $aggregation): int
    {
        $storeId = $this->option('store') ? (int) $this->option('store') : null;
        $retentionDays = (int) $this->option('retention-days');

        if ($this->option('from') || $this->option('to')) {
            $from = Carbon::parse($this->option('from') ?: $this->option('to'))->startOfDay();
            $to = Carbon::parse($this->option('to') ?: $this->option('from'))->startOfDay();
            foreach (CarbonPeriod::create($from, $to) as $date) {
                $aggregation->aggregateDate($date, $storeId);
                $this->line('Aggregated ' . $date->toDateString());
            }
        } else {
            $date = Carbon::parse($this->option('date') ?: now()->subDay())->startOfDay();
            $aggregation->aggregateDate($date, $storeId);
            $this->line('Aggregated ' . $date->toDateString());
        }

        $deleted = $aggregation->pruneRawEvents($retentionDays);
        $this->info("Pruned {$deleted} raw analytics events older than {$retentionDays} days.");

        return self::SUCCESS;
    }
}
