<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            // Customer Info
            $table->string('customer_name')->nullable()->after('buyer_id');
            $table->string('customer_phone')->nullable()->after('customer_name');

            // Location (Renaming existing or adding new)
            if (Schema::hasColumn('orders', 'alwaseet_city_id')) {
                $table->renameColumn('alwaseet_city_id', 'city_id');
            } else {
                $table->integer('city_id')->nullable()->after('customer_phone');
            }

            if (Schema::hasColumn('orders', 'alwaseet_region_id')) {
                $table->renameColumn('alwaseet_region_id', 'region_id');
            } else {
                $table->integer('region_id')->nullable()->after('city_id');
            }

            $table->text('address_details')->nullable()->after('region_id');

            // Shipment
            if (Schema::hasColumn('orders', 'alwaseet_package_size')) {
                $table->renameColumn('alwaseet_package_size', 'package_size_id');
            } else {
                $table->integer('package_size_id')->nullable()->after('address_details');
            }

            $table->text('items_description')->nullable()->after('package_size_id');
            $table->text('order_notes')->nullable()->after('items_description');

            // Payment
            $table->decimal('cod_amount', 10, 2)->nullable()->after('total_amount');

            // Integration Fields
            if (Schema::hasColumn('orders', 'alwaseet_qr_id')) {
                $table->renameColumn('alwaseet_qr_id', 'alwaseet_order_id');
            } else {
                $table->string('alwaseet_order_id')->nullable()->after('alwaseet_status');
            }

            $table->timestamp('alwaseet_synced_at')->nullable()->after('alwaseet_qr_link');
            $table->enum('alwaseet_sync_status', ['pending', 'sent', 'failed'])->default('pending')->after('alwaseet_synced_at');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn([
                'customer_name',
                'customer_phone',
                'address_details',
                'items_description',
                'order_notes',
                'cod_amount',
                'alwaseet_synced_at',
                'alwaseet_sync_status',
            ]);

            if (Schema::hasColumn('orders', 'city_id')) {
                $table->renameColumn('city_id', 'alwaseet_city_id');
            }
            if (Schema::hasColumn('orders', 'region_id')) {
                $table->renameColumn('region_id', 'alwaseet_region_id');
            }
            if (Schema::hasColumn('orders', 'package_size_id')) {
                $table->renameColumn('package_size_id', 'alwaseet_package_size');
            }
            if (Schema::hasColumn('orders', 'alwaseet_order_id')) {
                $table->renameColumn('alwaseet_order_id', 'alwaseet_qr_id');
            }
        });
    }
};
