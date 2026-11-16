<?php

use App\Models\Product;
use App\Services\AdminSpecificationService;
use App\Services\ProductPublishingService;
use App\Services\PublicCatalogService;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
$database = getenv('CATALOG_TEST_DATABASE');
if (! app()->environment(['local', 'testing']) || ! preg_match('/^shophub_catalog_api_test_[a-f0-9]{10}$/', (string) $database) || DB::connection()->getDatabaseName() !== $database || ! in_array(config('database.connections.mysql.host'), ['127.0.0.1', 'localhost'], true)) {
    throw new RuntimeException('Explicit isolated loopback test database required.');
}
$queries = [];
DB::listen(function ($q) use (&$queries) {
    $queries[] = ['signature' => hash('sha256', $q->sql), 'ms' => $q->time];
});
$public = app(PublicCatalogService::class);
$specs = app(AdminSpecificationService::class);
$publishing = app(ProductPublishingService::class);
$id = Product::where('slug', 'perf-load-product')->value('id');
$values = Product::findOrFail($id)->specificationValues->map(fn ($value) => $value->only(['specification_id', 'value']))->all();
$status = fn () => DB::select("SHOW GLOBAL STATUS WHERE Variable_name IN ('Innodb_row_lock_waits','Innodb_row_lock_time')");
$before = $status();
$result = [];
for ($round = 1; $round <= 5; $round++) {
    $steps = [
        'categories' => fn () => $public->categories(),
        'products' => fn () => $public->products([]),
        'detail' => fn () => $public->product('public-demo-laptop-1'),
        'product-schema' => fn () => $specs->productSchema(Product::findOrFail($id)),
        'save-specifications' => fn () => $specs->saveValues(Product::findOrFail($id), ['values' => $values]),
        'publish' => fn () => $publishing->transition(Product::findOrFail($id), 'publish'),
        'hide' => fn () => $publishing->transition(Product::findOrFail($id), 'hide'),
    ];
    foreach ($steps as $name => $step) {
        $queries = [];
        $start = hrtime(true);
        $step();
        $result[] = ['name' => $name, 'round' => $round, 'wall_ms' => (hrtime(true) - $start) / 1e6, 'query_count' => count($queries), 'sql_ms' => array_sum(array_column($queries, 'ms')), 'slowest_sql_ms' => max(array_column($queries, 'ms')), 'repeated_signatures' => array_filter(array_count_values(array_column($queries, 'signature')), fn ($count) => $count > 1)];
    }
}
$output = ['database' => $database, 'samples' => $result, 'lock_status_before' => $before, 'lock_status_after' => $status()];
$label = in_array($argv[1] ?? '', ['before', 'after'], true) ? $argv[1] : 'before';
file_put_contents(storage_path('framework/testing/perf-sql-'.$label.'.json'), json_encode($output, JSON_PRETTY_PRINT));
echo json_encode($output, JSON_PRETTY_PRINT).PHP_EOL;
