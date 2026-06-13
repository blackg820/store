<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('media', function (Blueprint $table) {
            if (!Schema::hasColumn('media', 'mime_type')) {
                $table->string('mime_type')->nullable()->after('type');
            }
            if (!Schema::hasColumn('media', 'thumbnail_url')) {
                $table->string('thumbnail_url', 1000)->nullable()->after('url');
            }
            if (!Schema::hasColumn('media', 'width')) {
                $table->unsignedInteger('width')->nullable()->after('file_size');
            }
            if (!Schema::hasColumn('media', 'height')) {
                $table->unsignedInteger('height')->nullable()->after('width');
            }
            if (!Schema::hasColumn('media', 'sort_order')) {
                $table->unsignedInteger('sort_order')->default(0)->after('height');
            }
        });
    }

    public function down(): void
    {
        Schema::table('media', function (Blueprint $table) {
            $columns = array_filter(
                ['mime_type', 'thumbnail_url', 'width', 'height', 'sort_order'],
                fn (string $column) => Schema::hasColumn('media', $column)
            );

            if ($columns !== []) {
                $table->dropColumn($columns);
            }
        });
    }
};
