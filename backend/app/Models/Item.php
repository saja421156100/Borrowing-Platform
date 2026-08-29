<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Item extends Model
{
    use HasFactory;

    protected $fillable = [
        'category_id',
        'user_id',
        'name',
        'description',
        'image',
        'status',
        'condition',
        'location',
    ];

    public function category()
    {
        return $this->belongsTo(Category::class);
    }

    public function owner()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function borrowings()
    {
        return $this->hasMany(Borrowing::class);
    }

    public function reviews()
    {
        return $this->hasMany(Review::class);
    }

    public function favoritedBy()
    {
        return $this->belongsToMany(User::class, 'favorites')->withTimestamps();
    }
}