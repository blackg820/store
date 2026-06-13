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
        Schema::create('al_waseet_cities', function (Blueprint $table) {
            $table->unsignedBigInteger('id')->primary();
            $table->string('city_name');
            $table->timestamps();
        });

        Schema::create('al_waseet_regions', function (Blueprint $table) {
            $table->unsignedBigInteger('id')->primary();
            $table->unsignedBigInteger('city_id');
            $table->string('region_name');
            $table->timestamps();

            $table->foreign('city_id')->references('id')->on('al_waseet_cities')->onDelete('cascade');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('al_waseet_regions');
        Schema::dropIfExists('al_waseet_cities');
    }
};
