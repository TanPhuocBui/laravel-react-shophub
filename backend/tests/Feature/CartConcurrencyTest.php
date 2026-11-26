<?php

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Tests\Support\CreatesCartFixtures;
use Tests\TestCase;

class CartConcurrencyTest extends TestCase
{
    use CreatesCartFixtures;

    private bool $connected = false;

    private array $owners = [];

    private array $products = [];

    private array $categories = [];

    private array $brands = [];

    protected function setUp(): void
    {
        parent::setUp();
        $database = getenv('CATALOG_TEST_DATABASE');
        if (! $database) {
            $this->markTestSkipped('Requires an explicit isolated MariaDB database and proc_open.');
        }
        self::assertTrue(function_exists('proc_open'));
        self::assertMatchesRegularExpression('/^shophub_catalog_api_test_[a-f0-9]{10}$/', $database);
        $connection = config('database.connections.mysql');
        self::assertContains($connection['host'], ['127.0.0.1', 'localhost', '::1']);
        $connection['database'] = $database;
        $connection['url'] = null;
        config(['database.connections.cart_race' => $connection]);
        DB::setDefaultConnection('cart_race');
        self::assertSame($database, DB::selectOne('SELECT DATABASE() AS db')->db);
        $this->connected = true;
    }

    protected function tearDown(): void
    {
        if ($this->connected) {
            // Only delete recorded test fixtures, on the verified isolated connection.
            User::whereIn('id', $this->owners)->delete();
            Product::withTrashed()->whereIn('id', $this->products)->forceDelete();
            Category::whereIn('id', $this->categories)->delete();
            Brand::whereIn('id', $this->brands)->delete();
            DB::purge('cart_race');
        }
        parent::tearDown();
    }

    private function owner(): User
    {
        $user = User::factory()->create();
        $this->owners[] = $user->id;

        return $user;
    }

    private function variant(array $attributes = []): ProductVariant
    {
        $variant = $this->cartVariant($attributes);
        $product = $variant->product;
        $this->products[] = $product->id;
        $this->categories[] = $product->category_id;
        $this->brands[] = $product->brand_id;

        return $variant;
    }

    private function pair(array $actions): array
    {
        $barrier = storage_path('framework/testing/uc14-race-'.bin2hex(random_bytes(8)));
        $processes = [];
        $results = [];
        $waits = (int) DB::selectOne("SHOW GLOBAL STATUS LIKE 'Innodb_row_lock_waits'")->Value;
        try {
            foreach ($actions as [$user, $action, $target, $quantity]) {
                $pipes = [];
                $process = proc_open([
                    PHP_BINARY, base_path('scripts/cart-concurrency-worker.php'), (string) $user->id,
                    $action, (string) $target, (string) $quantity, $barrier,
                ], [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']], $pipes, base_path(), null, ['bypass_shell' => true]);
                self::assertIsResource($process);
                fclose($pipes[0]);
                stream_set_blocking($pipes[1], false);
                stream_set_blocking($pipes[2], false);
                $processes[] = ['process' => $process, 'pipes' => $pipes, 'out' => '', 'err' => '', 'exit' => null];
            }
            $deadline = microtime(true) + 20;
            while (count(glob($barrier.'.ready-*')) < count($actions) && microtime(true) < $deadline) {
                usleep(10000);
            }
            self::assertCount(count($actions), glob($barrier.'.ready-*'), 'Concurrency workers did not reach the barrier.');
            file_put_contents($barrier, 'go');
            do {
                $running = false;
                foreach ($processes as &$entry) {
                    $entry['out'] .= stream_get_contents($entry['pipes'][1]);
                    $entry['err'] .= stream_get_contents($entry['pipes'][2]);
                    if ($entry['exit'] === null) {
                        $status = proc_get_status($entry['process']);
                        if ($status['running']) {
                            $running = true;
                        } else {
                            $entry['exit'] = $status['exitcode'];
                        }
                    }
                }
                unset($entry);
                if ($running) {
                    usleep(10000);
                }
            } while ($running && microtime(true) < $deadline);
            self::assertFalse($running, 'Concurrency workers timed out.');
            foreach ($processes as $entry) {
                $entry['out'] .= stream_get_contents($entry['pipes'][1]);
                $entry['err'] .= stream_get_contents($entry['pipes'][2]);
                self::assertSame(0, $entry['exit'], $entry['err']);
                $result = json_decode($entry['out'], true, flags: JSON_THROW_ON_ERROR);
                self::assertTrue($result['lock_observed']);
                $results[] = $result;
            }
            self::assertCount(count($actions), array_unique(array_column($results, 'connection_id')));
            self::assertGreaterThan($waits, (int) DB::selectOne("SHOW GLOBAL STATUS LIKE 'Innodb_row_lock_waits'")->Value);

            return $results;
        } finally {
            foreach ($processes as $entry) {
                if ($entry['exit'] === null) {
                    proc_terminate($entry['process']);
                }
                fclose($entry['pipes'][1]);
                fclose($entry['pipes'][2]);
                proc_close($entry['process']);
            }
            // Barrier and ready files have a fixed prefix under storage/framework/testing.
            foreach (glob($barrier.'*') as $file) {
                unlink($file);
            }
        }
    }

    public function test_first_concurrent_adds_create_one_cart_and_one_line_with_both_increments(): void
    {
        $user = $this->owner();
        $variant = $this->variant();
        $results = $this->pair([[$user, 'add', $variant->id, 2], [$user, 'add', $variant->id, 3]]);
        $statuses = array_column($results, 'status');
        sort($statuses);
        self::assertSame([200, 201], $statuses);
        self::assertSame(1, $user->cart()->count());
        self::assertSame(1, $user->cart->items()->count());
        self::assertSame(5, $user->cart->items()->sole()->quantity);
        self::assertSame(10, $variant->fresh()->stock_quantity);
    }

    public function test_concurrent_updates_do_not_lose_an_increment(): void
    {
        $user = $this->owner();
        $variant = $this->variant();
        $user->cart()->create()->items()->create(['product_variant_id' => $variant->id, 'quantity' => 1]);
        $results = $this->pair([[$user, 'add', $variant->id, 2], [$user, 'add', $variant->id, 3]]);
        self::assertSame([200, 200], array_column($results, 'status'));
        self::assertSame(6, $user->cart->items()->sole()->quantity);
    }

    public function test_competing_adds_that_exceed_stock_only_apply_one_complete_request(): void
    {
        $user = $this->owner();
        $variant = $this->variant(['stock_quantity' => 3]);
        $results = $this->pair([[$user, 'add', $variant->id, 2], [$user, 'add', $variant->id, 2]]);
        $statuses = array_column($results, 'status');
        sort($statuses);
        self::assertSame([201, 409], $statuses);
        self::assertContains('INSUFFICIENT_STOCK', array_column($results, 'code'));
        self::assertSame(1, $user->cart()->count());
        self::assertSame(2, $user->cart->items()->sole()->quantity);
        self::assertSame(3, $variant->fresh()->stock_quantity);
    }

    public function test_different_skus_share_one_new_cart_with_separate_lines(): void
    {
        $user = $this->owner();
        $one = $this->variant();
        $two = $this->variant();
        $results = $this->pair([[$user, 'add', $one->id, 2], [$user, 'add', $two->id, 3]]);
        self::assertSame([201, 201], array_column($results, 'status'));
        self::assertSame(1, $user->cart()->count());
        self::assertSame(2, $user->cart->items()->count());
        self::assertSame(5, (int) $user->cart->items()->sum('quantity'));
    }

    public function test_different_owners_can_add_the_same_last_unit_without_reserving_stock(): void
    {
        $a = $this->owner();
        $b = $this->owner();
        $variant = $this->variant(['stock_quantity' => 1]);
        $results = $this->pair([[$a, 'add', $variant->id, 1], [$b, 'add', $variant->id, 1]]);
        self::assertSame([201, 201], array_column($results, 'status'));
        self::assertSame(1, $a->cart->items()->sole()->quantity);
        self::assertSame(1, $b->cart->items()->sole()->quantity);
        self::assertNotSame($a->cart->id, $b->cart->id);
        self::assertSame(1, $variant->fresh()->stock_quantity);
    }

    public function test_summary_returns_a_consistent_snapshot_during_an_add(): void
    {
        $user = $this->owner();
        $variant = $this->variant();
        $results = $this->pair([[$user, 'add', $variant->id, 2], [$user, 'summary', $variant->id, 0]]);
        self::assertSame(201, $results[0]['status']);
        self::assertSame(200, $results[1]['status']);
        $snapshot = $results[1]['data'];
        self::assertContains($snapshot['total_quantity'], [0, 2]);
        self::assertSame($snapshot['total_quantity'], $snapshot['selected_item']['quantity'] ?? 0);
        self::assertSame($snapshot['total_quantity'] === 0 ? 0 : 1, $snapshot['item_count']);
    }

    public function test_admin_hiding_a_product_and_customer_adding_it_follow_the_catalog_lock_order(): void
    {
        $user = $this->owner();
        $variant = $this->variant();
        $results = $this->pair([[$user, 'add', $variant->id, 2], [$user, 'hide', $variant->product_id, 0]]);
        self::assertContains($results[0]['status'], [201, 404]);
        self::assertSame(200, $results[1]['status']);
        self::assertSame('inactive', $variant->product->fresh()->status);
        self::assertSame(10, $variant->fresh()->stock_quantity);
        if ($results[0]['status'] === 201) {
            self::assertSame(2, $user->cart->items()->sole()->quantity);
        } else {
            self::assertSame(0, $user->cart()->count());
        }
    }
}
