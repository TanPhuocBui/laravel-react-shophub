<?php

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductSpecificationValue;
use App\Models\Specification;
use Database\Seeders\PublicCatalogDemoSeeder;
use Database\Seeders\PublicCatalogSpecificationSeeder;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use RuntimeException;
use Tests\Support\CatalogDatabaseTestCase;

class CatalogSpecificationTest extends CatalogDatabaseTestCase
{
    private Category $category;
    private Brand $brand;

    protected function setUp(): void
    {
        parent::setUp();
        $this->category = Category::create(['slug' => 'spec-laptops', 'name' => 'Spec laptops', 'is_active' => true]);
        $this->brand = Brand::create(['slug' => 'spec-brand', 'name' => 'Spec brand', 'is_active' => true]);
    }

    private function product(): Product
    {
        $product = Product::create([
            'slug' => 'spec-product', 'name' => 'Spec product', 'category_id' => $this->category->id,
            'brand_id' => $this->brand->id, 'status' => 'active',
        ]);
        $product->variants()->create(['sku' => 'SPEC-SKU', 'name' => 'Default', 'sale_price' => 100, 'list_price' => 120, 'is_active' => true]);

        return $product;
    }

    private function rejectsConstraint(callable $write): void
    {
        try {
            DB::transaction($write);
            self::fail('Expected a database integrity constraint.');
        } catch (QueryException $error) {
            self::assertSame('23000', (string) $error->getCode());
        }
    }

    public function test_schema_composite_key_unique_pairs_foreign_keys_and_relations(): void
    {
        self::assertFalse(Schema::hasColumn('category_specification', 'id'));
        $primary = collect(Schema::getIndexes('category_specification'))->firstWhere('primary', true);
        self::assertSame(['category_id', 'specification_id'], $primary['columns']);
        self::assertCount(2, Schema::getForeignKeys('category_specification'));
        self::assertCount(2, Schema::getForeignKeys('product_specification_values'));
        $product = $this->product();
        $ram = Specification::create(['code' => 'ram', 'name' => 'RAM', 'unit' => 'GB']);
        $this->category->specifications()->attach($ram, ['is_required' => true, 'sort_order' => 12]);
        $value = $product->specificationValues()->create(['specification_id' => $ram->id, 'value' => '16']);
        self::assertTrue($this->category->specifications()->first()->pivot->is_required);
        self::assertSame(12, $this->category->specifications()->first()->pivot->sort_order);
        self::assertNotNull($this->category->specifications()->first()->pivot->created_at);
        self::assertSame($this->category->id, $ram->categories()->first()->id);
        self::assertSame($product->id, $ram->productValues()->first()->product->id);
        self::assertSame('ram', $value->specification->code);
        self::assertSame('16', $product->specifications()->first()->pivot->value);
        $this->rejectsConstraint(fn () => Specification::create(['code' => 'ram', 'name' => 'Duplicate']));
        $this->rejectsConstraint(fn () => $this->category->specifications()->attach($ram));
        $this->rejectsConstraint(fn () => $product->specificationValues()->create(['specification_id' => $ram->id, 'value' => '32']));
        $this->rejectsConstraint(fn () => $product->specificationValues()->create(['specification_id' => 99999999, 'value' => 'Invalid FK']));
        $this->rejectsConstraint(fn () => DB::table('category_specification')->insert(['category_id' => 99999999, 'specification_id' => $ram->id]));
        self::assertSame(1, ProductSpecificationValue::count());
        $product->delete();
        self::assertSame(1, ProductSpecificationValue::count(), 'Soft delete must retain values.');
        $product->forceDelete();
        self::assertSame(0, ProductSpecificationValue::count());
        $ram->delete();
        self::assertSame(0, DB::table('category_specification')->count());
    }

    public function test_detail_uses_category_order_active_specs_and_units_without_parent_inheritance(): void
    {
        $product = $this->product();
        $ram = Specification::create(['code' => 'ram', 'name' => 'RAM', 'unit' => 'GB']);
        $cpu = Specification::create(['code' => 'cpu', 'name' => 'CPU']);
        $screen = Specification::create(['code' => 'screen', 'name' => 'Màn hình', 'unit' => 'inch']);
        $zero = Specification::create(['code' => 'zero', 'name' => 'Zero', 'unit' => 'W']);
        $hidden = Specification::create(['code' => 'hidden', 'name' => 'Inactive', 'is_active' => false]);
        $empty = Specification::create(['code' => 'empty', 'name' => 'Empty', 'unit' => 'L']);
        foreach ([[$ram, '16', 30], [$cpu, 'Core i5', 10], [$screen, '15.6', 10], [$zero, '0', 20], [$hidden, 'hidden', 0], [$empty, '   ', 0]] as [$spec, $value, $order]) {
            $this->category->specifications()->attach($spec, ['sort_order' => $order]);
            $product->specificationValues()->create(['specification_id' => $spec->id, 'value' => $value]);
        }
        $outside = Specification::create(['code' => 'outside', 'name' => 'Wrong category']);
        $other = Category::create(['slug' => 'other', 'name' => 'Other']);
        $other->specifications()->attach($outside);
        // Deliberately malformed row: separate FKs permit it; the public read must reject it.
        $product->specificationValues()->create(['specification_id' => $outside->id, 'value' => 'must not leak']);
        $parent = Category::create(['slug' => 'parent', 'name' => 'Parent']);
        $parentSpec = Specification::create(['code' => 'parent-only', 'name' => 'Parent only']);
        $parent->specifications()->attach($parentSpec);
        $this->category->update(['parent_id' => $parent->id]);
        $product->specificationValues()->create(['specification_id' => $parentSpec->id, 'value' => 'not inherited']);

        $response = $this->getJson('/api/public/products/'.$product->slug)->assertOk();
        self::assertSame([
            ['name' => 'CPU', 'value' => 'Core i5'], ['name' => 'Màn hình', 'value' => '15.6 inch'],
            ['name' => 'Zero', 'value' => '0 W'], ['name' => 'RAM', 'value' => '16 GB'],
        ], $response->json('data.specifications'));
        $response->assertJsonPath('data.card_price', 100)->assertJsonPath('data.variants.0.sku', 'SPEC-SKU');
        $this->getJson('/api/public/products')->assertJsonPath('data.0.specifications', []);
    }

    public function test_unconfigured_missing_or_removed_values_return_empty_and_do_not_hide_product(): void
    {
        $product = $this->product();
        $spec = Specification::create(['code' => 'ram', 'name' => 'RAM', 'unit' => 'GB']);
        $this->category->specifications()->attach($spec, ['is_required' => true]);
        $this->getJson('/api/public/products/'.$product->slug)->assertOk()->assertJsonPath('data.specifications', []);
        $product->specificationValues()->create(['specification_id' => $spec->id, 'value' => '16 GB']);
        $this->getJson('/api/public/products/'.$product->slug)->assertJsonPath('data.specifications.0.value', '16 GB');
        $this->category->specifications()->detach($spec);
        $this->getJson('/api/public/products/'.$product->slug)->assertJsonPath('data.specifications', []);
        self::assertSame(1, $product->specificationValues()->count());
        $other = Category::create(['slug' => 'new-category', 'name' => 'New']);
        $product->update(['category_id' => $other->id]);
        $this->getJson('/api/public/products/'.$product->slug)->assertJsonPath('data.specifications', []);
        $product->update(['status' => 'draft']);
        $this->getJson('/api/public/products/'.$product->slug)->assertNotFound();
    }

    public function test_unit_formatting_preserves_text_and_does_not_repeat_existing_units(): void
    {
        $ram = new Specification(['unit' => 'GB']);
        foreach (['16' => '16 GB', '16 GB' => '16 GB', '16GB' => '16GB', '16 gb' => '16 gb', ' 32 GB ' => '32 GB', '0' => '0 GB', '' => ''] as $raw => $formatted) {
            self::assertSame($formatted, $ram->displayValue((string) $raw));
        }
        self::assertSame('Intel Core i5', (new Specification)->displayValue('Intel Core i5'));
    }

    public function test_seeder_runs_twice_preserving_edited_values_configuration_status_and_catalog(): void
    {
        $this->seed(PublicCatalogDemoSeeder::class);
        $product = Product::where('slug', 'public-demo-laptop-1')->firstOrFail();
        $before = $product->getAttributes();
        $variant = $product->variants()->first();
        $variantBefore = $variant->getAttributes();
        $this->seed(PublicCatalogSpecificationSeeder::class);
        self::assertSame(9, Specification::count());
        self::assertSame(10, DB::table('category_specification')->count());
        self::assertSame(46, ProductSpecificationValue::count());
        $ram = Specification::where('code', 'ram')->firstOrFail();
        $value = $product->specificationValues()->where('specification_id', $ram->id)->firstOrFail();
        self::assertSame('16', $value->value);
        $value->update(['value' => '32 GB']);
        $ram->update(['name' => 'RAM đã chỉnh', 'is_active' => false]);
        $product->category->specifications()->updateExistingPivot($ram->id, ['sort_order' => 7, 'is_required' => false]);
        $this->seed(PublicCatalogSpecificationSeeder::class);
        self::assertSame('32 GB', $value->fresh()->value);
        self::assertSame('RAM đã chỉnh', $ram->fresh()->name);
        self::assertFalse($ram->fresh()->is_active);
        self::assertSame(7, $product->category->specifications()->find($ram->id)->pivot->sort_order);
        self::assertFalse($product->category->specifications()->find($ram->id)->pivot->is_required);
        self::assertSame(46, ProductSpecificationValue::count());
        self::assertSame(10, DB::table('category_specification')->count());
        self::assertSame($before, $product->fresh()->getAttributes());
        self::assertSame($variantBefore, $variant->fresh()->getAttributes());
        $this->getJson('/api/public/products/public-demo-kettle')->assertJsonPath('data.specifications.0', ['name' => 'Công suất', 'value' => '1800 W']);
    }

    public function test_seeder_rejects_missing_wrong_category_and_soft_deleted_fixtures_without_writes(): void
    {
        foreach (['missing', 'wrong-category', 'soft-deleted'] as $state) {
            if ($state === 'wrong-category') {
                $this->seed(PublicCatalogDemoSeeder::class);
                Product::where('slug', 'public-demo-laptop-1')->update(['category_id' => $this->category->id]);
            } elseif ($state === 'soft-deleted') {
                $product = Product::where('slug', 'public-demo-laptop-1')->firstOrFail();
                $product->update(['category_id' => Category::where('slug', 'laptop')->value('id')]);
                $product->delete();
            }
            try {
                $this->seed(PublicCatalogSpecificationSeeder::class);
                self::fail('Expected fixture conflict.');
            } catch (RuntimeException $error) {
                self::assertStringContainsString('Missing/conflicting fixture', $error->getMessage());
            }
            self::assertSame(0, Specification::count());
            self::assertSame(0, ProductSpecificationValue::count());
        }
        self::assertNotNull(Product::withTrashed()->where('slug', 'public-demo-laptop-1')->first()->deleted_at);
    }

    public function test_unit_conflict_rolls_back_and_production_is_rejected(): void
    {
        $this->seed(PublicCatalogDemoSeeder::class);
        $ram = Specification::create(['code' => 'ram', 'name' => 'RAM', 'unit' => 'MB']);
        try {
            $this->seed(PublicCatalogSpecificationSeeder::class);
            self::fail('Expected unit conflict.');
        } catch (RuntimeException $error) {
            self::assertStringContainsString('different unit', $error->getMessage());
        }
        self::assertSame(1, Specification::count());
        self::assertSame('MB', $ram->fresh()->unit);
        self::assertSame(0, DB::table('category_specification')->count());
        self::assertSame(0, ProductSpecificationValue::count());
        $this->app->instance('env', 'production');
        $this->expectException(RuntimeException::class);
        $this->app->make(PublicCatalogSpecificationSeeder::class)->run();
    }
}
