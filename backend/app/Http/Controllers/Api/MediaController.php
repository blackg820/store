<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use App\Models\Media;
use App\Models\Store;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class MediaController extends Controller
{
    public function index(Request $request)
    {
        $query = Media::query();

        if ($request->has('store_id')) {
            $query->where('store_id', $request->store_id);
        }
        if ($request->has('product_id')) {
            $query->where('product_id', $request->product_id);
        }

        $media = $query->whereNull('deleted_at')->get();

        return response()->json([
            'success' => true,
            'data' => $media->map(function($m) {
                return [
                    'id' => (string) $m->id,
                    'url' => $m->url,
                    'type' => $m->type,
                    'productId' => $m->product_id ? (string) $m->product_id : null
                ];
            })
        ]);
    }

    public function store(Request $request)
    {
        $request->validate([
            'file' => 'required|file|max:10240', // 10MB limit
            'storeId' => 'required',
        ]);

        $user = $request->user();
        $storeId = $request->storeId;

        if ($storeId !== '0') {
            $store = Store::findOrFail($storeId);
            if ($user->role !== 'admin' && $store->user_id !== $user->id) {
                return response()->json(['success' => false, 'error' => 'Access denied'], 403);
            }
        }

        $file = $request->file('file');
        $folder = $storeId !== '0' ? "store_{$storeId}" : "general";
        
        // Save locally in public/uploads for now so Next.js can serve it
        // In production we would use S3/Bunny disk
        $path = $file->store($folder, 'public_uploads');
        $url = asset('uploads/' . $path);

        $media = Media::create([
            'store_id' => $storeId === '0' ? null : $storeId,
            'product_id' => $request->productId,
            'url' => $url,
            'file_path' => $path,
            'file_size' => $file->getSize(),
            'type' => Str::startsWith($file->getMimeType(), 'image/') ? 'image' : 'video',
            'storage_provider' => 'local',
            'visibility' => 'public',
        ]);

        return response()->json([
            'success' => true,
            'data' => [
                'id' => (string) $media->id,
                'url' => $media->url,
                'type' => $media->type
            ],
            'message' => 'File uploaded successfully'
        ]);
    }
}
