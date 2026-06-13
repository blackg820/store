<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Store;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use App\Services\TelegramService;

class TelegramController extends Controller
{
    protected $telegramService;

    public function __construct(TelegramService $telegramService)
    {
        $this->telegramService = $telegramService;
    }
    public function linkBot(Request $request)
    {
        $request->validate([
            'storeId' => 'required',
            'type' => 'required|in:user,group,channel'
        ]);

        $store = Store::findOrFail($request->storeId);
        $user = $request->user();
        $ownerId = $user->parent_id ?: $user->id;

        if ($user->role !== 'admin' && (int) $store->user_id !== (int) $ownerId) {
            return $this->tenantDenied();
        }

        if ($this->isReadOnlyRole($user)) {
            return $this->readOnlyDenied();
        }

        if (!app(\App\Services\SubscriptionService::class)->canUseFeature($user->tenantOwner(), 'telegram_bot')) {
            return $this->error('Your plan does not support Telegram integration.', 403, null, 'FEATURE_DISABLED');
        }

        $botUsername = $this->telegramService->getBotUsername($store);

        // Generate a unique token for this linking session
        $payload = base64_encode(json_encode([
            'store_id' => $store->id,
            'type' => $request->type,
            'user_id' => $user->id
        ]));

        if ($request->type === 'channel') {
            $deeplink = "https://t.me/{$botUsername}?start=setandChannelSetting_{$store->id}";
        } else {
            $deeplink = "https://t.me/{$botUsername}?start={$payload}";
        }

        return $this->success([
            'deeplink' => $deeplink,
            'botUsername' => $botUsername,
        ], 'Telegram link prepared.');
    }

    public function setupWebhook()
    {
        if (request()->user()?->role !== 'admin') {
            return $this->error('Admin access required.', 403, null, 'ADMIN_REQUIRED');
        }

        $token = env('TELEGRAM_BOT_TOKEN');
        if (!$token) {
            return $this->error('Telegram bot is not configured on the server.', 500, null, 'TELEGRAM_NOT_CONFIGURED');
        }

        $appUrl = env('APP_URL');
        $webhookUrl = "{$appUrl}/api/v1/telegram/webhook";

        $payload = ['url' => $webhookUrl];
        if (config('services.telegram.webhook_secret')) {
            $payload['secret_token'] = config('services.telegram.webhook_secret');
        }

        $response = Http::post("https://api.telegram.org/bot{$token}/setWebhook", $payload);

        if (!($response->successful() && $response->json('ok'))) {
            return $this->error('Telegram webhook could not be configured.', 502, null, 'TELEGRAM_WEBHOOK_FAILED', [
                'details' => [
                    'description' => $response->json('description') ?: 'Telegram rejected the webhook request.',
                ],
            ]);
        }

        return $this->success([
            'result' => [
                'ok' => (bool) $response->json('ok'),
                'description' => $response->json('description'),
            ],
        ], 'Telegram webhook configured.');
    }

    public function handleWebhook(Request $request)
    {
        if (!$this->hasValidWebhookSecret($request)) {
            Log::warning('Telegram webhook rejected: invalid secret header.');

            return response()->json(['status' => 'forbidden'], 403);
        }

        $update = $request->all();

        // Handle Private Chat Start Command
        if (isset($update['message']['text'])) {
            $text = $update['message']['text'];
            $chatId = $update['message']['chat']['id'];
            $userId = $update['message']['from']['id'];

            if (str_starts_with($text, '/start ')) {
                $payload = substr($text, 7);

                // Handle new channel setting format: setandChannelSetting_STOREID
                if (str_starts_with($payload, 'setandChannelSetting_')) {
                    $storeId = substr($payload, 21);
                    $store = Store::find($storeId);

                    if ($store) {
                        // Store pending configuration for this user
                        Cache::put("tg_pending_channel_{$userId}", $store->id, now()->addMinutes(60));

                        $botUsername = $this->telegramService->getBotUsername($store);

                        $this->sendReply($chatId, "📌 <b>Channel Link Initiated</b>\n\nYou are linking <b>{$store->name}</b> to a channel.\n\n1. Add me (@{$botUsername}) to your channel as an <b>Administrator</b>.\n2. Ensure I have permissions to <b>Post Messages</b>.\n\nI will automatically detect the channel once added!", $store);

                        $this->sendReply($chatId, "👇 Click the button below to add me to your channel:", $store, [
                            'inline_keyboard' => [
                                [
                                    ['text' => '📣 Add to Channel', 'url' => "https://t.me/{$botUsername}?startchannel=true&admin=post_messages"]
                                ]
                            ]
                        ]);
                    }
                    return response()->json(['status' => 'ok']);
                }

                // Handle legacy base64 format for user/group
                try {
                    $data = json_decode(base64_decode($payload), true);
                    if ($data && isset($data['store_id'], $data['type'])) {
                        $store = Store::find($data['store_id']);
                        if ($store) {
                            if ($data['type'] === 'user') {
                                $store->update(['telegram_user_id' => $update['message']['from']['id']]);
                            } else {
                                $store->update(['telegram_group_id' => $update['message']['chat']['id']]);
                            }

                            $this->sendReply($chatId, "✅ Store '<b>" . $store->name . "</b>' linked successfully!", $store);
                        }
                    }
                } catch (\Exception $e) {
                    Log::warning('Telegram webhook start payload failed.', [
                        'error' => $e->getMessage(),
                    ]);
                }
            }
        }

        // Handle Bot Added to Channel/Group (my_chat_member)
        if (isset($update['my_chat_member'])) {
            $chat = $update['my_chat_member']['chat'];
            $from = $update['my_chat_member']['from']; // User who added the bot
            $newMember = $update['my_chat_member']['new_chat_member'];

            if ($newMember['status'] === 'administrator' || $newMember['status'] === 'member') {
                $userId = $from['id'];
                $storeId = Cache::get("tg_pending_channel_{$userId}");

                if ($storeId) {
                    $store = Store::find($storeId);
                    if ($store) {
                        if ($chat['type'] === 'channel') {
                            $store->update(['telegram_channel_id' => $chat['id']]);
                            $this->sendReply($chat['id'], "✅ This channel is now linked to <b>{$store->name}</b>. Products will be posted here automatically.", $store);

                            // Also notify user in private
                            $this->sendReply($userId, "✅ Success! I've linked your channel '<b>{$chat['title']}</b>' to <b>{$store->name}</b>.", $store);
                            Cache::forget("tg_pending_channel_{$userId}");
                        } else if ($chat['type'] === 'group' || $chat['type'] === 'supergroup') {
                            $store->update(['telegram_group_id' => $chat['id']]);
                            $this->sendReply($chat['id'], "✅ This group is now linked to <b>{$store->name}</b> for notifications.", $store);
                            Cache::forget("tg_pending_channel_{$userId}");
                        }
                    }
                }
            }
        }

        return response()->json(['status' => 'ok']);
    }

    protected function hasValidWebhookSecret(Request $request): bool
    {
        $secret = config('services.telegram.webhook_secret');

        if (!$secret) {
            Log::warning('Telegram webhook secret is not configured; accepting webhook for compatibility.');
            return true;
        }

        return hash_equals($secret, (string) $request->header('X-Telegram-Bot-Api-Secret-Token'));
    }

    protected function sendReply($chatId, $text, $store = null, $replyMarkup = null)
    {
        $token = $this->telegramService->getToken($store);
        if (!$token) return;

        $params = [
            'chat_id' => $chatId,
            'text' => $text,
            'parse_mode' => 'HTML'
        ];

        if ($replyMarkup) {
            $params['reply_markup'] = json_encode($replyMarkup);
        }

        Http::post("https://api.telegram.org/bot{$token}/sendMessage", $params);
    }
}
