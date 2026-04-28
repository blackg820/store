<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('push_subscriptions', function (Blueprint $output) {
            $output->id();
            $output->foreignId('user_id')->constrained()->onDelete('cascade');
            $output->string('endpoint', 500)->unique();
            $output->string('public_key')->nullable();
            $output->string('auth_token')->nullable();
            $output->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('push_subscriptions');
    }
};
