<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class ProductRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        $isUpdate = $this->isMethod('patch') || $this->isMethod('put');
        $required = $isUpdate ? 'sometimes' : 'required';

        return [
            'storeId' => [$required, 'integer', 'exists:stores,id'],
            'title' => [$required, 'string', 'max:255'],
            'price' => [$required, 'numeric', 'min:0'],
            'productTypeId' => [$required, 'integer', 'exists:product_types,id'],
            'categoryId' => 'nullable|exists:categories,id',
            'sku' => 'nullable|string|max:100',
            'description' => 'nullable|string',
            'costPrice' => 'nullable|numeric|min:0',
            'discount' => 'nullable|numeric|min:0',
            'deliveryFee' => 'nullable|numeric|min:0',
            'needsDeposit' => 'nullable|boolean',
            'depositAmount' => 'nullable|numeric|min:0',
            'isActive' => 'nullable|boolean',
            'status' => 'nullable|string|in:active,inactive,draft,archived',
            'customData' => 'nullable|array',
            'options' => 'sometimes|array',
            'options.*.name' => 'required_with:options|string|max:255',
            'options.*.type' => 'nullable|string|max:50',
            'options.*.values' => 'required_with:options|array',
            'options.*.swatches' => 'nullable|array',
            'variants' => 'sometimes|array',
            'variants.*.title' => 'nullable|string|max:255',
            'variants.*.sku' => 'nullable|string|max:100',
            'variants.*.priceOverride' => 'nullable|numeric|min:0',
            'variants.*.stockQuantity' => 'nullable|integer|min:0',
            'variants.*.optionValues' => 'required_with:variants|array',
            'variants.*.imageId' => 'nullable',
            'variants.*.isActive' => 'nullable|boolean',
            'media' => 'sometimes|array',
            'media.*.id' => 'required_with:media',
            'media.*.isMain' => 'nullable|boolean',
        ];
    }
}
