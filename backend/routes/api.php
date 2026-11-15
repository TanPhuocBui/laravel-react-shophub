<?php

use App\Http\Controllers\Api\AdminBrandController;
use App\Http\Controllers\Api\AdminCategoryController;
use App\Http\Controllers\Api\AdminProductController;
use App\Http\Controllers\Api\PublicCatalogController;
use App\Http\Middleware\EnsureAccountIsActive;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;

Route::prefix('public')->group(function () {
    Route::get('/categories', [PublicCatalogController::class, 'categories']);
    Route::get('/brands', [PublicCatalogController::class, 'brands']);
    Route::get('/products', [PublicCatalogController::class, 'products']);
    Route::get('/products/{slug}', [PublicCatalogController::class, 'product']);
});

Route::get('/health', function () {
    return response()->json([
        'status' => 'success',
        'message' => 'React đã kết nối thành công với Laravel!',
        'app' => config('app.name'),
    ]);
});

Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware(['auth:sanctum', EnsureAccountIsActive::class]);

Route::get('/admin/access', fn () => response()->noContent())
    ->middleware(['auth:sanctum', 'can:access-admin']);

Route::prefix('admin')->name('admin.')->middleware(['auth:sanctum', 'can:access-admin'])->group(function () {
    Route::get('products/options', [AdminProductController::class, 'options'])->name('products.options');
    Route::apiResource('products', AdminProductController::class)->except('destroy');
    Route::get('categories/options', [AdminCategoryController::class, 'options'])->name('categories.options');
    Route::apiResource('categories', AdminCategoryController::class)->except('destroy');
    Route::patch('categories/{category}/hide', [AdminCategoryController::class, 'hide'])->name('categories.hide');
    Route::apiResource('brands', AdminBrandController::class)->except('destroy');
    Route::patch('brands/{brand}/hide', [AdminBrandController::class, 'hide'])->name('brands.hide');
});
