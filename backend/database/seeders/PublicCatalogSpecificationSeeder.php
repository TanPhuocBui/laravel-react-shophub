<?php

namespace Database\Seeders;

use App\Models\CategorySpecification;
use App\Models\Product;
use App\Models\ProductSpecificationValue;
use App\Models\Specification;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class PublicCatalogSpecificationSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment(['local', 'testing'])) {
            throw new RuntimeException('PublicCatalogSpecificationSeeder is restricted to local/testing, including --force.');
        }

        // Raw values exclude units. These are fictional specifications, not manufacturer claims.
        $groups = [
            'laptop' => [
                'slugs' => array_map(fn ($number) => 'public-demo-laptop-'.$number, range(1, 10)),
                'specs' => [
                    ['cpu', 'CPU', null, 'Intel Core i5 (demo)', true],
                    ['ram', 'RAM', 'GB', '16', true],
                    ['storage_capacity', 'Dung lượng lưu trữ', 'GB', '512', true],
                    ['screen_size', 'Kích thước màn hình', 'inch', '15.6', false],
                ],
            ],
            'linh-kien-phu-kien' => [
                'slugs' => ['public-demo-ssd'],
                'specs' => [
                    ['storage_capacity', 'Dung lượng lưu trữ', 'GB', '1000', true],
                    ['storage_interface', 'Giao tiếp', null, 'PCIe NVMe (demo)', true],
                    ['storage_form_factor', 'Chuẩn kích thước', null, 'M.2 2280', false],
                ],
            ],
            'thiet-bi-gia-dung' => [
                'slugs' => ['public-demo-kettle'],
                'specs' => [
                    ['power', 'Công suất', 'W', '1800', true],
                    ['capacity', 'Dung tích', 'L', '1.8', true],
                    ['material', 'Chất liệu', null, 'Thép không gỉ (demo)', false],
                ],
            ],
        ];

        DB::transaction(function () use ($groups): void {
            $slugs = array_merge(...array_column($groups, 'slugs'));
            $products = Product::withTrashed()->with('category')->whereIn('slug', $slugs)
                ->orderBy('id')->lockForUpdate()->get()->keyBy('slug');
            // Validate every target before creating configuration or values.
            foreach ($groups as $categorySlug => $group) {
                foreach ($group['slugs'] as $slug) {
                    $product = $products->get($slug);
                    if (! $product || $product->trashed() || $product->category?->slug !== $categorySlug) {
                        throw new RuntimeException("Missing/conflicting fixture {$slug} in category {$categorySlug}. Run PublicCatalogDemoSeeder first; no product was restored or reassigned.");
                    }
                }
            }

            foreach ($groups as $group) {
                $category = $products[$group['slugs'][0]]->category;
                foreach ($group['specs'] as $index => [$code, $name, $unit, $value, $required]) {
                    $specification = Specification::firstOrCreate(['code' => $code], [
                        'name' => $name, 'unit' => $unit, 'is_active' => true,
                    ]);
                    if ($specification->unit !== $unit) {
                        throw new RuntimeException("Specification {$code} has a different unit. Existing data was preserved; review the unit before seeding.");
                    }
                    CategorySpecification::firstOrCreate([
                        'category_id' => $category->id, 'specification_id' => $specification->id,
                    ], ['is_required' => $required, 'sort_order' => ($index + 1) * 10]);

                    foreach ($group['slugs'] as $slug) {
                        $product = $products[$slug];
                        // Separate FKs do NOT guarantee that this spec belongs to this category.
                        if (! $product->category->specifications()->whereKey($specification->id)->exists()) {
                            throw new RuntimeException("Specification {$code} is not configured for product {$slug}'s category.");
                        }
                        ProductSpecificationValue::firstOrCreate([
                            'product_id' => $product->id, 'specification_id' => $specification->id,
                        ], ['value' => $value]);
                    }
                }
            }
        });

        $this->command?->info('Demo specifications added where missing; existing values, units, status and category configuration were preserved.');
    }
}
