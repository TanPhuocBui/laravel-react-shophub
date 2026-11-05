<?php

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductVariant;
use Database\Seeders\ProductCatalogSeeder;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use PHPUnit\Framework\Attributes\DataProvider;
use RuntimeException;
use Tests\TestCase;

class ProductCatalogSeederTest extends TestCase
{
    private const TABLES = ['categories', 'brands', 'products', 'product_variants', 'product_images'];

    protected function setUp(): void
    {
        parent::setUp();

        // Every test uses its own in-memory database, never the configured shophub database.
        config()->set('database.connections.catalog_seeder_test', [
            'driver' => 'sqlite',
            'database' => ':memory:',
            'prefix' => '',
            'foreign_key_constraints' => true,
        ]);
        DB::setDefaultConnection('catalog_seeder_test');

        self::assertSame('catalog_seeder_test', Schema::getConnection()->getName());
        self::assertSame(':memory:', DB::connection()->getDatabaseName());

        foreach (self::TABLES as $table) {
            $files = glob(database_path("migrations/*_create_{$table}_table.php"));
            self::assertCount(1, $files);
            (require $files[0])->up();
        }
    }

    protected function tearDown(): void
    {
        DB::purge('catalog_seeder_test');

        parent::tearDown();
    }

    #[DataProvider('allowedEnvironments')]
    public function test_it_creates_the_expected_demo_catalog(string $environment): void
    {
        $this->app->instance('env', $environment);
        $this->seed(ProductCatalogSeeder::class);

        foreach (array_combine(self::TABLES, [3, 3, 3, 4, 6]) as $table => $count) {
            $this->assertDatabaseCount($table, $count);
        }

        self::assertSame(['laptop', 'linh-kien-phu-kien', 'thiet-bi-gia-dung'], Category::orderBy('sort_order')->pluck('slug')->all());
        self::assertSame([1, 2, 3], Category::orderBy('sort_order')->pluck('sort_order')->all());
        self::assertSame(0, Category::whereNotNull('parent_id')->count());

        $products = Product::with(['category', 'brand', 'variants', 'images'])->get()->keyBy('slug');
        $expectedProducts = [
            'laptop-asus-demo' => ['Laptop ASUS Demo', 'laptop', 'asus', 24, 2],
            'ssd-kingston-demo-1tb' => ['SSD Kingston Demo 1TB', 'linh-kien-phu-kien', 'kingston', 36, 1],
            'binh-dun-philips-demo' => ['Bình đun Philips Demo', 'thiet-bi-gia-dung', 'philips', 12, 1],
        ];

        foreach ($expectedProducts as $slug => [$name, $category, $brand, $warranty, $variantCount]) {
            $product = $products[$slug];
            self::assertSame($name, $product->name);
            self::assertSame($category, $product->category->slug);
            self::assertSame($brand, $product->brand->slug);
            self::assertTrue($product->category->is_active);
            self::assertTrue($product->brand->is_active);
            self::assertSame($warranty, $product->warranty_months);
            self::assertSame(Product::STATUS_DRAFT, $product->status);
            self::assertStringContainsString('Dữ liệu demo', $product->short_description);
            self::assertCount($variantCount, $product->variants);
            self::assertSame([0, 1], $product->images->pluck('sort_order')->all());

            foreach ($product->images as $image) {
                self::assertFileExists(public_path($image->path));
                self::assertStringStartsWith('images/demo/', $image->path);
                self::assertStringContainsString($name, $image->alt_text);
            }
        }

        $expectedVariants = [
            'DEMO-ASUS-BLACK' => ['Đen', ['color' => 'Đen'], 20000000, 18500000, 10],
            'DEMO-ASUS-SILVER' => ['Bạc', ['color' => 'Bạc'], 20000000, 18800000, 0],
            'DEMO-SSD-1TB' => ['Mặc định', null, 2000000, 1700000, 20],
            'DEMO-KETTLE' => ['Mặc định', null, 700000, 550000, 15],
        ];

        foreach ($expectedVariants as $sku => $expected) {
            $variant = ProductVariant::where('sku', $sku)->firstOrFail();
            self::assertSame($expected, [$variant->name, $variant->options, $variant->list_price, $variant->sale_price, $variant->stock_quantity]);
            self::assertTrue($variant->is_active);
        }
    }

    public function test_rerunning_preserves_existing_records_and_adds_missing_fixtures(): void
    {
        $category = Category::create([
            'slug' => 'laptop',
            'name' => 'Danh mục đã chỉnh',
            'sort_order' => 42,
            'is_active' => false,
        ]);
        $brand = Brand::create(['slug' => 'asus', 'name' => 'Thương hiệu đã chỉnh', 'is_active' => false]);
        $product = Product::create([
            'slug' => 'laptop-asus-demo',
            'category_id' => $category->id,
            'brand_id' => $brand->id,
            'name' => 'Sản phẩm đã chỉnh',
            'short_description' => 'Mô tả ngắn đã chỉnh',
            'description' => 'Mô tả chi tiết đã chỉnh',
            'status' => Product::STATUS_INACTIVE,
            'warranty_months' => 7,
            'is_featured' => true,
        ]);
        $variant = ProductVariant::create([
            'product_id' => $product->id,
            'sku' => 'DEMO-ASUS-BLACK',
            'name' => 'Biến thể đã chỉnh',
            'options' => ['color' => 'Màu đã chỉnh'],
            'list_price' => 25000000,
            'sale_price' => 21000000,
            'stock_quantity' => 3,
            'is_active' => false,
        ]);
        $image = ProductImage::create([
            'product_id' => $product->id,
            'path' => 'images/demo/catalog-placeholder-front.svg',
            'alt_text' => 'Ảnh đã chỉnh',
            'sort_order' => 9,
        ]);
        $originals = array_map(fn ($model) => $model->fresh()->getAttributes(), [$category, $brand, $product, $variant, $image]);

        $this->seed(ProductCatalogSeeder::class);

        self::assertSame($originals, array_map(fn ($model) => $model->fresh()->getAttributes(), [$category, $brand, $product, $variant, $image]));
        foreach (array_combine(self::TABLES, [3, 3, 3, 4, 6]) as $table => $count) {
            $this->assertDatabaseCount($table, $count);
        }

        $before = $this->snapshot();
        $this->seed(ProductCatalogSeeder::class);
        self::assertSame($before, $this->snapshot());
    }

    public function test_it_rejects_a_category_slug_that_is_not_a_root(): void
    {
        $parent = Category::create(['slug' => 'existing-parent', 'name' => 'Existing parent']);
        Category::create(['slug' => 'laptop', 'name' => 'Existing child', 'parent_id' => $parent->id]);
        $before = $this->snapshot();

        $this->assertConflict('Category slug [laptop]');

        self::assertSame($before, $this->snapshot());
    }

    public function test_it_reports_a_brand_name_owned_by_another_slug_and_rolls_back(): void
    {
        Brand::create(['slug' => 'existing-philips', 'name' => 'Philips']);
        $before = $this->snapshot();

        $this->assertConflict('Brand name [Philips]');

        self::assertSame($before, $this->snapshot());
    }

    #[DataProvider('productRelationships')]
    public function test_it_rejects_an_existing_product_with_different_relationships(string $foreignKey): void
    {
        $this->seed(ProductCatalogSeeder::class);
        $product = Product::where('slug', 'laptop-asus-demo')->firstOrFail();
        $other = Product::where('slug', 'ssd-kingston-demo-1tb')->firstOrFail();
        $product->update([$foreignKey => $other->$foreignKey]);
        $before = $this->snapshot();

        $this->assertConflict('Product slug [laptop-asus-demo]');

        self::assertSame($before, $this->snapshot());
    }

    public function test_a_late_sku_conflict_rolls_back_all_new_fixture_records(): void
    {
        $category = Category::create(['slug' => 'existing-category', 'name' => 'Existing category']);
        $brand = Brand::create(['slug' => 'existing-brand', 'name' => 'Existing brand']);
        $product = Product::create([
            'slug' => 'existing-product',
            'name' => 'Existing product',
            'category_id' => $category->id,
            'brand_id' => $brand->id,
        ]);
        ProductVariant::create([
            'product_id' => $product->id,
            'sku' => 'DEMO-KETTLE',
            'name' => 'Existing variant',
            'list_price' => 1000000,
            'sale_price' => 900000,
            'stock_quantity' => 4,
        ]);
        $before = $this->snapshot();

        $this->assertConflict('Variant SKU [DEMO-KETTLE]');

        self::assertSame($before, $this->snapshot());
    }

    public function test_it_does_not_restore_or_recreate_a_soft_deleted_product(): void
    {
        $this->seed(ProductCatalogSeeder::class);
        Product::where('slug', 'laptop-asus-demo')->firstOrFail()->delete();
        $before = $this->snapshot();

        $this->assertConflict('the product is soft deleted');

        self::assertSame($before, $this->snapshot());
        self::assertSame(3, Product::withTrashed()->count());
        self::assertTrue(Product::withTrashed()->where('slug', 'laptop-asus-demo')->firstOrFail()->trashed());
    }

    #[DataProvider('blockedEnvironments')]
    public function test_it_blocks_other_environments_even_with_force(string $environment): void
    {
        $this->app->instance('env', $environment);
        $before = $this->snapshot();

        try {
            Artisan::call('db:seed', ['--class' => ProductCatalogSeeder::class, '--force' => true]);
            self::fail('Expected the environment guard to reject seeding.');
        } catch (RuntimeException $exception) {
            self::assertStringContainsString('only allowed in local or testing', $exception->getMessage());
        }

        self::assertSame($before, $this->snapshot());
    }

    public function test_it_requires_placeholder_files_before_writing_records(): void
    {
        $this->app->usePublicPath(base_path('tests/missing-catalog-public'));
        $before = $this->snapshot();

        $this->assertConflict('placeholder is missing');

        self::assertSame($before, $this->snapshot());
    }

    public static function allowedEnvironments(): array
    {
        return [['local'], ['testing']];
    }

    public static function blockedEnvironments(): array
    {
        return [['production'], ['staging'], ['development']];
    }

    public static function productRelationships(): array
    {
        return [['category_id'], ['brand_id']];
    }

    private function assertConflict(string $message): void
    {
        try {
            $this->seed(ProductCatalogSeeder::class);
            self::fail('Expected a catalog seeding conflict.');
        } catch (RuntimeException $exception) {
            self::assertStringContainsString($message, $exception->getMessage());
        }
    }

    private function snapshot(): array
    {
        $snapshot = [];

        foreach (self::TABLES as $table) {
            $snapshot[$table] = DB::table($table)->orderBy('id')->get()->map(fn ($row) => (array) $row)->all();
        }

        return $snapshot;
    }
}
