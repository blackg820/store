<?php

namespace App\Jobs;

use App\Services\BunnyMediaService;
use App\Services\SystemEventService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class DeleteBunnyMedia implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public int $tries = 3;

    public function __construct(public string $path)
    {
        $this->onQueue('media');
    }

    public function backoff(): array
    {
        return [60, 300, 900];
    }

    public function handle(BunnyMediaService $bunnyMediaService): void
    {
        $bunnyMediaService->delete($this->path);
    }

    public function failed(\Throwable $exception): void
    {
        app(SystemEventService::class)->record('bunny_failure', 'Bunny media cleanup job failed.', [
            'path_hash' => hash('sha256', $this->path),
            'error' => $exception->getMessage(),
        ], 'error', static::class);
    }
}
