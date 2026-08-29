<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (Schema::hasColumn('items', 'price_per_day')) {
            Schema::table('items', function (Blueprint $table) {
                $table->dropColumn('price_per_day');
            });
        }
    }

    public function down(): void
    {
        // Intentionally left empty: Borrowly does not use paid rentals.
    }
};
