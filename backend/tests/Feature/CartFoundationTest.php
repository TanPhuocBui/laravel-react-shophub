<?php

namespace Tests\Feature;

use App\Models\Brand;
use App\Models\Cart;
use App\Models\CartItem;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Database\QueryException;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class CartFoundationTest extends TestCase
{
    private const MIGRATIONS = [
        'database/migrations/2026_11_19_100000_create_carts_table.php',
        'database/migrations/2026_11_19_100001_create_cart_items_table.php',
    ];

    protected function setUp(): void
    {
        parent::setUp();

        $database = getenv('CATALOG_TEST_DATABASE');
        if ($database) {
            self::assertMatchesRegularExpression('/^shophub_catalog_api_test_[a-f0-9]{10}$/', $database);
            $connection = config('database.connections.mysql');
            self::assertContains($connection['host'], ['127.0.0.1', 'localhost', '::1']);
            $connection['database'] = $database;
            $connection['url'] = null;
        } else {
            // Supplementary compatibility only; MariaDB runs require the explicit isolated DB above.
            $connection = ['driver' => 'sqlite', 'database' => ':memory:', 'prefix' => '', 'foreign_key_constraints' => true];
        }
        config(['database.connections.cart_foundation_test' => $connection]);
        DB::setDefaultConnection('cart_foundation_test');
        self::assertSame($database ?: ':memory:', DB::connection()->getDatabaseName());
        if ($database) {
            self::assertSame($database, DB::selectOne('SELECT DATABASE() AS db')->db);
        }

        $this->artisan('migrate', ['--database' => 'cart_foundation_test', '--force' => true])->assertSuccessful();
        DB::beginTransaction();
    }

    protected function tearDown(): void
    {
        if (DB::connection('cart_foundation_test')->transactionLevel() > 0) {
            DB::connection('cart_foundation_test')->rollBack();
        }
        DB::purge('cart_foundation_test');
        parent::tearDown();
    }

    private function variant(): ProductVariant
    {
        $key = bin2hex(random_bytes(6));
        $category = Category::create(['name' => 'Cart '.$key, 'slug' => 'cart-'.$key]);
        $brand = Brand::create(['name' => 'Cart '.$key, 'slug' => 'cart-'.$key]);
        $product = Product::create([
            'category_id' => $category->id, 'brand_id' => $brand->id,
            'name' => 'Cart fixture', 'slug' => 'cart-'.$key, 'status' => 'active',
        ]);

        return $product->variants()->create([
            'sku' => 'CART-'.$key, 'name' => 'Default',
            'list_price' => 200000, 'sale_price' => 150000, 'stock_quantity' => 10,
        ]);
    }

    public function test_relations_persist_quantity_without_creating_a_cart_automatically_or_changing_stock(): void
    {
        $user = User::factory()->create();
        self::assertNull($user->cart);
        self::assertSame(0, $user->cart()->count());
        $variant = $this->variant();
        $before = $variant->fresh()->getAttributes();
        $cart = $user->cart()->create();
        $item = $cart->items()->create(['product_variant_id' => $variant->id, 'quantity' => '2']);

        self::assertTrue($user->fresh()->cart->is($cart));
        self::assertTrue($cart->fresh()->user->is($user));
        self::assertTrue($cart->fresh()->items->sole()->is($item));
        self::assertTrue($item->fresh()->cart->is($cart));
        self::assertTrue($item->fresh()->productVariant->is($variant));
        self::assertSame(2, $item->fresh()->quantity);
        self::assertNotNull($item->fresh()->created_at);
        self::assertNotNull($cart->fresh()->created_at);
        self::assertSame($before, $variant->fresh()->getAttributes());
        self::assertFalse((new Cart)->isFillable('user_id'));
        self::assertFalse((new CartItem)->isFillable('cart_id'));
    }

    public function test_database_rejects_a_second_cart_for_the_same_user(): void
    {
        $user = User::factory()->create();
        $user->cart()->create();

        $this->expectException(QueryException::class);
        DB::table('carts')->insert(['user_id' => $user->id]);
    }

    public function test_database_rejects_a_second_line_for_the_same_variant_in_one_cart(): void
    {
        $cart = User::factory()->create()->cart()->create();
        $payload = ['product_variant_id' => $this->variant()->id, 'quantity' => 1];
        $cart->items()->create($payload);

        $this->expectException(QueryException::class);
        DB::table('cart_items')->insert(['cart_id' => $cart->id, ...$payload]);
    }

    public function test_different_variants_and_different_owners_have_independent_lines(): void
    {
        $a = User::factory()->create()->cart()->create();
        $b = User::factory()->create()->cart()->create();
        $one = $this->variant();
        $two = $this->variant();
        $a->items()->create(['product_variant_id' => $one->id, 'quantity' => 2]);
        $a->items()->create(['product_variant_id' => $two->id, 'quantity' => 3]);
        $b->items()->create(['product_variant_id' => $one->id, 'quantity' => 4]);

        self::assertSame(2, $a->items()->count());
        self::assertSame(1, $b->items()->count());
        self::assertSame(4, $b->items()->sole()->quantity);
    }

    public static function invalidReferences(): array
    {
        return [
            'missing user' => ['carts', 'user_id', 999999999],
            'null user' => ['carts', 'user_id', null],
            'missing cart' => ['cart_items', 'cart_id', 999999999],
            'null cart' => ['cart_items', 'cart_id', null],
            'missing variant' => ['cart_items', 'product_variant_id', 999999999],
            'null variant' => ['cart_items', 'product_variant_id', null],
        ];
    }

    #[DataProvider('invalidReferences')]
    public function test_database_rejects_missing_and_null_references(string $table, string $column, ?int $value): void
    {
        $payload = ['user_id' => User::factory()->create()->id];
        if ($table === 'cart_items') {
            $payload = [
                'cart_id' => User::factory()->create()->cart()->create()->id,
                'product_variant_id' => $this->variant()->id, 'quantity' => 1,
            ];
        }
        $payload[$column] = $value;

        $this->expectException(QueryException::class);
        DB::table($table)->insert($payload);
    }

    public static function invalidQuantities(): array
    {
        return ['zero' => [0], 'negative' => [-1], 'overflow' => [4294967296], 'null' => [null]];
    }

    #[DataProvider('invalidQuantities')]
    public function test_database_rejects_invalid_quantity_on_insert(?int $quantity): void
    {
        $cart = User::factory()->create()->cart()->create();
        $variant = $this->variant();

        $this->expectException(QueryException::class);
        DB::table('cart_items')->insert([
            'cart_id' => $cart->id, 'product_variant_id' => $variant->id, 'quantity' => $quantity,
        ]);
    }

    #[DataProvider('invalidQuantities')]
    public function test_failed_quantity_update_preserves_the_saved_line(?int $quantity): void
    {
        $cart = User::factory()->create()->cart()->create();
        $item = $cart->items()->create(['product_variant_id' => $this->variant()->id, 'quantity' => 2]);
        try {
            DB::table('cart_items')->where('id', $item->id)->update(['quantity' => $quantity]);
            self::fail('Database accepted an invalid quantity.');
        } catch (QueryException) {
            self::assertSame(2, $item->fresh()->quantity);
        }
    }

    public function test_unsigned_integer_upper_bound_is_stored_without_changing_inventory(): void
    {
        $cart = User::factory()->create()->cart()->create();
        $variant = $this->variant();
        $item = $cart->items()->create(['product_variant_id' => $variant->id, 'quantity' => 4294967295]);

        // This is a storage boundary test; stock validation belongs to the cart service task.
        self::assertSame(4294967295, $item->fresh()->quantity);
        self::assertSame(10, $variant->fresh()->stock_quantity);
    }

    public static function deletedParents(): array
    {
        return ['owner' => ['user'], 'cart' => ['cart'], 'variant' => ['variant']];
    }

    #[DataProvider('deletedParents')]
    public function test_database_cascades_only_the_affected_temporary_cart_data(string $parent): void
    {
        $user = User::factory()->create();
        $cart = $user->cart()->create();
        $other = User::factory()->create()->cart()->create();
        $variant = $this->variant();
        $otherVariant = $this->variant();
        $cart->items()->create(['product_variant_id' => $variant->id, 'quantity' => 1]);
        $other->items()->create(['product_variant_id' => $variant->id, 'quantity' => 2]);
        $unrelated = $other->items()->create(['product_variant_id' => $otherVariant->id, 'quantity' => 3]);

        // Query Builder bypasses model events: these effects must come from the database FKs.
        [$table, $id] = match ($parent) {
            'user' => ['users', $user->id],
            'cart' => ['carts', $cart->id],
            'variant' => ['product_variants', $variant->id],
        };
        DB::table($table)->where('id', $id)->delete();

        self::assertSame(0, $cart->items()->count());
        self::assertTrue($other->fresh()->exists);
        self::assertTrue($unrelated->fresh()->exists);
        self::assertSame($parent === 'variant' ? 1 : 2, $other->items()->count());
        self::assertSame($parent === 'variant' ? 1 : 0, Cart::whereKey($cart->id)->count());
        self::assertTrue($otherVariant->fresh()->exists);
    }

    public function test_only_the_two_new_migrations_can_roll_back_and_run_again_on_the_isolated_database(): void
    {
        // DDL must run outside fixture transactions, and only on the isolated connection from setUp.
        DB::rollBack();
        self::assertSame('cart_foundation_test', DB::getDefaultConnection());
        $before = [];
        foreach (['users', 'products', 'product_variants', 'addresses'] as $table) {
            $before[$table] = DB::table($table)->count();
        }
        $this->artisan('migrate:rollback', [
            '--database' => 'cart_foundation_test', '--path' => self::MIGRATIONS,
            '--step' => 2, '--force' => true,
        ])->assertSuccessful();
        self::assertFalse(Schema::hasTable('cart_items'));
        self::assertFalse(Schema::hasTable('carts'));
        foreach ($before as $table => $count) {
            self::assertTrue(Schema::hasTable($table));
            self::assertSame($count, DB::table($table)->count());
        }
        $this->artisan('migrate', [
            '--database' => 'cart_foundation_test', '--path' => self::MIGRATIONS, '--force' => true,
        ])->assertSuccessful();
        self::assertTrue(Schema::hasTable('carts'));
        self::assertTrue(Schema::hasTable('cart_items'));
        $this->artisan('migrate', [
            '--database' => 'cart_foundation_test', '--path' => self::MIGRATIONS, '--force' => true,
        ])->expectsOutputToContain('Nothing to migrate')->assertSuccessful();
    }
}
