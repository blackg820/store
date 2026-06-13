<?php

/**
 * ============================================================
 * File     : AlWaseetManager.php
 * Path     : app/Services/AlWaseetManager.php
 * Purpose  : Factory that creates and caches one AlWaseetService
 *            instance per store within a single request.
 *
 * Why this class exists:
 *   Since each store has its own credentials, we cannot have a
 *   single shared AlWaseetService.  AlWaseetManager acts as a
 *   registry: the first time you ask for a store's service it
 *   creates it, and every subsequent call within the same request
 *   returns the same instance (avoiding redundant token lookups).
 *
 * This class is registered as a singleton in AlWaseetServiceProvider
 * so the instance cache is shared for the full request lifecycle.
 *
 * Usage:
 *   // Inject into any controller, job, or command:
 *   public function __construct(private AlWaseetManager $alWaseet) {}
 *
 *   // Resolve for a specific store:
 *   $service = $this->alWaseet->for($store);
 *
 *   // Resolve for the currently authenticated user's store:
 *   $service = $this->alWaseet->forCurrentStore();
 * ============================================================
 */

declare(strict_types=1);

namespace App\Services;

use App\Models\Store;
use RuntimeException;

final class AlWaseetManager
{
    /**
     * In-memory cache of service instances keyed by store ID.
     * Lives for the duration of the current request only.
     *
     * @var AlWaseetService[]
     */
    private array $instances = [];

    /**
     * Returns the AlWaseetService bound to the given store.
     *
     * Creates a new instance on the first call for a store, then
     * returns the same instance on every subsequent call within
     * the same request — preventing repeated token DB lookups.
     *
     * @throws RuntimeException  if the store has no credentials configured
     */
    public function for(Store $store): AlWaseetService
    {
        if (! isset($this->instances[$store->id])) {
            $this->instances[$store->id] = new AlWaseetService($store);
        }

        return $this->instances[$store->id];
    }

    /**
     * Shortcut that resolves the service for the currently authenticated
     * user's store.  Assumes User belongsTo Store (user->store relation).
     *
     * Usage: app(AlWaseetManager::class)->forCurrentStore()
     *
     * @throws RuntimeException  if no user is authenticated or user has no store
     */
    public function forCurrentStore(): AlWaseetService
    {
        /** @var \App\Models\User $user */
        $user = auth()->user();

        if (! $user || ! $user->store) {
            throw new RuntimeException('No authenticated store found.');
        }

        return $this->for($user->store);
    }

    /**
     * Removes a store's cached service instance.
     *
     * Call this after updating a store's credentials so the next
     * request creates a fresh service with the new credentials
     * rather than reusing the old one (which holds a stale token).
     *
     * @param int $storeId  The ID of the store to evict from cache
     */
    public function forget(int $storeId): void
    {
        unset($this->instances[$storeId]);
    }
}