<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class UserNotification extends Model
{
    use HasFactory;

    protected $table = 'notifications';

    protected $fillable = [
        'user_id',
        'actor_id',
        'borrowing_id',
        'item_id',
        'type',
        'title',
        'message',
        'read_at',
    ];

    protected $casts = [
        'read_at' => 'datetime',
    ];

    public function user()
    {
        return $this->belongsTo(User::class);
    }

    public function actor()
    {
        return $this->belongsTo(User::class, 'actor_id');
    }

    public function borrowing()
    {
        return $this->belongsTo(Borrowing::class);
    }

    public function item()
    {
        return $this->belongsTo(Item::class);
    }
}
