<?php

namespace App\Services;

use App\Models\Buyer;
use App\Models\GlobalCustomer;
use App\Models\Order;
use Illuminate\Support\Facades\DB;

class CustomerRiskService
{
    public function normalizePhone(string $phone): string
    {
        $phone = preg_replace('/[^\d+]/', '', trim($phone)) ?: trim($phone);
        if (str_starts_with($phone, '00')) {
            $phone = '+' . substr($phone, 2);
        }

        return $phone;
    }

    public function ensureForPhone(string $phone): GlobalCustomer
    {
        $normalized = $this->normalizePhone($phone);

        return GlobalCustomer::firstOrCreate(
            ['phone' => $normalized],
            ['risk_level' => 'normal']
        );
    }

    public function attachBuyer(Buyer $buyer): GlobalCustomer
    {
        $globalCustomer = $this->ensureForPhone($buyer->phone);

        if ((int) $buyer->global_customer_id !== (int) $globalCustomer->id) {
            $buyer->forceFill(['global_customer_id' => $globalCustomer->id])->save();
        }

        $buyer->forceFill([
            'risk_level' => $globalCustomer->risk_level,
            'rejected_orders' => max((int) $buyer->rejected_orders, (int) $globalCustomer->rejection_count),
        ])->save();

        return $globalCustomer;
    }

    public function recordOrderCreated(Order $order): void
    {
        DB::transaction(function () use ($order) {
            $phone = $order->customer_phone ?: $order->buyer?->phone;
            if (!$phone) {
                return;
            }

            $globalCustomer = $this->ensureForPhone($phone);
            $globalCustomer->increment('total_orders');
            $globalCustomer->forceFill([
                'first_order_at' => $globalCustomer->first_order_at ?: $order->created_at ?: now(),
                'last_order_at' => $order->created_at ?: now(),
            ])->save();

            if ($order->buyer) {
                $this->attachBuyer($order->buyer);
            }

            if ((int) $order->global_customer_id !== (int) $globalCustomer->id) {
                $order->forceFill(['global_customer_id' => $globalCustomer->id])->save();
            }
        });
    }

    public function recordRejectedOrder(Order $order): ?GlobalCustomer
    {
        return DB::transaction(function () use ($order) {
            $phone = $order->customer_phone ?: $order->buyer?->phone;
            if (!$phone) {
                return null;
            }

            $globalCustomer = $this->ensureForPhone($phone);
            $rejections = (int) $globalCustomer->rejection_count + 1;
            $riskLevel = GlobalCustomer::riskLevelFor($rejections);

            $globalCustomer->forceFill([
                'rejection_count' => $rejections,
                'total_rejections' => (int) $globalCustomer->total_rejections + 1,
                'risk_level' => $riskLevel,
                'last_order_at' => $order->created_at ?: now(),
            ])->save();

            if ($order->buyer) {
                $order->buyer->forceFill([
                    'global_customer_id' => $globalCustomer->id,
                    'risk_level' => $riskLevel,
                    'rejected_orders' => max((int) $order->buyer->rejected_orders + 1, $rejections),
                ])->save();
            }

            $order->forceFill(['global_customer_id' => $globalCustomer->id])->save();

            return $globalCustomer;
        });
    }
}
