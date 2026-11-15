<?php

namespace App\Http\Resources;

use App\Support\CatalogImageUrl;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AdminProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id, 'name' => $this->name, 'slug' => $this->slug,
            'category_id' => $this->category_id, 'brand_id' => $this->brand_id,
            'category' => $this->whenLoaded('category', fn () => ['id' => $this->category->id, 'name' => $this->category->name]),
            'brand' => $this->whenLoaded('brand', fn () => ['id' => $this->brand->id, 'name' => $this->brand->name]),
            'short_description' => $this->short_description, 'description' => $this->description,
            'warranty_months' => $this->warranty_months, 'status' => $this->status,
            'variants_count' => $this->whenCounted('variants'),
            'images_count' => $this->whenCounted('images'),
            'min_sale_price' => $this->when(isset($this->variants_min_sale_price), fn () => (int) $this->variants_min_sale_price),
            'images' => $this->whenLoaded('images', fn () => $this->images->map(fn ($image) => [
                'id' => $image->id, 'url' => CatalogImageUrl::from($image->path), 'alt_text' => $image->alt_text, 'sort_order' => $image->sort_order,
            ])),
            'variants' => $this->whenLoaded('variants', fn () => $this->variants->map(fn ($variant) => [
                'id' => $variant->id, 'sku' => $variant->sku, 'name' => $variant->name, 'options' => $variant->options,
                'list_price' => $variant->list_price, 'sale_price' => $variant->sale_price,
                'stock_quantity' => $variant->stock_quantity, 'is_active' => $variant->is_active,
            ])),
        ];
    }
}
