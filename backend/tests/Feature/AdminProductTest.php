<?php

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use App\Services\AdminProductService;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Tests\Support\CatalogDatabaseTestCase;

class AdminProductTest extends CatalogDatabaseTestCase
{
    private Category $category;

    private Brand $brand;

    protected function setUp(): void
    {
        parent::setUp();
        if (! Schema::hasTable('users')) {
            (require database_path('migrations/0001_01_01_000000_create_users_table.php'))->up();
            (require database_path('migrations/2026_11_07_180000_add_account_fields_to_users_table.php'))->up();
        }
        Storage::fake('public');
        $this->category = Category::create(['name' => 'Laptop', 'slug' => 't03-laptop', 'is_active' => true]);
        $this->brand = Brand::create(['name' => 'T03 Brand', 'slug' => 't03-brand', 'is_active' => true]);
    }

    private function admin(): void
    {
        $this->actingAs(User::factory()->create(['role' => 'admin']), 'web');
    }

    private function payload(string $suffix = 'one'): array
    {
        return [
            'name' => 'Product '.$suffix, 'slug' => 't03-'.$suffix,
            'category_id' => $this->category->id, 'brand_id' => $this->brand->id,
            'warranty_months' => 12, 'description' => 'Plain text',
            'images' => [['file' => $this->image(), 'alt_text' => 'Front', 'sort_order' => 0]],
            'variants' => [
                ['sku' => 'T03-'.$suffix.'-BLACK', 'name' => 'Đen', 'list_price' => 200000, 'sale_price' => 150000, 'stock_quantity' => 5, 'is_active' => true],
                ['sku' => 'T03-'.$suffix.'-SILVER', 'name' => 'Bạc', 'list_price' => 210000, 'sale_price' => 160000, 'stock_quantity' => 0, 'is_active' => true],
            ],
        ];
    }

    private function image(string $name = 'photo.png'): UploadedFile
    {
        // A real tiny PNG; no GD extension or generated review image is required.
        return UploadedFile::fake()->createWithContent($name, base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='));
    }

    private function editPayload(Product $product): array
    {
        return [...$product->only(['name', 'slug', 'category_id', 'brand_id', 'warranty_months', 'description']),
            'images' => $product->images->map(fn ($image) => $image->only(['id', 'alt_text', 'sort_order']))->all(),
            'variants' => $product->variants->map(fn ($variant) => $variant->only(['id', 'sku', 'name', 'options', 'list_price', 'sale_price', 'stock_quantity', 'is_active']))->all()];
    }

    public function test_every_product_endpoint_requires_active_admin_before_payload_validation(): void
    {
        $product = Product::create(['name' => 'Draft', 'slug' => 'draft', 'category_id' => $this->category->id, 'brand_id' => $this->brand->id]);
        $routes = [['GET', ''], ['POST', ''], ['GET', '/options'], ['GET', '/'.$product->id], ['PUT', '/'.$product->id], ['PATCH', '/'.$product->id]];
        foreach ($routes as [$method, $suffix]) {
            $this->json($method, '/api/admin/products'.$suffix)->assertUnauthorized();
        }
        $user = User::factory()->create();
        $this->actingAs($user, 'web');
        foreach ($routes as [$method, $suffix]) {
            $this->json($method, '/api/admin/products'.$suffix)->assertForbidden();
        }
        $user->forceFill(['role' => 'admin', 'is_active' => false])->save();
        foreach ($routes as [$method, $suffix]) {
            $this->json($method, '/api/admin/products'.$suffix)->assertForbidden();
        }
        $this->assertDatabaseCount('products', 1);
    }

    public function test_admin_creates_draft_two_skus_and_real_image_then_reads_it_back(): void
    {
        $this->admin();
        $created = $this->postJson('/api/admin/products', $this->payload())->assertCreated()->assertJsonPath('data.status', 'draft')->json('data');
        $this->getJson('/api/admin/products/'.$created['id'])->assertOk()->assertJsonCount(2, 'data.variants')->assertJsonCount(1, 'data.images')->assertJsonPath('data.variants.0.sale_price', 150000)->assertJsonPath('data.variants.1.stock_quantity', 0);
        $this->getJson('/api/admin/products?q=T03-one-BLACK&status=draft&per_page=1')->assertOk()->assertJsonPath('meta.total', 1)->assertJsonPath('data.0.variants_count', 2);
        $this->getJson('/api/admin/products/options')->assertOk()->assertJsonCount(1, 'data.categories')->assertJsonCount(1, 'data.brands');
        $this->getJson('/api/public/products')->assertJsonPath('meta.total', 0);
        $this->getJson('/api/public/products/'.$created['slug'])->assertNotFound();
        $this->get(parse_url($created['images'][0]['url'], PHP_URL_PATH))->assertOk()->assertHeader('X-Content-Type-Options', 'nosniff');
        self::assertCount(1, Storage::disk('public')->allFiles());
    }

    public function test_invalid_sku_prices_stock_links_and_files_leave_no_partial_data(): void
    {
        $this->admin();
        $changes = [
            ['variants.1.sku', 'T03-one-BLACK'], ['variants.0.list_price', 0],
            ['variants.0.sale_price', 0], ['variants.0.sale_price', 200001],
            ['variants.0.sale_price', 1.5], ['variants.0.list_price', 1000000000000],
            ['variants.0.stock_quantity', -1], ['variants.0.stock_quantity', '1.5'],
            ['variants.0.stock_quantity', 4294967296], ['category_id', 999999999],
            ['brand_id', 999999999], ['status', 'active'], ['images.0.id', 999999999],
            ['images.0.file', UploadedFile::fake()->create('bad.txt', 1, 'text/plain')],
            ['images.0.file', UploadedFile::fake()->create('bad.svg', 1, 'image/svg+xml')],
        ];
        foreach ($changes as [$field, $value]) {
            $payload = $this->payload();
            data_set($payload, $field, $value);
            $this->postJson('/api/admin/products', $payload)->assertUnprocessable()->assertJsonValidationErrors($field);
            $this->assertDatabaseCount('products', 0);
            $this->assertDatabaseCount('product_images', 0);
            $this->assertDatabaseCount('product_variants', 0);
            self::assertSame([], Storage::disk('public')->allFiles());
        }
    }

    public function test_update_preserves_ids_rejects_foreign_ids_and_never_deletes_saved_skus(): void
    {
        $this->admin();
        $service = app(AdminProductService::class);
        $product = $service->save($this->payload());
        $other = $service->save($this->payload('other'));
        $payload = $this->editPayload($product);
        $oldIds = $product->variants->pluck('id')->all();
        $payload['variants'][0]['sale_price'] = 120000;
        $payload['variants'][0]['stock_quantity'] = 9;
        $payload['variants'][1]['is_active'] = false;
        $this->putJson('/api/admin/products/'.$product->id, $payload)->assertOk()->assertJsonPath('data.variants.0.id', $oldIds[0])->assertJsonPath('data.variants.0.stock_quantity', 9)->assertJsonPath('data.variants.1.is_active', false);
        $before = $product->fresh()->toArray();
        foreach (['variants', 'images'] as $relation) {
            $invalid = $payload;
            $invalid[$relation][0]['id'] = $other->$relation->first()->id;
            $this->putJson('/api/admin/products/'.$product->id, $invalid)->assertUnprocessable()->assertJsonValidationErrors($relation.'.0.id');
            self::assertSame($before, $product->fresh()->toArray());
        }
        $invalid = $payload;
        array_pop($invalid['variants']);
        $this->putJson('/api/admin/products/'.$product->id, $invalid)->assertUnprocessable()->assertJsonValidationErrors('variants');
        $invalid = $payload;
        $invalid['variants'][0]['sku'] = $other->variants->first()->sku;
        $this->putJson('/api/admin/products/'.$product->id, $invalid)->assertUnprocessable()->assertJsonValidationErrors('variants.0.sku');
        self::assertSame($oldIds, $product->variants()->orderBy('id')->pluck('id')->all());
        self::assertSame(120000, $product->variants()->whereKey($oldIds[0])->first()->sale_price);
    }

    public function test_late_database_unique_collision_rolls_back_metadata_and_new_file(): void
    {
        $this->admin();
        ProductVariant::creating(function ($variant) {
            if ($variant->sku === 'T03-one-SILVER') {
                DB::table('product_variants')->insert($variant->getAttributes());
            }
        });
        try {
            $this->postJson('/api/admin/products', $this->payload())->assertUnprocessable()->assertJsonValidationErrors('variants.1.sku');
        } finally {
            ProductVariant::flushEventListeners();
        }
        $this->assertDatabaseCount('products', 0);
        $this->assertDatabaseCount('product_images', 0);
        $this->assertDatabaseCount('product_variants', 0);
        self::assertSame([], Storage::disk('public')->allFiles());
    }

    public function test_exception_after_upload_rolls_back_existing_product_and_keeps_original_files(): void
    {
        $service = app(AdminProductService::class);
        $product = $service->save($this->payload());
        $files = Storage::disk('public')->allFiles();
        $oldImage = $product->images->first();
        $payload = $this->editPayload($product);
        $payload['name'] = 'Must roll back';
        $payload['images'][0]['file'] = $this->image('replacement.png');
        $payload['variants'][] = ['sku' => 'FAIL-AFTER-UPLOAD', 'name' => 'Fail', 'list_price' => 20, 'sale_price' => 10, 'stock_quantity' => 0, 'is_active' => true];
        ProductVariant::creating(fn () => throw new RuntimeException('Simulated failure after file write'));
        try {
            $service->save($payload, $product);
            self::fail('Expected an exception.');
        } catch (RuntimeException $error) {
            self::assertSame('Simulated failure after file write', $error->getMessage());
        } finally {
            ProductVariant::flushEventListeners();
        }
        self::assertSame($files, Storage::disk('public')->allFiles());
        self::assertSame('Product one', $product->fresh()->name);
        self::assertSame($oldImage->path, $oldImage->fresh()->path);
        $this->assertDatabaseCount('product_variants', 2);
    }

    public function test_images_reorder_replace_remove_and_active_products_are_read_only(): void
    {
        $this->admin();
        $product = app(AdminProductService::class)->save($this->payload());
        $payload = $this->editPayload($product);
        $payload['images'][0]['sort_order'] = 3;
        $payload['images'][] = ['file' => $this->image('second.png'), 'sort_order' => 0, 'alt_text' => 'Second'];
        $updated = $this->putJson('/api/admin/products/'.$product->id, $payload)->assertOk()->json('data');
        self::assertSame('Second', $updated['images'][0]['alt_text']);
        self::assertSame($product->images->first()->id, $updated['images'][1]['id']);
        $payload['images'] = [collect($updated['images'][0])->only(['id', 'alt_text', 'sort_order'])->all()];
        $this->putJson('/api/admin/products/'.$product->id, $payload)->assertOk()->assertJsonCount(1, 'data.images');
        $this->assertDatabaseCount('product_images', 1);
        self::assertCount(2, Storage::disk('public')->allFiles());
        $keptImageId = $payload['images'][0]['id'];
        $oldPath = $product->images()->first()->path;
        $payload['images'][0]['file'] = $this->image('replacement-success.png');
        $replaced = $this->putJson('/api/admin/products/'.$product->id, $payload)
            ->assertOk()->assertJsonPath('data.images.0.id', $keptImageId)->json('data');
        self::assertNotSame($oldPath, $product->images()->first()->path);
        self::assertStringEndsWith(basename($product->images()->first()->path), $replaced['images'][0]['url']);
        Storage::disk('public')->assertExists('catalog/products/'.basename($oldPath));
        self::assertCount(3, Storage::disk('public')->allFiles());
        $product->status = 'active';
        $product->save();
        $this->putJson('/api/admin/products/'.$product->id, $payload)->assertStatus(409);
        $this->assertDatabaseHas('products', ['id' => $product->id, 'status' => 'active']);
    }
}
