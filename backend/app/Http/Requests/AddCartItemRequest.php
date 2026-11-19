<?php

namespace App\Http\Requests;

use App\Services\CartService;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class AddCartItemRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('manage-cart') ?? false;
    }

    public function rules(): array
    {
        return [
            'product_variant_id' => ['bail', 'required', 'integer:strict', 'min:1', 'max:'.PHP_INT_MAX],
            'quantity' => ['bail', 'required', 'integer:strict', 'min:1', 'max:'.CartService::MAX_QUANTITY],
        ];
    }

    public function after(): array
    {
        return [function (Validator $validator): void {
            foreach (array_diff(array_keys($this->all()), ['product_variant_id', 'quantity']) as $field) {
                $validator->errors()->add($field, 'Không được gửi trường này khi thêm vào giỏ hàng.');
            }
        }];
    }

    public function messages(): array
    {
        return [
            'required' => 'Vui lòng nhập :attribute.', 'integer' => ':attribute phải là số nguyên JSON.',
            'min' => ':attribute phải lớn hơn hoặc bằng :min.', 'max' => ':attribute vượt quá giới hạn cho phép.',
        ];
    }

    public function attributes(): array
    {
        return ['product_variant_id' => 'mã biến thể', 'quantity' => 'số lượng'];
    }
}
