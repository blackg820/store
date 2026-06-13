<?php

namespace App\Services;

use App\Models\Store;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class NotificationService
{
    public function sendTelegramNotification(Store $store, string $message, ?string $event = null, array $context = [])
    {
        $settings = $store->notification_settings;

        // Parse settings if string
        if (is_string($settings)) {
            $settings = json_decode($settings, true) ?: [];
        }

        // Check if event is enabled
        if ($event && isset($settings[$event]) && $settings[$event] === false) {
            return true;
        }

        $method = $settings['notificationMethod'] ?? 'telegram';
        if ($method !== 'telegram' && $method !== 'both') {
            return true;
        }

        $token = app(\App\Services\TelegramService::class)->getToken($store);
        $chatIds = array_filter([
            $store->telegram_user_id,
            $store->telegram_group_id,
            $store->telegram_chat_id,
            $store->telegram_channel_id
        ]);

        if (!$token || empty($chatIds)) {
            Log::warning("Telegram notification skipped: Token or Chat IDs missing for Store {$store->id}");
            return false;
        }

        $inlineKeyboard = $this->buildInlineKeyboard($event, $context);

        foreach ($chatIds as $chatId) {
            try {
                $payload = [
                    'chat_id' => $chatId,
                    'text' => str_replace('<br/>', "\n", $message),
                    'parse_mode' => 'HTML',
                    'reply_markup' => $inlineKeyboard ? ['inline_keyboard' => $inlineKeyboard] : null,
                ];

                if ($store->telegram_message_thread_id) {
                    $payload['message_thread_id'] = $store->telegram_message_thread_id;
                }

                Http::post("https://api.telegram.org/bot{$token}/sendMessage", $payload);
            } catch (\Exception $e) {
                Log::error("Failed to send Telegram notification for Store {$store->id}: " . $e->getMessage());
            }
        }

        return true;
    }

    protected function buildInlineKeyboard(?string $event, array $context)
    {
        $keyboard = [];
        $appUrl = env('APP_URL', 'https://store.blackt.uk');

        if (isset($context['orderGroupId'])) {
            $manageUrl = "{$appUrl}/dashboard/orders?search={$context['orderGroupId']}";
            $keyboard[] = [['text' => '📁 Manage Order', 'url' => $manageUrl]];

            if ($event === 'newOrders' && isset($context['orderId'])) {
                $keyboard[] = [
                    ['text' => '✅ Confirm', 'callback_data' => "status:confirmed:{$context['orderId']}"],
                    ['text' => '📦 Delivered', 'callback_data' => "status:delivered:{$context['orderId']}"]
                ];
                $keyboard[] = [
                    ['text' => '⚠️ Problematic', 'callback_data' => "status:problematic:{$context['orderId']}"]
                ];
            }
        }

        return !empty($keyboard) ? $keyboard : null;
    }
}
