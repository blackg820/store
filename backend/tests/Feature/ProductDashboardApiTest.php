<?php

namespace Tests\Feature;

use App\Models\Media;
use App\Models\Product;
use App\Models\ProductType;
use App\Models\Store;
use App\Models\User;
use App\Models\UserLimit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class ProductDashboardApiTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_creates_product_with_options_and_variants(): void
    {
        [$owner, $store, $type] = $this->catalogFixture();
        Sanctum::actingAs($owner);

        $this->postJson('/api/v1/products', [
            'storeId' => $store->id,
            'productTypeId' => $type->id,
            'title' => 'Dokani Shirt',
            'description' => 'Cotton shirt',
            'price' => 10000,
            'discount' => 10,
            'options' => [[
                'name' => 'Size',
                'type' => 'choice',
                'values' => ['S', 'M'],
            ]],
            'variants' => [[
                'title' => 'Dokani Shirt / M',
                'sku' => 'SHIRT-M',
                'priceOverride' => 11000,
                'stockQuantity' => 5,
                'optionValues' => ['Size' => 'M'],
                'isActive' => true,
            ]],
        ], ['X-Store-ID' => (string) $store->id])
            ->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.options.0.name', 'Size')
            ->assertJsonPath('data.variants.0.sku', 'SHIRT-M');
    }

    public function test_product_media_upload_reorder_primary_and_delete(): void
    {
        Storage::fake('public_uploads');
        [$owner, $store, $type] = $this->catalogFixture();
        Sanctum::actingAs($owner);
        $product = Product::create([
            'store_id' => $store->id,
            'product_type_id' => $type->id,
            'title' => 'Media Product',
            'price' => 1000,
            'is_active' => true,
            'status' => 'active',
        ]);

        $first = $this->post('/api/v1/products/'.$product->id.'/media', [
            'file' => UploadedFile::fake()->image('first.png', 20, 20),
        ], ['X-Store-ID' => (string) $store->id])->assertCreated();
        $second = $this->post('/api/v1/products/'.$product->id.'/media', [
            'file' => UploadedFile::fake()->image('second.png', 20, 20),
        ], ['X-Store-ID' => (string) $store->id])->assertCreated();

        $firstId = $first->json('data.id');
        $secondId = $second->json('data.id');

        $this->postJson('/api/v1/products/'.$product->id.'/media/reorder', [
            'mediaIds' => [(int) $secondId, (int) $firstId],
        ], ['X-Store-ID' => (string) $store->id])->assertOk();
        $this->postJson('/api/v1/products/'.$product->id.'/media/'.$secondId.'/primary', [], [
            'X-Store-ID' => (string) $store->id,
        ])->assertOk()->assertJsonPath('data.isPrimary', true);
        $this->deleteJson('/api/v1/products/'.$product->id.'/media/'.$firstId, [], [
            'X-Store-ID' => (string) $store->id,
        ])->assertOk();
    }

    public function test_viewer_cannot_upload_product_media(): void
    {
        [, $store, $type] = $this->catalogFixture();
        $viewer = User::factory()->create(['role' => 'viewer', 'parent_id' => $store->user_id, 'status' => 'active']);
        Sanctum::actingAs($viewer);
        $product = Product::create([
            'store_id' => $store->id,
            'product_type_id' => $type->id,
            'title' => 'Read only',
            'price' => 1000,
            'is_active' => true,
            'status' => 'active',
        ]);

        $this->post('/api/v1/products/'.$product->id.'/media', [
            'file' => UploadedFile::fake()->image('blocked.png'),
        ], ['X-Store-ID' => (string) $store->id])
            ->assertForbidden()
            ->assertJsonPath('code', 'READ_ONLY_ROLE');
    }

    public function test_media_upload_respects_storage_limit(): void
    {
        [$owner, $store, $type] = $this->catalogFixture();
        UserLimit::create([
            'user_id' => $owner->id,
            'limits' => ['storage_gb' => 0],
            'pricing' => [],
            'currency' => 'USD',
        ]);
        Sanctum::actingAs($owner);
        $product = Product::create([
            'store_id' => $store->id,
            'product_type_id' => $type->id,
            'title' => 'Quota blocked',
            'price' => 1000,
            'is_active' => true,
            'status' => 'active',
        ]);

        $this->post('/api/v1/products/'.$product->id.'/media', [
            'file' => UploadedFile::fake()->image('quota.png', 20, 20),
        ], ['X-Store-ID' => (string) $store->id])
            ->assertForbidden()
            ->assertJsonPath('success', false);
    }

    private function catalogFixture(): array
    {
        $owner = User::factory()->create(['role' => 'store_owner', 'status' => 'active']);
        $store = Store::create([
            'user_id' => $owner->id,
            'name' => 'Dokani Store',
            'slug' => 'dokani-store-'.uniqid(),
            'status' => 'active',
            'base_currency' => 'IQD',
        ]);
        $type = ProductType::create([
            'store_id' => $store->id,
            'name' => 'Apparel',
            'slug' => 'apparel-'.uniqid(),
            'schema' => [],
            'is_active' => true,
        ]);

        return [$owner, $store, $type];
    }
}
