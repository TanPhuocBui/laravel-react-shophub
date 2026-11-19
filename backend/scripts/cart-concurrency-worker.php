<?php

// Test-only worker: never accepts the application's live database.
use App\Exceptions\CartConflictException;
use App\Models\Product;
use App\Models\User;
use App\Services\CartService;
use App\Services\ProductPublishingService;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;
use Symfony\Component\HttpKernel\Exception\HttpExceptionInterface;

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();
$database = getenv('CATALOG_TEST_DATABASE');
$connection = config('database.connections.mysql');
if (! app()->environment('testing') || ! preg_match('/^shophub_catalog_api_test_[a-f0-9]{10}$/', (string) $database)
    || ! in_array($connection['host'], ['127.0.0.1', 'localhost', '::1'], true)) {
    throw new RuntimeException('Isolated local testing database required.');
}
$connection['database'] = $database;
$connection['url'] = null;
config(['database.connections.cart_worker' => $connection]);
DB::setDefaultConnection('cart_worker');
if (DB::selectOne('SELECT DATABASE() AS db')->db !== $database) {
    throw new RuntimeException('Unexpected database.');
}
[$script, $userId, $action, $targetId, $quantity, $barrier] = $argv;
$root = realpath(storage_path('framework/testing'));
if (realpath(dirname($barrier)) !== $root || ! preg_match('/^uc14-race-[a-f0-9]{16}$/', basename($barrier))) {
    throw new RuntimeException('Unexpected test barrier path.');
}
$connectionId = DB::selectOne('SELECT CONNECTION_ID() AS id')->id;
$observed = false;
$lockTable = $action === 'summary' ? 'users' : 'categories';
DB::listen(function ($query) use (&$observed, $lockTable): void {
    if (! $observed && str_contains(strtolower($query->sql), 'for update') && str_contains($query->sql, $lockTable)) {
        $observed = true;
        usleep(150000); // Retain the real service lock so the other connection must contend.
    }
});
file_put_contents($barrier.'.ready-'.getmypid(), 'ready');
$deadline = microtime(true) + 15;
while (! is_file($barrier)) {
    if (microtime(true) > $deadline) {
        throw new RuntimeException('Test barrier timed out.');
    }
    usleep(5000);
}
try {
    $user = User::findOrFail((int) $userId);
    $service = app(CartService::class);
    if ($action === 'add') {
        $result = $service->add($user, (int) $targetId, (int) $quantity);
        $response = [
            'status' => $result['created'] ? 201 : 200,
            'data' => ['item' => $result['item']->only(['id', 'product_variant_id', 'quantity']), 'summary' => $result['summary']],
        ];
    } elseif ($action === 'summary') {
        $result = $service->summary($user, (int) $targetId);
        $result['selected_item'] = $result['selected_item']?->only(['id', 'product_variant_id', 'quantity']);
        $response = ['status' => 200, 'data' => $result];
    } elseif ($action === 'hide') {
        app(ProductPublishingService::class)->transition(Product::findOrFail((int) $targetId), 'hide');
        $response = ['status' => 200];
    } else {
        throw new RuntimeException('Unknown test action.');
    }
} catch (HttpExceptionInterface $error) {
    $response = ['status' => $error->getStatusCode()];
    if ($error instanceof CartConflictException) {
        $response['code'] = $error->reason;
    }
}
echo json_encode([...$response, 'connection_id' => $connectionId, 'lock_observed' => $observed], JSON_THROW_ON_ERROR), PHP_EOL;
