<?php

namespace App\Jobs;

use App\Models\Order;
use App\Services\AlWaseetManager;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;
use Illuminate\Support\Facades\Log;

class SyncAlWaseetStatuses implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function handle(AlWaseetManager $manager): void
    {
        // Get orders that were sent but not yet finalized
        $orders = Order::where('alwaseet_sync_status', 'sent')
            ->whereNotNull('alwaseet_order_id')
            ->orderBy('alwaseet_synced_at', 'desc')
            ->get()
            ->groupBy('store_id');

        foreach ($orders as $storeId => $storeOrders) {
            try {
                $store = $storeOrders->first()->store;
                $service = $manager->for($store);

                // Chunk by 25 (API limit)
                foreach ($storeOrders->chunk(25) as $chunk) {
                    $ids = $chunk->pluck('alwaseet_order_id')->toArray();
                    $updates = $service->getOrdersByIds($ids);

                    foreach ($updates as $update) {
                        $order = $chunk->firstWhere('alwaseet_order_id', $update['qr_id']);
                        if ($order) {
                            $order->update([
                                'alwaseet_status' => $update['status_id'],
                            ]);
                        }
                    }

                    // Respect rate limits: 1 second delay between batches
                    if ($storeOrders->count() > 25) {
                        sleep(1);
                    }
                }
            } catch (\Exception $e) {
                Log::error("Failed to sync Al-Waseet statuses for store [{$storeId}]: " . $e->getMessage());
            }
        }
    }
}
