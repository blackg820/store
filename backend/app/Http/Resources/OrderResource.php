<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class OrderResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'storeId' => (string) $this->store_id,
            'buyerId' => (string) $this->buyer_id,
            'globalCustomerId' => $this->global_customer_id ? (string) $this->global_customer_id : null,
            'status' => $this->status ?? 'pending',
            'total' => (float) ($this->total_amount ?? 0),
            'totalAmount' => (float) ($this->total_amount ?? 0),
            'codAmount' => (float) ($this->cod_amount ?? $this->total_amount ?? 0),
            'deliveryFee' => (float) ($this->delivery_fee ?? 0),
            'notes' => $this->internal_notes ?? '',
            'orderNotes' => $this->order_notes ?? '',
            'customerName' => $this->customer_name,
            'customerPhone' => $this->customer_phone,
            'deliveryStatus' => $this->alwaseet_status,
            'integrationStatus' => $this->alwaseet_sync_status,
            'statusHistory' => $this->status_history ?? [],
            'timeline' => $this->timeline ?? [],
            'createdAt' => $this->created_at?->toISOString(),
            'updatedAt' => $this->updated_at?->toISOString(),
            'alwaseet' => [
                'orderId' => $this->alwaseet_order_id,
                'qrLink' => $this->alwaseet_qr_link,
                'cityId' => $this->city_id,
                'regionId' => $this->region_id,
                'addressDetails' => $this->address_details,
                'packageSizeId' => $this->package_size_id,
                'itemsDescription' => $this->items_description,
                'orderNotes' => $this->order_notes,
                'codAmount' => (float) $this->cod_amount,
                'status' => $this->alwaseet_status,
                'syncedAt' => $this->alwaseet_synced_at?->toISOString(),
                'syncStatus' => $this->alwaseet_sync_status,
            ],
            'customer' => [
                'name' => $this->customer_name,
                'phone' => $this->customer_phone,
                'riskLevel' => $this->globalCustomer?->risk_level ?? $this->buyer?->risk_level ?? 'normal',
                'rejectionCount' => (int) ($this->globalCustomer?->rejection_count ?? $this->buyer?->rejected_orders ?? 0),
                'totalOrders' => (int) ($this->globalCustomer?->total_orders ?? $this->buyer?->total_orders ?? 0),
            ],
            'store' => [
                'name' => $this->store->name ?? 'Store',
            ],
            'buyer' => [
                'name' => $this->buyer->name ?? 'Buyer',
                'riskLevel' => $this->globalCustomer?->risk_level ?? $this->buyer?->risk_level ?? 'normal',
                'rejectionCount' => (int) ($this->globalCustomer?->rejection_count ?? $this->buyer?->rejected_orders ?? 0),
            ],
            'items' => $this->whenLoaded('items', function() {
                return $this->items->map(function($item) {
                    return [
                        'id' => (string) $item->id,
                        'orderId' => (string) $item->order_id,
                        'productId' => $item->product_id ? (string) $item->product_id : null,
                        'quantity' => (int) $item->quantity,
                        'unitPrice' => (float) $item->unit_price,
                        'price' => (float) $item->unit_price,
                        'options' => $item->options ?? [],
                        'product' => $item->product ? [
                            'id' => (string) $item->product->id,
                            'title' => $item->product->title,
                            'sku' => $item->product->sku,
                            'imageUrl' => $item->product->media?->where('type', 'image')->first()?->url,
                        ] : null,
                    ];
                });
            }, []),
        ];
    }
}
