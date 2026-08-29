<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('reporter_id')->constrained('users')->cascadeOnDelete();
            $table->foreignId('reported_user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('item_id')->nullable()->constrained('items')->nullOnDelete();
            $table->foreignId('borrowing_id')->nullable()->constrained('borrowings')->nullOnDelete();
            $table->string('type', 80);
            $table->text('reason');
            $table->enum('status', ['pending', 'resolved', 'dismissed'])->default('pending');
            $table->text('admin_note')->nullable();
            $table->foreignId('resolved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamp('resolved_at')->nullable();
            $table->timestamps();

            $table->index(['status', 'created_at']);
            $table->index(['reporter_id', 'created_at']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('reports');
    }
};
