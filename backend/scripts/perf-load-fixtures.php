<?php

// Performance writes are confined to the same guarded test DB convention as QA.
use App\Models\Product;
use App\Models\User;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
$name = getenv('CATALOG_TEST_DATABASE');
if (! app()->environment(['local', 'testing']) || ! preg_match('/^shophub_catalog_api_test_[a-f0-9]{10}$/', (string) $name) || DB::connection()->getDatabaseName() !== $name || ! in_array(config('database.connections.mysql.host'), ['127.0.0.1', 'localhost'], true)) {
    throw new RuntimeException('Isolated database required.');
}
$password = getenv('PERF_PASSWORD');
if (! is_string($password) || strlen($password) < 20) {
    throw new RuntimeException('Ephemeral password required.');
}
$user = User::firstOrNew(['email' => 'perf-admin@shophub.invalid']);
$user->fill(['name' => 'Performance Admin', 'password' => $password])->forceFill(['role' => 'admin', 'is_active' => true])->save();
$source = Product::where('slug', 'public-demo-laptop-1')->firstOrFail();
$product = Product::where('slug', 'perf-load-product')->first();
if (! $product) {
    DB::transaction(function () use ($source, &$product) {
        $product = $source->replicate();
        $product->slug = 'perf-load-product';
        $product->name = 'Performance fixture';
        $product->status = 'draft';
        $product->save();
        foreach ($source->images as $image) {
            $product->images()->create($image->only(['path', 'alt_text', 'sort_order']));
        }
        foreach ($source->variants as $variant) {
            $product->variants()->create([...$variant->only(['name', 'options', 'list_price', 'sale_price', 'stock_quantity', 'is_active']), 'sku' => 'PERF-'.$variant->id]);
        }
        foreach ($source->specificationValues as $value) {
            $product->specificationValues()->create($value->only(['specification_id', 'value']));
        }
    });
}
$product->update(['status' => 'draft']);
file_put_contents(storage_path('framework/testing/perf-fixture.json'), json_encode(['id' => $product->id]));
echo json_encode(['database' => $name, 'product_id' => $product->id, 'products' => Product::count()]).PHP_EOL;
