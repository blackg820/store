<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Media;
use App\Models\Store;
use App\Models\Product;
use App\Http\Resources\MediaResource;
use App\Services\BunnyMediaService;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;
use Illuminate\Http\Exceptions\HttpResponseException;

class MediaController extends Controller
{
    public function index(Request $request)
    {
        $query = Media::query();
        $user = $request->user();

        if ($user && $user->role !== 'admin') {
            $ownerId = $user->parent_id ?: $user->id;
            $query->whereHas('store', function($q) use ($ownerId) {
                $q->where('user_id', $ownerId);
            });
        }

        $storeId = $request->input('store_id', $request->header('X-Store-ID'));
        if ($storeId) {
            $query->where('store_id', $storeId);
        }
        if ($request->has('product_id')) {
            $query->where('product_id', $request->product_id);
        }

        $media = $query->whereNull('deleted_at')->orderBy('sort_order')->orderBy('id')->get();

        return $this->success(MediaResource::collection($media), 'Media loaded');
    }

    public function store(Request $request)
    {
        $request->validate([
            'file' => [
                'required',
                'file',
                'max:51200',
                'mimetypes:image/jpeg,image/pjpeg,image/png,image/webp,image/gif,image/heic,image/heif,video/mp4,video/webm,video/quicktime,video/x-msvideo',
            ],
            'storeId' => 'required',
            'productId' => 'nullable|exists:products,id',
        ]);

        $user = $request->user();
        $storeId = $request->input('storeId');
        $store = null;

        if ($storeId === '0' || $storeId === 0) {
            if ($user->role !== 'admin') {
                return $this->error('Global uploads are restricted to platform admins', 403);
            }
        } else {
            $store = Store::findOrFail($storeId);
            $ownerId = $user->parent_id ?: $user->id;
            if ($user->role !== 'admin' && (int) $store->user_id !== (int) $ownerId) {
                return $this->error('Access denied', 403);
            }

            if ($request->filled('productId')) {
                $productBelongsToStore = Product::where('id', $request->productId)
                    ->where('store_id', $store->id)
                    ->exists();
                if (!$productBelongsToStore) {
                    return $this->error('Product does not belong to the selected store', 422);
                }
            }
        }

        $file = $request->file('file');
        if ($store) {
            $owner = $store->user;
            $storeIds = $owner->stores()->pluck('id');
            $usedBytes = (int) Media::whereIn('store_id', $storeIds)->whereNull('deleted_at')->sum('file_size');
            $usedGb = $usedBytes / 1024 / 1024 / 1024;
            $incomingGb = $file->getSize() / 1024 / 1024 / 1024;
            $check = app(\App\Services\SubscriptionService::class)
                ->checkLimit($owner, 'storage_gb', $usedGb, $incomingGb);
            if (!$check['allowed']) {
                return $this->limitError($check);
            }
        }

        $media = $this->persistUploadedMedia($file, $store, $request->input('productId'));

        return $this->success(new MediaResource($media), 'File uploaded successfully', 201);
    }

    public function destroy(Request $request, Media $media)
    {
        if (!$this->canManageMedia($request->user(), $media)) {
            return $this->error('Access denied', 403);
        }

        $this->queueBunnyDelete($media);
        $this->deleteLocalFile($media);
        $media->delete();

        return $this->success(null, 'Media deleted successfully');
    }

    public function replace(Request $request, Media $media)
    {
        if (!$this->canManageMedia($request->user(), $media)) {
            return $this->error('Access denied', 403);
        }

        $request->validate([
            'file' => [
                'required',
                'file',
                'max:51200',
                'mimetypes:image/jpeg,image/pjpeg,image/png,image/webp,image/gif,image/heic,image/heif,video/mp4,video/webm,video/quicktime,video/x-msvideo',
            ],
        ]);

        $file = $request->file('file');
        $store = $media->store;

        if ($store) {
            $owner = $store->user;
            $storeIds = $owner->stores()->pluck('id');
            $usedBytes = (int) Media::whereIn('store_id', $storeIds)
                ->whereNull('deleted_at')
                ->where('id', '!=', $media->id)
                ->sum('file_size');
            $usedGb = $usedBytes / 1024 / 1024 / 1024;
            $incomingGb = $file->getSize() / 1024 / 1024 / 1024;
            $check = app(\App\Services\SubscriptionService::class)
                ->checkLimit($owner, 'storage_gb', $usedGb, $incomingGb);
            if (!$check['allowed']) {
                return $this->limitError($check);
            }
        }

        $this->queueBunnyDelete($media);
        $this->deleteLocalFile($media);

        $replacement = $this->persistUploadedMedia($file, $store, $media->product_id, $media);

        return $this->success(new MediaResource($replacement), 'Media replaced successfully');
    }

    public function productIndex(Request $request, Product $product)
    {
        if (!$this->canAccessProduct($request->user(), $product)) {
            return $this->tenantDenied();
        }

        return $this->success(
            MediaResource::collection($product->media()->orderBy('sort_order')->orderBy('id')->get()),
            'Product media loaded'
        );
    }

    public function productStore(Request $request, Product $product)
    {
        if (!$this->canMutateProductMedia($request->user(), $product)) {
            return $this->mediaMutationDenied($request->user());
        }

        $request->validate($this->uploadRules(false));
        $this->assertHeaderStoreMatchesProduct($request, $product);
        $this->assertStorageQuota($product->store, $request->file('file'));

        $media = $this->persistUploadedMedia($request->file('file'), $product->store, $product->id);

        return $this->success(new MediaResource($media), 'Product media uploaded', 201);
    }

    public function productDestroy(Request $request, Product $product, Media $media)
    {
        if (!$this->canMutateProductMedia($request->user(), $product)) {
            return $this->mediaMutationDenied($request->user());
        }
        if ((int) $media->product_id !== (int) $product->id) {
            return $this->error('Media does not belong to this product.', 404, null, 'PRODUCT_MEDIA_NOT_FOUND');
        }

        $this->queueBunnyDelete($media);
        $this->deleteLocalFile($media);
        $media->delete();

        return $this->success(null, 'Product media deleted');
    }

    public function productReorder(Request $request, Product $product)
    {
        if (!$this->canMutateProductMedia($request->user(), $product)) {
            return $this->mediaMutationDenied($request->user());
        }

        $data = $request->validate([
            'mediaIds' => 'required|array|min:1',
            'mediaIds.*' => 'required|integer',
        ]);

        $owned = $product->media()->whereIn('id', $data['mediaIds'])->pluck('id')->map(fn ($id) => (int) $id)->all();
        if (count($owned) !== count(array_unique(array_map('intval', $data['mediaIds'])))) {
            return $this->error('Every media id must belong to this product.', 422, null, 'INVALID_MEDIA_ORDER');
        }

        foreach ($data['mediaIds'] as $position => $mediaId) {
            $product->media()->whereKey($mediaId)->update(['sort_order' => $position]);
        }

        return $this->success(
            MediaResource::collection($product->media()->orderBy('sort_order')->orderBy('id')->get()),
            'Product media reordered'
        );
    }

    public function productPrimary(Request $request, Product $product, Media $media)
    {
        if (!$this->canMutateProductMedia($request->user(), $product)) {
            return $this->mediaMutationDenied($request->user());
        }
        if ((int) $media->product_id !== (int) $product->id) {
            return $this->error('Media does not belong to this product.', 404, null, 'PRODUCT_MEDIA_NOT_FOUND');
        }

        $product->media()->update(['is_main' => false]);
        $media->update(['is_main' => true]);

        return $this->success(new MediaResource($media->fresh()), 'Primary product media updated');
    }

    private function canManageMedia($user, Media $media): bool
    {
        if (!$user) {
            return false;
        }

        if ($user->role === 'admin') {
            return true;
        }

        $ownerId = $user->parent_id ?: $user->id;

        return $media->store_id
            && Store::where('id', $media->store_id)->where('user_id', $ownerId)->exists();
    }

    private function canAccessProduct($user, Product $product): bool
    {
        if (!$user) {
            return false;
        }
        if ($user->role === 'admin') {
            return true;
        }

        $product->loadMissing('store');
        $ownerId = $user->parent_id ?: $user->id;

        return (int) $product->store->user_id === (int) $ownerId;
    }

    private function canMutateProductMedia($user, Product $product): bool
    {
        return $this->canAccessProduct($user, $product)
            && !in_array($user?->role, ['support', 'viewer'], true);
    }

    private function mediaMutationDenied($user)
    {
        return in_array($user?->role, ['support', 'viewer'], true)
            ? $this->readOnlyDenied()
            : $this->tenantDenied();
    }

    private function uploadRules(bool $withStore = true): array
    {
        return [
            'file' => [
                'required',
                'file',
                'max:51200',
                'mimetypes:image/jpeg,image/pjpeg,image/png,image/webp,image/gif,image/heic,image/heif,video/mp4,video/webm,video/quicktime,video/x-msvideo',
            ],
            ...($withStore ? [
                'storeId' => 'required',
                'productId' => 'nullable|exists:products,id',
            ] : []),
        ];
    }

    private function assertHeaderStoreMatchesProduct(Request $request, Product $product): void
    {
        $storeId = $request->header('X-Store-ID');
        if ($storeId && (int) $storeId !== (int) $product->store_id) {
            throw new HttpResponseException(response()->json([
                'success' => false,
                'code' => 'TENANT_ACCESS_DENIED',
                'message' => 'The selected store does not match this product.',
                'errors' => (object) [],
                'details' => (object) [],
            ], 403));
        }
    }

    private function assertStorageQuota(Store $store, $file): void
    {
        $owner = $store->user;
        $storeIds = $owner->stores()->pluck('id');
        $usedBytes = (int) Media::whereIn('store_id', $storeIds)->whereNull('deleted_at')->sum('file_size');
        $usedGb = $usedBytes / 1024 / 1024 / 1024;
        $incomingGb = $file->getSize() / 1024 / 1024 / 1024;
        $check = app(\App\Services\SubscriptionService::class)
            ->checkLimit($owner, 'storage_gb', $usedGb, $incomingGb);

        if (!$check['allowed']) {
            throw new HttpResponseException($this->limitError($check));
        }
    }

    private function persistUploadedMedia($file, ?Store $store, $productId = null, ?Media $existing = null): Media
    {
        $folder = $store ? "store_{$store->id}" : 'general';
        $filename = $file->hashName();
        $localPath = $file->storeAs($folder, $filename, 'public_uploads');
        $url = asset('uploads/' . $localPath);
        $provider = 'local';
        $remotePath = $localPath;

        $bunny = app(BunnyMediaService::class)->upload($file, $folder, $filename);
        if ($bunny) {
            $url = $bunny['url'];
            $provider = $bunny['provider'];
            $remotePath = $bunny['path'];
        }

        [$width, $height] = $this->imageDimensions($file);
        $attributes = [
            'store_id' => $store?->id,
            'product_id' => $productId,
            'url' => $url,
            'thumbnail_url' => null,
            'file_path' => $provider === 'bunny' ? $remotePath : $localPath,
            'file_size' => $file->getSize(),
            'type' => Str::startsWith((string) $file->getMimeType(), 'image/') ? 'image' : 'video',
            'mime_type' => $file->getMimeType(),
            'width' => $width,
            'height' => $height,
            'sort_order' => $existing?->sort_order ?? $this->nextSortOrder($productId),
            'is_main' => $existing?->is_main ?? !$productId || !Media::where('product_id', $productId)->where('is_main', true)->exists(),
            'storage_provider' => $provider,
            'visibility' => 'public',
            'metadata' => [
                'mime' => $file->getMimeType(),
                'width' => $width,
                'height' => $height,
                'localBackupPath' => $localPath,
            ],
        ];

        if ($existing) {
            $existing->update($attributes);
            return $existing->fresh();
        }

        return Media::create($attributes);
    }

    private function nextSortOrder($productId): int
    {
        if (!$productId) {
            return 0;
        }

        return ((int) Media::where('product_id', $productId)->max('sort_order')) + 1;
    }

    private function imageDimensions($file): array
    {
        if (!Str::startsWith((string) $file->getMimeType(), 'image/')) {
            return [null, null];
        }

        $size = @getimagesize($file->getRealPath());

        return [$size[0] ?? null, $size[1] ?? null];
    }

    private function deleteLocalFile(Media $media): void
    {
        $metadata = is_array($media->metadata) ? $media->metadata : [];
        $path = $metadata['localBackupPath'] ?? ($media->storage_provider === 'local' ? $media->file_path : null);

        if ($path) {
            Storage::disk('public_uploads')->delete($path);
        }
    }

    private function queueBunnyDelete(Media $media): void
    {
        if ($media->storage_provider === 'bunny' && $media->file_path) {
            \App\Jobs\DeleteBunnyMedia::dispatch($media->file_path);
        }
    }
}
