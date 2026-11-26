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
    if (in_array($action, ['setup', 'setup-acceptance'], true)) {
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
        if ($action === 'setup-acceptance') {
            $fresh = new User(['name' => 'UC14 First Write', 'email' => 't02-first@shophub.invalid', 'password' => $password]);
            $fresh->save();
            $otherProduct = Product::create([
                'name' => 'Laptop ShopHub — Sản phẩm đối chiếu khác', 'slug' => 'uc14-browser-second-product',
                'category_id' => $category->id, 'brand_id' => $brand->id, 'status' => 'active',
                'short_description' => 'Sản phẩm độc lập để kiểm tra ngữ cảnh thêm giỏ.', 'warranty_months' => 12,
            ]);
            $otherProduct->variants()->create([
                'sku' => 'UC14-SECOND', 'name' => 'Xám', 'list_price' => 15000000,
                'sale_price' => 13000000, 'stock_quantity' => 100, 'is_active' => true,
            ]);
        }
    }
    $product = Product::where('slug', 'uc14-browser-product')->firstOrFail();
    $variants = $product->variants()->orderBy('id')->get();
    match ($action) {
        'setup', 'setup-acceptance', 'inspect' => null,
        'stock-low' => $variants[0]->update(['stock_quantity' => 1]),
        'stock-restore' => $variants[0]->update(['stock_quantity' => 100]),
        'hide-silver', 'show-silver' => $variants[1]->update(['is_active' => $action === 'show-silver']),
        'hide' => $product->update(['status' => 'inactive']),
        'show' => $product->update(['status' => 'active']),
        'lock', 'unlock' => User::where('email', 't02-customer@shophub.invalid')->firstOrFail()->forceFill(['is_active' => $action === 'unlock'])->save(),
        default => throw new RuntimeException('Unknown fixture action.'),
    };

    $result = ['slug' => $product->slug, 'variants' => $variants->fresh()->map->only(['id', 'sku', 'name', 'stock_quantity'])->all()];
    if ($action === 'setup-acceptance') {
        $result['other_slug'] = $otherProduct->slug;
        $result['other_variant_id'] = $otherProduct->variants()->sole()->id;
    }

    return $result;
});
echo json_encode($result, JSON_THROW_ON_ERROR), PHP_EOL;
