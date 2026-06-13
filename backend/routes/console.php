<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;
use App\Jobs\AggregateDailyAnalytics;
use App\Models\SchedulerHeartbeat;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

Schedule::call(function () {
    SchedulerHeartbeat::updateOrCreate(
        ['name' => 'scheduler'],
        ['last_seen_at' => now(), 'metadata' => ['source' => 'routes/console.php']]
    );
})->everyFiveMinutes()->name('scheduler-heartbeat')->withoutOverlapping();

Schedule::call(function () {
    AggregateDailyAnalytics::dispatch(now()->subDay()->toDateString());
    SchedulerHeartbeat::updateOrCreate(
        ['name' => 'analytics:aggregate-daily'],
        ['last_seen_at' => now(), 'metadata' => ['date' => now()->subDay()->toDateString()]]
    );
})->dailyAt('02:15')->name('analytics-aggregate-daily')->withoutOverlapping();
