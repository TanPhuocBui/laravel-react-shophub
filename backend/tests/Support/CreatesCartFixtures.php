<?php

namespace Tests\Support;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;

trait CreatesCartFixtures
{
    private function cartVariant(array $attributes = []): ProductVariant
    {
        $key = bin2hex(random_bytes(8));
        $category = Category::create(['name' => 'Cart '.$key, 'slug' => 'cart-'.$key, 'is_active' => true]);
        $brand = Brand::create(['name' => 'Cart '.$key, 'slug' => 'cart-'.$key, 'is_active' => true]);
        $product = Product::create([
            'name' => 'Cart fixture', 'slug' => 'cart-'.$key, 'status' => Product::STATUS_ACTIVE,
            'category_id' => $category->id, 'brand_id' => $brand->id,
        ]);

        return $product->variants()->create([
            'sku' => 'CART-'.$key, 'name' => 'Default', 'is_active' => true,
            'list_price' => 200000, 'sale_price' => 150000, 'stock_quantity' => 10,
            ...$attributes,
        ]);
    }
}
