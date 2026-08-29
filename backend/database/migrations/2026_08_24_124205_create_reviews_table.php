<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reviews', function (Blueprint $table) {
            $table->id();

            $table->foreignId('user_id')
                ->constrained('users')
                ->onDelete('cascade');

            $table->foreignId('item_id')
                ->constrained('items')
                ->onDelete('cascade');

            $table->unsignedTinyInteger('rating');
            $table->text('comment')->nullable();

            $table->timestamps();

            $table->unique(['user_id', 'item_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reviews');
    }
};