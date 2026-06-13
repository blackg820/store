<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Illuminate\Http\UploadedFile;

class BunnyMediaService
{
    public function upload(UploadedFile $file, string $folder, string $filename): ?array
    {
        $storageZone = config('services.bunny.storage_zone');
        $apiKey = config('services.bunny.api_key');
        $pullZone = config('services.bunny.pull_zone');
        $region = config('services.bunny.region', 'storage.bunnycdn.com');

        if (!$storageZone || !$apiKey || !$pullZone) {
            return null;
        }

        $path = trim($folder, '/') . '/' . ltrim($filename, '/');
        $url = "https://{$region}/{$storageZone}/{$path}";

        try {
            $response = Http::withHeaders([
                'AccessKey' => $apiKey,
                'Content-Type' => $file->getMimeType(),
            ])->withBody(
                file_get_contents($file->getRealPath()),
                $file->getMimeType() ?: 'application/octet-stream'
            )->put($url);

            if (!$response->successful()) {
                Log::warning('Bunny upload failed.', ['status' => $response->status()]);
                app(SystemEventService::class)->record('bunny_failure', 'Bunny upload failed.', [
                    'status' => $response->status(),
                ], 'warning', static::class);
                return null;
            }

            return [
                'url' => "https://{$pullZone}/{$path}",
                'path' => $path,
                'provider' => 'bunny',
            ];
        } catch (\Throwable $e) {
            Log::warning('Bunny upload failed.', ['error' => $e->getMessage()]);
            app(SystemEventService::class)->record('bunny_failure', 'Bunny upload exception.', [
                'error' => $e->getMessage(),
            ], 'warning', static::class);
            return null;
        }
    }

    public function delete(string $path): bool
    {
        $storageZone = config('services.bunny.storage_zone');
        $apiKey = config('services.bunny.api_key');
        $region = config('services.bunny.region', 'storage.bunnycdn.com');

        if (!$storageZone || !$apiKey) {
            Log::warning('Bunny cleanup skipped: storage is not configured.', [
                'path' => $this->redactPath($path),
            ]);
            return false;
        }

        $url = "https://{$region}/{$storageZone}/" . ltrim($path, '/');

        $response = Http::withHeaders(['AccessKey' => $apiKey])->delete($url);
        if ($response->successful() || $response->status() === 404) {
            return true;
        }

        Log::warning('Bunny cleanup failed.', [
            'path' => $this->redactPath($path),
            'status' => $response->status(),
        ]);
        app(SystemEventService::class)->record('bunny_failure', 'Bunny cleanup failed.', [
            'path_hash' => hash('sha256', $path),
            'status' => $response->status(),
        ], 'warning', static::class);

        return false;
    }

    private function redactPath(string $path): string
    {
        $parts = explode('/', trim($path, '/'));
        $file = array_pop($parts);

        if (!$file) {
            return '[empty]';
        }

        return implode('/', $parts) . '/' . substr($file, 0, 8) . '...';
    }
}
