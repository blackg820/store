<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('buyers', function (Blueprint $table) {
            if (!Schema::hasColumn('buyers', 'notes')) {
                $table->text('notes')->nullable()->after('address');
            }

            if (!Schema::hasColumn('buyers', 'blacklist_reason')) {
                $table->text('blacklist_reason')->nullable()->after('is_blacklisted');
            }
        });
    }

    public function down(): void
    {
        Schema::table('buyers', function (Blueprint $table) {
            $columns = [];

            if (Schema::hasColumn('buyers', 'notes')) {
                $columns[] = 'notes';
            }

            if (Schema::hasColumn('buyers', 'blacklist_reason')) {
                $columns[] = 'blacklist_reason';
            }

            if ($columns !== []) {
                $table->dropColumn($columns);
            }
        });
    }
};
