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
            $table->string('alwaseet_qr_id')->nullable()->after('status');
            $table->string('alwaseet_qr_link')->nullable()->after('alwaseet_qr_id');
            $table->integer('alwaseet_city_id')->nullable()->after('alwaseet_qr_link');
            $table->integer('alwaseet_region_id')->nullable()->after('alwaseet_city_id');
            $table->integer('alwaseet_package_size')->nullable()->after('alwaseet_region_id');
            $table->string('alwaseet_status')->nullable()->after('alwaseet_package_size');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('orders', function (Blueprint $table) {
            $table->dropColumn([
                'alwaseet_qr_id',
                'alwaseet_qr_link',
                'alwaseet_city_id',
                'alwaseet_region_id',
                'alwaseet_package_size',
                'alwaseet_status',
            ]);
        });
    }
};
