<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Laravel\Sanctum\HasApiTokens;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

class User extends Authenticatable
{
    /** @use HasFactory<\Database\Factories\UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * The attributes that are mass assignable.
     *
     * @var array<int, string>
     */
    protected $fillable = [
        'name',
        'email',
        'password',
        'role',
        'mode',
        'status',
        'subscription_plan',
        'parent_id',
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
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /**
     * Get the store associated with the user.
     */
    public function store()
    {
        return $this->hasOne(Store::class);
    }

    public function stores()
    {
        return $this->hasMany(Store::class);
    }

    public function tenantOwner(): self
    {
        return $this->parent ?: $this;
    }

    public function parent()
    {
        return $this->belongsTo(User::class, 'parent_id');
    }

    public function employees()
    {
        return $this->hasMany(User::class, 'parent_id');
    }

    public function activeSubscription()
    {
        return $this->hasOne(Subscription::class)->where('status', 'active');
    }

    public function subscriptions()
    {
        return $this->hasMany(Subscription::class);
    }

    public function userLimit()
    {
        return $this->hasOne(UserLimit::class);
    }

    public function hasFeature(string $featureSlug, float $increment = 0): bool
    {
        return app(\App\Services\SubscriptionService::class)->canUseFeature($this, $featureSlug, $increment);
    }
}
