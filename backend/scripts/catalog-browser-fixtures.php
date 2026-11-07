<?php

// Browser QA only: refuse the configured ShopHub database, even on local.
use App\Models\Product;
use Database\Seeders\ProductCatalogSeeder;
use Database\Seeders\PublicCatalogDemoSeeder;
use Database\Seeders\PublicCatalogSpecificationSeeder;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
$database = getenv('CATALOG_TEST_DATABASE');
$connection = config('database.connections.mysql');
if (! app()->environment(['local', 'testing']) || ! is_string($database)
    || ! preg_match('/^shophub_catalog_api_test_[a-f0-9]{10}$/', $database)
    || ! in_array($connection['host'], ['127.0.0.1', 'localhost', '::1'], true)) {
    throw new RuntimeException('Browser fixtures require an explicit, isolated catalog test database on loopback.');
}
$connection['url'] = null;
$connection['database'] = $database;
config(['database.connections.catalog_browser' => $connection]);
DB::setDefaultConnection('catalog_browser');
if (DB::selectOne('SELECT DATABASE() AS db')->db !== $database) {
    throw new RuntimeException('Unexpected database; no writes performed.');
}
$action = $argv[1] ?? 'seed';
if ($action === 'seed') {
    (new ProductCatalogSeeder)->run();
    (new PublicCatalogDemoSeeder)->run();
} elseif ($action === 'specifications') {
    (new PublicCatalogSpecificationSeeder)->run();
} elseif (in_array($action, ['empty', 'restore'], true)) {
    // Only this test fixture namespace; the original draft products stay draft.
    Product::where('slug', 'like', 'public-demo-%')->update(['status' => $action === 'empty' ? 'draft' : 'active']);
} else {
    throw new InvalidArgumentException('Use seed, specifications, empty or restore.');
}
echo json_encode(['database' => $database, 'action' => $action, 'active' => Product::where('status', 'active')->count(), 'draft' => Product::where('status', 'draft')->count()]).PHP_EOL;
