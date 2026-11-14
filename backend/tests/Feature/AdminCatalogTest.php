<?php

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use App\Services\AdminCatalogService;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;
use Tests\Support\CatalogDatabaseTestCase;

class AdminCatalogTest extends CatalogDatabaseTestCase
{
    protected function setUp(): void
    {
        parent::setUp();
        if (! Schema::hasTable('users')) {
            (require database_path('migrations/0001_01_01_000000_create_users_table.php'))->up();
            (require database_path('migrations/2026_11_07_180000_add_account_fields_to_users_table.php'))->up();
        }
        $this->withHeader('Origin', 'http://localhost:5173');
    }

    private function admin(): User
    {
        $admin = User::factory()->create(['role' => 'admin']);
        $this->actingAs($admin, 'web');

        return $admin;
    }

    private function category(array $extra = []): array
    {
        return [...['name' => 'Danh mục test', 'slug' => 'danh-muc-test', 'parent_id' => null,
            'sort_order' => 0, 'is_active' => true], ...$extra];
    }

    public function test_all_admin_routes_require_an_active_admin_before_validation_or_mutation(): void
    {
        $category = Category::create($this->category());
        $brand = Brand::create(['name' => 'Brand', 'slug' => 'brand', 'is_active' => true]);
        $routes = [];
        foreach (['categories' => $category->id, 'brands' => $brand->id] as $kind => $id) {
            foreach ([['GET', ''], ['POST', ''], ['GET', "/{$id}"], ['PUT', "/{$id}"], ['PATCH', "/{$id}"], ['PATCH', "/{$id}/hide"]] as [$method, $suffix]) {
                $routes[] = [$method, "/api/admin/{$kind}{$suffix}"];
            }
        }
        $routes[] = ['GET', '/api/admin/categories/options'];
        foreach ($routes as [$method, $url]) {
            $this->json($method, $url)->assertUnauthorized();
        }
        $customer = User::factory()->create();
        $this->actingAs($customer, 'web');
        foreach ($routes as [$method, $url]) {
            $this->json($method, $url)->assertForbidden();
        }
        $customer->forceFill(['role' => 'admin', 'is_active' => false])->save();
        foreach ($routes as [$method, $url]) {
            $this->json($method, $url)->assertForbidden();
        }
        $this->assertDatabaseCount('categories', 1);
        $this->assertDatabaseCount('brands', 1);
        self::assertTrue($category->fresh()->is_active);
        self::assertTrue($brand->fresh()->is_active);
    }

    public function test_admin_can_create_edit_list_hide_and_reactivate_categories_and_brands(): void
    {
        $this->admin();
        $root = $this->postJson('/api/admin/categories', $this->category())->assertCreated()->json('data');
        $child = $this->postJson('/api/admin/categories', $this->category(['name' => 'Child', 'slug' => 'child', 'parent_id' => $root['id']]))->assertCreated()->json('data');
        $this->getJson('/api/admin/categories/options')->assertOk()->assertJsonCount(2, 'data');
        $this->putJson('/api/admin/categories/'.$child['id'], $this->category(['name' => 'Child updated', 'slug' => 'child-updated', 'parent_id' => $root['id'], 'sort_order' => 4]))->assertOk()->assertJsonPath('data.sort_order', 4);
        $this->getJson('/api/admin/categories/'.$child['id'])->assertOk()->assertJsonPath('data.parent_id', $root['id']);
        $this->getJson('/api/admin/categories?per_page=1&page=2')->assertOk()->assertJsonPath('meta.total', 2)->assertJsonCount(1, 'data');
        $this->patchJson('/api/admin/categories/'.$root['id'].'/hide')->assertOk()->assertJsonPath('data.is_active', false);
        $this->patchJson('/api/admin/categories/'.$root['id'].'/hide')->assertOk();
        $this->assertDatabaseHas('categories', ['id' => $child['id'], 'parent_id' => $root['id'], 'is_active' => true]);
        $this->putJson('/api/admin/categories/'.$root['id'], $this->category())->assertOk()->assertJsonPath('data.is_active', true);
        $brand = $this->postJson('/api/admin/brands', ['name' => 'New brand', 'slug' => 'new-brand', 'is_active' => true])->assertCreated()->json('data');
        $this->putJson('/api/admin/brands/'.$brand['id'], ['name' => 'Edited', 'slug' => 'edited', 'is_active' => true])->assertOk();
        $this->getJson('/api/admin/brands/'.$brand['id'])->assertOk()->assertJsonPath('data.name', 'Edited');
        $this->patchJson('/api/admin/brands/'.$brand['id'].'/hide')->assertOk()->assertJsonPath('data.is_active', false);
        $this->patchJson('/api/admin/brands/'.$brand['id'].'/hide')->assertOk();
        $this->getJson('/api/admin/brands?status=inactive&q=Edited')->assertOk()->assertJsonPath('meta.total', 1);
        $this->putJson('/api/admin/brands/'.$brand['id'], ['name' => 'Edited', 'slug' => 'edited', 'is_active' => true])->assertOk()->assertJsonPath('data.is_active', true);
    }

    public function test_invalid_parent_self_and_multi_level_cycle_leave_entire_tree_unchanged(): void
    {
        $this->admin();
        $a = Category::create($this->category(['slug' => 'a']));
        $b = Category::create($this->category(['slug' => 'b', 'parent_id' => $a->id]));
        $c = Category::create($this->category(['slug' => 'c', 'parent_id' => $b->id]));
        $before = Category::orderBy('id')->get()->toArray();
        foreach ([999999999, $a->id, $b->id, $c->id] as $parent) {
            $this->putJson('/api/admin/categories/'.$a->id, $this->category(['slug' => 'changed', 'name' => 'Must not change', 'parent_id' => $parent]))
                ->assertUnprocessable()->assertJsonValidationErrors('parent_id');
            self::assertSame($before, Category::orderBy('id')->get()->toArray());
        }
        $this->postJson('/api/admin/categories', $this->category(['slug' => 'orphan', 'parent_id' => 999999999]))->assertUnprocessable()->assertJsonValidationErrors('parent_id');
        self::assertSame($before, Category::orderBy('id')->get()->toArray());
        try {
            app(AdminCatalogService::class)->saveCategory($this->category(['slug' => 'a', 'parent_id' => $c->id]), $a);
            self::fail('Internal service must reject cycles too.');
        } catch (ValidationException $error) {
            self::assertArrayHasKey('parent_id', $error->errors());
        }
        self::assertSame($before, Category::orderBy('id')->get()->toArray());
    }

    public function test_validation_duplicates_unknown_records_and_literal_search(): void
    {
        $this->admin();
        Category::create($this->category(['name' => '100% category']));
        Brand::create(['name' => 'Existing', 'slug' => 'existing', 'is_active' => true]);
        $this->postJson('/api/admin/categories', $this->category())->assertUnprocessable()->assertJsonValidationErrors('slug');
        $this->postJson('/api/admin/categories', $this->category(['slug' => 'Invalid slug', 'sort_order' => -1]))->assertUnprocessable()->assertJsonValidationErrors(['slug', 'sort_order']);
        $this->postJson('/api/admin/brands', ['name' => 'Existing', 'slug' => 'other', 'is_active' => true])->assertUnprocessable()->assertJsonValidationErrors('name');
        $this->postJson('/api/admin/brands', ['name' => 'Other', 'slug' => 'existing', 'is_active' => true])->assertUnprocessable()->assertJsonValidationErrors('slug');
        $this->postJson('/api/admin/brands', [])->assertUnprocessable()->assertJsonValidationErrors(['name', 'slug', 'is_active']);
        $this->getJson('/api/admin/categories?q=100%25')->assertOk()->assertJsonPath('meta.total', 1);
        $this->getJson('/api/admin/brands?q=missing')->assertOk()->assertJsonPath('meta.total', 0);
        $this->getJson('/api/admin/brands?per_page=51')->assertUnprocessable();
        $this->getJson('/api/admin/categories/999999999')->assertNotFound();
        $this->getJson('/api/admin/brands/999999999')->assertNotFound();
        $this->deleteJson('/api/admin/brands/1')->assertMethodNotAllowed();
    }

    public function test_hiding_preserves_product_links_and_matches_t01_visibility_rules(): void
    {
        $this->admin();
        $parent = Category::create($this->category(['slug' => 'parent']));
        $child = Category::create($this->category(['slug' => 'child', 'parent_id' => $parent->id]));
        $brand = Brand::create(['name' => 'Brand', 'slug' => 'brand', 'is_active' => true]);
        $product = Product::create(['name' => 'Product', 'slug' => 'product', 'category_id' => $child->id, 'brand_id' => $brand->id, 'status' => 'active']);
        $product->variants()->create(['name' => 'Default', 'sku' => 'ADMIN-TEST', 'sale_price' => 100, 'list_price' => 100, 'stock_quantity' => 1, 'is_active' => true]);
        $this->getJson('/api/public/products/product')->assertOk();
        $this->patchJson('/api/admin/categories/'.$parent->id.'/hide')->assertOk();
        $this->getJson('/api/public/products?category=parent')->assertJsonPath('meta.total', 0);
        $this->getJson('/api/public/products/product')->assertOk();
        $this->patchJson('/api/admin/categories/'.$child->id.'/hide')->assertOk();
        $this->getJson('/api/public/products/product')->assertNotFound();
        $this->putJson('/api/admin/categories/'.$child->id, $this->category(['slug' => 'child', 'parent_id' => $parent->id]))->assertOk();
        $this->getJson('/api/public/products/product')->assertOk();
        $this->patchJson('/api/admin/brands/'.$brand->id.'/hide')->assertOk();
        $this->getJson('/api/public/products/product')->assertNotFound();
        $this->assertDatabaseHas('products', ['id' => $product->id, 'category_id' => $child->id, 'brand_id' => $brand->id, 'status' => 'active']);
        $this->assertDatabaseCount('product_variants', 1);
        $this->assertDatabaseCount('categories', 2);
        $this->assertDatabaseCount('brands', 1);
    }
}
