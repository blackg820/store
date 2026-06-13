<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use App\Models\Plan;
use App\Models\Feature;
use App\Models\PlanFeature;

class SubscriptionSeeder extends Seeder
{
    public function run(): void
    {
        // Define Features
        $features = [
            ['code' => 'storage_gb', 'name' => 'Storage', 'slug' => 'storage_gb', 'type' => 'limit', 'unit' => 'GB'],
            ['code' => 'stores', 'name' => 'Stores', 'slug' => 'stores', 'type' => 'limit', 'unit' => 'count'],
            ['code' => 'employees', 'name' => 'Employees', 'slug' => 'employees', 'type' => 'limit', 'unit' => 'count'],
            ['code' => 'products', 'name' => 'Products', 'slug' => 'products', 'type' => 'limit', 'unit' => 'count'],
            ['code' => 'api_requests', 'name' => 'API Requests', 'slug' => 'api_requests', 'type' => 'metered', 'unit' => 'request', 'reset_interval' => 'month'],
            ['code' => 'telegram_bot', 'name' => 'Telegram Bot', 'slug' => 'telegram_bot', 'type' => 'boolean'],
            ['code' => 'alwaseet_integration', 'name' => 'Al-Waseet Integration', 'slug' => 'alwaseet_integration', 'type' => 'boolean'],
            ['code' => 'custom_domain', 'name' => 'Custom Domain', 'slug' => 'custom_domain', 'type' => 'boolean'],
            ['code' => 'premium_support', 'name' => 'Premium Support', 'slug' => 'premium_support', 'type' => 'boolean'],
        ];

        foreach ($features as $f) {
            Feature::updateOrCreate(['slug' => $f['slug']], $f);
        }

        // Define Plans
        $plans = [
            [
                'code' => 'free',
                'name' => 'Free Plan',
                'description' => 'For small businesses just starting out.',
                'type' => 'fixed',
                'billing_model' => 'fixed',
                'price' => 0,
                'base_price_cents' => 0,
                'currency' => 'USD',
                'interval' => 'month',
                'duration_days' => 30,
                'features' => [
                    'storage_gb' => 1,
                    'stores' => 1,
                    'employees' => 0,
                    'products' => 10,
                    'api_requests' => 1000,
                    'telegram_bot' => false,
                    'alwaseet_integration' => false,
                ]
            ],
            [
                'code' => 'pro',
                'name' => 'Pro Plan',
                'description' => 'Perfect for growing businesses.',
                'type' => 'hybrid',
                'billing_model' => 'hybrid',
                'price' => 29.99,
                'base_price_cents' => 2999,
                'currency' => 'USD',
                'interval' => 'month',
                'duration_days' => 30,
                'features' => [
                    'storage_gb' => 10,
                    'stores' => 3,
                    'employees' => 5,
                    'products' => 500,
                    'api_requests' => 50000,
                    'telegram_bot' => true,
                    'alwaseet_integration' => true,
                ]
            ],
            [
                'code' => 'enterprise',
                'name' => 'Enterprise Plan',
                'description' => 'Full power for large scale operations.',
                'type' => 'hybrid',
                'billing_model' => 'hybrid',
                'price' => 99.99,
                'base_price_cents' => 9999,
                'currency' => 'USD',
                'interval' => 'month',
                'duration_days' => 30,
                'features' => [
                    'storage_gb' => 100,
                    'stores' => 10,
                    'employees' => 20,
                    'products' => 5000,
                    'api_requests' => 500000,
                    'telegram_bot' => true,
                    'alwaseet_integration' => true,
                    'custom_domain' => true,
                    'premium_support' => true,
                ]
            ],
        ];

        foreach ($plans as $pData) {
            $planFeatures = $pData['features'];
            unset($pData['features']);

            $plan = Plan::updateOrCreate(['code' => $pData['code']], $pData);

            foreach ($planFeatures as $slug => $value) {
                $feature = Feature::where('slug', $slug)->first();
                if (!$feature) continue;

                $pivotData = [];
                if ($feature->type === 'boolean') {
                    $pivotData['is_enabled'] = (bool)$value;
                    $pivotData['limit_value'] = null;
                    $pivotData['included_quantity'] = null;
                    $pivotData['limit_quantity'] = null;
                    $pivotData['hard_limit'] = true;
                } else {
                    $pivotData['is_enabled'] = true;
                    $pivotData['limit_value'] = (float)$value;
                    $pivotData['included_quantity'] = (float)$value;
                    $pivotData['limit_quantity'] = (float)$value;
                    $pivotData['hard_limit'] = true;
                    if ($slug === 'api_requests') {
                        $pivotData['price_per_unit_cents'] = 1;
                        $pivotData['overage_price_cents'] = 1;
                        $pivotData['hard_limit'] = false;
                    }
                }

                $plan->features()->syncWithoutDetaching([$feature->id => $pivotData]);
            }
        }
    }
}
