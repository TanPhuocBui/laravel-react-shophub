<?php

namespace App\Services;

use App\Models\Address;
use App\Models\User;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

class CustomerAddressService
{
    public static function rules(): array
    {
        return [
            'recipient_name' => ['required', 'string', 'max:255'],
            'phone' => ['required', 'string', 'max:20', 'regex:/^\+?[0-9]{8,15}$/'],
            'province' => ['required', 'string', 'max:100'],
            'ward' => ['required', 'string', 'max:100'],
            'address_line' => ['required', 'string', 'max:255'],
            'is_default' => ['sometimes', 'boolean'],
            'user_id' => ['missing'], 'id' => ['missing'], 'created_at' => ['missing'], 'updated_at' => ['missing'],
        ];
    }

    public static function messages(): array
    {
        return [
            'required' => 'Vui lòng nhập :attribute.', 'string' => ':attribute phải là văn bản.',
            'max' => ':attribute không được vượt quá :max ký tự.', 'boolean' => 'Lựa chọn mặc định không hợp lệ.',
            'phone.regex' => 'Số điện thoại gồm 8–15 chữ số, có thể bắt đầu bằng dấu +.',
            'missing' => 'Không được gửi trường :attribute; hệ thống tự quản lý thông tin này.',
        ];
    }

    public static function attributes(): array
    {
        return ['recipient_name' => 'tên người nhận', 'phone' => 'số điện thoại', 'province' => 'tỉnh/thành phố', 'ward' => 'phường/xã', 'address_line' => 'địa chỉ cụ thể'];
    }

    private function lockOwner(User $actor): User
    {
        $owner = User::lockForUpdate()->findOrFail($actor->id);
        abort_unless($owner->is_active && $owner->role === 'customer', 403, 'Chỉ khách hàng đang hoạt động được quản lý sổ địa chỉ.');

        return $owner;
    }

    public function save(User $actor, array $data, int|string|null $id = null): Address
    {
        return DB::transaction(function () use ($actor, $data, $id) {
            $owner = $this->lockOwner($actor);
            $address = $id === null ? $owner->addresses()->make() : $owner->addresses()->lockForUpdate()->findOrFail($id);
            $data = Arr::map($data, fn ($value) => is_string($value) ? trim($value) : $value);
            $valid = Validator::make($data, self::rules(), self::messages(), self::attributes())->validate();
            $default = $valid['is_default'] ?? $address->is_default ?? false;
            if ($address->exists && $address->is_default && ! $default) {
                throw ValidationException::withMessages(['is_default' => 'Hãy chọn địa chỉ khác làm mặc định trước.']);
            }
            if (! $owner->addresses()->exists()) {
                $default = true;
            }
            if ($default) {
                $owner->addresses()->where('is_default', true)->when($address->exists, fn ($query) => $query->where('id', '!=', $address->id))->update(['is_default' => false]);
            }
            $address->fill(Arr::except($valid, ['is_default']));
            $address->is_default = $default;
            $address->save();

            return $address;
        }, 3);
    }

    public function makeDefault(User $actor, int|string $id): Address
    {
        return DB::transaction(function () use ($actor, $id) {
            $owner = $this->lockOwner($actor);
            $address = $owner->addresses()->lockForUpdate()->findOrFail($id);
            $owner->addresses()->where('is_default', true)->where('id', '!=', $address->id)->update(['is_default' => false]);
            $address->is_default = true;
            $address->save();

            return $address;
        }, 3);
    }

    public function delete(User $actor, int|string $id): void
    {
        DB::transaction(function () use ($actor, $id) {
            $owner = $this->lockOwner($actor);
            $address = $owner->addresses()->lockForUpdate()->findOrFail($id);
            $wasDefault = $address->is_default;
            $address->delete();
            if ($wasDefault) {
                $next = $owner->addresses()->orderBy('created_at')->orderBy('id')->lockForUpdate()->first();
                if ($next) {
                    $next->update(['is_default' => true]);
                }
            }
        }, 3);
    }
}
