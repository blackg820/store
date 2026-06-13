<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('features', function (Blueprint $table) {
            if (!Schema::hasColumn('features', 'code')) {
                $table->string('code')->nullable()->unique()->after('id');
            }
            if (!Schema::hasColumn('features', 'reset_interval')) {
                $table->string('reset_interval')->nullable()->after('unit');
            }
        });

        if (Schema::getConnection()->getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE features MODIFY type ENUM('boolean', 'limit', 'usage', 'metered') NOT NULL DEFAULT 'limit'");
        }

        DB::table('features')->whereNull('code')->update(['code' => DB::raw('slug')]);

        Schema::table('plans', function (Blueprint $table) {
            if (!Schema::hasColumn('plans', 'billing_model')) {
                $table->string('billing_model')->default('fixed')->after('type');
            }
            if (!Schema::hasColumn('plans', 'base_price_cents')) {
                $table->unsignedBigInteger('base_price_cents')->default(0)->after('price');
            }
            if (!Schema::hasColumn('plans', 'interval')) {
                $table->string('interval')->default('month')->after('currency');
            }
        });

        Schema::table('plan_features', function (Blueprint $table) {
            if (!Schema::hasColumn('plan_features', 'included_quantity')) {
                $table->decimal('included_quantity', 16, 2)->nullable()->after('feature_id');
            }
            if (!Schema::hasColumn('plan_features', 'limit_quantity')) {
                $table->decimal('limit_quantity', 16, 2)->nullable()->after('included_quantity');
            }
            if (!Schema::hasColumn('plan_features', 'price_per_unit_cents')) {
                $table->unsignedBigInteger('price_per_unit_cents')->default(0)->after('overage_price');
            }
            if (!Schema::hasColumn('plan_features', 'overage_price_cents')) {
                $table->unsignedBigInteger('overage_price_cents')->default(0)->after('price_per_unit_cents');
            }
            if (!Schema::hasColumn('plan_features', 'hard_limit')) {
                $table->boolean('hard_limit')->default(true)->after('is_enabled');
            }
            if (!Schema::hasColumn('plan_features', 'reset_interval')) {
                $table->string('reset_interval')->nullable()->after('hard_limit');
            }
        });

        DB::table('plan_features')
            ->whereNull('limit_quantity')
            ->update(['limit_quantity' => DB::raw('limit_value'), 'included_quantity' => DB::raw('limit_value')]);

        if (!Schema::hasTable('usage_records')) {
            Schema::create('usage_records', function (Blueprint $table) {
                $table->id();
                $table->foreignId('subscription_id')->constrained('subscriptions')->cascadeOnDelete();
                $table->foreignId('feature_id')->constrained('features')->cascadeOnDelete();
                $table->string('idempotency_key')->nullable()->unique();
                $table->decimal('quantity', 16, 4)->default(0);
                $table->json('metadata')->nullable();
                $table->timestamp('recorded_at')->useCurrent();
                $table->timestamps();
                $table->index(['subscription_id', 'feature_id', 'recorded_at']);
            });
        }

        if (!Schema::hasTable('usage_rollups')) {
            Schema::create('usage_rollups', function (Blueprint $table) {
                $table->id();
                $table->foreignId('subscription_id')->constrained('subscriptions')->cascadeOnDelete();
                $table->foreignId('feature_id')->constrained('features')->cascadeOnDelete();
                $table->date('period_start');
                $table->date('period_end');
                $table->decimal('quantity', 16, 4)->default(0);
                $table->timestamps();
                $table->unique(['subscription_id', 'feature_id', 'period_start'], 'usage_rollup_unique');
            });
        }

        if (!Schema::hasTable('subscription_feature_overrides')) {
            Schema::create('subscription_feature_overrides', function (Blueprint $table) {
                $table->id();
                $table->foreignId('subscription_id')->constrained('subscriptions')->cascadeOnDelete();
                $table->foreignId('feature_id')->constrained('features')->cascadeOnDelete();
                $table->boolean('is_enabled')->nullable();
                $table->decimal('limit_quantity', 16, 2)->nullable();
                $table->unsignedBigInteger('price_per_unit_cents')->nullable();
                $table->unsignedBigInteger('overage_price_cents')->nullable();
                $table->boolean('hard_limit')->nullable();
                $table->timestamps();
                $table->unique(['subscription_id', 'feature_id'], 'sub_feature_override_unique');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('subscription_feature_overrides');
        Schema::dropIfExists('usage_rollups');
        Schema::dropIfExists('usage_records');
    }
};
