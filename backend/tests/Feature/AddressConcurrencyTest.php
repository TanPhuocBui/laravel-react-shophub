<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Tests\TestCase;

class AddressConcurrencyTest extends TestCase
{
    public function test_parallel_create_default_and_delete_serialize_on_the_owner(): void
    {
        $database = getenv('CATALOG_TEST_DATABASE');
        if (! $database) {
            $this->markTestSkipped('Requires explicit isolated MariaDB and proc_open.');
        }
        self::assertMatchesRegularExpression('/^shophub_catalog_api_test_[a-f0-9]{10}$/', $database);
        $connection = config('database.connections.mysql');
        self::assertContains($connection['host'], ['127.0.0.1', 'localhost']);
        $connection['database'] = $database;
        $connection['url'] = null;
        config(['database.connections.address_race' => $connection]);
        DB::setDefaultConnection('address_race');
        self::assertSame($database, DB::selectOne('SELECT DATABASE() AS db')->db);
        $user = User::factory()->create();
        $before = (int) DB::selectOne("SHOW GLOBAL STATUS LIKE 'Innodb_row_lock_waits'")->Value;
        try {
            $this->pair($user, ['create', 0], ['create', 0]);
            $addresses = $user->addresses()->orderBy('id')->get();
            self::assertCount(2, $addresses);
            self::assertSame(1, $addresses->where('is_default', true)->count());
            $this->pair($user, ['default', $addresses[0]->id], ['default', $addresses[1]->id]);
            self::assertSame(1, $user->addresses()->where('is_default', true)->count());
            $current = $user->addresses()->where('is_default', true)->firstOrFail();
            $other = $user->addresses()->where('id', '!=', $current->id)->firstOrFail();
            $this->pair($user, ['delete', $current->id], ['default', $other->id]);
            self::assertSame(1, $user->addresses()->count());
            self::assertTrue($other->fresh()->is_default);
            self::assertGreaterThan($before, (int) DB::selectOne("SHOW GLOBAL STATUS LIKE 'Innodb_row_lock_waits'")->Value);
        } finally {
            $user->delete();
            DB::purge('address_race');
        }
    }

    private function pair(User $user, array $a, array $b): void
    {
        $barrier = storage_path('framework/testing/t05-race-'.bin2hex(random_bytes(8)));
        $processes = [];
        try {
            foreach ([$a, $b] as [$action,$target]) {
                $pipes = [];
                $process = proc_open([PHP_BINARY, base_path('scripts/address-concurrency-worker.php'), (string) $user->id, $action, (string) $target, $barrier], [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes, base_path(), null, ['bypass_shell' => true]);
                self::assertIsResource($process);
                fclose($pipes[0]);
                $processes[] = [$process, $pipes];
            }
            $deadline = microtime(true) + 15;
            while (count(glob($barrier.'.ready-*')) < 2 && microtime(true) < $deadline) {
                usleep(10000);
            }
            if (count(glob($barrier.'.ready-*')) !== 2) {
                $failures = [];
                foreach ($processes as [$process,$pipes]) {
                    proc_terminate($process);
                    $failures[] = stream_get_contents($pipes[2]);
                    fclose($pipes[1]);
                    fclose($pipes[2]);
                    proc_close($process);
                }
                $processes = [];
                self::fail('Concurrency workers did not become ready: '.implode("\n", $failures));
            }
            file_put_contents($barrier, 'go');
            foreach ($processes as [$process,$pipes]) {
                $output = stream_get_contents($pipes[1]);
                $error = stream_get_contents($pipes[2]);
                fclose($pipes[1]);
                fclose($pipes[2]);
                self::assertSame(0, proc_close($process), $error);
                self::assertTrue(json_decode($output, true, flags: JSON_THROW_ON_ERROR)['lock_observed']);
            }
            $processes = [];
        } finally {
            foreach ($processes as [$process,$pipes]) {
                if (is_resource($process)) {
                    proc_terminate($process);
                    proc_close($process);
                }
            }
            foreach (glob($barrier.'*') as $file) {
                unlink($file);
            }
        }
    }
}
