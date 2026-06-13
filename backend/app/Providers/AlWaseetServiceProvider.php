<?php

/**
 * ============================================================
 * File     : AlWaseetServiceProvider.php
 * Path     : app/Providers/AlWaseetServiceProvider.php
 * Purpose  : Registers Al-Waseet related classes into Laravel's
 *            service container.
 *
 * What it registers:
 *   AlWaseetManager → singleton
 *     Registered as a singleton so the in-memory per-store
 *     instance cache inside AlWaseetManager is shared for the
 *     full request lifecycle.  This means if two different parts
 *     of your code both ask for the same store's service, the
 *     second call reuses the first instance (no extra DB hit).
 *
 * How to register this provider:
 *
 *   Laravel 11+ — add to bootstrap/providers.php:
 *     return [
 *         // ...
 *         App\Providers\AlWaseetServiceProvider::class,
 *     ];
 *
 *   Laravel 10 — add to config/app.php in the 'providers' array:
 *     App\Providers\AlWaseetServiceProvider::class,
 * ============================================================
 */

declare(strict_types=1);

namespace App\Providers;

use App\Services\AlWaseetManager;
use Illuminate\Support\ServiceProvider;

final class AlWaseetServiceProvider extends ServiceProvider
{
    /**
     * Bind AlWaseetManager as a singleton.
     *
     * One manager instance lives for the entire request, ensuring
     * the per-request service-instance cache works correctly.
     */
    public function register(): void
    {
        $this->app->singleton(AlWaseetManager::class);
    }

    public function boot(): void
    {
        //
    }
}