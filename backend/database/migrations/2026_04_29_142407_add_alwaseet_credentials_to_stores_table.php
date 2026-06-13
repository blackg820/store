<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Add Al-Waseet API credentials to the stores table.
     */
    public function up(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            if (!Schema::hasColumn('stores', 'alwaseet_username')) {
                $table->text('alwaseet_username')->nullable()->after('id');
            }
            if (!Schema::hasColumn('stores', 'alwaseet_password')) {
                $table->text('alwaseet_password')->nullable()->after('alwaseet_username');
            }
            if (!Schema::hasColumn('stores', 'alwaseet_token')) {
                $table->text('alwaseet_token')->nullable()->after('alwaseet_password');
            }
            if (!Schema::hasColumn('stores', 'alwaseet_token_expires_at')) {
                $table->timestamp('alwaseet_token_expires_at')->nullable()->after('alwaseet_token');
            }
            if (!Schema::hasColumn('stores', 'alwaseet_enabled')) {
                $table->boolean('alwaseet_enabled')->default(false)->after('alwaseet_token_expires_at');
            }
        });
    }

    public function down(): void
    {
        Schema::table('stores', function (Blueprint $table) {
            $table->dropColumn([
                'alwaseet_username',
                'alwaseet_password',
                'alwaseet_token',
                'alwaseet_token_expires_at',
                'alwaseet_enabled',
            ]);
        });
    }
};
