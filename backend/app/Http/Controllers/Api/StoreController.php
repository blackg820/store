<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Store;
use App\Models\Media;
use App\Http\Resources\StoreResource;
use App\Http\Resources\MediaResource;
use App\Services\BunnyMediaService;
use App\Services\DomainTenantService;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Storage;

class StoreController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $isAdmin = $user->role === 'admin';
        $ownerId = $user->parent_id ?: $user->id;

        $query = Store::query()->withCount('products');

        if (!$isAdmin) {
            $query->where('user_id', $ownerId);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%$search%")
                  ->orWhere('slug', 'like', "%$search%");
            });
        }

        $stores = $query->orderBy('created_at', 'desc')->paginate($request->limit ?? 10);

        return $this->success(StoreResource::collection($stores));
    }

    public function formOptions(Request $request)
    {
        $user = $request->user();

        return $this->success([
            'statuses' => $this->statusValues(),
            'languages' => ['ar', 'en', 'ku'],
            'currencies' => ['IQD'],
            'uploadRules' => [
                'logo' => ['mimeTypes' => ['image/jpeg', 'image/png', 'image/webp', 'image/gif'], 'maxSizeKb' => 10240],
                'cover' => ['mimeTypes' => ['image/jpeg', 'image/png', 'image/webp', 'image/gif'], 'maxSizeKb' => 20480],
            ],
            'permissions' => [
                'canCreate' => $user->role === 'admin' || !in_array($user->role, ['employee', 'support', 'viewer'], true),
                'canUploadBranding' => $user->role === 'admin' || !in_array($user->role, ['employee', 'support', 'viewer'], true),
            ],
            'reservedSubdomains' => DomainTenantService::RESERVED_SUBDOMAINS,
        ], 'Store form options loaded');
    }

    public function checkSlug(Request $request)
    {
        $data = $request->validate([
            'slug' => 'required|string|max:255',
            'ignoreStoreId' => 'nullable|integer|exists:stores,id',
        ]);

        $available = !Store::query()
            ->when($data['ignoreStoreId'] ?? null, fn ($query, $storeId) => $query->where('id', '!=', $storeId))
            ->where('slug', $data['slug'])
            ->exists();

        return $this->success([
            'slug' => $data['slug'],
            'available' => $available,
        ], 'Store slug checked');
    }

    public function checkDomain(Request $request)
    {
        $data = $request->validate([
            'subdomain' => 'nullable|string|max:63',
            'customDomain' => 'nullable|string|max:255',
            'ignoreStoreId' => 'nullable|integer|exists:stores,id',
        ]);

        $service = app(DomainTenantService::class);

        try {
            $subdomain = array_key_exists('subdomain', $data)
                ? $service->validateSubdomain($data['subdomain'], $data['ignoreStoreId'] ?? null)
                : null;
            $customDomain = array_key_exists('customDomain', $data)
                ? $service->validateCustomDomain($data['customDomain'], $data['ignoreStoreId'] ?? null)
                : null;
        } catch (\Illuminate\Validation\ValidationException $e) {
            return $this->error('Domain is not available.', 422, $e->errors(), 'DOMAIN_NOT_AVAILABLE');
        }

        return $this->success([
            'subdomain' => $subdomain,
            'customDomain' => $customDomain,
            'available' => true,
            'reservedSubdomains' => DomainTenantService::RESERVED_SUBDOMAINS,
        ], 'Store domain checked');
    }

    public function show(Request $request, Store $store)
    {
        $user = $request->user();
        $ownerId = $user?->parent_id ?: $user?->id;
        if (!$user || ($user->role !== 'admin' && (int) $store->user_id !== (int) $ownerId)) {
            return $this->error('Access denied', 403);
        }

        $store->loadCount('products');
        return $this->success(new StoreResource($store));
    }

    public function store(\App\Http\Requests\StoreRequest $request)
    {
        $user = $request->user();
        if ($user->role === 'employee' || $this->isReadOnlyRole($user)) {
            return $this->error('Employees cannot create stores', 403);
        }

        $owner = $user->tenantOwner();
        $domainService = app(DomainTenantService::class);
        $subdomain = $domainService->validateSubdomain($request->input('subdomain'), null);
        $customDomain = $domainService->validateCustomDomain($request->input('customDomain', $request->input('custom_domain')), null);

        // Plan limits check
        $subService = app(\App\Services\SubscriptionService::class);
        if ($customDomain && !$subService->canUseFeature($owner, 'custom_domain')) {
            return $this->error('Your plan does not support custom domains.', 403, null, 'FEATURE_DISABLED');
        }
        $check = $subService->checkLimit($owner, 'stores', $owner->stores()->count());
        if (!$check['allowed']) {
            return $this->limitError($check);
        }

        $store = Store::create([
            'user_id' => $owner->id,
            'name' => $request->name,
            'slug' => $request->slug,
            'subdomain' => $subdomain,
            'custom_domain' => $customDomain,
            'domain_verified_at' => null,
            'whatsapp_number' => $request->whatsappNumber,
            'description' => $request->description ?? '',
            'bio' => $request->bio ?? $request->profileDescription,
            'default_language' => $request->defaultLanguage ?? 'ar',
            'logo_url' => $request->logoUrl ?? $request->profilePhotoUrl,
            'cover_url' => $request->coverUrl ?? $request->coverPhotoUrl,
            'facebook_url' => $request->facebookUrl,
            'instagram_url' => $request->instagramUrl,
            'tiktok_url' => $request->tiktokUrl,
            'youtube_url' => $request->youtubeUrl,
            'twitter_url' => $request->twitterUrl,
            'telegram_url' => $request->telegramUrl,
            'snapchat_url' => $request->snapchatUrl,
            'website_url' => $request->websiteUrl,
            'status' => 'active',
            'checkout_enabled' => $request->boolean('checkoutEnabled', true),
            'base_currency' => 'IQD',
            'base_language' => $request->defaultLanguage ?? 'ar',
            'delivery_time' => $request->deliveryDays ?? 3,
            'telegram_user_id' => $request->telegramUserId,
            'telegram_group_id' => $request->telegramGroupId,
            'telegram_chat_id' => $request->telegramChatId,
            'telegram_channel_id' => $request->telegramChannelId,
            'telegram_auto_post' => $request->boolean('telegramAutoPost', false),
            'telegram_message_thread_id' => $request->messageThreadId ?? $request->telegramMessageThreadId,
            'theme_settings' => $request->themeSettings,
            'notification_settings' => $request->notificationSettings,
        ]);

        return $this->success(new StoreResource($store), 'Store created successfully', 201);
    }

    public function update(\App\Http\Requests\StoreRequest $request, Store $store)
    {
        $user = $request->user();
        if ($user->role === 'employee' || $this->isReadOnlyRole($user)) {
            return $this->error('Employees can only manage products and categories.', 403);
        }

        $ownerId = $user->parent_id ?: $user->id;
        if ($user->role !== 'admin' && (int) $store->user_id !== (int) $ownerId) {
            return $this->error('Access denied', 403);
        }

        $data = $request->validated();

        // Map camelCase to snake_case for the model
        $mappedData = $this->mapSettingsData($data, $store, true);

        // Include themeSettings if in request
        if ($request->has('themeSettings')) $mappedData['theme_settings'] = $request->themeSettings;

        $store->update($mappedData);
        app(DomainTenantService::class)->forget($store);

        return $this->success(new StoreResource($store), 'Store updated successfully');
    }

    public function settings(Request $request, Store $store)
    {
        if (!$this->canManageStore($request, $store, false)) {
            return $this->error('You do not have access to this store', 403);
        }

        return $this->success(new StoreResource($store), 'Store settings loaded');
    }

    public function updateSettings(Request $request, Store $store)
    {
        if (!$this->canManageStore($request, $store, true)) {
            return $this->error('You do not have access to this store', 403);
        }

        $data = $request->validate($this->settingsRules());
        $store->update($this->mapSettingsData($data, $store, false));
        app(DomainTenantService::class)->forget($store);

        return $this->success(new StoreResource($store->fresh()), 'Store settings saved successfully');
    }

    public function updateStatus(Request $request, Store $store)
    {
        if (!$this->canManageStore($request, $store, true)) {
            return $this->error('You do not have access to this store', 403);
        }

        $data = $request->validate([
            'isOpen' => 'sometimes|boolean',
            'status' => ['sometimes', Rule::in($this->statusValues())],
            'checkoutEnabled' => 'sometimes|boolean',
        ]);

        $updates = [];
        if (array_key_exists('status', $data)) {
            $updates['status'] = $data['status'];
        }
        if (array_key_exists('isOpen', $data)) {
            $updates['status'] = $data['isOpen'] ? 'active' : 'closed';
        }
        if (array_key_exists('checkoutEnabled', $data)) {
            $updates['checkout_enabled'] = (bool) $data['checkoutEnabled'];
        }

        if ($updates === []) {
            return $this->error('No status fields were provided.', 422);
        }

        $store->update($updates);

        return $this->success(new StoreResource($store->fresh()), 'Store status updated successfully');
    }

    public function open(Request $request, Store $store)
    {
        return $this->setOperationalState($request, $store, ['status' => 'active'], 'Store opened successfully');
    }

    public function close(Request $request, Store $store)
    {
        return $this->setOperationalState($request, $store, ['status' => 'closed'], 'Store closed successfully');
    }

    public function toggleAcceptingOrders(Request $request, Store $store)
    {
        if (!$this->canManageStore($request, $store, true)) {
            return $this->error('You do not have access to this store', 403);
        }

        $store->update(['checkout_enabled' => !$store->checkout_enabled]);

        return $this->success(new StoreResource($store->fresh()), 'Store order acceptance updated');
    }

    public function uploadLogo(Request $request, Store $store)
    {
        return $this->uploadBrandAsset($request, $store, 'logo');
    }

    public function deleteLogo(Request $request, Store $store)
    {
        return $this->deleteBrandAsset($request, $store, 'logo');
    }

    public function uploadCover(Request $request, Store $store)
    {
        return $this->uploadBrandAsset($request, $store, 'cover');
    }

    public function deleteCover(Request $request, Store $store)
    {
        return $this->deleteBrandAsset($request, $store, 'cover');
    }

    public function telegramSettings(Request $request, Store $store)
    {
        if (!$this->canManageStore($request, $store, false)) {
            return $this->error('You do not have access to this store', 403);
        }

        return $this->success($this->telegramSettingsPayload($store), 'Telegram settings loaded');
    }

    public function updateTelegramSettings(Request $request, Store $store)
    {
        if (!$this->canManageStore($request, $store, true)) {
            return $this->error('You do not have access to this store', 403);
        }

        $data = $request->validate([
            'enabled' => 'sometimes|boolean',
            'chatId' => 'nullable|string|max:255',
            'telegramChatId' => 'nullable|string|max:255',
            'telegramChannelId' => 'nullable|string|max:255',
            'telegramGroupId' => 'nullable|string|max:255',
            'messageThreadId' => 'nullable|string|max:255',
            'telegramMessageThreadId' => 'nullable|string|max:255',
            'autoPostProducts' => 'sometimes|boolean',
            'telegramAutoPost' => 'sometimes|boolean',
            'notificationLanguage' => 'nullable|string|in:ar,en,ku',
            'botToken' => 'prohibited',
            'telegramToken' => 'prohibited',
            'token' => 'prohibited',
        ]);

        $settings = $store->notification_settings ?? [];
        if (is_string($settings)) {
            $settings = json_decode($settings, true) ?: [];
        }

        if (array_key_exists('enabled', $data)) {
            $settings['notificationMethod'] = $data['enabled'] ? 'telegram' : 'none';
        }
        if (array_key_exists('notificationLanguage', $data)) {
            $settings['language'] = $data['notificationLanguage'];
        }

        $updates = [
            'telegram_chat_id' => $data['chatId'] ?? $data['telegramChatId'] ?? $store->telegram_chat_id,
            'telegram_channel_id' => $data['telegramChannelId'] ?? $store->telegram_channel_id,
            'telegram_group_id' => $data['telegramGroupId'] ?? $store->telegram_group_id,
            'telegram_message_thread_id' => $data['messageThreadId'] ?? $data['telegramMessageThreadId'] ?? $store->telegram_message_thread_id,
            'telegram_auto_post' => $data['autoPostProducts'] ?? $data['telegramAutoPost'] ?? $store->telegram_auto_post,
            'notification_settings' => $settings,
        ];

        $store->update($updates);

        return $this->success($this->telegramSettingsPayload($store->fresh()), 'Telegram settings saved successfully');
    }

    public function testTelegramSettings(Request $request, Store $store)
    {
        if (!$this->canManageStore($request, $store, true)) {
            return $this->error('You do not have access to this store', 403);
        }

        $token = app(\App\Services\TelegramService::class)->getToken();
        if (!$token) {
            return $this->error('Telegram bot token is not configured', 500);
        }

        $sent = app(\App\Services\NotificationService::class)->sendTelegramNotification(
            $store,
            '<b>Test notification</b>' . "\n" . 'Your store Telegram notifications are configured.',
            'testNotification'
        );

        if (!$sent) {
            return $this->error('Telegram test notification could not be sent. Check chat or channel settings.', 422);
        }

        return $this->success(['sent' => true], 'Test notification sent successfully');
    }

    public function validateTelegramBot(Request $request)
    {
        $token = app(\App\Services\TelegramService::class)->getToken();
        if (!$token) {
            return $this->error('Telegram bot token is not configured on the server.', 500);
        }

        $success = app(\App\Services\TelegramService::class)->validateBot($token);
        return $this->success(['valid' => $success]);
    }

    public function validateTelegramChannel(Request $request)
    {
        $token = app(\App\Services\TelegramService::class)->getToken();
        if (!$token) {
            return $this->error('Telegram bot token is not configured on the server.', 500);
        }

        $request->validate([
            'channelId' => 'required|string'
        ]);
        $result = app(\App\Services\TelegramService::class)->validateChannel($token, $request->channelId);
        return $this->success($result);
    }

    public function destroy(Request $request, Store $store)
    {
        $user = $request->user();
        if ($user?->role === 'employee') {
            return $this->error('Employees can only manage products and categories.', 403);
        }

        $ownerId = $user?->parent_id ?: $user?->id;
        if (!$user || ($user->role !== 'admin' && (int) $store->user_id !== (int) $ownerId)) {
            return $this->error('Access denied', 403);
        }

        $store->delete();

        return $this->success(null, 'Store deleted successfully');
    }

    private function canManageStore(Request $request, Store $store, bool $mutating): bool
    {
        $user = $request->user();
        if (!$user) {
            return false;
        }

        if ($user->role === 'admin') {
            return true;
        }

        if ($mutating && ($user->role === 'employee' || $this->isReadOnlyRole($user))) {
            return false;
        }

        $ownerId = $user->parent_id ?: $user->id;

        return (int) $store->user_id === (int) $ownerId;
    }

    private function setOperationalState(Request $request, Store $store, array $updates, string $message)
    {
        if (!$this->canManageStore($request, $store, true)) {
            return $this->error('You do not have access to this store', 403);
        }

        $store->update($updates);

        return $this->success(new StoreResource($store->fresh()), $message);
    }

    private function uploadBrandAsset(Request $request, Store $store, string $kind)
    {
        if (!$this->canManageStore($request, $store, true)) {
            return $this->error('You do not have access to this store', 403);
        }

        $request->validate([
            'file' => [
                'required',
                'file',
                'mimetypes:image/jpeg,image/pjpeg,image/png,image/webp,image/gif',
                'max:' . ($kind === 'logo' ? 10240 : 20480),
            ],
        ]);

        $file = $request->file('file');
        $owner = $store->user;
        $storeIds = $owner->stores()->pluck('id');
        $usedBytes = (int) Media::whereIn('store_id', $storeIds)->whereNull('deleted_at')->sum('file_size');
        $incomingGb = $file->getSize() / 1024 / 1024 / 1024;
        $usedGb = $usedBytes / 1024 / 1024 / 1024;
        $check = app(\App\Services\SubscriptionService::class)->checkLimit($owner, 'storage_gb', $usedGb, $incomingGb);
        if (!$check['allowed']) {
            return $this->limitError($check);
        }

        $folder = "store_{$store->id}/branding";
        $filename = $file->hashName();
        $localPath = $file->storeAs($folder, $filename, 'public_uploads');
        $provider = 'local';
        $remotePath = $localPath;
        $url = asset('uploads/' . $localPath);

        $bunny = app(BunnyMediaService::class)->upload($file, $folder, $filename);
        if ($bunny) {
            $provider = $bunny['provider'];
            $remotePath = $bunny['path'];
            $url = $bunny['url'];
        }

        [$width, $height] = @getimagesize($file->getRealPath()) ?: [null, null];
        $media = Media::create([
            'store_id' => $store->id,
            'product_id' => null,
            'url' => $url,
            'thumbnail_url' => null,
            'file_path' => $provider === 'bunny' ? $remotePath : $localPath,
            'file_size' => $file->getSize(),
            'type' => 'image',
            'mime_type' => $file->getMimeType(),
            'width' => $width,
            'height' => $height,
            'sort_order' => 0,
            'is_main' => false,
            'storage_provider' => $provider,
            'visibility' => 'public',
            'metadata' => [
                'usage' => "store_{$kind}",
                'localBackupPath' => $localPath,
            ],
        ]);

        $column = $kind === 'logo' ? 'logo_url' : 'cover_url';
        $store->update([$column => $url]);

        return $this->success([
            'store' => new StoreResource($store->fresh()),
            'media' => new MediaResource($media),
        ], ucfirst($kind) . ' uploaded successfully', 201);
    }

    private function deleteBrandAsset(Request $request, Store $store, string $kind)
    {
        if (!$this->canManageStore($request, $store, true)) {
            return $this->error('You do not have access to this store', 403);
        }

        $column = $kind === 'logo' ? 'logo_url' : 'cover_url';
        $url = $store->{$column};
        $media = $url ? Media::where('store_id', $store->id)->where('url', $url)->latest('id')->first() : null;

        if ($media) {
            if ($media->storage_provider === 'bunny') {
                \App\Jobs\DeleteBunnyMedia::dispatch($media->file_path);
            }

            $localBackupPath = data_get($media->metadata, 'localBackupPath');
            if ($localBackupPath) {
                Storage::disk('public_uploads')->delete($localBackupPath);
            }

            $media->delete();
        }

        $store->update([$column => null]);

        return $this->success(new StoreResource($store->fresh()), ucfirst($kind) . ' removed successfully');
    }

    private function settingsRules(): array
    {
        return [
            'name' => 'sometimes|required|string|max:255',
            'description' => 'nullable|string|max:5000',
            'bio' => 'nullable|string|max:1000',
            'profileDescription' => 'nullable|string|max:1000',
            'defaultLanguage' => 'nullable|string|in:ar,en,ku',
            'subdomain' => 'nullable|string|max:63',
            'customDomain' => 'nullable|string|max:255',
            'custom_domain' => 'nullable|string|max:255',
            'logoUrl' => 'nullable|string|url',
            'coverUrl' => 'nullable|string|url',
            'phone' => 'nullable|string|max:30',
            'whatsappNumber' => 'nullable|string|max:30',
            'whatsappUrl' => 'nullable|string|url',
            'facebookUrl' => 'nullable|string|url',
            'instagramUrl' => 'nullable|string|url',
            'tiktokUrl' => 'nullable|string|url',
            'youtubeUrl' => 'nullable|string|url',
            'xUrl' => 'nullable|string|url',
            'twitterUrl' => 'nullable|string|url',
            'telegramUrl' => 'nullable|string|url',
            'websiteUrl' => 'nullable|string|url',
            'snapchatUrl' => 'nullable|string|url',
            'telegramChannelId' => 'nullable|string|max:255',
            'telegramAutoPost' => 'sometimes|boolean',
            'messageThreadId' => 'nullable|string|max:255',
            'telegramMessageThreadId' => 'nullable|string|max:255',
            'status' => ['nullable', Rule::in($this->statusValues())],
            'isOpen' => 'sometimes|boolean',
            'checkoutEnabled' => 'sometimes|boolean',
            'themeSettings' => 'nullable|array',
            'notificationSettings' => 'nullable|array',
            'botToken' => 'prohibited',
            'telegramToken' => 'prohibited',
            'token' => 'prohibited',
        ];
    }

    private function mapSettingsData(array $data, Store $store, bool $allowSlug): array
    {
        $mapped = [];
        $fieldMap = [
            'name' => 'name',
            'description' => 'description',
            'bio' => 'bio',
            'defaultLanguage' => 'default_language',
            'logoUrl' => 'logo_url',
            'profilePhotoUrl' => 'logo_url',
            'coverUrl' => 'cover_url',
            'coverPhotoUrl' => 'cover_url',
            'facebookUrl' => 'facebook_url',
            'instagramUrl' => 'instagram_url',
            'tiktokUrl' => 'tiktok_url',
            'youtubeUrl' => 'youtube_url',
            'twitterUrl' => 'twitter_url',
            'xUrl' => 'twitter_url',
            'telegramUrl' => 'telegram_url',
            'snapchatUrl' => 'snapchat_url',
            'websiteUrl' => 'website_url',
            'telegramChannelId' => 'telegram_channel_id',
            'telegramAutoPost' => 'telegram_auto_post',
            'messageThreadId' => 'telegram_message_thread_id',
            'telegramMessageThreadId' => 'telegram_message_thread_id',
            'themeSettings' => 'theme_settings',
            'notificationSettings' => 'notification_settings',
            'checkoutEnabled' => 'checkout_enabled',
            'status' => 'status',
        ];

        foreach ($fieldMap as $input => $column) {
            if (array_key_exists($input, $data)) {
                $mapped[$column] = $data[$input];
            }
        }

        if (array_key_exists('defaultLanguage', $data)) {
            $mapped['base_language'] = $data['defaultLanguage'];
        }

        if ($allowSlug && array_key_exists('slug', $data)) {
            $mapped['slug'] = $data['slug'];
        }

        $domainService = app(DomainTenantService::class);
        if (array_key_exists('subdomain', $data)) {
            $mapped['subdomain'] = $domainService->validateSubdomain($data['subdomain'], $store->id);
        }
        if (array_key_exists('customDomain', $data) || array_key_exists('custom_domain', $data)) {
            $nextDomain = $data['customDomain'] ?? $data['custom_domain'] ?? null;
            $normalized = $domainService->validateCustomDomain($nextDomain, $store->id);
            if ($normalized && !app(\App\Services\SubscriptionService::class)->canUseFeature($store->user, 'custom_domain')) {
                throw \Illuminate\Validation\ValidationException::withMessages([
                    'customDomain' => 'Your plan does not support custom domains.',
                ]);
            }
            $mapped['custom_domain'] = $normalized;
            if ($normalized !== $store->custom_domain) {
                $mapped['domain_verified_at'] = null;
            }
        }

        if (array_key_exists('profileDescription', $data) && !array_key_exists('bio', $mapped)) {
            $mapped['bio'] = $data['profileDescription'];
        }
        if (array_key_exists('whatsappNumber', $data)) {
            $mapped['whatsapp_number'] = $data['whatsappNumber'];
        } elseif (array_key_exists('phone', $data)) {
            $mapped['whatsapp_number'] = $data['phone'];
        }
        if (array_key_exists('deliveryDays', $data)) {
            $mapped['delivery_time'] = $data['deliveryDays'];
        }
        if (array_key_exists('telegramChatId', $data)) {
            $mapped['telegram_chat_id'] = $data['telegramChatId'];
        }
        if (array_key_exists('telegramGroupId', $data)) {
            $mapped['telegram_group_id'] = $data['telegramGroupId'];
        }
        if (array_key_exists('telegramUserId', $data)) {
            $mapped['telegram_user_id'] = $data['telegramUserId'];
        }
        if (array_key_exists('isOpen', $data)) {
            $mapped['status'] = $data['isOpen'] ? 'active' : 'closed';
        }

        return $mapped;
    }

    private function telegramSettingsPayload(Store $store): array
    {
        $settings = $store->notification_settings ?? [];
        if (is_string($settings)) {
            $settings = json_decode($settings, true) ?: [];
        }

        return [
            'enabled' => ($settings['notificationMethod'] ?? 'telegram') !== 'none',
            'chatId' => $store->telegram_chat_id,
            'telegramChatId' => $store->telegram_chat_id,
            'telegramGroupId' => $store->telegram_group_id,
            'telegramChannelId' => $store->telegram_channel_id,
            'messageThreadId' => $store->telegram_message_thread_id,
            'autoPostProducts' => (bool) ($store->telegram_auto_post ?? false),
            'notificationLanguage' => $settings['language'] ?? $store->default_language ?? $store->base_language ?? 'ar',
            'botTokenManagedByPlatform' => true,
        ];
    }

    private function statusValues(): array
    {
        return ['active', 'inactive', 'closed', 'suspended', 'maintenance'];
    }
}
