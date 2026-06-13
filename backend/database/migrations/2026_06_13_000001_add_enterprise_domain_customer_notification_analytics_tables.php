<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            if (!Schema::hasColumn('stores', 'subdomain')) {
                $table->string('subdomain')->nullable()->unique('stores_subdomain_unique')->after('slug');
            }
            if (!Schema::hasColumn('stores', 'custom_domain')) {
                $table->string('custom_domain')->nullable()->unique('stores_custom_domain_unique')->after('subdomain');
            }
            if (!Schema::hasColumn('stores', 'domain_verified_at')) {
                $table->timestamp('domain_verified_at')->nullable()->after('custom_domain');
            }
        });

        Schema::table('stores', function (Blueprint $table) {
            if (!$this->indexExists('stores', 'stores_status_created_at_index')) {
                $table->index(['status', 'created_at'], 'stores_status_created_at_index');
            }
            if (!$this->indexExists('stores', 'stores_user_status_index')) {
                $table->index(['user_id', 'status'], 'stores_user_status_index');
            }
        });

        if (!Schema::hasTable('global_customers')) {
            Schema::create('global_customers', function (Blueprint $table) {
                $table->id();
                $table->string('phone')->unique();
                $table->unsignedInteger('rejection_count')->default(0);
                $table->string('risk_level')->default('normal');
                $table->unsignedInteger('total_orders')->default(0);
                $table->unsignedInteger('total_rejections')->default(0);
                $table->timestamp('first_order_at')->nullable();
                $table->timestamp('last_order_at')->nullable();
                $table->timestamps();

                $table->index(['risk_level', 'last_order_at'], 'global_customers_risk_last_order_index');
            });
        }

        Schema::table('buyers', function (Blueprint $table) {
            if (!Schema::hasColumn('buyers', 'global_customer_id')) {
                $table->foreignId('global_customer_id')->nullable()->after('id')->constrained('global_customers')->nullOnDelete();
            }
            if (!$this->indexExists('buyers', 'buyers_user_risk_index')) {
                $table->index(['user_id', 'risk_level'], 'buyers_user_risk_index');
            }
        });

        Schema::table('orders', function (Blueprint $table) {
            if (!Schema::hasColumn('orders', 'global_customer_id')) {
                $table->foreignId('global_customer_id')->nullable()->after('buyer_id')->constrained('global_customers')->nullOnDelete();
            }
            if (!$this->indexExists('orders', 'orders_global_customer_created_index')) {
                $table->index(['global_customer_id', 'created_at'], 'orders_global_customer_created_index');
            }
            if (!$this->indexExists('orders', 'orders_status_created_at_index')) {
                $table->index(['status', 'created_at'], 'orders_status_created_at_index');
            }
        });

        Schema::table('products', function (Blueprint $table) {
            if (!Schema::hasColumn('products', 'slug')) {
                $table->string('slug')->nullable()->after('title');
            }
            if (!$this->indexExists('products', 'products_store_slug_index')) {
                $table->index(['store_id', 'slug'], 'products_store_slug_index');
            }
            if (!$this->indexExists('products', 'products_store_status_created_index')) {
                $table->index(['store_id', 'status', 'created_at'], 'products_store_status_created_index');
            }
        });

        Schema::table('categories', function (Blueprint $table) {
            if (!$this->indexExists('categories', 'categories_store_slug_index')) {
                $table->index(['store_id', 'slug'], 'categories_store_slug_index');
            }
        });

        if (!Schema::hasTable('customer_notification_subscriptions')) {
            Schema::create('customer_notification_subscriptions', function (Blueprint $table) {
                $table->id();
                $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
                $table->foreignId('buyer_id')->nullable()->constrained('buyers')->nullOnDelete();
                $table->foreignId('global_customer_id')->nullable()->constrained('global_customers')->nullOnDelete();
                $table->string('phone');
                $table->string('channel')->default('pwa');
                $table->string('language', 5)->default('ar');
                $table->string('endpoint_hash', 64)->nullable();
                $table->text('endpoint')->nullable();
                $table->json('keys')->nullable();
                $table->json('metadata')->nullable();
                $table->timestamp('subscribed_at')->nullable();
                $table->timestamp('unsubscribed_at')->nullable();
                $table->timestamps();

                $table->index(['store_id', 'phone'], 'customer_notif_sub_store_phone_index');
                $table->index(['store_id', 'channel', 'unsubscribed_at'], 'customer_notif_sub_channel_active_index');
                $table->unique(['store_id', 'channel', 'endpoint_hash'], 'customer_notif_sub_endpoint_unique');
            });
        }

        if (!Schema::hasTable('customer_notification_campaigns')) {
            Schema::create('customer_notification_campaigns', function (Blueprint $table) {
                $table->id();
                $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
                $table->foreignId('created_by')->nullable()->constrained('users')->nullOnDelete();
                $table->string('name');
                $table->string('status')->default('draft');
                $table->json('channels')->nullable();
                $table->json('segment')->nullable();
                $table->json('template')->nullable();
                $table->timestamp('scheduled_at')->nullable();
                $table->timestamp('sent_at')->nullable();
                $table->timestamps();

                $table->index(['store_id', 'status', 'scheduled_at'], 'customer_notif_campaign_schedule_index');
            });
        }

        if (!Schema::hasTable('customer_notification_deliveries')) {
            Schema::create('customer_notification_deliveries', function (Blueprint $table) {
                $table->id();
                $table->foreignId('campaign_id')->constrained('customer_notification_campaigns')->cascadeOnDelete();
                $table->foreignId('store_id')->constrained('stores')->cascadeOnDelete();
                $table->foreignId('subscription_id')->nullable()->constrained('customer_notification_subscriptions')->nullOnDelete();
                $table->foreignId('buyer_id')->nullable()->constrained('buyers')->nullOnDelete();
                $table->foreignId('global_customer_id')->nullable()->constrained('global_customers')->nullOnDelete();
                $table->string('channel')->default('pwa');
                $table->string('status')->default('queued');
                $table->timestamp('queued_at')->nullable();
                $table->timestamp('delivered_at')->nullable();
                $table->timestamp('opened_at')->nullable();
                $table->timestamp('clicked_at')->nullable();
                $table->text('failure_reason')->nullable();
                $table->json('metadata')->nullable();
                $table->timestamps();

                $table->index(['store_id', 'status', 'created_at'], 'customer_notif_delivery_store_status_index');
                $table->index(['campaign_id', 'status'], 'customer_notif_delivery_campaign_status_index');
            });
        }

        if (!Schema::hasTable('analytics_events')) {
            Schema::create('analytics_events', function (Blueprint $table) {
                $table->id();
                $table->foreignId('store_id')->nullable()->constrained('stores')->cascadeOnDelete();
                $table->foreignId('product_id')->nullable()->constrained('products')->nullOnDelete();
                $table->foreignId('campaign_id')->nullable()->constrained('customer_notification_campaigns')->nullOnDelete();
                $table->string('event_type');
                $table->string('visitor_id')->nullable();
                $table->string('device_type')->nullable();
                $table->string('locale', 5)->nullable();
                $table->json('metadata')->nullable();
                $table->timestamps();

                $table->index(['store_id', 'event_type', 'created_at'], 'analytics_events_store_type_created_index');
                $table->index(['event_type', 'created_at'], 'analytics_events_type_created_index');
            });
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('analytics_events');
        Schema::dropIfExists('customer_notification_deliveries');
        Schema::dropIfExists('customer_notification_campaigns');
        Schema::dropIfExists('customer_notification_subscriptions');

        Schema::table('categories', function (Blueprint $table) {
            if ($this->indexExists('categories', 'categories_store_slug_index')) {
                $table->dropIndex('categories_store_slug_index');
            }
        });

        Schema::table('products', function (Blueprint $table) {
            if ($this->indexExists('products', 'products_store_slug_index')) {
                $table->dropIndex('products_store_slug_index');
            }
            if ($this->indexExists('products', 'products_store_status_created_index')) {
                $table->dropIndex('products_store_status_created_index');
            }
            if (Schema::hasColumn('products', 'slug')) {
                $table->dropColumn('slug');
            }
        });

        Schema::table('orders', function (Blueprint $table) {
            if ($this->indexExists('orders', 'orders_global_customer_created_index')) {
                $table->dropIndex('orders_global_customer_created_index');
            }
            if ($this->indexExists('orders', 'orders_status_created_at_index')) {
                $table->dropIndex('orders_status_created_at_index');
            }
            if (Schema::hasColumn('orders', 'global_customer_id')) {
                $table->dropConstrainedForeignId('global_customer_id');
            }
        });

        Schema::table('buyers', function (Blueprint $table) {
            if ($this->indexExists('buyers', 'buyers_user_risk_index')) {
                $table->dropIndex('buyers_user_risk_index');
            }
            if (Schema::hasColumn('buyers', 'global_customer_id')) {
                $table->dropConstrainedForeignId('global_customer_id');
            }
        });

        Schema::dropIfExists('global_customers');

        Schema::table('stores', function (Blueprint $table) {
            if ($this->indexExists('stores', 'stores_subdomain_unique')) {
                $table->dropUnique('stores_subdomain_unique');
            }
            if ($this->indexExists('stores', 'stores_custom_domain_unique')) {
                $table->dropUnique('stores_custom_domain_unique');
            }
            if ($this->indexExists('stores', 'stores_status_created_at_index')) {
                $table->dropIndex('stores_status_created_at_index');
            }
            if ($this->indexExists('stores', 'stores_user_status_index')) {
                $table->dropIndex('stores_user_status_index');
            }
            $columns = [];
            foreach (['subdomain', 'custom_domain', 'domain_verified_at'] as $column) {
                if (Schema::hasColumn('stores', $column)) {
                    $columns[] = $column;
                }
            }
            if ($columns !== []) {
                $table->dropColumn($columns);
            }
        });
    }

    private function indexExists(string $table, string $index): bool
    {
        try {
            return collect(Schema::getIndexes($table))->contains(function (array $existing) use ($index) {
                return ($existing['name'] ?? null) === $index;
            });
        } catch (\Throwable) {
            try {
                return collect(DB::select("SHOW INDEX FROM `{$table}` WHERE Key_name = ?", [$index]))->isNotEmpty();
            } catch (\Throwable) {
                return false;
            }
        }
    }
};
