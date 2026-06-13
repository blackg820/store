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
        Schema::create('alwaseet_cities', function (Blueprint $table) {
            $table->unsignedBigInteger('id')->primary();
            $table->string('city_name');
            $table->timestamps();
        });

        Schema::create('alwaseet_regions', function (Blueprint $table) {
            $table->unsignedBigInteger('id')->primary();
            $table->unsignedBigInteger('city_id')->index();
            $table->string('region_name');
            $table->timestamps();

            $table->foreign('city_id')->references('id')->on('alwaseet_cities')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('alwaseet_regions');
        Schema::dropIfExists('alwaseet_cities');
    }
};
