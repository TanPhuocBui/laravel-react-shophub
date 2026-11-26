<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CartItemResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        return ['id' => $this->id, 'product_variant_id' => $this->product_variant_id, 'quantity' => $this->quantity];
    }
}
