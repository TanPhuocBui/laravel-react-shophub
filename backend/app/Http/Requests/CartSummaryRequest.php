<?php

namespace App\Http\Requests;

use Closure;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class CartSummaryRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('manage-cart') ?? false;
    }

    public function rules(): array
    {
        return ['product_variant_id' => [
            'bail', 'sometimes', 'required', 'integer', 'min:1', 'max:'.PHP_INT_MAX,
            function (string $attribute, mixed $value, Closure $fail): void {
                if (! is_int($value) && ! is_string($value)) {
                    $fail('Mã biến thể phải là số nguyên dương.');
                }
            },
        ]];
    }

    public function after(): array
    {
        return [function (Validator $validator): void {
            foreach (array_diff(array_keys($this->all()), ['product_variant_id']) as $field) {
                $validator->errors()->add($field, 'Không được gửi trường này khi đọc giỏ hàng.');
            }
        }];
    }

    public function messages(): array
    {
        return [
            'required' => 'Mã biến thể không được để trống.', 'integer' => 'Mã biến thể phải là số nguyên dương.',
            'min' => 'Mã biến thể phải là số nguyên dương.', 'max' => 'Mã biến thể vượt quá giới hạn cho phép.',
        ];
    }
}
