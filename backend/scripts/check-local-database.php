<?php

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;

require __DIR__.'/../vendor/autoload.php';
$app = require __DIR__.'/../bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

try {
    $connection = DB::connection();
    if (! $app->environment('local', 'testing') || $connection->getDriverName() !== 'mysql'
        || ! in_array($connection->getConfig('host'), ['localhost', '127.0.0.1', '::1'], true)) {
        throw new RuntimeException('Expected a local MySQL/MariaDB configuration.');
    }
    // A short TCP probe avoids waiting for the OS connection timeout when XAMPP is off.
    $host = $connection->getConfig('host');
    $socketHost = str_contains($host, ':') ? '['.$host.']' : $host;
    $socket = @stream_socket_client(
        'tcp://'.$socketHost.':'.($connection->getConfig('port') ?: 3306),
        $errorCode, $errorMessage, 2
    );
    if ($socket === false) {
        throw new RuntimeException('Database port is unavailable. Start MySQL in XAMPP and check DB_HOST/DB_PORT.');
    }
    fclose($socket);
    $server = $connection->selectOne('SELECT DATABASE() AS db, VERSION() AS version');
    echo json_encode(['database' => $server->db, 'server' => $server->version, 'mode' => 'read_only'], JSON_THROW_ON_ERROR), PHP_EOL;
} catch (Throwable $error) {
    // Do not print connection credentials, SQL, session identifiers or raw PDO messages.
    fwrite(STDERR, "Local database check failed. Start MySQL in XAMPP; verify DB configuration and access. No data was changed.\n");
    exit(1);
}
