<?php

namespace App\Services;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Support\Collection;

class PublicCatalogService
{
    public function publicProducts(): Builder
    {
        // The Product model's SoftDeletes scope excludes deleted records.
        return Product::query()->where('status', Product::STATUS_ACTIVE)
            ->whereHas('category', fn (Builder $query) => $query->where('is_active', true))
            ->whereHas('brand', fn (Builder $query) => $query->where('is_active', true))
            ->whereHas('variants', fn (Builder $query) => $query->where('is_active', true));
    }

    private function activeCategories(): Collection
    {
        return Category::where('is_active', true)->orderBy('sort_order')->orderBy('id')->get();
    }

    private function categoryIds(Category $category, Collection $categories): array
    {
        // Traverse only active edges. The visited set also bounds malformed cycles.
        $ids = [(int) $category->id];
        $children = $categories->groupBy('parent_id');
        for ($index = 0; $index < count($ids); $index++) {
            foreach ($children->get($ids[$index], []) as $child) {
                if (! in_array((int) $child->id, $ids, true)) {
                    $ids[] = (int) $child->id;
                }
            }
        }

        return $ids;
    }

    public function categories(): Collection
    {
        $categories = $this->activeCategories();
        $counts = $this->publicProducts()->selectRaw('category_id, COUNT(*) AS total')
            ->groupBy('category_id')->pluck('total', 'category_id');

        return $categories->each(function (Category $category) use ($categories, $counts): void {
            $category->setAttribute('product_count', array_sum(array_map(
                fn ($id) => (int) $counts->get($id, 0), $this->categoryIds($category, $categories),
            )));
        });
    }

    public function brands(): Collection
    {
        return Brand::where('is_active', true)->orderBy('name')->orderBy('id')->get();
    }

    private function cheapestPrice(): Builder
    {
        return ProductVariant::select('sale_price')->whereColumn('product_id', 'products.id')
            ->where('is_active', true)->orderBy('sale_price')->orderBy('id')->limit(1);
    }

    private function withPublicRelations(Builder $query): Builder
    {
        return $query->with([
            'category', 'brand', 'images',
            'variants' => fn ($variants) => $variants->where('is_active', true)->orderBy('id'),
        ])->addSelect(['card_price' => $this->cheapestPrice()]);
    }

    public function products(array $filters): LengthAwarePaginator
    {
        $query = $this->withPublicRelations($this->publicProducts());
        if (isset($filters['category']) && $filters['category'] !== '') {
            $categories = $this->activeCategories();
            $category = $categories->firstWhere('slug', $filters['category']);
            $query->whereIn('category_id', $category ? $this->categoryIds($category, $categories) : []);
        }
        if (isset($filters['brand']) && $filters['brand'] !== '') {
            $query->whereHas('brand', fn (Builder $brand) => $brand->where('slug', $filters['brand']));
        }
        if (isset($filters['min_price'])) {
            $query->where($this->cheapestPrice(), '>=', $filters['min_price']);
        }
        if (isset($filters['max_price'])) {
            $query->where($this->cheapestPrice(), '<=', $filters['max_price']);
        }
        if (! empty($filters['in_stock'])) {
            $query->whereHas('variants', fn (Builder $variant) => $variant->where('is_active', true)->where('stock_quantity', '>', 0));
        }
        if (! empty($filters['promotion'])) {
            $query->whereHas('variants', fn (Builder $variant) => $variant->where('is_active', true)->whereColumn('sale_price', '<', 'list_price'));
        }
        if (isset($filters['q']) && $filters['q'] !== '') {
            // ! is an explicit escape character on both MySQL/MariaDB and SQLite.
            $term = '%'.str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $filters['q']).'%';
            $query->where(function (Builder $search) use ($term): void {
                $search->whereRaw("products.name LIKE ? ESCAPE '!'", [$term])
                    ->orWhereHas('brand', fn (Builder $brand) => $brand->whereRaw("name LIKE ? ESCAPE '!'", [$term]))
                    ->orWhereHas('variants', fn (Builder $variant) => $variant->where('is_active', true)->whereRaw("sku LIKE ? ESCAPE '!'", [$term]));
            });
        }

        match ($filters['sort'] ?? 'newest') {
            'price_asc' => $query->orderBy('card_price')->orderBy('id'),
            'price_desc' => $query->orderByDesc('card_price')->orderBy('id'),
            'name' => $query->orderBy('name')->orderBy('id'),
            default => $query->orderByDesc('created_at')->orderByDesc('id'),
        };

        return $query->paginate((int) ($filters['per_page'] ?? 8))->withQueryString();
    }

    public function product(string $slug): Product
    {
        $product = $this->withPublicRelations($this->publicProducts())->where('slug', $slug)->firstOrFail();
        // The product's direct category owns the configuration; no parent inheritance.
        $product->load(['specifications' => fn ($query) => $query
            ->join('category_specification', function ($join) use ($product): void {
                $join->on('category_specification.specification_id', '=', 'specifications.id')
                    ->where('category_specification.category_id', $product->category_id);
            })
            ->where('specifications.is_active', true)
            ->orderBy('category_specification.sort_order')->orderBy('specifications.id')]);

        return $product;
    }
}
