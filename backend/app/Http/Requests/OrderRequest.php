<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class OrderRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    public function rules(): array
    {
        return [
            'storeId' => 'required|exists:stores,id',
            'buyerId' => 'required|exists:buyers,id',
            'customerName' => 'nullable|string|max:255',
            'customerPhone' => 'nullable|string|max:255',
            'cityId' => 'nullable|integer',
            'regionId' => 'nullable|integer',
            'packageSizeId' => 'nullable|integer',
            'itemsDescription' => 'nullable|string',
            'addressDetails' => 'nullable|string',
            'orderNotes' => 'nullable|string',
            'codAmount' => 'nullable|numeric',
            'clientReferenceId' => 'nullable|string|max:100',
            'productId' => 'nullable|exists:products,id',
            'quantity' => 'nullable|integer|min:1',
        ];
    }
}
