<?php

namespace App\Http\Requests;

use App\Services\AdminProductService;
use Illuminate\Foundation\Http\FormRequest;

class AdminProductWriteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('access-admin') ?? false;
    }

    public function rules(): array
    {
        return AdminProductService::rules($this->all(), $this->route('product'));
    }

    public function validationData(): array
    {
        return AdminProductService::normalize($this->all());
    }

    public function messages(): array
    {
        return AdminProductService::messages();
    }
}
