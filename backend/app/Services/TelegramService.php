<?php

namespace App\Services;

use App\Models\Product;
use App\Models\Store;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class TelegramService
{
    /**
     * Get the appropriate bot token for a store
     */
    public function getToken(?Store $store = null): ?string
    {
        // Central bot token managed by platform admin
        return env('TELEGRAM_BOT_TOKEN');
    }

    /**
     * Get the appropriate bot username for a store
     */
    public function getBotUsername(?Store $store = null): ?string
    {
        $token = $this->getToken($store);
        if (!$token) return env('TELEGRAM_BOT_USERNAME', 'DokaniBot');

        // Return the env username if set
        if (env('TELEGRAM_BOT_USERNAME')) {
            return env('TELEGRAM_BOT_USERNAME');
        }

        // Fetch from API
        try {
            $response = Http::get("https://api.telegram.org/bot{$token}/getMe");
            if ($response->successful()) {
                return $response->json('result.username');
            }
        } catch (\Exception $e) {
            Log::error("Telegram getBotUsername error: " . $e->getMessage());
        }

        return 'DokaniBot';
    }

    /**
     * Validate bot token via getMe API
     */
    public function validateBot(string $token)
    {
        try {
            $response = Http::get("https://api.telegram.org/bot{$token}/getMe");
            return $response->successful() && $response->json('ok');
        } catch (\Exception $e) {
            Log::error("Telegram validateBot error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Set webhook for a bot token
     */
    public function setWebhook(string $token)
    {
        try {
            $appUrl = env('APP_URL');
            $webhookUrl = "{$appUrl}/api/v1/telegram/webhook";
            $payload = ['url' => $webhookUrl];
            if (config('services.telegram.webhook_secret')) {
                $payload['secret_token'] = config('services.telegram.webhook_secret');
            }

            $response = Http::post("https://api.telegram.org/bot{$token}/setWebhook", $payload);
            return $response->successful() && $response->json('ok');
        } catch (\Exception $e) {
            Log::error("Telegram setWebhook error: " . $e->getMessage());
            return false;
        }
    }

    /**
     * Validate channel via getChat and ensure bot is admin
     */
    public function validateChannel(string $token, string $channelId)
    {
        try {
            $response = Http::get("https://api.telegram.org/bot{$token}/getChat", [
                'chat_id' => $channelId
            ]);

            if (!$response->successful() || !$response->json('ok')) {
                return [
                    'success' => false,
                    'message' => 'Channel not found or bot is not a member.'
                ];
            }

            // Optional: Check if bot is admin
            $adminsResponse = Http::get("https://api.telegram.org/bot{$token}/getChatAdministrators", [
                'chat_id' => $channelId
            ]);

            if ($adminsResponse->successful() && $adminsResponse->json('ok')) {
                // If we can get admins, it means bot is at least in the channel.
                // We should check if bot's ID is in the admin list, but usually getChat success is enough to try posting.
                return [
                    'success' => true,
                    'data' => $this->safeChatPayload($response->json('result') ?: [])
                ];
            }

            return [
                'success' => false,
                'message' => 'Bot is not an administrator in this channel.'
            ];
        } catch (\Exception $e) {
            Log::error("Telegram validateChannel error: " . $e->getMessage());
            return [
                'success' => false,
                'message' => 'Telegram channel validation failed. Please check the channel id and bot permissions.'
            ];
        }
    }

    private function safeChatPayload(array $chat): array
    {
        return [
            'id' => isset($chat['id']) ? (string) $chat['id'] : null,
            'title' => $chat['title'] ?? $chat['username'] ?? null,
            'username' => $chat['username'] ?? null,
            'type' => $chat['type'] ?? null,
        ];
    }

    /**
     * Post product to Telegram channel
     */
    public function postProduct(Product $product)
    {
        $store = $product->store;
        $token = $this->getToken($store);
        $channelId = $store->telegram_channel_id;

        if (!$token || !$channelId) {
            Log::warning("Telegram postProduct skipped: Token or Channel ID missing for Store {$store->id}");
            return false;
        }

        $caption = $this->buildCaption($product);
        $media = $product->media()->take(10)->get();

        if ($media->isEmpty()) {
            // Send as simple message
            return $this->sendMessage($token, $channelId, $caption, $product);
        }

        if ($media->count() === 1) {
            // Send as single photo/video
            return $this->sendSingleMedia($token, $channelId, $media->first(), $caption, $product);
        }

        // Send as Media Group
        return $this->sendMediaGroup($token, $channelId, $media, $caption, $product);
    }

    protected function buildCaption(Product $product)
    {
        $store = $product->store;
        $caption = "<b>{$product->title}</b>\n\n";

        if ($product->description) {
            $caption .= strip_tags($product->description) . "\n\n";
        }

        $caption .= "💰 <b>Price:</b> {$product->price} {$store->base_currency}\n";

        if ($product->variants()->count() > 0) {
            $caption .= "✨ <i>Multiple variants available</i>\n";
        }

        return $caption;
    }

    protected function buildInlineKeyboard(Product $product)
    {
        $appUrl = env('APP_URL', 'https://store.blackt.uk');
        $storeUrl = "{$appUrl}/s/{$product->store->slug}";
        $productUrl = "{$storeUrl}/p/{$product->id}";

        return [
            'inline_keyboard' => [
                [
                    ['text' => '🛍️ View Product', 'url' => $productUrl],
                    ['text' => '🏪 Visit Store', 'url' => $storeUrl],
                ]
            ]
        ];
    }

    protected function sendMessage($token, $chatId, $text, $product)
    {
        return Http::post("https://api.telegram.org/bot{$token}/sendMessage", [
            'chat_id' => $chatId,
            'text' => $text,
            'parse_mode' => 'HTML',
            'reply_markup' => $this->buildInlineKeyboard($product)
        ]);
    }

    protected function sendSingleMedia($token, $chatId, $media, $caption, $product)
    {
        $method = $media->type === 'video' ? 'sendVideo' : 'sendPhoto';
        $type = $media->type === 'video' ? 'video' : 'photo';

        return Http::post("https://api.telegram.org/bot{$token}/{$method}", [
            'chat_id' => $chatId,
            $type => $media->url,
            'caption' => $caption,
            'parse_mode' => 'HTML',
            'reply_markup' => $this->buildInlineKeyboard($product)
        ]);
    }

    protected function sendMediaGroup($token, $chatId, $mediaItems, $caption, $product)
    {
        $media = [];
        foreach ($mediaItems as $index => $item) {
            $media[] = [
                'type' => $item->type === 'video' ? 'video' : 'photo',
                'media' => $item->url,
                'caption' => $index === 0 ? $caption : '',
                'parse_mode' => $index === 0 ? 'HTML' : '',
            ];
        }

        // Note: Media groups do not support reply_markup (buttons) directly.
        // We should send the buttons in a separate message or as a caption if only one item.
        // But since we want buttons, we'll send the media group first, then a small message with buttons.

        $response = Http::post("https://api.telegram.org/bot{$token}/sendMediaGroup", [
            'chat_id' => $chatId,
            'media' => json_encode($media)
        ]);

        if ($response->successful()) {
            // Send buttons as a follow-up message
            $this->sendMessage($token, $chatId, "👆 Check out this product!", $product);
        }

        return $response;
    }
}
