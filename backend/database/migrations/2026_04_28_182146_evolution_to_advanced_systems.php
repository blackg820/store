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
        // Update product_options
        Schema::table('product_options', function (Blueprint $table) {
            if (!Schema::hasColumn('product_options', 'position')) {
                $table->integer('position')->default(0)->after('type');
            }
        });

        // Update product_variants
        Schema::table('product_variants', function (Blueprint $table) {
            if (!Schema::hasColumn('product_variants', 'title')) {
                $table->string('title')->after('product_id');
            }
            if (!Schema::hasColumn('product_variants', 'image_id')) {
                $table->foreignId('image_id')->nullable()->after('stock_quantity')->constrained('media')->onDelete('set null');
            }
            if (!Schema::hasColumn('product_variants', 'is_active')) {
                $table->boolean('is_active')->default(true)->after('image_id');
            }
        });

        // Update stores for Telegram
        Schema::table('stores', function (Blueprint $table) {
            if (!Schema::hasColumn('stores', 'telegram_channel_id')) {
                $table->string('telegram_channel_id')->nullable()->after('telegram_token');
            }
            if (!Schema::hasColumn('stores', 'telegram_auto_post')) {
                $table->boolean('telegram_auto_post')->default(false)->after('telegram_channel_id');
            }
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('product_options', function (Blueprint $table) {
            $table->dropColumn(['position']);
        });
        Schema::table('product_variants', function (Blueprint $table) {
            $table->dropColumn(['title', 'image_id', 'is_active']);
        });
        Schema::table('stores', function (Blueprint $table) {
            $table->dropColumn(['telegram_channel_id', 'telegram_auto_post']);
        });
    }
};
