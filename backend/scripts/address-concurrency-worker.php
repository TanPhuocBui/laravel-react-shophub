<?php

// Only the T05 concurrency test: two independent MariaDB sessions, no live data.
use App\Models\User;
use App\Services\CustomerAddressService;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
$database = getenv('CATALOG_TEST_DATABASE');
$connection = config('database.connections.mysql');
if (! app()->environment('testing') || ! preg_match('/^shophub_catalog_api_test_[a-f0-9]{10}$/', (string) $database) || ! in_array($connection['host'], ['127.0.0.1', 'localhost'], true)) {
    throw new RuntimeException('Isolated testing database required.');
}
$connection['database'] = $database;
$connection['url'] = null;
config(['database.connections.address_worker' => $connection]);
DB::setDefaultConnection('address_worker');
if (DB::selectOne('SELECT DATABASE() AS db')->db !== $database) {
    throw new RuntimeException('Unexpected database.');
}
[$script, $userId, $action, $target, $barrier] = $argv;
$root = realpath(storage_path('framework/testing'));
if (realpath(dirname($barrier)) !== $root || ! str_starts_with(basename($barrier), 't05-race-')) {
    throw new RuntimeException('Unexpected barrier path.');
}
$user = User::findOrFail((int) $userId);
$observed = false;
DB::listen(function ($query) use (&$observed) {
    if (! $observed && str_contains(strtolower($query->sql), 'for update') && str_contains($query->sql, 'users')) {
        $observed = true;
        usleep(150000); // Hold the actual service lock long enough for the peer to contend.
    }
});
file_put_contents($barrier.'.ready-'.getmypid(), 'ready');
$deadline = microtime(true) + 15;
while (! is_file($barrier)) {
    if (microtime(true) > $deadline) {
        throw new RuntimeException('Barrier timed out.');
    } usleep(5000);
}
$service = app(CustomerAddressService::class);
match ($action) {
    'create' => $service->save($user, ['recipient_name' => 'Concurrent fixture', 'phone' => '0900000001', 'province' => 'Test', 'ward' => 'Test', 'address_line' => 'Test', 'is_default' => false]),
    'default' => $service->makeDefault($user, (int) $target),
    'delete' => $service->delete($user, (int) $target),
    default => throw new RuntimeException('Unknown test action.'),
};
echo json_encode(['lock_observed' => $observed]).PHP_EOL;
