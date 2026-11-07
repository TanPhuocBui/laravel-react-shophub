<?php

use App\Http\Middleware\EnsureAccountIsActive;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\PublicCatalogController;

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
