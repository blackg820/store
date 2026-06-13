<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            if (!Schema::hasColumn('users', 'role')) {
                $table->string('role')->default('store_owner')->after('password');
            }
            if (!Schema::hasColumn('users', 'mode')) {
                $table->string('mode')->default('controlled')->after('role');
            }
            if (!Schema::hasColumn('users', 'status')) {
                $table->string('status')->default('active')->after('mode');
            }
            if (!Schema::hasColumn('users', 'subscription_plan')) {
                $table->string('subscription_plan')->nullable()->after('status');
            }
        });

        if (!Schema::hasTable('personal_access_tokens')) {
            Schema::create('personal_access_tokens', function (Blueprint $table) {
                $table->id();
                $table->morphs('tokenable');
                $table->string('name');
                $table->string('token', 64)->unique();
                $table->text('abilities')->nullable();
                $table->timestamp('last_used_at')->nullable();
                $table->timestamp('expires_at')->nullable();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('plans')) {
            Schema::create('plans', function (Blueprint $table) {
                $table->id();
                $table->string('code')->unique();
                $table->string('name');
                $table->decimal('price', 16, 2)->default(0);
                $table->integer('duration_days')->default(30);
                $table->string('status')->default('active');
                $table->integer('storage_gb')->nullable();
                $table->integer('stores_limit')->nullable();
                $table->integer('products_limit')->nullable();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('subscriptions')) {
            Schema::create('subscriptions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->foreignId('plan_id')->nullable()->constrained('plans')->nullOnDelete();
                $table->string('plan_code')->nullable();
                $table->string('status')->default('active');
                $table->string('stripe_subscription_id')->nullable();
                $table->timestamp('current_period_start')->nullable();
                $table->timestamp('current_period_end')->nullable();
                $table->boolean('cancel_at_period_end')->default(false);
                $table->timestamp('cleanup_at')->nullable();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('stores')) {
            Schema::create('stores', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->constrained()->cascadeOnDelete();
                $table->string('name');
                $table->string('slug')->unique();
                $table->string('whatsapp_number')->nullable();
                $table->text('description')->nullable();
                $table->string('default_language', 5)->default('ar');
                $table->string('status')->default('active');
                $table->string('base_currency', 3)->default('IQD');
                $table->string('base_language', 5)->default('ar');
                $table->integer('delivery_time')->default(3);
                $table->json('theme_settings')->nullable();
                $table->json('option_presets')->nullable();
                $table->json('notification_settings')->nullable();
                $table->string('logo_url')->nullable();
                $table->string('cover_url')->nullable();
                $table->string('telegram_token')->nullable();
                $table->string('telegram_user_id')->nullable();
                $table->string('telegram_group_id')->nullable();
                $table->string('telegram_chat_id')->nullable();
                $table->softDeletes();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('product_types')) {
            Schema::create('product_types', function (Blueprint $table) {
                $table->id();
                $table->foreignId('store_id')->nullable()->constrained('stores')->cascadeOnDelete();
                $table->string('name');
                $table->string('slug');
                $table->json('schema')->nullable();
                $table->boolean('is_active')->default(true);
                $table->softDeletes();
                $table->timestamps();
                $table->unique(['store_id', 'slug']);
            });
        }

        if (!Schema::hasTable('categories')) {
            Schema::create('categories', function (Blueprint $table) {
                $table->id();
                $table->foreignId('store_id')->nullable()->constrained('stores')->cascadeOnDelete();
                $table->foreignId('product_type_id')->nullable()->constrained('product_types')->nullOnDelete();
                $table->foreignId('parent_id')->nullable()->constrained('categories')->nullOnDelete();
                $table->string('name');
                $table->string('slug');
                $table->boolean('is_active')->default(true);
                $table->integer('sort_order')->default(0);
                $table->softDeletes();
                $table->timestamps();
                $table->index(['store_id', 'is_active', 'sort_order']);
            });
        }

        if (!Schema::hasTable('products')) {
            Schema::create('products', function (Blueprint $table) {
                $table->id();
                $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
                $table->string('sku')->nullable();
                $table->string('product_code')->nullable();
                $table->foreignId('product_type_id')->nullable()->constrained('product_types')->nullOnDelete();
                $table->foreignId('category_id')->nullable()->constrained('categories')->nullOnDelete();
                $table->string('title');
                $table->text('description')->nullable();
                $table->decimal('price', 16, 2)->default(0);
                $table->decimal('cost_price', 16, 2)->default(0);
                $table->decimal('discount', 8, 2)->default(0);
                $table->decimal('delivery_fee', 16, 2)->default(0);
                $table->json('custom_data')->nullable();
                $table->decimal('rating', 3, 2)->default(0);
                $table->integer('rating_count')->default(0);
                $table->boolean('needs_deposit')->default(false);
                $table->decimal('deposit_amount', 16, 2)->default(0);
                $table->softDeletes();
                $table->timestamps();
                $table->index(['store_id', 'deleted_at']);
            });
        }

        if (!Schema::hasTable('media')) {
            Schema::create('media', function (Blueprint $table) {
                $table->id();
                $table->foreignId('store_id')->nullable()->constrained('stores')->cascadeOnDelete();
                $table->foreignId('product_id')->nullable()->constrained('products')->cascadeOnDelete();
                $table->string('url', 1000);
                $table->string('file_path')->nullable();
                $table->unsignedBigInteger('file_size')->default(0);
                $table->string('type')->default('image');
                $table->string('storage_provider')->default('local');
                $table->string('visibility')->default('public');
                $table->json('metadata')->nullable();
                $table->softDeletes();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('buyers')) {
            Schema::create('buyers', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
                $table->string('phone');
                $table->string('name');
                $table->string('email')->nullable();
                $table->string('password_hash')->nullable();
                $table->json('address')->nullable();
                $table->integer('total_orders')->default(0);
                $table->integer('rejected_orders')->default(0);
                $table->string('risk_level')->default('low');
                $table->boolean('is_blacklisted')->default(false);
                $table->softDeletes();
                $table->timestamps();
                $table->unique(['user_id', 'phone'], 'buyers_user_id_phone_unique');
            });
        }

        if (!Schema::hasTable('orders')) {
            Schema::create('orders', function (Blueprint $table) {
                $table->id();
                $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
                $table->foreignId('buyer_id')->nullable()->constrained('buyers')->nullOnDelete();
                $table->string('group_id')->nullable();
                $table->string('status')->default('pending');
                $table->decimal('total_amount', 16, 2)->default(0);
                $table->decimal('delivery_fee', 16, 2)->default(0);
                $table->text('internal_notes')->nullable();
                $table->text('buyer_notes')->nullable();
                $table->softDeletes();
                $table->timestamps();
                $table->index(['store_id', 'status', 'created_at']);
            });
        }

        if (!Schema::hasTable('order_items')) {
            Schema::create('order_items', function (Blueprint $table) {
                $table->id();
                $table->foreignId('order_id')->constrained('orders')->cascadeOnDelete();
                $table->foreignId('product_id')->nullable()->constrained('products')->nullOnDelete();
                $table->integer('quantity')->default(1);
                $table->decimal('unit_price', 16, 2)->default(0);
                $table->json('options')->nullable();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('product_options')) {
            Schema::create('product_options', function (Blueprint $table) {
                $table->id();
                $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
                $table->string('name');
                $table->json('values_json')->nullable();
                $table->json('swatches_json')->nullable();
                $table->string('type')->default('choice');
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('product_variants')) {
            Schema::create('product_variants', function (Blueprint $table) {
                $table->id();
                $table->foreignId('product_id')->constrained('products')->cascadeOnDelete();
                $table->string('sku')->nullable();
                $table->decimal('price_override', 16, 2)->nullable();
                $table->integer('stock_quantity')->default(0);
                $table->json('option_values')->nullable();
                $table->timestamps();
            });
        }

        if (!Schema::hasTable('audit_logs')) {
            Schema::create('audit_logs', function (Blueprint $table) {
                $table->id();
                $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
                $table->string('entity_type');
                $table->string('entity_id');
                $table->string('action');
                $table->json('previous_value')->nullable();
                $table->json('new_value')->nullable();
                $table->string('ip_address')->nullable();
                $table->text('user_agent')->nullable();
                $table->timestamps();
                $table->index(['entity_type', 'entity_id']);
            });
        }

        if (!Schema::hasTable('global_settings')) {
            Schema::create('global_settings', function (Blueprint $table) {
                $table->id();
                $table->string('setting_key')->unique();
                $table->text('setting_value')->nullable();
                $table->timestamps();
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('global_settings');
        Schema::dropIfExists('audit_logs');
        Schema::dropIfExists('product_variants');
        Schema::dropIfExists('product_options');
        Schema::dropIfExists('order_items');
        Schema::dropIfExists('orders');
        Schema::dropIfExists('buyers');
        Schema::dropIfExists('media');
        Schema::dropIfExists('products');
        Schema::dropIfExists('categories');
        Schema::dropIfExists('product_types');
        Schema::dropIfExists('stores');
        Schema::dropIfExists('subscriptions');
        Schema::dropIfExists('plans');
        Schema::dropIfExists('personal_access_tokens');
    }
};
