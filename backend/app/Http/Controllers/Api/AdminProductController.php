<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AdminProductIndexRequest;
use App\Http\Requests\AdminProductWriteRequest;
use App\Http\Resources\AdminProductResource;
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Services\AdminProductService;

class AdminProductController extends Controller
{
    public function index(AdminProductIndexRequest $request)
    {
        $filters = $request->validated();
        $query = Product::with(['category', 'brand'])->withCount(['variants', 'images'])->withMin('variants', 'sale_price');
        if (($term = trim($filters['q'] ?? '')) !== '') {
            $term = '%'.str_replace(['!', '%', '_'], ['!!', '!%', '!_'], $term).'%';
            $query->where(fn ($q) => $q->whereRaw("name LIKE ? ESCAPE '!'", [$term])
                ->orWhereRaw("slug LIKE ? ESCAPE '!'", [$term])
                ->orWhereHas('variants', fn ($v) => $v->whereRaw("sku LIKE ? ESCAPE '!'", [$term])));
        }
        foreach (['category_id', 'brand_id', 'status'] as $field) {
            if (isset($filters[$field])) {
                $query->where($field, $filters[$field]);
            }
        }

        return AdminProductResource::collection($query->orderByDesc('id')->paginate($filters['per_page'] ?? 10)->withQueryString());
    }

    public function options()
    {
        return response()->json(['data' => [
            'categories' => Category::orderBy('sort_order')->orderBy('id')->get(['id', 'name', 'parent_id', 'is_active']),
            'brands' => Brand::orderBy('name')->orderBy('id')->get(['id', 'name', 'is_active']),
        ]]);
    }

    public function show(Product $product)
    {
        return new AdminProductResource($product->load(['category', 'brand', 'images', 'variants' => fn ($query) => $query->orderBy('id')]));
    }

    public function store(AdminProductWriteRequest $request, AdminProductService $service)
    {
        return (new AdminProductResource($service->save($request->validated())))->response()->setStatusCode(201);
    }

    public function update(AdminProductWriteRequest $request, Product $product, AdminProductService $service)
    {
        return new AdminProductResource($service->save($request->validated(), $product));
    }
}
