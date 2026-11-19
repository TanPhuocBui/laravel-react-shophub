<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class CartSummaryResource extends JsonResource
{
    public function toArray(Request $request): array
    {
        $data = ['item_count' => $this->resource['item_count'], 'total_quantity' => $this->resource['total_quantity']];
        if (array_key_exists('selected_item', $this->resource)) {
            $data['selected_item'] = $this->resource['selected_item']
                ? new CartItemResource($this->resource['selected_item']) : null;
        }

        return $data;
    }
}
