<?php

// Ephemeral accounts only in an explicit, isolated testing database.
use App\Models\User;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
$database = getenv('CATALOG_TEST_DATABASE');
$password = getenv('T02_TEST_PASSWORD');
if (! app()->environment('testing') || ! preg_match('/^shophub_catalog_api_test_[a-f0-9]{10}$/', (string) $database) || DB::connection()->getDatabaseName() !== $database || ! in_array(config('database.connections.mysql.host'), ['127.0.0.1', 'localhost'], true) || strlen((string) $password) < 20) {
    throw new RuntimeException('Isolated testing fixtures required.');
}
$action = $argv[1] ?? 'accounts';
if ($action === 'accounts') {
    foreach (['other' => true, 'locked' => false] as $name => $active) {
        $user = new User(['name' => 'T05 '.$name, 'email' => 't02-'.$name.'@shophub.invalid', 'password' => $password]);
        $user->forceFill(['role' => 'customer', 'is_active' => $active])->save();
    }
} elseif (in_array($action, ['lock', 'unlock'], true)) {
    User::where('email', 't02-customer@shophub.invalid')->firstOrFail()->forceFill(['is_active' => $action === 'unlock'])->save();
} else {
    throw new RuntimeException('Unknown fixture action.');
}
echo json_encode(['fixture' => 'T05', 'action' => $action]).PHP_EOL;
