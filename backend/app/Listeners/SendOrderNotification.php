<?php

namespace App\Listeners;

use App\Events\OrderCreated;
use App\Services\NotificationService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Queue\InteractsWithQueue;

class SendOrderNotification implements ShouldQueue
{
    use InteractsWithQueue;

    protected $notificationService;

    public function __construct(NotificationService $notificationService)
    {
        $this->notificationService = $notificationService;
    }

    public function handle(OrderCreated $event): void
    {
        $order = $event->order;
        $store = $order->store;
        $buyer = $order->buyer;

        $message = "<b>🚀 New Order Received!</b>\n\n";
        $message .= "<b>Store:</b> {$store->name}\n";
        $message .= "<b>Buyer:</b> {$buyer->name} ({$buyer->phone})\n";
        $message .= "<b>Total:</b> " . number_format((float)$order->total_amount, 2) . " IQD\n\n";
        $message .= "<i>Please check the dashboard to manage this order.</i>";

        $this->notificationService->sendTelegramNotification($store, $message, 'newOrders', [
            'orderId' => $order->id,
            'orderGroupId' => $order->id, // Simplified for now
        ]);
    }
}
