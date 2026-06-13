<?php

namespace App\Listeners;

use App\Events\OrderCreated;
use App\Models\DashboardNotification;
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
        $lang = $store->base_language ?? 'ar';

        $translations = [
            'ku' => [
                'new_order' => '🚀 داواکارییەکی نوێ گەیشت!',
                'store' => 'فرۆشگا',
                'buyer' => 'کڕیار',
                'total' => 'کۆی گشتی',
                'check_dashboard' => 'تکایە داشبۆرد بپشکنە بۆ بەڕێوەبردنی ئەم داواکارییە.',
                'notes' => 'تێبینییەکان',
                'items' => 'کاڵاکان',
                'location' => 'ناونیشان',
                'governorate' => 'پارێزگا',
                'district' => 'قەزا',
                'landmark' => 'نیشانە',
            ],
            'en' => [
                'new_order' => '🚀 New Order Received!',
                'store' => 'Store',
                'buyer' => 'Buyer',
                'total' => 'Total',
                'check_dashboard' => 'Please check the dashboard to manage this order.',
                'notes' => 'Notes',
                'items' => 'Items',
                'location' => 'Location',
                'governorate' => 'Governorate',
                'district' => 'District',
                'landmark' => 'Landmark',
            ],
            'ar' => [
                'new_order' => '🚀 تم استلام طلب جديد!',
                'store' => 'المتجر',
                'buyer' => 'الزبون',
                'total' => 'المجموع',
                'check_dashboard' => 'يرجى التحقق من لوحة التحكم لإدارة هذا الطلب.',
                'notes' => 'ملاحظات',
                'items' => 'المنتجات',
                'location' => 'العنوان',
                'governorate' => 'المحافظة',
                'district' => 'القضاء',
                'landmark' => 'نقطة دالة',
            ]
        ];

        $t = $translations[$lang] ?? $translations['ar'];

        $message = "<b>{$t['new_order']}</b>\n\n";
        $message .= "<b>{$t['store']}:</b> {$store->name}\n";
        $message .= "<b>{$t['buyer']}:</b> {$buyer->name} ({$buyer->phone})\n";

        // Location Info
        $address = $buyer->address;
        if (is_string($address)) {
            $address = json_decode($address, true);
        }

        if (!empty($address)) {
            $message .= "<b>{$t['location']}:</b>\n";
            if (!empty($address['governorate'])) $message .= "  • {$t['governorate']}: {$address['governorate']}\n";
            if (!empty($address['district'])) $message .= "  • {$t['district']}: {$address['district']}\n";
            if (!empty($address['landmark'])) $message .= "  • {$t['landmark']}: {$address['landmark']}\n";
        }

        $notes = $order->buyer_notes ?: $order->internal_notes;
        if ($notes) {
            $message .= "<b>{$t['notes']}:</b> {$notes}\n";
        }

        $message .= "\n<b>{$t['items']}:</b>\n";
        foreach ($order->items as $item) {
            $product = $item->product;
            $title = $product->title;

            $message .= "• {$title} x{$item->quantity}";
            if (!empty($item->options)) {
                $opts = [];
                foreach ($item->options as $k => $v) {
                    if (!empty($v)) {
                        $opts[] = "{$k}: {$v}";
                    }
                }
                if (!empty($opts)) {
                    $message .= " (" . implode(', ', $opts) . ")";
                }
            }
            $message .= "\n";
        }

        $message .= "\n<b>{$t['total']}:</b> " . number_format((float)$order->total_amount, 2) . " IQD\n\n";
        $message .= "<i>{$t['check_dashboard']}</i>";

        $notification = DashboardNotification::create([
            'user_id' => $store->user_id,
            'store_id' => $store->id,
            'order_id' => $order->id,
            'type' => 'order.created',
            'title' => $t['new_order'],
            'body' => "{$buyer->name} ({$buyer->phone}) - " . number_format((float) $order->total_amount, 2) . ' IQD',
            'metadata' => [
                'orderId' => (string) $order->id,
                'buyerId' => $buyer?->id ? (string) $buyer->id : null,
                'storeId' => (string) $store->id,
            ],
        ]);

        app(\App\Services\PushNotificationService::class)->queueForNotification($notification);

        $this->notificationService->sendTelegramNotification($store, $message, 'newOrders', [
            'orderId' => $order->id,
            'orderGroupId' => $order->id,
        ]);
    }
}
