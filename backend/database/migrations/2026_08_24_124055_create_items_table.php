<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('items', function (Blueprint $table) {
            $table->id();

            $table->foreignId('category_id')
                ->constrained('categories')
                ->onDelete('cascade');

            $table->foreignId('user_id')
                ->constrained('users')
                ->onDelete('cascade');

            $table->string('name');
            $table->text('description')->nullable();
            $table->string('image')->nullable();

            $table->enum('status', [
                'available',
                'borrowed',
                'unavailable'
            ])->default('available');

            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('items');
    }
};