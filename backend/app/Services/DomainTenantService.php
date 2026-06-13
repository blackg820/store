<?php

namespace App\Services;

use App\Models\Store;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class DomainTenantService
{
    public const RESERVED_SUBDOMAINS = [
        'admin',
        'api',
        'app',
        'dashboard',
        'cdn',
        'media',
        'ftp',
        'mail',
        'www',
        'support',
        'help',
        'docs',
        'status',
    ];

    public function normalizeSubdomain(?string $value): ?string
    {
        if ($value === null || trim($value) === '') {
            return null;
        }

        $subdomain = Str::of($value)->lower()->trim()->replaceMatches('/[^a-z0-9-]/', '-')->trim('-')->toString();

        return $subdomain !== '' ? $subdomain : null;
    }

    public function normalizeCustomDomain(?string $value): ?string
    {
        if ($value === null || trim($value) === '') {
            return null;
        }

        $host = parse_url(Str::of($value)->lower()->trim()->toString(), PHP_URL_HOST) ?: $value;
        $host = Str::of($host)->lower()->trim()->replaceMatches('/^www\./', '')->toString();

        return $host !== '' ? $host : null;
    }

    public function validateSubdomain(?string $subdomain, ?int $ignoreStoreId = null): ?string
    {
        $subdomain = $this->normalizeSubdomain($subdomain);
        if ($subdomain === null) {
            return null;
        }

        if (strlen($subdomain) < 3 || strlen($subdomain) > 63 || !preg_match('/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/', $subdomain)) {
            throw ValidationException::withMessages([
                'subdomain' => 'Subdomain must be 3-63 characters and may contain lowercase letters, numbers, and hyphens.',
            ]);
        }

        if (in_array($subdomain, self::RESERVED_SUBDOMAINS, true)) {
            throw ValidationException::withMessages([
                'subdomain' => 'This subdomain is reserved.',
            ]);
        }

        $exists = Store::query()
            ->when($ignoreStoreId, fn ($query) => $query->whereKeyNot($ignoreStoreId))
            ->where('subdomain', $subdomain)
            ->exists();

        if ($exists) {
            throw ValidationException::withMessages([
                'subdomain' => 'This subdomain is already in use.',
            ]);
        }

        return $subdomain;
    }

    public function validateCustomDomain(?string $domain, ?int $ignoreStoreId = null): ?string
    {
        $domain = $this->normalizeCustomDomain($domain);
        if ($domain === null) {
            return null;
        }

        if (strlen($domain) > 255 || !filter_var('https://' . $domain, FILTER_VALIDATE_URL) || !str_contains($domain, '.')) {
            throw ValidationException::withMessages([
                'customDomain' => 'Custom domain must be a valid hostname.',
            ]);
        }

        $leftMost = explode('.', $domain)[0] ?? '';
        if (in_array($leftMost, self::RESERVED_SUBDOMAINS, true)) {
            throw ValidationException::withMessages([
                'customDomain' => 'This custom domain prefix is reserved.',
            ]);
        }

        $exists = Store::query()
            ->when($ignoreStoreId, fn ($query) => $query->whereKeyNot($ignoreStoreId))
            ->where('custom_domain', $domain)
            ->exists();

        if ($exists) {
            throw ValidationException::withMessages([
                'customDomain' => 'This custom domain is already in use.',
            ]);
        }

        return $domain;
    }

    public function resolveHost(string $host): ?Store
    {
        $host = Str::of($host)->lower()->before(':')->replaceMatches('/^www\./', '')->toString();
        if ($host === '') {
            return null;
        }

        $cacheKey = 'tenant:host:' . sha1($host);

        $storeId = Cache::remember($cacheKey, now()->addMinutes(10), function () use ($host) {
            $subdomain = $this->extractSubdomain($host);
            $store = Store::query()
                ->where(function ($query) use ($host, $subdomain) {
                    $query->where(function ($customDomainQuery) use ($host) {
                        $customDomainQuery->where('custom_domain', $host)
                            ->whereNotNull('domain_verified_at');
                    });

                    if ($subdomain !== null) {
                        $query->orWhere('subdomain', $subdomain);
                    }
                })
                ->whereNull('deleted_at')
                ->first();

            return $store?->id;
        });

        return $storeId ? Store::find($storeId) : null;
    }

    public function extractSubdomain(string $host): ?string
    {
        $baseDomain = config('services.storefront_base_domain') ?: env('STOREFRONT_BASE_DOMAIN');
        if (!$baseDomain) {
            return explode('.', $host)[0] ?? null;
        }

        $baseDomain = Str::of($baseDomain)->lower()->replaceMatches('/^www\./', '')->toString();
        if (!Str::endsWith($host, '.' . $baseDomain)) {
            return null;
        }

        return Str::before($host, '.' . $baseDomain);
    }

    public function forget(Store $store): void
    {
        foreach ([$store->subdomain, $store->custom_domain] as $host) {
            if ($host) {
                Cache::forget('tenant:host:' . sha1($host));
            }
        }
    }
}
