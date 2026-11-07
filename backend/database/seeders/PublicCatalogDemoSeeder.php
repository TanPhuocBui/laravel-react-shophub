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

class PublicCatalogDemoSeeder extends Seeder
{
    public function run(): void
    {
        if (! app()->environment(['local', 'testing'])) {
            throw new RuntimeException('PublicCatalogDemoSeeder is restricted to local/testing, including --force.');
        }
        $images = ['images/demo/catalog-placeholder-front.svg', 'images/demo/catalog-placeholder-detail.svg'];
        foreach ($images as $path) {
            if (! is_file(public_path($path))) {
                throw new RuntimeException("Missing demo asset: {$path}");
            }
        }

        DB::transaction(function () use ($images): void {
            $categories = [];
            foreach (['laptop' => 'Laptop', 'linh-kien-phu-kien' => 'Linh kiện và phụ kiện', 'thiet-bi-gia-dung' => 'Thiết bị gia dụng'] as $slug => $name) {
                $category = Category::firstOrCreate(['slug' => $slug], ['name' => $name, 'sort_order' => count($categories) + 1, 'is_active' => true]);
                if (! $category->is_active || $category->parent_id !== null) {
                    throw new RuntimeException("Category {$slug} must already be an active root; existing data was not changed.");
                }
                $categories[$slug] = $category;
            }
            $brands = [];
            foreach (['asus' => 'ASUS', 'kingston' => 'Kingston', 'philips' => 'Philips'] as $slug => $name) {
                $brand = Brand::firstOrCreate(['slug' => $slug], ['name' => $name, 'is_active' => true]);
                if (! $brand->is_active) {
                    throw new RuntimeException("Brand {$slug} is inactive; this seeder will not reactivate it.");
                }
                $brands[$slug] = $brand;
            }
            $fixtures = [];
            for ($number = 1; $number <= 10; $number++) {
                $fixtures[] = ['laptop-'.$number, 'Laptop catalog demo '.$number, 'laptop', 'asus', 18000000 + $number * 100000, 21000000, $number === 2 ? 0 : 10];
            }
            $fixtures[] = ['ssd', 'SSD catalog demo', 'linh-kien-phu-kien', 'kingston', 1700000, 2000000, 20];
            $fixtures[] = ['kettle', 'Bình đun catalog demo', 'thiet-bi-gia-dung', 'philips', 550000, 700000, 15];

            foreach ($fixtures as [$key, $name, $category, $brand, $sale, $list, $stock]) {
                $product = Product::withTrashed()->firstOrCreate(['slug' => 'public-demo-'.$key], [
                    'name' => $name, 'category_id' => $categories[$category]->id, 'brand_id' => $brands[$brand]->id,
                    'status' => Product::STATUS_ACTIVE, 'warranty_months' => 12,
                    'short_description' => 'Dữ liệu demo catalog công khai. Giá, tồn và bảo hành là giả lập.',
                    'description' => 'Fixture riêng cho API catalog. Không thay đổi các sản phẩm draft từ ProductCatalogSeeder.',
                ]);
                if ($product->trashed() || $product->category_id !== $categories[$category]->id || $product->brand_id !== $brands[$brand]->id) {
                    throw new RuntimeException("Public demo slug conflicts: {$product->slug}. No restore/reassignment was performed.");
                }
                $variants = [['sku' => 'PUBLIC-DEMO-'.strtoupper($key).'-BLACK', 'name' => $key === 'laptop-1' ? 'Đen' : 'Mặc định', 'sale_price' => $sale, 'list_price' => $list, 'stock_quantity' => $stock, 'options' => $key === 'laptop-1' ? ['color' => 'Đen'] : null]];
                if ($key === 'laptop-1') {
                    $variants[] = ['sku' => 'PUBLIC-DEMO-LAPTOP-1-SILVER', 'name' => 'Bạc', 'sale_price' => $sale + 300000, 'list_price' => $list, 'stock_quantity' => 0, 'options' => ['color' => 'Bạc']];
                }
                foreach ($variants as $attributes) {
                    $variant = ProductVariant::firstOrCreate(['sku' => $attributes['sku']], [...$attributes, 'product_id' => $product->id, 'is_active' => true]);
                    if ($variant->product_id !== $product->id) {
                        throw new RuntimeException("Public demo SKU conflicts: {$variant->sku}.");
                    }
                }
                foreach ($images as $order => $path) {
                    ProductImage::firstOrCreate(['product_id' => $product->id, 'path' => $path], ['alt_text' => $name.' — ảnh placeholder', 'sort_order' => $order]);
                }
            }
        });
        $this->command?->info('Public demo fixtures created where missing; existing prices, stock and statuses were preserved.');
    }
}
