<?php

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductVariant;
use Database\Seeders\ProductCatalogSeeder;
use Database\Seeders\PublicCatalogDemoSeeder;
use Illuminate\Support\Facades\DB;
use Tests\Support\CatalogDatabaseTestCase;

class PublicCatalogApiTest extends CatalogDatabaseTestCase
{
    private Category $category;
    private Brand $brand;
    private int $sequence = 0;

    protected function setUp(): void
    {
        parent::setUp();
        $this->category = Category::create(['slug' => 'laptop', 'name' => 'Laptop', 'is_active' => true]);
        $this->brand = Brand::create(['slug' => 'asus', 'name' => 'ASUS', 'is_active' => true]);
    }

    private function product(array $attributes = [], array $variant = []): Product
    {
        $number = ++$this->sequence;
        $product = Product::create([...[
            'slug' => 'product-'.$number, 'name' => 'Product '.$number,
            'category_id' => $this->category->id, 'brand_id' => $this->brand->id,
            'status' => Product::STATUS_ACTIVE, 'created_at' => '2026-11-07 10:00:00',
        ], ...$attributes]);
        $product->variants()->create([...[
            'sku' => 'SKU-'.$number, 'name' => 'Đen', 'sale_price' => 100, 'list_price' => 120,
            'stock_quantity' => 3, 'is_active' => true,
        ], ...$variant]);

        return $product;
    }

    public function test_all_public_conditions_apply_to_lists_counts_and_slug_lookup(): void
    {
        $visible = $this->product();
        $hidden = [];
        $hidden[] = $this->product(['status' => 'draft']);
        $hidden[] = $this->product(['status' => 'inactive']);
        $deleted = $this->product();
        $deleted->delete();
        $hidden[] = $deleted;
        $hidden[] = $this->product([], ['is_active' => false]);
        $without = $this->product();
        $without->variants()->delete();
        $hidden[] = $without;
        $inactiveCategory = Category::create(['slug' => 'hidden-category', 'name' => 'Hidden', 'is_active' => false]);
        $hidden[] = $this->product(['category_id' => $inactiveCategory->id]);
        $inactiveBrand = Brand::create(['slug' => 'hidden-brand', 'name' => 'Hidden', 'is_active' => false]);
        $hidden[] = $this->product(['brand_id' => $inactiveBrand->id]);
        $this->getJson('/api/public/products')->assertOk()->assertJsonPath('meta.total', 1)->assertJsonPath('data.0.id', $visible->id);
        $this->getJson('/api/public/categories')->assertOk()->assertJsonCount(1, 'data')->assertJsonPath('data.0.product_count', 1);
        $this->getJson('/api/public/brands')->assertOk()->assertJsonCount(1, 'data');
        foreach ($hidden as $product) {
            $this->getJson('/api/public/products/'.$product->slug)->assertNotFound();
        }
        $this->getJson('/api/public/products/unknown')->assertNotFound();
    }

    public function test_parent_category_count_matches_active_descendant_filter(): void
    {
        $this->product();
        $child = Category::create(['slug' => 'gaming', 'name' => 'Gaming', 'is_active' => true, 'parent_id' => $this->category->id]);
        $grandchild = Category::create(['slug' => 'portable', 'name' => 'Portable', 'is_active' => true, 'parent_id' => $child->id]);
        $this->product(['category_id' => $child->id]);
        $this->product(['category_id' => $grandchild->id]);
        $this->product(['category_id' => $child->id, 'status' => 'draft']);
        $this->getJson('/api/public/products?category=laptop')->assertJsonPath('meta.total', 3);
        $this->getJson('/api/public/products?category=gaming')->assertJsonPath('meta.total', 2);
        $categories = collect($this->getJson('/api/public/categories')->json('data'))->keyBy('slug');
        self::assertSame(3, $categories['laptop']['product_count']);
        self::assertSame(2, $categories['gaming']['product_count']);
        $child->update(['is_active' => false]);
        $this->getJson('/api/public/products?category=laptop')->assertJsonPath('meta.total', 1);
        $this->getJson('/api/public/products?category=gaming')->assertJsonPath('meta.total', 0);
        $this->getJson('/api/public/products?category=missing')->assertJsonPath('meta.total', 0);
    }

    public function test_price_filter_and_sort_use_cheapest_active_even_when_sold_out(): void
    {
        $multi = $this->product([], ['sale_price' => 100, 'list_price' => 100, 'stock_quantity' => 0]);
        $multi->variants()->create(['sku' => 'EXPENSIVE', 'name' => 'Bạc', 'sale_price' => 500, 'list_price' => 600, 'stock_quantity' => 10, 'is_active' => true]);
        $multi->variants()->create(['sku' => 'INACTIVE-CHEAP', 'name' => 'Hidden', 'sale_price' => 1, 'list_price' => 2, 'stock_quantity' => 99, 'is_active' => false]);
        $other = $this->product([], ['sale_price' => 200, 'list_price' => 200]);
        $this->getJson('/api/public/products?min_price=400&max_price=600')->assertJsonPath('meta.total', 0);
        $this->getJson('/api/public/products?min_price=100&max_price=100&in_stock=1&promotion=1')->assertJsonPath('meta.total', 1)->assertJsonPath('data.0.card_price', 100);
        $this->getJson('/api/public/products?sort=price_asc')->assertJsonPath('data.0.id', $multi->id)->assertJsonPath('data.1.id', $other->id);
        $this->getJson('/api/public/products?sort=price_desc')->assertJsonPath('data.0.id', $other->id);
        $this->getJson('/api/public/products?max_price=150')->assertOk()->assertJsonPath('meta.total', 1);
        $detail = $this->getJson('/api/public/products/'.$multi->slug)->assertOk()->assertJsonCount(2, 'data.variants')->assertJsonPath('data.card_price', 100);
        self::assertSame([100, 500], array_column($detail->json('data.variants'), 'sale_price'));
        self::assertSame([0, 10], array_column($detail->json('data.variants'), 'stock_quantity'));
    }

    public function test_filters_search_literal_wildcards_and_stable_pagination(): void
    {
        $this->product(['name' => 'Special 100% laptop'], ['stock_quantity' => 0, 'sale_price' => 120, 'list_price' => 120]);
        for ($number = 0; $number < 9; $number++) $this->product();
        $this->getJson('/api/public/products?per_page=4&page=2')->assertOk()->assertJsonCount(4, 'data')->assertJsonPath('meta.total', 10)->assertJsonPath('meta.current_page', 2)->assertJsonPath('meta.last_page', 3);
        $first = $this->getJson('/api/public/products?per_page=4')->json('data');
        $second = $this->getJson('/api/public/products?per_page=4&page=2')->json('data');
        self::assertSame([], array_intersect(array_column($first, 'id'), array_column($second, 'id')));
        $this->getJson('/api/public/products?q=100%25')->assertJsonPath('meta.total', 1);
        $this->getJson('/api/public/products?q=SKU-1')->assertJsonPath('meta.total', 2);
        $this->getJson('/api/public/products?q=0')->assertJsonPath('meta.total', 2);
        $this->getJson('/api/public/products?category=0')->assertJsonPath('meta.total', 0);
        $this->getJson('/api/public/products?brand=0')->assertJsonPath('meta.total', 0);
        $this->getJson('/api/public/products?brand=asus&category=laptop&promotion=1&in_stock=1')->assertJsonPath('meta.total', 9);
        $this->getJson('/api/public/products?brand=missing')->assertJsonPath('meta.total', 0);
        $this->getJson('/api/public/products?promotion=0&in_stock=0')->assertJsonPath('meta.total', 10);
        $this->getJson('/api/public/products?per_page=4&page=99')->assertJsonCount(0, 'data')->assertJsonPath('meta.total', 10);
    }

    public function test_images_empty_specs_and_explicit_resource_fields(): void
    {
        $product = $this->product();
        foreach ([[5, 'storage/second.jpg'], [0, 'images/demo/catalog-placeholder-front.svg'], [6, 'javascript:alert(1)']] as [$order, $path]) {
            ProductImage::create(['product_id' => $product->id, 'path' => $path, 'sort_order' => $order]);
        }
        $data = $this->getJson('/api/public/products/'.$product->slug)->assertOk()->json('data');
        self::assertStringEndsWith('/images/demo/catalog-placeholder-front.svg', $data['images'][0]['url']);
        self::assertSame('localhost', parse_url($data['images'][1]['url'], PHP_URL_HOST));
        self::assertSame('http', parse_url($data['images'][1]['url'], PHP_URL_SCHEME));
        self::assertNull($data['images'][2]['url']);
        self::assertSame([], $data['specifications']);
        foreach (['deleted_at', 'status', 'is_featured'] as $field) self::assertArrayNotHasKey($field, $data);
        self::assertArrayNotHasKey('is_active', $data['variants'][0]);
    }

    public function test_invalid_filters_are_422_and_empty_catalog_is_valid(): void
    {
        $this->getJson('/api/public/products')->assertOk()->assertJsonCount(0, 'data')->assertJsonPath('meta.total', 0);
        foreach (['per_page=49', 'page=0', 'min_price=-1', 'min_price=200&max_price=100', 'sort=invalid', 'in_stock=yes', 'q[]=bad'] as $query) {
            $this->getJson('/api/public/products?'.$query)->assertUnprocessable();
        }
    }

    public function test_old_seeder_stays_draft_and_public_seeder_is_safe_to_repeat(): void
    {
        $this->seed(ProductCatalogSeeder::class);
        $this->getJson('/api/public/products')->assertJsonPath('meta.total', 0);
        $this->seed(PublicCatalogDemoSeeder::class);
        $variant = ProductVariant::where('sku', 'PUBLIC-DEMO-LAPTOP-1-BLACK')->firstOrFail();
        $variant->update(['sale_price' => 17000000, 'stock_quantity' => 2]);
        $this->seed(PublicCatalogDemoSeeder::class);
        self::assertSame(17000000, $variant->fresh()->sale_price);
        self::assertSame(2, $variant->fresh()->stock_quantity);
        self::assertSame(3, Product::where('status', 'draft')->count());
        $this->getJson('/api/public/products')->assertJsonPath('meta.total', 12);
        $product = $variant->product;
        $product->update(['status' => 'draft']);
        $variant->update(['is_active' => false]);
        $this->seed(PublicCatalogDemoSeeder::class);
        self::assertSame('draft', $product->fresh()->status);
        self::assertFalse($variant->fresh()->is_active);
        $this->getJson('/api/public/products')->assertJsonPath('meta.total', 11);
        $this->app->instance('env', 'production');
        $this->expectException(\RuntimeException::class);
        $this->app->make(PublicCatalogDemoSeeder::class)->run();
    }

    public function test_public_seeder_conflict_rolls_back_without_taking_existing_sku(): void
    {
        $owner = $this->product([], ['sku' => 'PUBLIC-DEMO-LAPTOP-1-BLACK']);
        try {
            $this->seed(PublicCatalogDemoSeeder::class);
            self::fail('Expected a fixture SKU conflict.');
        } catch (\RuntimeException $error) {
            self::assertStringContainsString('SKU conflicts', $error->getMessage());
        }
        self::assertSame(1, Product::count());
        self::assertSame(1, Category::count());
        self::assertSame(1, Brand::count());
        self::assertSame($owner->id, ProductVariant::where('sku', 'PUBLIC-DEMO-LAPTOP-1-BLACK')->value('product_id'));
    }

    public function test_mariadb_search_handles_vietnamese_accents(): void
    {
        if (DB::connection()->getDriverName() !== 'mysql') $this->markTestSkipped('Collation check requires MySQL/MariaDB.');
        $this->product(['name' => 'Chuột không dây']);
        $this->getJson('/api/public/products?q=chuot')->assertOk()->assertJsonPath('meta.total', 1);
    }
}
