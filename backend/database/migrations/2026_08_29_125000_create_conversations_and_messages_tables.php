<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('conversations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('borrowing_id')->nullable()->unique()->constrained('borrowings')->nullOnDelete();
            $table->foreignId('item_id')->nullable()->constrained('items')->nullOnDelete();
            $table->foreignId('borrower_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('owner_id')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->index(['borrower_id', 'updated_at']);
            $table->index(['owner_id', 'updated_at']);
        });

        Schema::create('conversation_messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('conversation_id')->constrained('conversations')->cascadeOnDelete();
            $table->foreignId('sender_id')->constrained('users')->cascadeOnDelete();
            $table->text('body');
            $table->timestamp('read_at')->nullable();
            $table->timestamps();

            $table->index(['conversation_id', 'created_at']);
            $table->index(['conversation_id', 'read_at']);
            $table->index(['sender_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('conversation_messages');
        Schema::dropIfExists('conversations');
    }
};
