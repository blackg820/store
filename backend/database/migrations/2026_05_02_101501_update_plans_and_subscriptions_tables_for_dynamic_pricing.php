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
        Schema::table('plans', function (Blueprint $table) {
            if (!Schema::hasColumn('plans', 'description')) {
                $table->text('description')->nullable()->after('name');
            }
            if (!Schema::hasColumn('plans', 'type')) {
                $table->enum('type', ['fixed', 'usage', 'hybrid'])->default('fixed')->after('description');
            }
            if (!Schema::hasColumn('plans', 'currency')) {
                $table->string('currency', 3)->default('USD')->after('price');
            }
            if (!Schema::hasColumn('plans', 'trial_days')) {
                $table->integer('trial_days')->default(0)->after('duration_days');
            }
            if (!Schema::hasColumn('plans', 'sort_order')) {
                $table->integer('sort_order')->default(0)->after('status');
            }
            if (!Schema::hasColumn('plans', 'is_public')) {
                $table->boolean('is_public')->default(true)->after('sort_order');
            }
        });

        Schema::table('subscriptions', function (Blueprint $table) {
            if (!Schema::hasColumn('subscriptions', 'starts_at')) {
                $table->timestamp('starts_at')->nullable()->after('status');
            }
            if (!Schema::hasColumn('subscriptions', 'ends_at')) {
                $table->timestamp('ends_at')->nullable()->after('starts_at');
            }
            if (!Schema::hasColumn('subscriptions', 'trial_ends_at')) {
                $table->timestamp('trial_ends_at')->nullable()->after('ends_at');
            }
            if (!Schema::hasColumn('subscriptions', 'canceled_at')) {
                $table->timestamp('canceled_at')->nullable()->after('trial_ends_at');
            }
            if (!Schema::hasColumn('subscriptions', 'metadata')) {
                $table->json('metadata')->nullable()->after('canceled_at');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('plans', function (Blueprint $table) {
            $table->dropColumn(['description', 'type', 'currency', 'trial_days', 'sort_order', 'is_public']);
        });

        Schema::table('subscriptions', function (Blueprint $table) {
            $table->dropColumn(['starts_at', 'ends_at', 'trial_ends_at', 'canceled_at', 'metadata']);
        });
    }
};
