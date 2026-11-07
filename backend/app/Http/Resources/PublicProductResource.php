<?php

namespace App\Http\Resources;

use App\Support\CatalogImageUrl;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PublicProductResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $variants = $this->variants->map(fn ($variant) => [
            'id' => $variant->id,
            'sku' => $variant->sku,
            'name' => $variant->name,
            'options' => $variant->options,
            'list_price' => $variant->list_price,
            'sale_price' => $variant->sale_price,
            'stock_quantity' => $variant->stock_quantity,
        ]);

        return [
            'id' => $this->id,
            'slug' => $this->slug,
            'name' => $this->name,
            'short_description' => $this->short_description,
            'description' => $this->description,
            'warranty_months' => $this->warranty_months,
            'created_at' => $this->created_at->toISOString(),
            'category' => ['id' => $this->category->id, 'name' => $this->category->name, 'slug' => $this->category->slug],
            'brand' => new PublicBrandResource($this->brand),
            'card_price' => (int) $this->card_price,
            'images' => $this->images->map(fn ($image) => [
                'id' => $image->id, 'url' => CatalogImageUrl::from($image->path),
                'alt' => $image->alt_text ?: $this->name, 'sort_order' => $image->sort_order,
            ]),
            'variants' => $variants,
            // Listing responses keep their existing empty array; detail loads the configuration.
            'specifications' => $this->relationLoaded('specifications')
                ? $this->specifications->filter(fn ($specification) => trim($specification->pivot->value) !== '')
                    ->map(fn ($specification) => [
                        'name' => $specification->name,
                        'value' => $specification->displayValue($specification->pivot->value),
                    ])->values()
                : [],
        ];
    }
}
