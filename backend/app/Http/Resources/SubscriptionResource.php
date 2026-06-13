<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class SubscriptionResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => (string) $this->id,
            'userId' => (string) $this->user_id,
            'planId' => $this->plan_id,
            'planCode' => $this->plan_code,
            'status' => $this->status,
            'isActive' => $this->status === 'active' && (!$this->ends_at || $this->ends_at->isFuture()),
            'startsAt' => $this->starts_at,
            'startDate' => $this->starts_at,
            'endsAt' => $this->ends_at,
            'endDate' => $this->ends_at,
            'trialEndsAt' => $this->trial_ends_at,
            'canceledAt' => $this->canceled_at,
            'monthlyPrice' => (float) ($this->plan ? $this->plan->price : 0),
            'plan' => $this->whenLoaded('plan', function() {
                return [
                    'id' => $this->plan->id,
                    'name' => $this->plan->name,
                    'code' => $this->plan->code,
                    'billingModel' => $this->plan->billing_model ?? $this->plan->type,
                    'price' => (float) $this->plan->price,
                    'basePriceCents' => (int) $this->plan->base_price_cents,
                    'currency' => $this->plan->currency,
                    'interval' => $this->plan->interval,
                    'features' => $this->plan->features->map(function($f) {
                        return [
                            'code' => $f->code ?: $f->slug,
                            'slug' => $f->slug,
                            'name' => $f->name,
                            'type' => $f->type,
                            'limit' => $f->pivot->limit_quantity ?? $f->pivot->limit_value,
                            'includedQuantity' => $f->pivot->included_quantity,
                            'limitQuantity' => $f->pivot->limit_quantity ?? $f->pivot->limit_value,
                            'isEnabled' => $f->pivot->is_enabled,
                            'pricePerUnitCents' => (int) ($f->pivot->price_per_unit_cents ?? 0),
                            'overagePriceCents' => (int) ($f->pivot->overage_price_cents ?? 0),
                            'hardLimit' => (bool) ($f->pivot->hard_limit ?? true),
                        ];
                    }),
                ];
            }),
            'createdAt' => $this->created_at,
            'updatedAt' => $this->updated_at,
        ];
    }
}
