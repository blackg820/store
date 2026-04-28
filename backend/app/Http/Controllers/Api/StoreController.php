<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Store;
use App\Http\Resources\StoreResource;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\Rule;

class StoreController extends Controller
{
    public function index(Request $request)
    {
        $user = $request->user();
        $isAdmin = $user->role === 'admin';

        $query = Store::query()->withCount('products');

        if (!$isAdmin) {
            $query->where('user_id', $user->id);
        }

        if ($request->has('search')) {
            $search = $request->search;
            $query->where(function($q) use ($search) {
                $q->where('name', 'like', "%$search%")
                  ->orWhere('slug', 'like', "%$search%");
            });
        }

        $stores = $query->orderBy('created_at', 'desc')->paginate($request->limit ?? 10);

        return StoreResource::collection($stores);
    }

    public function show(Request $request, Store $store)
    {
        $user = $request->user();
        if (!$user || ($user->role !== 'admin' && $store->user_id !== $user->id)) {
            return response()->json(['success' => false, 'error' => 'Access denied'], 403);
        }

        $store->loadCount('products');
        return new StoreResource($store);
    }

    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'slug' => [
                'required',
                'string',
                'max:255',
                Rule::unique('stores')->whereNull('deleted_at'),
            ],
            'deliveryDays' => 'nullable|integer|min:1',
        ]);

        $user = $request->user();

        // Plan limits check would go here...

        $store = Store::create([
            'user_id' => $user->id,
            'name' => $request->name,
            'name_ar' => $request->nameAr ?? $request->name,
            'slug' => $request->slug,
            'whatsapp_number' => $request->whatsappNumber,
            'description' => $request->description ?? '',
            'description_ar' => $request->descriptionAr ?? $request->description,
            'logo_url' => $request->logoUrl,
            'cover_url' => $request->coverUrl,
            'status' => 'active',
            'base_currency' => 'IQD',
            'base_language' => 'ar',
            'delivery_time' => $request->deliveryDays ?? 3,
            'telegram_token' => $request->telegramToken,
            'telegram_user_id' => $request->telegramUserId,
            'telegram_group_id' => $request->telegramGroupId,
            'telegram_chat_id' => $request->telegramChatId,
            'theme_settings' => $request->themeSettings,
            'notification_settings' => $request->notificationSettings,
        ]);

        return new StoreResource($store);
    }

    public function update(Request $request, Store $store)
    {
        $user = $request->user();
        if ($user->role !== 'admin' && $store->user_id !== $user->id) {
            return response()->json(['success' => false, 'error' => 'Access denied'], 403);
        }

        $request->validate([
            'name' => 'sometimes|required|string|max:255',
            'slug' => [
                'sometimes',
                'required',
                'string',
                'max:255',
                Rule::unique('stores')->ignore($store->id)->whereNull('deleted_at'),
            ],
        ]);

        $data = $request->only([
            'name', 'nameAr', 'slug', 'whatsappNumber', 'description', 'descriptionAr',
            'logoUrl', 'coverUrl', 'deliveryDays', 'telegramToken', 'telegramUserId',
            'telegramGroupId', 'telegramChatId', 'themeSettings', 'notificationSettings'
        ]);

        // Map camelCase to snake_case for the model
        $mappedData = [];
        if (isset($data['name'])) $mappedData['name'] = $data['name'];
        if (isset($data['nameAr'])) $mappedData['name_ar'] = $data['nameAr'];
        if (isset($data['slug'])) $mappedData['slug'] = $data['slug'];
        if (isset($data['whatsappNumber'])) $mappedData['whatsapp_number'] = $data['whatsappNumber'];
        if (isset($data['description'])) $mappedData['description'] = $data['description'];
        if (isset($data['descriptionAr'])) $mappedData['description_ar'] = $data['descriptionAr'];
        if (isset($data['logoUrl'])) $mappedData['logo_url'] = $data['logoUrl'];
        if (isset($data['coverUrl'])) $mappedData['cover_url'] = $data['coverUrl'];
        if (isset($data['deliveryDays'])) $mappedData['delivery_time'] = $data['deliveryDays'];
        if (isset($data['telegramToken'])) $mappedData['telegram_token'] = $data['telegramToken'];
        if (isset($data['telegramUserId'])) $mappedData['telegram_user_id'] = $data['telegramUserId'];
        if (isset($data['telegramGroupId'])) $mappedData['telegram_group_id'] = $data['telegramGroupId'];
        if (isset($data['telegramChatId'])) $mappedData['telegram_chat_id'] = $data['telegramChatId'];
        if (isset($data['themeSettings'])) $mappedData['theme_settings'] = $data['themeSettings'];
        if (isset($data['notificationSettings'])) $mappedData['notification_settings'] = $data['notificationSettings'];

        $store->update($mappedData);

        return new StoreResource($store);
    }

    public function destroy(Request $request, Store $store)
    {
        $user = $request->user();
        if (!$user || ($user->role !== 'admin' && $store->user_id !== $user->id)) {
            return response()->json(['success' => false, 'error' => 'Access denied'], 403);
        }

        $store->delete();

        return response()->json(['success' => true, 'message' => 'Store deleted successfully']);
    }
}
