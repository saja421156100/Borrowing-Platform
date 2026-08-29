<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('items', function (Blueprint $table) {
            $table->enum('condition', ['excellent', 'good', 'fair'])
                ->default('good')
                ->after('description');
            $table->string('location')->nullable()->after('condition');
        });
    }

    public function down(): void
    {
        Schema::table('items', function (Blueprint $table) {
            $table->dropColumn(['condition', 'location']);
        });
    }
};
