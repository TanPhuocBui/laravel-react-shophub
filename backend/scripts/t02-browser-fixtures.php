<?php

// Only ephemeral browser QA accounts in an explicitly selected, fresh test DB.
use App\Models\User;
use Database\Seeders\ProductCatalogSeeder;
use Database\Seeders\PublicCatalogDemoSeeder;
use Database\Seeders\PublicCatalogSpecificationSeeder;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
$database = getenv('CATALOG_TEST_DATABASE');
$password = getenv('T02_TEST_PASSWORD');
$connection = config('database.connections.mysql');
if (! app()->environment('testing') || ! is_string($database)
    || ! preg_match('/^shophub_catalog_api_test_[a-f0-9]{10}$/', $database)
    || ! in_array($connection['host'], ['127.0.0.1', 'localhost', '::1'], true)
    || ! is_string($password) || strlen($password) < 20) {
    throw new RuntimeException('Requires testing environment, isolated loopback database and an ephemeral password.');
}
$connection['url'] = null;
$connection['database'] = $database;
config(['database.connections.t02_browser' => $connection]);
DB::setDefaultConnection('t02_browser');
if (DB::selectOne('SELECT DATABASE() AS db')->db !== $database || User::exists()) {
    throw new RuntimeException('Requires a fresh isolated test database without accounts.');
}
$accountsOnly = in_array('--accounts-only', $argv, true);
DB::transaction(function () use ($password, $accountsOnly) {
    if (! $accountsOnly) {
        (new ProductCatalogSeeder)->run();
        (new PublicCatalogDemoSeeder)->run();
        (new PublicCatalogSpecificationSeeder)->run();
    }
    foreach (['admin', 'customer'] as $role) {
        $user = new User(['name' => 'T02 '.ucfirst($role), 'email' => "t02-{$role}@shophub.invalid", 'password' => $password]);
        $user->forceFill(['role' => $role, 'is_active' => true])->save();
        if ($user->fresh()->role !== $role) {
            throw new RuntimeException('Unexpected test account role.');
        }
    }
});
echo json_encode(['database' => $database, 'accounts' => ['admin', 'customer'], 'fixture' => $accountsOnly ? 'accounts only' : 'public catalog']).PHP_EOL;
