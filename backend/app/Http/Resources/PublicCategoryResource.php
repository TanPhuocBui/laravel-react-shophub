<?php

namespace App\Http\Resources;

use App\Support\CatalogImageUrl;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PublicCategoryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'parent_id' => $this->parent_id,
            'name' => $this->name,
            'slug' => $this->slug,
            'image_url' => CatalogImageUrl::from($this->image_path),
            'product_count' => (int) $this->product_count,
        ];
    }
}
