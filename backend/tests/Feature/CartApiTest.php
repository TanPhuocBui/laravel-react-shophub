<?php

namespace Tests\Feature;

use App\Models\Cart;
use App\Models\User;
use App\Services\AdminProductService;
use App\Services\CartService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;
use PHPUnit\Framework\Attributes\DataProvider;
use RuntimeException;
use Symfony\Component\HttpKernel\Exception\HttpException;
use Tests\Support\CatalogDatabaseTestCase;
use Tests\Support\CreatesCartFixtures;

class CartApiTest extends CatalogDatabaseTestCase
{
    use CreatesCartFixtures;

    private string $base = '/api/customer/cart';

    protected function setUp(): void
    {
        parent::setUp();
        if (! Schema::hasTable('users')) {
            (require database_path('migrations/0001_01_01_000000_create_users_table.php'))->up();
            (require database_path('migrations/2026_11_07_180000_add_account_fields_to_users_table.php'))->up();
        }
        foreach (['carts', 'cart_items'] as $table) {
            if (! Schema::hasTable($table)) {
                (require glob(database_path("migrations/*_create_{$table}_table.php"))[0])->up();
            }
        }
    }

    private function customer(): User
    {
        $user = User::factory()->create();
        $this->app['auth']->forgetGuards();
        $this->actingAs($user, 'web');

        return $user;
    }

    public function test_both_routes_require_an_active_customer_before_validation(): void
    {
        foreach ([['POST', '/items'], ['GET', '/summary']] as [$method, $path]) {
            $this->json($method, $this->base.$path)->assertUnauthorized();
        }
        foreach ([['role' => 'admin'], ['is_active' => false]] as $attributes) {
            $this->app['auth']->forgetGuards();
            $this->actingAs(User::factory()->create($attributes), 'web');
            foreach ([['POST', '/items'], ['GET', '/summary']] as [$method, $path]) {
                $this->json($method, $this->base.$path)->assertForbidden();
            }
        }
        self::assertSame(0, Cart::count());
    }

    public function test_new_line_and_repeated_add_have_exact_resources_and_do_not_change_price_or_stock(): void
    {
        $user = $this->customer();
        $variant = $this->cartVariant();
        $before = $variant->fresh()->getAttributes();
        $payload = ['product_variant_id' => $variant->id, 'quantity' => 2];
        $id = $this->postJson($this->base.'/items', $payload)->assertCreated()->json('data.item.id');
        $this->postJson($this->base.'/items', $payload)->assertOk()->assertExactJson(['data' => [
            'item' => ['id' => $id, 'product_variant_id' => $variant->id, 'quantity' => 4],
            'summary' => ['item_count' => 1, 'total_quantity' => 4],
        ]]);
        self::assertSame(1, $user->cart()->count());
        self::assertSame(1, $user->cart->items()->count());
        self::assertSame($before, $variant->fresh()->getAttributes());
        $this->getJson($this->base.'/summary?product_variant_id='.$variant->id)->assertOk()->assertExactJson(['data' => [
            'item_count' => 1, 'total_quantity' => 4,
            'selected_item' => ['id' => $id, 'product_variant_id' => $variant->id, 'quantity' => 4],
        ]]);
    }

    public function test_different_skus_and_owners_have_scoped_summaries_and_reads_do_not_create_carts(): void
    {
        $a = $this->customer();
        $one = $this->cartVariant();
        $two = $this->cartVariant();
        $this->postJson($this->base.'/items', ['product_variant_id' => $one->id, 'quantity' => 2])->assertCreated();
        $this->postJson($this->base.'/items', ['product_variant_id' => $two->id, 'quantity' => 3])->assertCreated()
            ->assertJsonPath('data.summary.item_count', 2)->assertJsonPath('data.summary.total_quantity', 5);
        $b = $this->customer();
        $this->getJson($this->base.'/summary?product_variant_id='.$one->id)->assertExactJson(['data' => [
            'item_count' => 0, 'total_quantity' => 0, 'selected_item' => null,
        ]]);
        self::assertSame(0, $b->cart()->count());
        $this->postJson($this->base.'/items', ['product_variant_id' => $one->id, 'quantity' => 1])->assertCreated();
        $this->getJson($this->base.'/summary')->assertExactJson(['data' => [
            'item_count' => 1, 'total_quantity' => 1, 'selected_item' => null,
        ]]);
        $this->getJson($this->base.'/summary?product_variant_id=999999999')->assertJsonPath('data.selected_item', null);
        self::assertSame(5, (int) $a->cart->items()->sum('quantity'));
    }

    public static function invalidPayloads(): array
    {
        $cases = [];
        foreach (['product_variant_id', 'quantity'] as $field) {
            foreach (['zero' => 0, 'negative' => -1, 'null' => null, 'bool' => true, 'float' => 1.5, 'string' => '1', 'array' => []] as $name => $value) {
                $cases[$field.' '.$name] = [$field, $value];
            }
        }
        $cases['quantity overflow'] = ['quantity', 4294967296];
        $cases['ID overflow'] = ['product_variant_id', '9999999999999999999999999999999'];
        foreach (['user_id', 'cart_id', 'id', 'price', 'sale_price', 'subtotal', 'grand_total', 'unexpected'] as $field) {
            $cases['forbidden '.$field] = [$field, null];
        }

        return $cases;
    }

    #[DataProvider('invalidPayloads')]
    public function test_invalid_payloads_never_create_a_cart(string $field, mixed $value): void
    {
        $user = $this->customer();
        $payload = ['product_variant_id' => 123, 'quantity' => 1, $field => $value];
        $this->postJson($this->base.'/items', $payload)->assertUnprocessable()->assertJsonValidationErrors($field);
        self::assertSame(0, $user->cart()->count());
    }

    public function test_missing_fields_and_summary_parameters_are_validated(): void
    {
        $user = $this->customer();
        $this->postJson($this->base.'/items', [])->assertUnprocessable()->assertJsonValidationErrors(['product_variant_id', 'quantity']);
        foreach (['', '0', '-1', '1.5', 'abc', '9999999999999999999999999999999'] as $value) {
            $this->getJson($this->base.'/summary?product_variant_id='.rawurlencode($value))
                ->assertUnprocessable()->assertJsonValidationErrors('product_variant_id');
        }
        foreach (['user_id', 'cart_id', 'quantity', 'unexpected'] as $field) {
            $this->getJson($this->base.'/summary?'.$field.'=1')->assertUnprocessable()->assertJsonValidationErrors($field);
        }
        self::assertSame(0, $user->cart()->count());
    }

    public static function unavailableVariants(): array
    {
        return [
            'missing' => ['missing'], 'draft' => ['draft'], 'inactive' => ['inactive'],
            'soft deleted' => ['deleted'], 'category hidden' => ['category'],
            'brand hidden' => ['brand'], 'variant inactive' => ['variant'],
        ];
    }

    #[DataProvider('unavailableVariants')]
    public function test_unavailable_variants_return_the_same_404_and_leave_no_empty_cart(string $state): void
    {
        $user = $this->customer();
        $variant = $this->cartVariant();
        $product = $variant->product;
        match ($state) {
            'draft', 'inactive' => $product->update(['status' => $state]),
            'deleted' => $product->delete(),
            'category' => $product->category()->update(['is_active' => false]),
            'brand' => $product->brand()->update(['is_active' => false]),
            'variant' => $variant->update(['is_active' => false]),
            default => null,
        };
        $this->postJson($this->base.'/items', [
            'product_variant_id' => $state === 'missing' ? 999999999 : $variant->id, 'quantity' => 1,
        ])->assertNotFound()->assertJsonPath('message', 'Không tìm thấy SKU đang được bán.');
        self::assertSame(0, $user->cart()->count());
    }

    public function test_stock_conflict_returns_context_and_preserves_the_existing_quantity(): void
    {
        $user = $this->customer();
        $variant = $this->cartVariant(['stock_quantity' => 3]);
        $payload = ['product_variant_id' => $variant->id, 'quantity' => 2];
        $this->postJson($this->base.'/items', $payload)->assertCreated();
        $this->postJson($this->base.'/items', $payload)->assertConflict()->assertExactJson([
            'message' => 'Số lượng yêu cầu vượt quá tồn kho hiện tại.', 'code' => 'INSUFFICIENT_STOCK',
            'context' => ['product_variant_id' => $variant->id, 'stock_quantity' => 3, 'cart_quantity' => 2, 'requested_quantity' => 2],
        ]);
        self::assertSame(2, $user->cart->items()->sole()->quantity);
        self::assertSame(3, $variant->fresh()->stock_quantity);
    }

    public function test_sold_out_variant_rolls_back_the_first_cart_creation(): void
    {
        $user = $this->customer();
        $variant = $this->cartVariant(['stock_quantity' => 0]);
        $this->postJson($this->base.'/items', ['product_variant_id' => $variant->id, 'quantity' => 1])
            ->assertConflict()->assertJsonPath('code', 'INSUFFICIENT_STOCK');
        self::assertSame(0, $user->cart()->count());
    }

    public static function invalidPrices(): array
    {
        return [
            'zero' => [['sale_price' => 0]],
            'sale exceeds list' => [['sale_price' => 200001]],
            'price exceeds catalog limit' => [['list_price' => AdminProductService::MAX_PRICE + 1]],
        ];
    }

    #[DataProvider('invalidPrices')]
    public function test_invalid_prices_are_conflicts_and_do_not_leave_a_cart(array $attributes): void
    {
        $user = $this->customer();
        $variant = $this->cartVariant($attributes);
        $this->postJson($this->base.'/items', ['product_variant_id' => $variant->id, 'quantity' => 1])
            ->assertConflict()->assertJsonPath('code', 'INVALID_VARIANT_PRICE');
        self::assertSame(0, $user->cart()->count());
    }

    public function test_quantity_upper_bound_and_addition_overflow_use_integer_arithmetic(): void
    {
        $user = $this->customer();
        $variant = $this->cartVariant(['stock_quantity' => CartService::MAX_QUANTITY]);
        $this->postJson($this->base.'/items', ['product_variant_id' => $variant->id, 'quantity' => CartService::MAX_QUANTITY])
            ->assertCreated()->assertJsonPath('data.summary.total_quantity', CartService::MAX_QUANTITY);
        $this->postJson($this->base.'/items', ['product_variant_id' => $variant->id, 'quantity' => 1])
            ->assertConflict()->assertJsonPath('code', 'CART_QUANTITY_LIMIT');
        self::assertSame(CartService::MAX_QUANTITY, $user->cart->items()->sole()->quantity);
    }

    public static function changedActors(): array
    {
        return ['locked' => [['is_active' => false]], 'changed role' => [['role' => 'admin']]];
    }

    #[DataProvider('changedActors')]
    public function test_previously_valid_session_is_rejected_after_the_account_changes(array $changes): void
    {
        $actor = $this->customer();
        $variant = $this->cartVariant();
        $this->getJson($this->base.'/summary')->assertOk();
        DB::table('users')->where('id', $actor->id)->update($changes);
        $this->getJson($this->base.'/summary')->assertForbidden();
        $this->postJson($this->base.'/items', ['product_variant_id' => $variant->id, 'quantity' => 1])->assertForbidden();
        self::assertSame(0, $actor->cart()->count());
    }

    #[DataProvider('changedActors')]
    public function test_service_rechecks_stale_actor_on_writes_and_reads(array $changes): void
    {
        $actor = $this->customer();
        DB::table('users')->where('id', $actor->id)->update($changes);
        $service = app(CartService::class);
        foreach (['add', 'summary'] as $operation) {
            try {
                $operation === 'add' ? $service->add($actor, 123, 1) : $service->summary($actor);
                self::fail('Service accepted a stale actor.');
            } catch (HttpException $error) {
                self::assertSame(403, $error->getStatusCode());
            }
        }
        self::assertSame(0, $actor->cart()->count());
    }

    public function test_service_enforces_input_invariants_when_called_without_a_form_request(): void
    {
        $actor = $this->customer();
        $service = app(CartService::class);
        foreach ([[0, 1], [1, 0], [1, -1], [1, CartService::MAX_QUANTITY + 1], [1, true], ['1', 1], [1, 1.5]] as [$id, $quantity]) {
            try {
                $service->add($actor, $id, $quantity);
                self::fail('Service accepted invalid input.');
            } catch (ValidationException $error) {
                self::assertNotEmpty($error->errors());
            }
        }
        self::assertSame(0, $actor->cart()->count());
    }

    public static function existingCarts(): array
    {
        return ['new cart' => [false], 'existing line' => [true]];
    }

    #[DataProvider('existingCarts')]
    public function test_failure_after_saving_the_line_rolls_back_every_change(bool $existing): void
    {
        $user = $this->customer();
        $variant = $this->cartVariant();
        if ($existing) {
            $user->cart()->create()->items()->create(['product_variant_id' => $variant->id, 'quantity' => 2]);
        }
        $simulate = true;
        DB::connection()->beforeExecuting(function ($sql) use (&$simulate): void {
            if ($simulate && str_contains(strtolower($sql), 'sum(quantity)')) {
                throw new RuntimeException('Simulated cart read-back failure after saving the item.');
            }
        });
        try {
            $this->postJson($this->base.'/items', ['product_variant_id' => $variant->id, 'quantity' => 1])->assertStatus(500);
        } finally {
            $simulate = false;
        }
        self::assertSame($existing ? 1 : 0, $user->cart()->count());
        if ($existing) {
            self::assertSame(2, $user->cart->items()->sole()->quantity);
        }
        self::assertSame(10, $variant->fresh()->stock_quantity);
    }

    public function test_summary_reads_saved_lines_even_when_the_product_becomes_unavailable(): void
    {
        $this->customer();
        $variant = $this->cartVariant();
        $this->postJson($this->base.'/items', ['product_variant_id' => $variant->id, 'quantity' => 2])->assertCreated();
        $variant->product->update(['status' => 'inactive']);
        $this->getJson($this->base.'/summary?product_variant_id='.$variant->id)->assertOk()
            ->assertJsonPath('data.total_quantity', 2)->assertJsonPath('data.selected_item.quantity', 2);
        $this->postJson($this->base.'/items', ['product_variant_id' => $variant->id, 'quantity' => 1])->assertNotFound();
    }
}
