<?php

namespace App\Http\Resources;

use App\Support\CatalogImageUrl;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PublicBrandResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return ['id' => $this->id, 'name' => $this->name, 'slug' => $this->slug, 'logo_url' => CatalogImageUrl::from($this->logo_path)];
    }
}
