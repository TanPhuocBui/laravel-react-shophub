<?php

namespace App\Http\Resources;

use App\Support\CatalogImageUrl;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CartDetailsResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $items = array_map(function (array $line) use ($request): array {
            $variant = $line['visible_variant'];
            $product = $variant?->product;
            $image = $product?->images->first();

            return [
                ...(new CartItemResource($line['item']))->resolve($request),
                'product' => $product ? [
                    'name' => $product->name,
                    'slug' => $product->slug,
                    'image_url' => CatalogImageUrl::from($image?->path),
                    'image_alt' => $image?->alt_text ?: $product->name,
                ] : null,
                'variant' => $variant ? ['name' => $variant->name, 'sku' => $variant->sku] : null,
                'stock_quantity' => $variant?->stock_quantity,
                'unit_price' => $line['availability'] === 'invalid_price' ? null : $variant?->sale_price,
                'line_total' => $line['line_total'],
                'availability' => $line['availability'],
            ];
        }, $this->resource['items']);

        return ['items' => $items, 'summary' => $this->resource['summary']];
    }
}
