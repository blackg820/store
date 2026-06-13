<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            if (!Schema::hasColumn('stores', 'checkout_enabled')) {
                $table->boolean('checkout_enabled')->default(true)->after('status');
            }

            if (!Schema::hasColumn('stores', 'telegram_message_thread_id')) {
                $table->string('telegram_message_thread_id')->nullable()->after('telegram_channel_id');
            }
        });
    }

    public function down(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $columns = [];

            if (Schema::hasColumn('stores', 'checkout_enabled')) {
                $columns[] = 'checkout_enabled';
            }

            if (Schema::hasColumn('stores', 'telegram_message_thread_id')) {
                $columns[] = 'telegram_message_thread_id';
            }

            if ($columns !== []) {
                $table->dropColumn($columns);
            }
        });
    }
};
