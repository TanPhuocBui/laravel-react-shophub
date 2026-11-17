<?php

namespace App\Http\Requests;

use App\Services\CustomerAddressService;
use Illuminate\Foundation\Http\FormRequest;

class CustomerAddressRequest extends FormRequest
{
    public function authorize(): bool
    {
        if (! $this->user()?->can('manage-addresses')) {
            return false;
        }
        if ($this->route('address') !== null) {
            $this->user()->addresses()->findOrFail($this->route('address'));
        }

        return true;
    }

    public function rules(): array
    {
        return CustomerAddressService::rules();
    }

    public function messages(): array
    {
        return CustomerAddressService::messages();
    }

    public function attributes(): array
    {
        return CustomerAddressService::attributes();
    }
}
