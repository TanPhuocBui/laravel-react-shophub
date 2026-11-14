<?php

namespace App\Services;

use App\Models\Brand;
use App\Models\Category;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\UniqueConstraintViolationException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Illuminate\Validation\ValidationException;

class AdminCatalogService
{
    public static function rules(bool $category, ?int $id = null): array
    {
        $table = $category ? 'categories' : 'brands';
        $rules = [
            'name' => ['required', 'string', 'max:150'],
            'slug' => ['required', 'string', 'max:180', 'regex:/^[a-z0-9]+(?:-[a-z0-9]+)*$/', Rule::unique($table)->ignore($id)],
            'is_active' => ['required', 'boolean'],
        ];
        if ($category) {
            $rules['parent_id'] = ['nullable', 'integer', Rule::exists('categories', 'id')];
            $rules['sort_order'] = ['required', 'integer', 'min:0', 'max:4294967295'];
        } else {
            $rules['name'][] = Rule::unique('brands')->ignore($id);
        }

        return $rules;
    }

    public static function messages(): array
    {
        return [
            'name.required' => 'Vui lòng nhập tên.', 'name.max' => 'Tên tối đa 150 ký tự.',
            'name.unique' => 'Tên thương hiệu đã tồn tại.',
            'slug.required' => 'Vui lòng nhập slug.', 'slug.max' => 'Slug tối đa 180 ký tự.',
            'slug.regex' => 'Slug chỉ gồm chữ thường không dấu, số và dấu gạch ngang giữa các từ.',
            'slug.unique' => 'Slug đã tồn tại.',
            'parent_id.exists' => 'Danh mục cha không tồn tại.',
            'parent_id.integer' => 'Danh mục cha không hợp lệ.',
            'sort_order.*' => 'Thứ tự phải là số nguyên từ 0 đến 4294967295.',
            'is_active.*' => 'Trạng thái không hợp lệ.',
        ];
    }

    public function listing(Builder $query, array $filters): Builder
    {
        $term = trim($filters['q'] ?? '');
        if ($term !== '') {
            $term = '%'.str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $term).'%';
            $query->where(fn ($query) => $query->whereRaw("name LIKE ? ESCAPE '!'", [$term])
                ->orWhereRaw("slug LIKE ? ESCAPE '!'", [$term]));
        }
        if (in_array($filters['status'] ?? null, ['active', 'inactive'], true)) {
            $query->where('is_active', $filters['status'] === 'active');
        }

        return $query;
    }

    public function saveCategory(array $data, ?Category $category = null): Category
    {
        try {
            return DB::transaction(function () use ($data, $category) {
                // Every category mutation takes the same locks. Concurrent moves cannot
                // validate against different versions of the tree and create a cycle.
                $tree = Category::orderBy('id')->lockForUpdate()->get()->keyBy('id');
                $record = $category ? $tree->get($category->id) : new Category;
                abort_unless($record, 404);
                $valid = Validator::make($data, self::rules(true, $record->id), self::messages())->validate();
                $parent = $valid['parent_id'] ?? null;
                $visited = [];
                while ($parent !== null) {
                    if ((int) $parent === $record->id || isset($visited[$parent])) {
                        throw ValidationException::withMessages(['parent_id' => 'Danh mục cha không được là chính nó hoặc một danh mục con của nó.']);
                    }
                    $visited[$parent] = true;
                    $ancestor = $tree->get($parent);
                    if (! $ancestor) {
                        throw ValidationException::withMessages(['parent_id' => 'Danh mục cha không tồn tại.']);
                    }
                    $parent = $ancestor->parent_id;
                }
                $record->fill($valid)->save();

                return $record;
            }, 3);
        } catch (UniqueConstraintViolationException) {
            throw ValidationException::withMessages(['slug' => 'Slug đã tồn tại.']);
        }
    }

    public function hideCategory(Category $category): Category
    {
        return DB::transaction(function () use ($category) {
            $record = Category::orderBy('id')->lockForUpdate()->get()->firstWhere('id', $category->id);
            abort_unless($record, 404);
            $record->is_active = false;
            $record->save();

            return $record;
        }, 3);
    }

    public function saveBrand(array $data, ?Brand $brand = null): Brand
    {
        try {
            return DB::transaction(function () use ($data, $brand) {
                $record = $brand ? Brand::lockForUpdate()->findOrFail($brand->id) : new Brand;
                $valid = Validator::make($data, self::rules(false, $record->id), self::messages())->validate();
                $record->fill($valid)->save();

                return $record;
            }, 3);
        } catch (UniqueConstraintViolationException) {
            $field = Brand::where('slug', $data['slug'] ?? '')->exists() ? 'slug' : 'name';
            throw ValidationException::withMessages([$field => 'Tên hoặc slug thương hiệu đã tồn tại.']);
        }
    }

    public function hideBrand(Brand $brand): Brand
    {
        return DB::transaction(function () use ($brand) {
            $record = Brand::lockForUpdate()->findOrFail($brand->id);
            $record->is_active = false;
            $record->save();

            return $record;
        }, 3);
    }
}
