<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $this->dropColumns('stores', [$this->localized('name', 'ar'), $this->localized('description', 'ar')]);
        $this->dropColumns('product_types', [$this->localized('name', 'ar')]);
        $this->dropColumns('categories', [$this->localized('name', 'ar')]);
        $this->dropColumns('products', [
            $this->localized('title', 'ar'),
            $this->localized('title', 'ku'),
            $this->localized('description', 'ar'),
            $this->localized('description', 'ku'),
        ]);
        $this->dropColumns('product_options', [$this->localized('name', 'ar'), $this->localized('name', 'ku')]);
    }

    public function down(): void
    {
        //
    }

    private function dropColumns(string $tableName, array $columns): void
    {
        if (!Schema::hasTable($tableName)) {
            return;
        }

        $existing = array_values(array_filter(
            $columns,
            fn (string $column) => Schema::hasColumn($tableName, $column)
        ));

        if ($existing === []) {
            return;
        }

        Schema::table($tableName, function (Blueprint $table) use ($existing) {
            $table->dropColumn($existing);
        });
    }

    private function localized(string $field, string $language): string
    {
        return "{$field}_{$language}";
    }
};
