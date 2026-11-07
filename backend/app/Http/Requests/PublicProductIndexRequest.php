<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class PublicProductIndexRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    protected function prepareForValidation(): void
    {
        foreach (['q', 'category', 'brand'] as $key) {
            if (is_string($this->query($key))) {
                $this->merge([$key => trim($this->query($key))]);
            }
        }
    }

    public function rules(): array
    {
        return [
            'q' => ['nullable', 'string', 'max:200'],
            'category' => ['nullable', 'string', 'max:180'],
            'brand' => ['nullable', 'string', 'max:180'],
            'min_price' => ['nullable', 'integer', 'min:0', 'max:999999999999'],
            'max_price' => ['nullable', 'integer', 'min:0', 'max:999999999999', Rule::when($this->filled('min_price'), 'gte:min_price')],
            'in_stock' => ['sometimes', 'boolean'],
            'promotion' => ['sometimes', 'boolean'],
            'sort' => ['sometimes', Rule::in(['newest', 'price_asc', 'price_desc', 'name'])],
            'page' => ['sometimes', 'integer', 'min:1', 'max:1000000'],
            'per_page' => ['sometimes', 'integer', 'min:1', 'max:48'],
        ];
    }
}
