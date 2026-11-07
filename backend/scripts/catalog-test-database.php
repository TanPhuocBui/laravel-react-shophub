<?php

// Creates a NEW, isolated database; never resets or seeds the configured database.
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
$connection = config('database.connections.mysql');
$connection['url'] = null;
if (! app()->environment(['local', 'testing']) || ! in_array($connection['host'], ['127.0.0.1', 'localhost', '::1'], true)) {
    throw new RuntimeException('Catalog test database setup requires a local/testing app and loopback database host.');
}
$connection['options'][PDO::ATTR_TIMEOUT] = 5;
config(['database.connections.catalog_setup' => $connection]);
$db = DB::connection('catalog_setup');
$server = $db->selectOne('SELECT DATABASE() AS db, VERSION() AS version');
$name = 'shophub_catalog_api_test_'.bin2hex(random_bytes(5));
$db->statement("CREATE DATABASE `{$name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci");
$metadata = ['database' => $name, 'driver' => 'mysql', 'server' => $server->version];
if (! is_dir(storage_path('framework/testing'))) {
    mkdir(storage_path('framework/testing'), 0755, true);
}
file_put_contents(storage_path('framework/testing/catalog-api-database.json'), json_encode($metadata, JSON_PRETTY_PRINT));
echo json_encode($metadata, JSON_PRETTY_PRINT).PHP_EOL;
