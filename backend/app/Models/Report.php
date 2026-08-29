<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Report extends Model
{
    use HasFactory;

    protected $fillable = [
        'reporter_id',
        'reported_user_id',
        'item_id',
        'borrowing_id',
        'type',
        'reason',
        'status',
        'admin_note',
        'resolved_by',
        'resolved_at',
    ];

    protected $casts = [
        'resolved_at' => 'datetime',
    ];

    public function reporter()
    {
        return $this->belongsTo(User::class, 'reporter_id');
    }

    public function reportedUser()
    {
        return $this->belongsTo(User::class, 'reported_user_id');
    }

    public function item()
    {
        return $this->belongsTo(Item::class);
    }

    public function borrowing()
    {
        return $this->belongsTo(Borrowing::class);
    }

    public function resolver()
    {
        return $this->belongsTo(User::class, 'resolved_by');
    }
}
