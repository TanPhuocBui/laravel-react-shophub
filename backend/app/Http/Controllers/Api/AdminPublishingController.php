<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Resources\AdminProductResource;
use App\Models\Category;
use App\Models\Product;
use App\Models\Specification;
use App\Services\AdminSpecificationService;
use App\Services\ProductPublishingService;
use Illuminate\Http\Request;

class AdminPublishingController extends Controller
{
    public function definitions()
    {
        return response()->json(['data' => Specification::orderBy('name')->get(['id', 'name', 'code', 'unit', 'is_active'])]);
    }

    public function store(Request $request, AdminSpecificationService $service)
    {
        return response()->json(['data' => $service->saveDefinition($request->all())], 201);
    }

    public function update(Request $request, Specification $specification, AdminSpecificationService $service)
    {
        return response()->json(['data' => $service->saveDefinition($request->all(), $specification)]);
    }

    public function category(Category $category, AdminSpecificationService $service)
    {
        return response()->json(['data' => $service->categorySchema($category)]);
    }

    public function configure(Request $request, Category $category, AdminSpecificationService $service)
    {
        return response()->json(['data' => $service->configure($category, $request->all())]);
    }

    public function product(Product $product, AdminSpecificationService $service)
    {
        return response()->json(['data' => $service->productSchema($product)]);
    }

    public function values(Request $request, Product $product, AdminSpecificationService $service)
    {
        return response()->json(['data' => $service->saveValues($product, $request->all())]);
    }

    public function publish(Product $product, ProductPublishingService $service)
    {
        $service->transition($product, 'publish');

        return response()->json(['message' => 'Đã công bố sản phẩm.']);
    }

    public function hide(Product $product, ProductPublishingService $service)
    {
        $service->transition($product, 'hide');

        return response()->json(['message' => 'Đã ẩn sản phẩm, giữ nguyên dữ liệu và liên kết.']);
    }

    public function content(Request $request, Product $product, ProductPublishingService $service)
    {
        return new AdminProductResource($service->updateContent($product, $request->all()));
    }
}
