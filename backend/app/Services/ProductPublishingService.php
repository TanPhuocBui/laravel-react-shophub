<?php

namespace App\Services;

use App\Models\Category;
use App\Models\Product;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;
use Throwable;

class ProductPublishingService
{
    public function readiness(Product $product): array
    {
        $product->load(['category', 'brand', 'images', 'variants', 'specificationValues', 'category.specifications']);
        $issues = [];
        if (! $product->category?->is_active) {
            $issues[] = 'Danh mục phải đang hoạt động.';
        }
        if (! $product->brand?->is_active) {
            $issues[] = 'Thương hiệu phải đang hoạt động.';
        }
        if ($product->images->isEmpty()) {
            $issues[] = 'Cần ít nhất một ảnh sản phẩm.';
        }
        $variants = $product->variants->where('is_active', true);
        if ($variants->isEmpty()) {
            $issues[] = 'Cần ít nhất một SKU hoạt động.';
        }
        foreach ($variants as $variant) {
            if (trim($variant->sku) === '' || trim($variant->name) === '' || ! $variant->hasValidPrices() || $variant->stock_quantity < 0) {
                $issues[] = 'SKU '.$variant->sku.' có giá hoặc tồn kho không hợp lệ.';
            }
        }
        foreach ($product->category?->specifications ?? [] as $spec) {
            if ($spec->is_active && $spec->pivot->is_required && trim((string) $product->specificationValues->firstWhere('specification_id', $spec->id)?->value) === '') {
                $issues[] = 'Thiếu thông số bắt buộc: '.$spec->name.'.';
            }
        }

        return ['can_publish' => $issues === [], 'issues' => $issues];
    }

    public function transition(Product $product, string $action): Product
    {
        return DB::transaction(function () use ($product, $action) {
            Category::orderBy('id')->lockForUpdate()->get(['id']);
            $record = Product::lockForUpdate()->findOrFail($product->id);
            $record->brand()->lockForUpdate()->first();
            $record->variants()->orderBy('id')->lockForUpdate()->get();
            if ($action === 'publish') {
                $issues = $this->readiness($record)['issues'];
                if ($issues) {
                    throw ValidationException::withMessages(['publication' => $issues]);
                }
                $record->status = Product::STATUS_ACTIVE;
            } else {
                abort_if($record->status === Product::STATUS_DRAFT, 409, 'Bản nháp chưa được công bố.');
                $record->status = Product::STATUS_INACTIVE;
            }
            $record->save();

            return $record;
        });
    }

    public function updateContent(Product $product, array $data): Product
    {
        $images = app(AdminProductService::class);
        $written = [];
        try {
            return DB::transaction(function () use ($product, $data, $images, &$written) {
                Category::orderBy('id')->lockForUpdate()->get(['id']);
                $record = Product::lockForUpdate()->findOrFail($product->id);
                abort_unless($record->status === Product::STATUS_ACTIVE, 409, 'Luồng này chỉ sửa nội dung sản phẩm đang công khai.');
                foreach (array_diff(array_keys($data), ['name', 'short_description', 'description', 'images', '_method']) as $field) {
                    throw ValidationException::withMessages([$field => 'Không được sửa trường này trên sản phẩm đang công khai.']);
                }
                $data = AdminProductService::normalize($data);
                $rules = Arr::where(AdminProductService::rules($data, $record), fn ($rule, $key) => in_array($key, ['name', 'short_description', 'description']) || str_starts_with($key, 'images'));
                $valid = Validator::make($data, $rules, AdminProductService::messages())->validate();
                $record->fill(Arr::only($valid, ['name', 'short_description', 'description']))->save();
                $images->saveImages($record, $valid['images'], $written);

                return $record->load(['category', 'brand', 'images', 'variants']);
            });
        } catch (Throwable $error) {
            $images->cleanupImages($written);
            throw $error;
        }
    }
}
