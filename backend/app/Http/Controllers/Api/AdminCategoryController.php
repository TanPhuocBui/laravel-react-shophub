<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AdminCatalogIndexRequest;
use App\Http\Requests\AdminCatalogWriteRequest;
use App\Http\Resources\AdminCatalogResource;
use App\Models\Category;
use App\Services\AdminCatalogService;

class AdminCategoryController extends Controller
{
    public function index(AdminCatalogIndexRequest $request, AdminCatalogService $service)
    {
        $filters = $request->validated();

        return AdminCatalogResource::collection($service->listing(Category::query(), $filters)
            ->withCount('products')->orderBy('sort_order')->orderBy('id')
            ->paginate($filters['per_page'] ?? 10)->withQueryString());
    }

    public function options()
    {
        return AdminCatalogResource::collection(Category::orderBy('sort_order')->orderBy('id')->get());
    }

    public function show(Category $category)
    {
        return new AdminCatalogResource($category);
    }

    public function store(AdminCatalogWriteRequest $request, AdminCatalogService $service)
    {
        return (new AdminCatalogResource($service->saveCategory($request->validated())))
            ->response()->setStatusCode(201);
    }

    public function update(AdminCatalogWriteRequest $request, Category $category, AdminCatalogService $service)
    {
        return new AdminCatalogResource($service->saveCategory($request->validated(), $category));
    }

    public function hide(Category $category, AdminCatalogService $service)
    {
        return new AdminCatalogResource($service->hideCategory($category));
    }
}
