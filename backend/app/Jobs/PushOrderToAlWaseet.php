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

class PushOrderToAlWaseet implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        protected Order $order
    ) {}

    public function handle(AlWaseetManager $manager): void
    {
        if ($this->order->isSyncedWithAlWaseet()) {
            return;
        }

        try {
            $service = $manager->for($this->order->store);

            // Normalize phone number
            $phone = $this->order->customer_phone ?? $this->order->buyer->phone;
            if (!str_starts_with($phone, '+')) {
                $phone = '+' . ltrim($phone, '0');
            }
            if (str_starts_with($phone, '+9640')) {
                $phone = '+964' . substr($phone, 5);
            }
            if (!str_starts_with($phone, '+964')) {
                $phone = '+964' . ltrim($phone, '+');
            }

            $payload = [
                'client_name'    => $this->order->customer_name ?? $this->order->buyer->name,
                'client_mobile'  => $phone,
                'city_id'        => $this->order->city_id,
                'region_id'      => $this->order->region_id,
                'location'       => $this->order->address_details ?? (($this->order->buyer->governorate ?? '') . ', ' . ($this->order->buyer->district ?? '')),
                'type_name'      => $this->order->items_description ?? 'Order Items',
                'items_number'   => $this->order->items->sum('quantity') ?: 1,
                'price'          => (int) $this->order->total_amount,
                'package_size'   => $this->order->package_size_id,
                'replacement'    => 0,
                'merchant_notes' => $this->order->order_notes ?? $this->order->internal_notes,
            ];

            $res = $service->createOrder($payload);

            $this->order->update([
                'alwaseet_order_id'    => $res['qr_id'],
                'alwaseet_qr_link'     => $res['qr_link'],
                'alwaseet_sync_status' => 'sent',
                'alwaseet_synced_at'   => now(),
                'alwaseet_status'      => 'pending',
            ]);

            Log::info("Order [{$this->order->id}] pushed to Al-Waseet successfully.");

        } catch (\Exception $e) {
            Log::error("Failed to push order [{$this->order->id}] to Al-Waseet: " . $e->getMessage());

            $this->order->update([
                'alwaseet_sync_status' => 'failed',
            ]);

            throw $e;
        }
    }
}
