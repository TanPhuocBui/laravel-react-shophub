<?php

use App\Http\Controllers\Api\AdminBrandController;
use App\Http\Controllers\Api\AdminCategoryController;
use App\Http\Controllers\Api\AdminProductController;
use App\Http\Controllers\Api\AdminPublishingController;
use App\Http\Controllers\Api\CustomerAddressController;
use App\Http\Controllers\Api\CustomerCartController;
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

Route::prefix('customer')->name('customer.')->middleware(['auth:sanctum', EnsureAccountIsActive::class, 'can:manage-addresses'])->group(function () {
    Route::get('addresses', [CustomerAddressController::class, 'index'])->name('addresses.index');
    Route::post('addresses', [CustomerAddressController::class, 'store'])->name('addresses.store');
    Route::put('addresses/{address}', [CustomerAddressController::class, 'update'])->whereNumber('address')->name('addresses.update');
    Route::delete('addresses/{address}', [CustomerAddressController::class, 'destroy'])->whereNumber('address')->name('addresses.destroy');
    Route::patch('addresses/{address}/default', [CustomerAddressController::class, 'makeDefault'])->whereNumber('address')->name('addresses.default');
});

Route::prefix('customer/cart')->name('customer.cart.')->middleware(['auth:sanctum', EnsureAccountIsActive::class, 'can:manage-cart'])->group(function () {
    Route::get('/', [CustomerCartController::class, 'show'])->name('show');
    Route::post('items', [CustomerCartController::class, 'store'])->name('items.store');
    Route::get('summary', [CustomerCartController::class, 'summary'])->name('summary');
});

Route::prefix('admin')->name('admin.')->middleware(['auth:sanctum', 'can:access-admin'])->group(function () {
    Route::get('specifications', [AdminPublishingController::class, 'definitions'])->name('specifications.index');
    Route::post('specifications', [AdminPublishingController::class, 'store'])->name('specifications.store');
    Route::put('specifications/{specification}', [AdminPublishingController::class, 'update'])->name('specifications.update');
    Route::get('categories/{category}/specifications', [AdminPublishingController::class, 'category'])->name('categories.specifications.show');
    Route::put('categories/{category}/specifications', [AdminPublishingController::class, 'configure'])->name('categories.specifications.update');
    Route::get('products/{product}/specifications', [AdminPublishingController::class, 'product'])->name('products.specifications.show');
    Route::put('products/{product}/specifications', [AdminPublishingController::class, 'values'])->name('products.specifications.update');
    Route::post('products/{product}/publish', [AdminPublishingController::class, 'publish'])->name('products.publish');
    Route::post('products/{product}/hide', [AdminPublishingController::class, 'hide'])->name('products.hide');
    Route::put('products/{product}/content', [AdminPublishingController::class, 'content'])->name('products.content.update');
    Route::get('products/options', [AdminProductController::class, 'options'])->name('products.options');
    Route::apiResource('products', AdminProductController::class)->except('destroy');
    Route::get('categories/options', [AdminCategoryController::class, 'options'])->name('categories.options');
    Route::apiResource('categories', AdminCategoryController::class)->except('destroy');
    Route::patch('categories/{category}/hide', [AdminCategoryController::class, 'hide'])->name('categories.hide');
    Route::apiResource('brands', AdminBrandController::class)->except('destroy');
    Route::patch('brands/{brand}/hide', [AdminBrandController::class, 'hide'])->name('brands.hide');
});
