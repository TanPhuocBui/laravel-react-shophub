<?php

namespace Database\Seeders;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductImage;
use App\Models\ProductVariant;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;
use RuntimeException;

class ProductCatalogSeeder extends Seeder
{
    private const IMAGE_PATHS = [
        'images/demo/catalog-placeholder-front.svg',
        'images/demo/catalog-placeholder-detail.svg',
    ];

    public function run(): void
    {
        if (! app()->environment(['local', 'testing'])) {
            throw new RuntimeException('ProductCatalogSeeder is only allowed in local or testing environments, even with --force.');
        }

        // Assets are committed files, prepared independently of the database transaction.
        foreach (self::IMAGE_PATHS as $path) {
            if (! is_file(public_path($path))) {
                throw new RuntimeException("ProductCatalogSeeder placeholder is missing: [{$path}]. Restore the file before seeding.");
            }
        }

        DB::transaction(function (): void {
            $categories = [];

            foreach ([
                'laptop' => ['name' => 'Laptop', 'sort_order' => 1],
                'linh-kien-phu-kien' => ['name' => 'Linh kiện và phụ kiện', 'sort_order' => 2],
                'thiet-bi-gia-dung' => ['name' => 'Thiết bị gia dụng', 'sort_order' => 3],
            ] as $slug => $attributes) {
                $category = Category::firstOrCreate(['slug' => $slug], [
                    ...$attributes,
                    'parent_id' => null,
                    'is_active' => true,
                ]);

                if ($category->parent_id !== null) {
                    throw new RuntimeException("Category slug [{$slug}] conflicts: expected a root category, found parent_id [{$category->parent_id}]. No existing relationships were changed.");
                }

                $categories[$slug] = $category;
            }

            $brands = [];

            foreach (['asus' => 'ASUS', 'kingston' => 'Kingston', 'philips' => 'Philips'] as $slug => $name) {
                $brand = Brand::where('slug', $slug)->first();

                if ($brand === null) {
                    $nameOwner = Brand::where('name', $name)->first();

                    if ($nameOwner !== null) {
                        throw new RuntimeException("Brand name [{$name}] conflicts: already belongs to slug [{$nameOwner->slug}], expected [{$slug}]. No existing records were changed.");
                    }

                    $brand = Brand::firstOrCreate(['slug' => $slug], [
                        'name' => $name,
                        'is_active' => true,
                    ]);
                }

                $brands[$slug] = $brand;
            }

            foreach ($this->products() as $fixture) {
                $slug = $fixture['slug'];
                $category = $categories[$fixture['category_slug']];
                $brand = $brands[$fixture['brand_slug']];

                // Include trashed rows so their unique slugs are never restored or reused.
                $product = Product::withTrashed()->firstOrCreate(['slug' => $slug], [
                    'category_id' => $category->id,
                    'brand_id' => $brand->id,
                    'name' => $fixture['name'],
                    'short_description' => 'Dữ liệu demo cho đồ án ShopHub. Giá, tồn kho, cấu hình và bảo hành đều là giả lập, không phải thông tin bán hàng thực tế.',
                    'warranty_months' => $fixture['warranty_months'],
                    'status' => Product::STATUS_DRAFT,
                    'is_featured' => false,
                ]);

                if ($product->trashed()) {
                    throw new RuntimeException("Product slug [{$slug}] conflicts: the product is soft deleted. Resolve it manually; this seeder will not restore or recreate it.");
                }

                if ((int) $product->category_id !== (int) $category->id || (int) $product->brand_id !== (int) $brand->id) {
                    throw new RuntimeException("Product slug [{$slug}] conflicts: expected category [{$category->slug}] (id {$category->id}) and brand [{$brand->slug}] (id {$brand->id}); found category_id [{$product->category_id}] and brand_id [{$product->brand_id}]. No existing relationships were changed.");
                }

                foreach ($fixture['variants'] as $attributes) {
                    $variant = ProductVariant::firstOrCreate(['sku' => $attributes['sku']], [
                        ...$attributes,
                        'product_id' => $product->id,
                        'is_active' => true,
                    ]);

                    if ((int) $variant->product_id !== (int) $product->id) {
                        throw new RuntimeException("Variant SKU [{$variant->sku}] conflicts: belongs to product_id [{$variant->product_id}], expected [{$product->id}] for [{$slug}]. No existing relationships were changed.");
                    }
                }

                foreach (self::IMAGE_PATHS as $sortOrder => $path) {
                    ProductImage::firstOrCreate([
                        'product_id' => $product->id,
                        'path' => $path,
                    ], [
                        'alt_text' => $fixture['name'].' — ảnh placeholder demo '.($sortOrder + 1),
                        'sort_order' => $sortOrder,
                    ]);
                }
            }
        });

        $this->command?->info('Product catalog demo seeding completed. Existing records were preserved; newly created products are draft.');
    }

    /**
     * All prices, stock levels and warranties below are fictional demo values.
     *
     * @return list<array<string, mixed>>
     */
    private function products(): array
    {
        return [
            [
                'slug' => 'laptop-asus-demo',
                'name' => 'Laptop ASUS Demo',
                'category_slug' => 'laptop',
                'brand_slug' => 'asus',
                'warranty_months' => 24,
                'variants' => [
                    [
                        'sku' => 'DEMO-ASUS-BLACK',
                        'name' => 'Đen',
                        'options' => ['color' => 'Đen'],
                        'list_price' => 20000000,
                        'sale_price' => 18500000,
                        'stock_quantity' => 10,
                    ],
                    [
                        'sku' => 'DEMO-ASUS-SILVER',
                        'name' => 'Bạc',
                        'options' => ['color' => 'Bạc'],
                        'list_price' => 20000000,
                        'sale_price' => 18800000,
                        'stock_quantity' => 0,
                    ],
                ],
            ],
            [
                'slug' => 'ssd-kingston-demo-1tb',
                'name' => 'SSD Kingston Demo 1TB',
                'category_slug' => 'linh-kien-phu-kien',
                'brand_slug' => 'kingston',
                'warranty_months' => 36,
                'variants' => [
                    [
                        'sku' => 'DEMO-SSD-1TB',
                        'name' => 'Mặc định',
                        'options' => null,
                        'list_price' => 2000000,
                        'sale_price' => 1700000,
                        'stock_quantity' => 20,
                    ],
                ],
            ],
            [
                'slug' => 'binh-dun-philips-demo',
                'name' => 'Bình đun Philips Demo',
                'category_slug' => 'thiet-bi-gia-dung',
                'brand_slug' => 'philips',
                'warranty_months' => 12,
                'variants' => [
                    [
                        'sku' => 'DEMO-KETTLE',
                        'name' => 'Mặc định',
                        'options' => null,
                        'list_price' => 700000,
                        'sale_price' => 550000,
                        'stock_quantity' => 15,
                    ],
                ],
            ],
        ];
    }
}
