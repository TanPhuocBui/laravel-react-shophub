<?php

namespace App\Services;

use App\Models\Category;
use App\Models\Product;
use App\Models\Specification;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AdminSpecificationService
{
    private function lockCatalog(): void
    {
        Category::orderBy('id')->lockForUpdate()->get(['id']);
    }

    public function saveDefinition(array $data, ?Specification $spec = null): Specification
    {
        return DB::transaction(function () use ($data, $spec) {
            $this->lockCatalog();
            $spec = $spec ? Specification::lockForUpdate()->findOrFail($spec->id) : new Specification;
            $valid = Validator::make($data, [
                'name' => ['required', 'string', 'max:100'],
                'code' => ['required', 'string', 'max:100', 'regex:/^[a-z][a-z0-9_-]*$/', Rule::unique('specifications')->ignore($spec->id)],
                'unit' => ['nullable', 'string', 'max:30'], 'is_active' => ['required', 'boolean'],
            ], [...AdminProductService::messages(), 'code.unique' => 'Mã thông số đã tồn tại.', 'code.regex' => 'Mã bắt đầu bằng chữ thường, chỉ gồm chữ không dấu, số, gạch ngang hoặc gạch dưới.'])->validate();
            if ($spec->exists && $spec->productValues()->exists()) {
                foreach (['code', 'unit'] as $field) {
                    if (($valid[$field] ?? null) !== $spec->$field) {
                        throw ValidationException::withMessages([$field => 'Thông số đã có dữ liệu. Giữ nguyên mã và đơn vị để bảo toàn ý nghĩa giá trị.']);
                    }
                }
            }
            if ($spec->exists && ! $valid['is_active'] && ($spec->categories()->exists() || $spec->productValues()->exists())) {
                throw ValidationException::withMessages(['is_active' => 'Thông số đang được sử dụng, không thể ngừng hoạt động.']);
            }
            $spec->fill($valid)->save();

            return $spec;
        });
    }

    public function categorySchema(Category $category): array
    {
        return ['category_id' => $category->id, 'fields' => $category->specifications()->get()->map(fn ($spec) => [
            'id' => $spec->id, 'name' => $spec->name, 'code' => $spec->code, 'unit' => $spec->unit,
            'is_active' => $spec->is_active, 'is_required' => $spec->pivot->is_required, 'sort_order' => $spec->pivot->sort_order,
        ])->all()];
    }

    public function configure(Category $category, array $data): array
    {
        return DB::transaction(function () use ($category, $data) {
            $this->lockCatalog();
            $valid = Validator::make($data, [
                'items' => ['present', 'array', 'list', 'max:100'],
                'items.*' => ['array:specification_id,is_required,sort_order'],
                'items.*.specification_id' => ['required', 'integer', 'distinct', Rule::exists('specifications', 'id')->where('is_active', true)],
                'items.*.is_required' => ['required', 'boolean'], 'items.*.sort_order' => ['required', 'integer', 'min:0', 'max:4294967295'],
            ], AdminProductService::messages())->validate();
            $ids = collect($valid['items'])->pluck('specification_id');
            $removed = $category->specifications()->pluck('specifications.id')->diff($ids);
            if (DB::table('product_specification_values')->join('products', 'products.id', '=', 'product_specification_values.product_id')->where('products.category_id', $category->id)->whereIn('specification_id', $removed)->exists()) {
                throw ValidationException::withMessages(['items' => 'Không thể gỡ thông số đã có giá trị sản phẩm. Dữ liệu cũ được giữ nguyên.']);
            }
            foreach ($valid['items'] as $i => $item) {
                if ($item['is_required'] && Product::where('category_id', $category->id)->where('status', Product::STATUS_ACTIVE)->whereDoesntHave('specificationValues', fn ($q) => $q->where('specification_id', $item['specification_id'])->whereRaw("TRIM(value) <> ''"))->exists()) {
                    throw ValidationException::withMessages(["items.$i.is_required" => 'Có sản phẩm công khai chưa có giá trị. Hãy nhập giá trị trước khi đặt bắt buộc.']);
                }
            }
            $category->specifications()->sync(collect($valid['items'])->mapWithKeys(fn ($item) => [$item['specification_id'] => ['is_required' => $item['is_required'], 'sort_order' => $item['sort_order']]])->all());

            return $this->categorySchema($category);
        });
    }

    public function productSchema(Product $product): array
    {
        $schema = $this->categorySchema($product->category);
        $values = $product->specificationValues()->pluck('value', 'specification_id');
        $schema['fields'] = array_values(array_map(fn ($field) => [...$field, 'value' => $values[$field['id']] ?? ''], array_filter($schema['fields'], fn ($field) => $field['is_active'])));
        $schema['publication'] = app(ProductPublishingService::class)->readiness($product);
        $schema['status'] = $product->status;

        return $schema;
    }

    public function saveValues(Product $product, array $data): array
    {
        return DB::transaction(function () use ($product, $data) {
            $this->lockCatalog();
            $product = Product::lockForUpdate()->findOrFail($product->id);
            $ids = $product->category->specifications()->where('is_active', true)->pluck('specifications.id')->all();
            $valid = Validator::make($data, [
                'values' => ['present', 'array', 'list', 'max:100'], 'values.*' => ['array:specification_id,value'],
                'values.*.specification_id' => ['required', 'integer', 'distinct', Rule::in($ids)],
                'values.*.value' => ['present', 'nullable', 'string', 'max:5000'],
            ], [...AdminProductService::messages(), 'values.*.specification_id.in' => 'Thông số không thuộc cấu hình danh mục hiện tại.'])->validate();
            foreach ($valid['values'] as $item) {
                $value = trim($item['value'] ?? '');
                if ($value === '') {
                    $product->specificationValues()->where('specification_id', $item['specification_id'])->delete();
                } else {
                    $product->specificationValues()->updateOrCreate(['specification_id' => $item['specification_id']], ['value' => $value]);
                }
            }
            if ($product->status === Product::STATUS_ACTIVE) {
                $required = $product->category->specifications()->where('is_active', true)->wherePivot('is_required', true)->get();
                foreach ($required as $spec) {
                    if (! $product->specificationValues()->where('specification_id', $spec->id)->whereRaw("TRIM(value) <> ''")->exists()) {
                        throw ValidationException::withMessages(['values' => 'Không được xóa thông số bắt buộc của sản phẩm đang công khai: '.$spec->name]);
                    }
                }
            }

            return $this->productSchema($product);
        });
    }
}
