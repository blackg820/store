<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (!Schema::hasTable('buyers')) {
            return;
        }

        if (DB::connection()->getDriverName() !== 'mysql') {
            return;
        }

        if (!Schema::hasColumn('buyers', 'user_id')) {
            Schema::table('buyers', function (Blueprint $table) {
                $table->foreignId('user_id')->nullable()->after('id')->constrained()->nullOnDelete();
            });
        }

        foreach ($this->uniqueIndexesWithColumns('buyers', ['phone']) as $indexName) {
            DB::statement(sprintf('ALTER TABLE `buyers` DROP INDEX `%s`', str_replace('`', '``', $indexName)));
        }

        if ($this->hasIndex('buyers', 'buyers_user_id_phone_unique')) {
            return;
        }

        if ($this->hasDuplicateOwnerPhones()) {
            if (!$this->hasIndex('buyers', 'buyers_user_id_phone_index')) {
                Schema::table('buyers', function (Blueprint $table) {
                    $table->index(['user_id', 'phone'], 'buyers_user_id_phone_index');
                });
            }

            return;
        }

        Schema::table('buyers', function (Blueprint $table) {
            $table->unique(['user_id', 'phone'], 'buyers_user_id_phone_unique');
        });
    }

    public function down(): void
    {
        if (!Schema::hasTable('buyers')) {
            return;
        }

        if (DB::connection()->getDriverName() !== 'mysql') {
            return;
        }

        if ($this->hasIndex('buyers', 'buyers_user_id_phone_unique')) {
            Schema::table('buyers', function (Blueprint $table) {
                $table->dropUnique('buyers_user_id_phone_unique');
            });
        }

        if (!$this->hasDuplicateGlobalPhones() && !$this->uniqueIndexesWithColumns('buyers', ['phone'])) {
            Schema::table('buyers', function (Blueprint $table) {
                $table->unique('phone', 'buyers_phone_unique');
            });
        }
    }

    /**
     * @return array<int, string>
     */
    private function uniqueIndexesWithColumns(string $table, array $columns): array
    {
        $indexes = collect(DB::select("SHOW INDEX FROM `{$table}`"))
            ->groupBy('Key_name');

        return $indexes
            ->filter(function ($rows) use ($columns) {
                $first = $rows->first();
                $indexedColumns = $rows
                    ->sortBy('Seq_in_index')
                    ->pluck('Column_name')
                    ->values()
                    ->all();

                return (int) $first->Non_unique === 0 && $indexedColumns === $columns;
            })
            ->keys()
            ->values()
            ->all();
    }

    private function hasIndex(string $table, string $indexName): bool
    {
        return collect(DB::select("SHOW INDEX FROM `{$table}`"))
            ->contains(fn ($index) => $index->Key_name === $indexName);
    }

    private function hasDuplicateOwnerPhones(): bool
    {
        return DB::table('buyers')
            ->select('user_id', 'phone')
            ->whereNotNull('user_id')
            ->groupBy('user_id', 'phone')
            ->havingRaw('COUNT(*) > 1')
            ->exists();
    }

    private function hasDuplicateGlobalPhones(): bool
    {
        return DB::table('buyers')
            ->select('phone')
            ->groupBy('phone')
            ->havingRaw('COUNT(*) > 1')
            ->exists();
    }
};
