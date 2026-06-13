<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('store_daily_stats')) {
            Schema::create('store_daily_stats', function (Blueprint $table) {
                $table->id();
                $table->foreignId('store_id')->constrained()->cascadeOnDelete();
                $table->date('stat_date');
                $table->unsignedBigInteger('orders_count')->default(0);
                $table->unsignedBigInteger('delivered_orders_count')->default(0);
                $table->unsignedBigInteger('rejected_orders_count')->default(0);
                $table->decimal('revenue', 14, 2)->default(0);
                $table->unsignedBigInteger('visits_count')->default(0);
                $table->unsignedBigInteger('unique_visitors_count')->default(0);
                $table->unsignedBigInteger('checkout_starts_count')->default(0);
                $table->unsignedBigInteger('notifications_sent_count')->default(0);
                $table->unsignedBigInteger('notifications_delivered_count')->default(0);
                $table->unsignedBigInteger('notifications_opened_count')->default(0);
                $table->unsignedBigInteger('notifications_clicked_count')->default(0);
                $table->json('device_breakdown')->nullable();
                $table->timestamps();

                $table->unique(['store_id', 'stat_date']);
                $table->index('stat_date');
            });
        }

        if (!Schema::hasTable('product_daily_stats')) {
            Schema::create('product_daily_stats', function (Blueprint $table) {
                $table->id();
                $table->foreignId('store_id')->constrained()->cascadeOnDelete();
                $table->foreignId('product_id')->constrained()->cascadeOnDelete();
                $table->date('stat_date');
                $table->unsignedBigInteger('views_count')->default(0);
                $table->unsignedBigInteger('sold_count')->default(0);
                $table->decimal('revenue', 14, 2)->default(0);
                $table->timestamps();

                $table->unique(['product_id', 'stat_date']);
                $table->index(['store_id', 'stat_date']);
            });
        }

        if (!Schema::hasTable('notification_daily_stats')) {
            Schema::create('notification_daily_stats', function (Blueprint $table) {
                $table->id();
                $table->foreignId('store_id')->constrained()->cascadeOnDelete();
                $table->foreignId('campaign_id')->nullable()->constrained('customer_notification_campaigns')->nullOnDelete();
                $table->date('stat_date');
                $table->unsignedBigInteger('queued_count')->default(0);
                $table->unsignedBigInteger('sent_count')->default(0);
                $table->unsignedBigInteger('delivered_count')->default(0);
                $table->unsignedBigInteger('opened_count')->default(0);
                $table->unsignedBigInteger('clicked_count')->default(0);
                $table->unsignedBigInteger('failed_count')->default(0);
                $table->json('channel_breakdown')->nullable();
                $table->timestamps();

                $table->unique(['campaign_id', 'store_id', 'stat_date']);
                $table->index(['store_id', 'stat_date']);
            });
        }

        if (!Schema::hasTable('platform_daily_stats')) {
            Schema::create('platform_daily_stats', function (Blueprint $table) {
                $table->id();
                $table->date('stat_date')->unique();
                $table->unsignedBigInteger('users_count')->default(0);
                $table->unsignedBigInteger('new_users_count')->default(0);
                $table->unsignedBigInteger('stores_count')->default(0);
                $table->unsignedBigInteger('new_stores_count')->default(0);
                $table->unsignedBigInteger('orders_count')->default(0);
                $table->unsignedBigInteger('failed_jobs_count')->default(0);
                $table->unsignedBigInteger('queued_jobs_count')->default(0);
                $table->unsignedBigInteger('storage_bytes')->default(0);
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('system_events')) {
            Schema::create('system_events', function (Blueprint $table) {
                $table->id();
                $table->string('type', 80);
                $table->string('severity', 20)->default('warning');
                $table->string('source', 120)->nullable();
                $table->foreignId('store_id')->nullable()->constrained()->nullOnDelete();
                $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
                $table->string('message', 500);
                $table->json('metadata')->nullable();
                $table->timestamp('occurred_at')->useCurrent();
                $table->timestamps();

                $table->index(['type', 'occurred_at']);
                $table->index(['severity', 'occurred_at']);
            });
        }

        if (!Schema::hasTable('scheduler_heartbeats')) {
            Schema::create('scheduler_heartbeats', function (Blueprint $table) {
                $table->id();
                $table->string('name', 120)->unique();
                $table->timestamp('last_seen_at')->nullable();
                $table->json('metadata')->nullable();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('scheduler_heartbeats');
        Schema::dropIfExists('system_events');
        Schema::dropIfExists('platform_daily_stats');
        Schema::dropIfExists('notification_daily_stats');
        Schema::dropIfExists('product_daily_stats');
        Schema::dropIfExists('store_daily_stats');
    }
};
