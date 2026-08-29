<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Laravel\Sanctum\HasApiTokens;
use PHPOpenSourceSaver\JWTAuth\Contracts\JWTSubject;



class User extends Authenticatable implements JWTSubject
{
    use HasApiTokens, HasFactory, Notifiable;

public function getJWTIdentifier()
{
    return $this->getKey();
}

public function getJWTCustomClaims()
{
    return [];
}


    public function items()
{
    return $this->hasMany(Item::class);
}

public function borrowings()
{
    return $this->hasMany(Borrowing::class);
}

public function reviews()
{
    return $this->hasMany(Review::class);
}

public function favorites()
{
    return $this->belongsToMany(Item::class, 'favorites')->withTimestamps();
}

public function notifications()
{
    return $this->hasMany(UserNotification::class);
}

public function borrowedConversations()
{
    return $this->hasMany(Conversation::class, 'borrower_id');
}

public function ownedConversations()
{
    return $this->hasMany(Conversation::class, 'owner_id');
}

public function sentConversationMessages()
{
    return $this->hasMany(ConversationMessage::class, 'sender_id');
}

public function reports()
{
    return $this->hasMany(Report::class, 'reporter_id');
}

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
    'name',
    'email',
    'phone',
    'password',
    'role',
    'location',
    'bio',
];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var array<int, string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
    ];
}
