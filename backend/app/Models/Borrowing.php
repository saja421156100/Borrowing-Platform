<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Borrowing extends Model
{
    use HasFactory;

    protected $fillable = [
        'item_id',
        'user_id',
        'borrowed_at',
        'due_date',
        'returned_at',
        'status',
    ];

    protected $casts = [
        'borrowed_at' => 'date',
        'due_date' => 'date',
        'returned_at' => 'date',
    ];

    public function item()
    {
        return $this->belongsTo(Item::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}