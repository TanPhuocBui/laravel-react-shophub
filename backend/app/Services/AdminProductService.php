<?php

namespace App\Services;

use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Arr;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Str;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;
use Throwable;

class AdminProductService
{
    public static function normalize(array $data): array
    {
        // Multipart file/input bags may merge numeric rows in a different key order.
        foreach (['images', 'variants'] as $field) {
            if (isset($data[$field]) && is_array($data[$field])) {
                ksort($data[$field], SORT_NUMERIC);
            }
        }

        return $data;
    }

    public static function rules(array $data, ?Product $product = null): array
    {
        $rules = [
            'name' => ['required', 'string', 'max:255'],
            'slug' => ['required', 'string', 'max:255', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', Rule::unique('products')->ignore($product?->id)],
            'category_id' => ['required', 'integer', Rule::exists('categories', 'id')],
            'brand_id' => ['required', 'integer', Rule::exists('brands', 'id')],
            'short_description' => ['nullable', 'string', 'max:5000'],
            'description' => ['nullable', 'string', 'max:50000'],
            'warranty_months' => ['required', 'integer', 'min:0', 'max:65535'],
            'status' => ['prohibited'], 'is_featured' => ['prohibited'],
            'specifications' => ['prohibited'], 'specification_values' => ['prohibited'],
            'variants' => ['required', 'array', 'list', 'min:1', 'max:50'],
            'variants.*' => ['required', 'array:id,sku,name,options,list_price,sale_price,stock_quantity,is_active'],
            'variants.*.id' => $product ? ['nullable', 'integer', 'distinct', Rule::exists('product_variants', 'id')->where('product_id', $product->id)] : ['prohibited'],
            'variants.*.sku' => ['required', 'string', 'max:100', 'distinct:ignore_case'],
            'variants.*.name' => ['required', 'string', 'max:150'],
            'variants.*.options' => ['nullable', 'array', 'max:10'],
            'variants.*.options.*' => ['nullable', 'string', 'max:150'],
            'variants.*.list_price' => ['required', 'integer', 'min:1', 'max:'.ProductVariant::MAX_PRICE],
            'variants.*.sale_price' => ['required', 'integer', 'min:1', 'max:'.ProductVariant::MAX_PRICE, 'lte:variants.*.list_price'],
            'variants.*.stock_quantity' => ['required', 'integer', 'min:0', 'max:4294967295'],
            'variants.*.is_active' => ['required', 'boolean'],
            'images' => ['required', 'array', 'list', 'min:1', 'max:10'],
            'images.*' => ['required', 'array:id,file,alt_text,sort_order'],
            'images.*.id' => $product ? ['nullable', 'integer', 'distinct', Rule::exists('product_images', 'id')->where('product_id', $product->id)] : ['prohibited'],
            'images.*.file' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120', 'dimensions:max_width=6000,max_height=6000'],
            'images.*.alt_text' => ['nullable', 'string', 'max:255'],
            'images.*.sort_order' => ['required', 'integer', 'min:0', 'max:4294967295'],
        ];
        foreach (is_array($data['variants'] ?? null) ? $data['variants'] : [] as $i => $variant) {
            $id = is_array($variant) ? ($variant['id'] ?? null) : null;
            // Ownership is validated independently; an arbitrary ID cannot bypass it.
            $ownedId = $product && is_scalar($id) ? $product->variants()->whereKey($id)->value('id') : null;
            $rules["variants.{$i}.sku"] = [...$rules['variants.*.sku'], Rule::unique('product_variants', 'sku')->ignore($ownedId)];
        }
        foreach (is_array($data['images'] ?? null) ? $data['images'] : [] as $i => $image) {
            if (! is_array($image) || empty($image['id'])) {
                $rules["images.{$i}.file"] = ['required', ...array_slice($rules['images.*.file'], 1)];
            }
        }

        return $rules;
    }

    public static function messages(): array
    {
        return [
            'required' => 'Vui lòng nhập thông tin này.', 'integer' => 'Phải là số nguyên.',
            'string' => 'Thông tin phải là chuỗi văn bản.', 'max' => 'Thông tin vượt quá giới hạn cho phép.',
            'min' => 'Giá trị nhỏ hơn giới hạn cho phép.', 'boolean' => 'Trạng thái không hợp lệ.',
            'exists' => 'Liên kết không tồn tại hoặc không thuộc sản phẩm này.',
            'prohibited' => 'Trường này chưa được hỗ trợ trong biểu mẫu sản phẩm.',
            'slug.unique' => 'Slug sản phẩm đã tồn tại.', 'slug.regex' => 'Slug chỉ gồm chữ thường không dấu, số và dấu gạch ngang.',
            'variants.min' => 'Sản phẩm cần ít nhất một SKU.',
            'variants.*.sku.distinct' => 'Mã SKU trùng trong biểu mẫu.',
            'variants.*.sku.unique' => 'Mã SKU đã được sử dụng.',
            'variants.*.sale_price.lte' => 'Giá bán phải nhỏ hơn hoặc bằng giá niêm yết.',
            'variants.*.sale_price.min' => 'Giá bán phải lớn hơn 0.',
            'variants.*.list_price.min' => 'Giá niêm yết phải lớn hơn 0.',
            'variants.*.stock_quantity.min' => 'Tồn kho không được âm.',
            'images.min' => 'Vui lòng thêm ít nhất một ảnh.',
            'images.*.file.required' => 'Vui lòng chọn tệp ảnh.',
            'images.*.file.image' => 'Tệp phải là ảnh hợp lệ.',
            'images.*.file.mimes' => 'Chỉ chấp nhận JPG, PNG hoặc WebP.',
            'images.*.file.max' => 'Ảnh không được vượt quá 5 MB.',
            'images.*.file.dimensions' => 'Kích thước ảnh không vượt quá 6000 × 6000 pixel.',
        ];
    }

    public function save(array $data, ?Product $product = null): Product
    {
        $data = self::normalize($data);
        $written = [];
        $conflict = 'slug';
        try {
            return DB::transaction(function () use ($data, $product, &$written, &$conflict) {
                Category::orderBy('id')->lockForUpdate()->get(['id']);
                $record = $product ? Product::lockForUpdate()->findOrFail($product->id) : new Product;
                abort_if($record->exists && $record->status !== Product::STATUS_DRAFT, 409, 'Chỉ cho phép sửa sản phẩm nháp.');
                $storedVariants = $record->exists ? $record->variants()->orderBy('id')->lockForUpdate()->get()->keyBy('id') : collect();
                $valid = Validator::make($data, self::rules($data, $record->exists ? $record : null), self::messages())->validate();
                $submittedIds = collect($valid['variants'])->pluck('id')->filter()->map(fn ($id) => (int) $id);
                if ($storedVariants->keys()->diff($submittedIds)->isNotEmpty()) {
                    throw ValidationException::withMessages(['variants' => 'Không được bỏ SKU đã lưu. Hãy giữ dòng và bỏ chọn Hoạt động nếu ngừng dùng.']);
                }
                if ($record->exists && (int) $valid['category_id'] !== $record->category_id && $record->specificationValues()->exists()) {
                    throw ValidationException::withMessages(['category_id' => 'Sản phẩm đã có thông số. Chưa hỗ trợ đổi danh mục cho sản phẩm này.']);
                }
                $record->fill(Arr::only($valid, ['name', 'slug', 'category_id', 'brand_id', 'short_description', 'description', 'warranty_months']));
                $record->status = Product::STATUS_DRAFT;
                $record->save();
                $this->saveImages($record, $valid['images'], $written);
                foreach ($valid['variants'] as $i => $variant) {
                    $conflict = "variants.{$i}.sku";
                    $model = ! empty($variant['id']) ? $storedVariants->get($variant['id']) : $record->variants()->make();
                    $model->fill(Arr::except($variant, ['id']));
                    $model->save();
                }

                return $record->load(['category', 'brand', 'images', 'variants' => fn ($query) => $query->orderBy('id')]);
            });
        } catch (Throwable $error) {
            $this->cleanupImages($written);
            if ($error instanceof UniqueConstraintViolationException) {
                throw ValidationException::withMessages([$conflict => $conflict === 'slug' ? 'Slug sản phẩm đã tồn tại.' : 'Mã SKU vừa được sử dụng bởi yêu cầu khác. Vui lòng kiểm tra lại.']);
            }
            throw $error;
        }
    }

    public function saveImages(Product $record, array $images, array &$written): void
    {
        $storedImages = $record->images()->lockForUpdate()->get()->keyBy('id');
        $keptImages = [];
        foreach ($images as $image) {
            $model = ! empty($image['id']) ? $storedImages->get($image['id']) : $record->images()->make();
            if (! empty($image['file'])) {
                $file = $image['file'];
                $name = Str::uuid().'.'.$file->extension();
                $path = 'catalog/products/'.$name;
                // Track before writing so a partial/failed write is cleaned too.
                $written[] = $path;
                if (! Storage::disk('public')->putFileAs('catalog/products', $file, $name)) {
                    throw new \RuntimeException('Không thể lưu tệp ảnh.');
                }
                $model->path = 'media/catalog/'.$name;
            }
            $model->alt_text = $image['alt_text'] ?? null;
            $model->sort_order = $image['sort_order'];
            $model->save();
            $keptImages[] = $model->id;
        }
        $record->images()->whereNotIn('id', $keptImages)->delete();
        // Existing files are retained: removal/replacement edits metadata only,
        // avoiding broken historical URLs or shared seeded image paths.
    }

    public function cleanupImages(array $written): void
    {
        foreach ($written as $path) {
            Storage::disk('public')->delete($path);
        }
    }
}
