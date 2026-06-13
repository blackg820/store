<?php

namespace App\Console\Commands;

use App\Models\AlWaseetCity;
use App\Models\AlWaseetRegion;
use App\Models\Store;
use App\Services\AlWaseetManager;
use Illuminate\Console\Command;

class SyncAlWaseetLocations extends Command
{
    protected $signature = 'alwaseet:sync-locations';
    protected $description = 'Sync cities and regions from Al-Waseet API';

    public function handle(AlWaseetManager $manager)
    {
        $this->info('Starting Al-Waseet location sync...');

        $store = Store::where('alwaseet_enabled', true)
            ->whereNotNull('alwaseet_username')
            ->first();

        if (!$store) {
            $this->error('No store found with Al-Waseet enabled to perform sync.');
            return 1;
        }

        try {
            $service = $manager->for($store);

            $this->info('Fetching cities...');
            $cities = $service->getCities();

            foreach ($cities as $city) {
                AlWaseetCity::updateOrCreate(
                    ['id' => $city['id']],
                    ['city_name' => $city['city_name']]
                );

                $this->info("Fetching regions for {$city['city_name']}...");
                $regions = $service->getRegions($city['id']);

                foreach ($regions as $region) {
                    AlWaseetRegion::updateOrCreate(
                        ['id' => $region['id']],
                        [
                            'city_id' => $city['id'],
                            'region_name' => $region['region_name']
                        ]
                    );
                }
            }

            $this->info('Al-Waseet locations synced successfully.');
            return 0;
        } catch (\Exception $e) {
            $this->error('Failed to sync Al-Waseet locations: ' . $e->getMessage());
            return 1;
        }
    }
}
