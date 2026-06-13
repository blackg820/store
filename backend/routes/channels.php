<?php

use Illuminate\Support\Facades\Broadcast;
use App\Models\Store;

Broadcast::channel('App.Models.User.{id}', function ($user, $id) {
    return (int) $user->id === (int) $id;
});

Broadcast::channel('store.{id}', function ($user, $id) {
    if ($user->role === 'admin') {
        return true;
    }

    $ownerId = $user->parent_id ?: $user->id;

    return Store::where('id', $id)->where('user_id', $ownerId)->exists();
});
