<?php

namespace App\Jobs;

use App\Services\AlWaseetManager;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;

class SyncAlWaseetStatusDictionary implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function handle(AlWaseetManager $manager): void
    {
        // Use a store that has Al-Waseet enabled to fetch the dictionary
        $store = \App\Models\Store::where('alwaseet_enabled', true)
            ->whereNotNull('alwaseet_username')
            ->first();

        if (!$store) {
            return;
        }

        try {
            $service = $manager->for($store);
            $statuses = $service->getOrderStatuses();

            // Store in cache for 24h
            Cache::put('alwaseet_status_dictionary', $statuses, now()->addHours(24));

            Log::info("Al-Waseet status dictionary synced.");
        } catch (\Exception $e) {
            Log::error("Failed to sync Al-Waseet status dictionary: " . $e->getMessage());
        }
    }
}
