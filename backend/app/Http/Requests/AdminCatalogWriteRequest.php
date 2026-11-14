<?php

namespace App\Http\Requests;

use App\Services\AdminCatalogService;
use Illuminate\Foundation\Http\FormRequest;

class AdminCatalogWriteRequest extends FormRequest
{
    public function authorize(): bool
    {
        return $this->user()?->can('access-admin') ?? false;
    }

    public function rules(): array
    {
        $category = $this->routeIs('admin.categories.*');
        $record = $this->route($category ? 'category' : 'brand');

        return AdminCatalogService::rules($category, $record?->id);
    }

    public function messages(): array
    {
        return AdminCatalogService::messages();
    }
}
