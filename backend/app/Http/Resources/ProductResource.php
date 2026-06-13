<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class ProductResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        $user = $request->user();
        $canAccess = $user && (
            $user->role === 'admin'
            || (int) ($this->store?->user_id ?? 0) === (int) ($user->parent_id ?: $user->id)
        );
        $canMutate = $canAccess && !in_array($user?->role, ['support', 'viewer'], true);
        $price = (float) ($this->price ?? 0);
        $discount = (float) ($this->discount ?? 0);

        return [
            'id' => (string) $this->id,
            'storeId' => (string) $this->store_id,
            'productTypeId' => $this->product_type_id ? (string) $this->product_type_id : null,
            'categoryId' => $this->category_id ? (string) $this->category_id : null,
            'categoryName' => $this->category?->name,
            'categorySlug' => $this->category?->slug,
            'productType' => $this->productType?->name,
            'productTypeName' => $this->productType?->name,
            'productTypeSlug' => $this->productType?->slug,
            'sku' => $this->sku ?? '',
            'productCode' => $this->product_code,
            'title' => $this->title ?? '',
            'slug' => $this->slug,
            'description' => $this->description ?? '',
            'price' => $price,
            'costPrice' => (float) ($this->cost_price ?? 0),
            'discount' => $discount,
            'finalPrice' => round($price * (1 - min(max($discount, 0), 100) / 100), 2),
            'final_price' => round($price * (1 - min(max($discount, 0), 100) / 100), 2),
            'deliveryFee' => (float) ($this->delivery_fee ?? 0),
            'needsDeposit' => (bool) ($this->needs_deposit ?? false),
            'depositAmount' => (float) ($this->deposit_amount ?? 0),
            'status' => $this->status ?? ((bool) $this->is_active ? 'active' : 'inactive'),
            'isActive' => $this->is_active || $this->status === 'active',
            'createdAt' => $this->created_at?->toISOString(),
            'updatedAt' => $this->updated_at?->toISOString(),
            'customData' => $this->custom_data ?? [],
            'media' => MediaResource::collection($this->whenLoaded('media', $this->media ?? collect())),
            'options' => ProductOptionResource::collection($this->options),
            'variants' => ProductVariantResource::collection($this->variants),
            'store' => new StoreResource($this->whenLoaded('store')),
            'categoryObject' => $this->category ? [
                'id' => (string) $this->category->id,
                'name' => $this->category->name,
                'slug' => $this->category->slug,
            ] : null,
            'category' => $this->category ? [
                'id' => (string) $this->category->id,
                'name' => $this->category->name,
                'slug' => $this->category->slug,
            ] : null,
            'product_type' => $this->productType ? [
                'id' => (string) $this->productType->id,
                'name' => $this->productType->name,
                'slug' => $this->productType->slug,
            ] : null,
            'permissions' => [
                'canEdit' => $canMutate,
                'canDelete' => $canMutate && $user?->role !== 'employee',
                'canUploadMedia' => $canMutate,
                'canManageOptions' => $canMutate,
                'canManageVariants' => $canMutate,
                'can_edit' => $canMutate,
                'can_delete' => $canMutate && $user?->role !== 'employee',
                'can_upload_media' => $canMutate,
            ],
            'imageUrl' => $this->media?->where('is_main', true)->where('type', 'image')->first()?->url
                ?? $this->media?->where('type', 'image')->first()?->url
                ?? $this->store?->logo_url,
        ];
    }
}
