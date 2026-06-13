<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class StoreRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true; // Authorization is handled in the controller for now
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        $storeId = $this->route('store') ? $this->route('store')->id : null;
        $nameRule = $storeId ? 'sometimes|required|string|max:255' : 'required|string|max:255';
        $slugRequired = $storeId ? 'sometimes' : 'required';

        return [
            'name' => $nameRule,
            'slug' => [
                $slugRequired,
                'string',
                'max:255',
                Rule::unique('stores')->ignore($storeId)->whereNull('deleted_at'),
            ],
            'subdomain' => 'nullable|string|max:63',
            'customDomain' => 'nullable|string|max:255',
            'custom_domain' => 'nullable|string|max:255',
            'whatsappNumber' => 'nullable|string|max:20',
            'phone' => 'nullable|string|max:30',
            'deliveryDays' => 'nullable|integer|min:1',
            'description' => 'nullable|string|max:5000',
            'bio' => 'nullable|string|max:1000',
            'profileDescription' => 'nullable|string|max:1000',
            'defaultLanguage' => 'nullable|string|in:ar,en,ku',
            'status' => 'nullable|string|in:active,inactive,closed,suspended,maintenance',
            'isOpen' => 'nullable|boolean',
            'checkoutEnabled' => 'nullable|boolean',
            'logoUrl' => 'nullable|string|url',
            'profilePhotoUrl' => 'nullable|string|url',
            'coverUrl' => 'nullable|string|url',
            'coverPhotoUrl' => 'nullable|string|url',
            'facebookUrl' => 'nullable|string|url',
            'instagramUrl' => 'nullable|string|url',
            'tiktokUrl' => 'nullable|string|url',
            'youtubeUrl' => 'nullable|string|url',
            'twitterUrl' => 'nullable|string|url',
            'telegramUrl' => 'nullable|string|url',
            'snapchatUrl' => 'nullable|string|url',
            'websiteUrl' => 'nullable|string|url',
            'telegramChatId' => 'nullable|string',
            'telegramGroupId' => 'nullable|string',
            'telegramUserId' => 'nullable|string',
            'telegramChannelId' => 'nullable|string',
            'telegramAutoPost' => 'nullable|boolean',
            'messageThreadId' => 'nullable|string',
            'telegramMessageThreadId' => 'nullable|string',
            'themeSettings' => 'nullable|array',
            'notificationSettings' => 'nullable|array',
            'botToken' => 'prohibited',
            'telegramToken' => 'prohibited',
        ];
    }
}
