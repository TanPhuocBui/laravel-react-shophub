<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\AdminCatalogIndexRequest;
use App\Http\Requests\AdminCatalogWriteRequest;
use App\Http\Resources\AdminCatalogResource;
use App\Models\Brand;
use App\Services\AdminCatalogService;

class AdminBrandController extends Controller
{
    public function index(AdminCatalogIndexRequest $request, AdminCatalogService $service)
    {
        $filters = $request->validated();

        return AdminCatalogResource::collection($service->listing(Brand::query(), $filters)
            ->withCount('products')->orderBy('name')->orderBy('id')
            ->paginate($filters['per_page'] ?? 10)->withQueryString());
    }

    public function show(Brand $brand)
    {
        return new AdminCatalogResource($brand);
    }

    public function store(AdminCatalogWriteRequest $request, AdminCatalogService $service)
    {
        return (new AdminCatalogResource($service->saveBrand($request->validated())))
            ->response()->setStatusCode(201);
    }

    public function update(AdminCatalogWriteRequest $request, Brand $brand, AdminCatalogService $service)
    {
        return new AdminCatalogResource($service->saveBrand($request->validated(), $brand));
    }

    public function hide(Brand $brand, AdminCatalogService $service)
    {
        return new AdminCatalogResource($service->hideBrand($brand));
    }
}
