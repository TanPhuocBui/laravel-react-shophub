<?php

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\Specification;
use App\Models\User;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Storage;
use RuntimeException;
use Tests\Support\CatalogDatabaseTestCase;

class AdminPublishingTest extends CatalogDatabaseTestCase
{
    private Product $product;

    private Specification $spec;

    private string $base;

    protected function setUp(): void
    {
        parent::setUp();
        if (! Schema::hasTable('users')) {
            (require database_path('migrations/0001_01_01_000000_create_users_table.php'))->up();
            (require database_path('migrations/2026_11_07_180000_add_account_fields_to_users_table.php'))->up();
        }
        Storage::fake('public');
        $category = Category::create(['name' => 'T04', 'slug' => 't04', 'is_active' => true]);
        $brand = Brand::create(['name' => 'T04', 'slug' => 't04', 'is_active' => true]);
        $this->product = Product::create(['name' => 'T04', 'slug' => 't04', 'category_id' => $category->id, 'brand_id' => $brand->id, 'status' => 'draft']);
        $this->product->images()->create(['path' => 'assets/demo.png', 'sort_order' => 0]);
        $this->product->variants()->create(['sku' => 'T04', 'name' => 'Default', 'list_price' => 200, 'sale_price' => 100, 'stock_quantity' => 0, 'is_active' => true]);
        $this->spec = Specification::create(['name' => 'Dung lượng', 'code' => 't04_capacity', 'unit' => 'GB', 'is_active' => true]);
        $category->specifications()->attach($this->spec->id, ['is_required' => true, 'sort_order' => 2]);
        $this->base = '/api/admin/products/'.$this->product->id;
    }

    private function admin(): void
    {
        $this->actingAs(User::factory()->create(['role' => 'admin']), 'web');
    }

    private function values(mixed $value = '16'): array
    {
        return ['values' => [['specification_id' => $this->spec->id, 'value' => $value]]];
    }

    private function config(bool $required = true): array
    {
        return ['items' => [['specification_id' => $this->spec->id, 'is_required' => $required, 'sort_order' => 2]]];
    }

    private function content(): array
    {
        return ['name' => 'Updated', 'description' => 'New description', 'images' => $this->product->images->map(fn ($i) => $i->only(['id', 'sort_order', 'alt_text']))->all()];
    }

    public function test_all_new_routes_require_admin(): void
    {
        $routes = [['GET', '/api/admin/specifications'], ['POST', '/api/admin/specifications'], ['PUT', '/api/admin/specifications/'.$this->spec->id], ['GET', '/api/admin/categories/'.$this->product->category_id.'/specifications'], ['PUT', '/api/admin/categories/'.$this->product->category_id.'/specifications'], ['GET', $this->base.'/specifications'], ['PUT', $this->base.'/specifications'], ['POST', $this->base.'/publish'], ['POST', $this->base.'/hide'], ['PUT', $this->base.'/content']];
        foreach ($routes as [$method, $url]) {
            $this->json($method, $url)->assertUnauthorized();
        }
        $user = User::factory()->create();
        $this->actingAs($user, 'web');
        foreach ($routes as [$method, $url]) {
            $this->json($method, $url)->assertForbidden();
        }
        $user->forceFill(['role' => 'admin', 'is_active' => false])->save();
        foreach ($routes as [$method, $url]) {
            $this->json($method, $url)->assertForbidden();
        }
    }

    public function test_publish_hide_republish_and_public_spec_order_units(): void
    {
        $this->admin();
        $this->postJson($this->base.'/publish')->assertUnprocessable()->assertJsonValidationErrors('publication');
        $this->assertSame('draft', $this->product->fresh()->status);
        $this->putJson($this->base.'/specifications', $this->values())->assertOk()->assertJsonPath('data.publication.can_publish', true);
        $other = Specification::create(['name' => 'CPU', 'code' => 't04_cpu', 'is_active' => true]);
        $this->product->category->specifications()->attach($other, ['sort_order' => 1]);
        $this->product->specificationValues()->create(['specification_id' => $other->id, 'value' => 'Core i7']);
        $this->postJson($this->base.'/publish')->assertOk();
        $this->getJson('/api/public/products/t04')->assertOk()->assertJsonPath('data.specifications.0.name', 'CPU')->assertJsonPath('data.specifications.1.value', '16 GB');
        $this->putJson($this->base.'/specifications', $this->values('32GB'))->assertOk();
        $this->getJson('/api/public/products/t04')->assertJsonPath('data.specifications.1.value', '32GB');
        $this->postJson($this->base.'/hide')->assertOk();
        $this->getJson('/api/public/products/t04')->assertNotFound();
        $this->getJson('/api/public/products')->assertJsonPath('meta.total', 0);
        $this->assertDatabaseCount('product_variants', 1);
        $this->assertDatabaseCount('product_images', 1);
        $this->assertDatabaseCount('product_specification_values', 2);
        $this->postJson($this->base.'/publish')->assertOk();
        $this->getJson('/api/public/products')->assertJsonPath('meta.total', 1);
    }

    public function test_bad_values_or_category_configuration_roll_back(): void
    {
        $this->admin();
        $this->putJson($this->base.'/specifications', $this->values())->assertOk();
        foreach ([12, true, ['bad'], ['text' => 'bad']] as $invalid) {
            $this->putJson($this->base.'/specifications', $this->values($invalid))->assertUnprocessable();
        }
        $wrong = Specification::create(['name' => 'Other', 'code' => 't04_wrong', 'is_active' => true]);
        $this->putJson($this->base.'/specifications', ['values' => [...$this->values('changed')['values'], ['specification_id' => $wrong->id, 'value' => 'bad']]])->assertUnprocessable();
        $this->assertSame('16', $this->product->specificationValues()->first()->value);
        $url = '/api/admin/categories/'.$this->product->category_id.'/specifications';
        $this->putJson($url, ['items' => []])->assertUnprocessable();
        $this->putJson($url, ['items' => [['specification_id' => 99999999, 'is_required' => false, 'sort_order' => 1]]])->assertUnprocessable();
        $this->assertSame(1, $this->product->category->specifications()->count());
        $this->postJson($this->base.'/publish')->assertOk();
        $this->putJson($this->base.'/specifications', $this->values(''))->assertUnprocessable();
        $this->assertSame('16', $this->product->specificationValues()->first()->value);
        $this->putJson($url, ['items' => [...$this->config()['items'], ['specification_id' => $wrong->id, 'is_required' => true, 'sort_order' => 0]]])->assertUnprocessable();
        $this->assertSame(1, $this->product->category->specifications()->count());
    }

    public function test_definition_edits_protect_existing_semantics(): void
    {
        $this->admin();
        $new = $this->postJson('/api/admin/specifications', ['name' => 'New', 'code' => 't04_new', 'unit' => null, 'is_active' => true])->assertCreated()->json('data');
        $this->putJson('/api/admin/categories/'.$this->product->category_id.'/specifications', ['items' => [...$this->config()['items'], ['specification_id' => $new['id'], 'is_required' => false, 'sort_order' => 0]]])->assertOk();
        $this->putJson($this->base.'/specifications', $this->values())->assertOk();
        $payload = $this->spec->only(['name', 'code', 'unit', 'is_active']);
        foreach ([['unit' => 'MB'], ['code' => 'changed'], ['is_active' => false]] as $change) {
            $this->putJson('/api/admin/specifications/'.$this->spec->id, [...$payload, ...$change])->assertUnprocessable();
        }
        $this->putJson('/api/admin/specifications/'.$this->spec->id, [...$payload, 'name' => 'Memory'])->assertOk();
        $this->assertSame('GB', $this->spec->fresh()->unit);
    }

    public function test_text_zero_is_a_valid_required_value(): void
    {
        $this->admin();
        $this->putJson($this->base.'/specifications', $this->values('0'))->assertOk()->assertJsonPath('data.publication.can_publish', true);
        $this->postJson($this->base.'/publish')->assertOk();
        $this->getJson('/api/public/products/t04')->assertOk()->assertJsonPath('data.specifications.0.value', '0 GB');
    }

    public function test_publish_checks_category_brand_images_and_skus(): void
    {
        $this->admin();
        $this->putJson($this->base.'/specifications', $this->values())->assertOk();
        $this->product->category->update(['is_active' => false]);
        $this->product->brand->update(['is_active' => false]);
        $this->product->images()->delete();
        $this->product->variants()->update(['is_active' => false]);
        $issues = $this->postJson($this->base.'/publish')->assertUnprocessable()->json('errors.publication');
        $this->assertCount(4, $issues);
        $this->assertSame('draft', $this->product->fresh()->status);
        $this->postJson($this->base.'/hide')->assertConflict();
        $this->putJson($this->base.'/content', $this->content())->assertConflict();
    }

    public function test_active_content_whitelist_keeps_slug_sku_status_and_t03_guard(): void
    {
        $this->admin();
        $this->putJson($this->base.'/specifications', $this->values())->assertOk();
        $this->postJson($this->base.'/publish')->assertOk();
        foreach (['slug', 'category_id', 'brand_id', 'variants', 'status', 'warranty_months', 'sale_price', 'stock_quantity', 'specifications'] as $field) {
            $this->putJson($this->base.'/content', [...$this->content(), $field => null])->assertUnprocessable()->assertJsonValidationErrors($field);
            $this->assertSame('T04', $this->product->fresh()->name);
        }
        $this->putJson($this->base, [])->assertUnprocessable();
        $this->putJson($this->base.'/content', $this->content())->assertOk();
        $this->assertSame('t04', $this->product->fresh()->slug);
        $this->assertSame('active', $this->product->fresh()->status);
        $this->assertSame('T04', $this->product->variants()->first()->sku);
        $this->getJson('/api/public/products/t04')->assertJsonPath('data.name', 'Updated');
    }

    public function test_active_upload_failure_rolls_back_metadata_and_new_files(): void
    {
        $this->admin();
        $this->product->update(['status' => 'active']);
        $original = $this->product->images()->first()->path;
        $payload = $this->content();
        $payload['images'][0]['file'] = UploadedFile::fake()->createWithContent('new.png', base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='));
        $connection = DB::connection();
        $simulate = true;
        $connection->beforeExecuting(function ($query) use (&$simulate) {
            if ($simulate && str_starts_with(strtolower($query), 'update') && str_contains($query, 'product_images')) {
                throw new RuntimeException('Simulated metadata failure');
            }
        });
        try {
            $this->putJson($this->base.'/content', $payload)->assertStatus(500);
        } finally {
            $simulate = false;
        }
        $this->assertSame('T04', $this->product->fresh()->name);
        $this->assertSame($original, $this->product->images()->first()->path);
        $this->assertSame([], Storage::disk('public')->allFiles());
    }

    public function test_active_content_replaces_image_with_owned_id_and_rejects_foreign_image(): void
    {
        $this->admin();
        $this->product->update(['status' => 'active']);
        $imageId = $this->product->images()->first()->id;
        $other = Product::create(['name' => 'Other', 'slug' => 't04-other', 'category_id' => $this->product->category_id, 'brand_id' => $this->product->brand_id]);
        $foreign = $other->images()->create(['path' => 'assets/foreign.png', 'sort_order' => 0]);
        $payload = $this->content();
        $payload['images'][0]['id'] = $foreign->id;
        $this->putJson($this->base.'/content', $payload)->assertUnprocessable()->assertJsonValidationErrors('images.0.id');
        $this->assertSame('T04', $this->product->fresh()->name);
        $payload['images'][0]['id'] = $imageId;
        $payload['images'][0]['file'] = UploadedFile::fake()->createWithContent('valid.png', base64_decode('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII='));
        $this->putJson($this->base.'/content', $payload)->assertOk()->assertJsonPath('data.images.0.id', $imageId)->assertJsonPath('data.status', 'active');
        $path = $this->product->images()->first()->path;
        $this->assertStringStartsWith('media/catalog/', $path);
        $this->get('/'.$path)->assertOk()->assertHeader('X-Content-Type-Options', 'nosniff');
        $this->assertCount(1, Storage::disk('public')->allFiles());
        $this->assertSame('assets/foreign.png', $foreign->fresh()->path);
    }
}
