<?php

namespace App\Http\Resources;

use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class AdminCatalogResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $data = ['id' => $this->id, 'name' => $this->name, 'slug' => $this->slug,
            'is_active' => $this->is_active];
        if ($this->resource instanceof Category) {
            $data['parent_id'] = $this->parent_id;
            $data['sort_order'] = $this->sort_order;
        }
        if (isset($this->products_count)) {
            $data['products_count'] = $this->products_count;
        }

        return $data;
    }
}
