<?php

// Test-only fixtures. No live accounts, catalog writes or default passwords.
use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\User;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
$database = getenv('CATALOG_TEST_DATABASE');
$password = getenv('T02_TEST_PASSWORD');
if (! app()->environment('testing') || ! preg_match('/^shophub_catalog_api_test_[a-f0-9]{10}$/', (string) $database)
    || DB::connection()->getDatabaseName() !== $database || DB::selectOne('SELECT DATABASE() AS db')->db !== $database
    || ! in_array(config('database.connections.mysql.host'), ['127.0.0.1', 'localhost', '::1'], true)
    || strlen((string) $password) < 20) {
    throw new RuntimeException('Explicit isolated testing database required.');
}
$action = $argv[1] ?? 'setup';
$result = DB::transaction(function () use ($action, $password): array {
    if ($action === 'setup') {
        if (Product::withTrashed()->where('slug', 'uc14-browser-product')->exists()
            || User::where('email', 't02-other@shophub.invalid')->exists()) {
            throw new RuntimeException('Fresh browser fixtures required.');
        }
        $other = new User(['name' => 'UC14 Other', 'email' => 't02-other@shophub.invalid', 'password' => $password]);
        $other->save();
        $category = Category::create(['name' => 'Laptop kiểm thử', 'slug' => 'uc14-laptop', 'is_active' => true]);
        $brand = Brand::create(['name' => 'ShopHub Test', 'slug' => 'uc14-brand', 'is_active' => true]);
        $product = Product::create([
            'name' => 'Laptop ShopHub — Kiểm tra thêm giỏ', 'slug' => 'uc14-browser-product',
            'category_id' => $category->id, 'brand_id' => $brand->id, 'status' => 'active',
            'short_description' => 'Chọn phiên bản phù hợp cho công việc và cuộc sống.', 'warranty_months' => 12,
        ]);
        foreach (['Đen' => 100, 'Bạc' => 100, 'Trắng' => 0] as $name => $stock) {
            $product->variants()->create([
                'sku' => 'UC14-'.($stock === 0 ? 'SOLDOUT' : ($name === 'Đen' ? 'BLACK' : 'SILVER')),
                'name' => $name, 'list_price' => 12000000, 'sale_price' => 10000000,
                'stock_quantity' => $stock, 'is_active' => true,
            ]);
        }
    }
    $product = Product::where('slug', 'uc14-browser-product')->firstOrFail();
    $variants = $product->variants()->orderBy('id')->get();
    match ($action) {
        'setup', 'inspect' => null,
        'stock-low' => $variants[0]->update(['stock_quantity' => 1]),
        'stock-restore' => $variants[0]->update(['stock_quantity' => 100]),
        'hide' => $product->update(['status' => 'inactive']),
        'show' => $product->update(['status' => 'active']),
        'lock', 'unlock' => User::where('email', 't02-customer@shophub.invalid')->firstOrFail()->forceFill(['is_active' => $action === 'unlock'])->save(),
        default => throw new RuntimeException('Unknown fixture action.'),
    };

    return ['slug' => $product->slug, 'variants' => $variants->fresh()->map->only(['id', 'sku', 'name', 'stock_quantity'])->all()];
});
echo json_encode($result, JSON_THROW_ON_ERROR), PHP_EOL;
