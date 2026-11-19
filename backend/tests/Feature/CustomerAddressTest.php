<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use RuntimeException;
use Tests\Support\CatalogDatabaseTestCase;

class CustomerAddressTest extends CatalogDatabaseTestCase
{
    private User $a;

    private User $b;

    private string $base = '/api/customer/addresses';

    protected function setUp(): void
    {
        parent::setUp();
        if (! Schema::hasTable('users')) {
            (require database_path('migrations/0001_01_01_000000_create_users_table.php'))->up();
            (require database_path('migrations/2026_11_07_180000_add_account_fields_to_users_table.php'))->up();
        }
        if (! Schema::hasTable('addresses')) {
            (require database_path('migrations/2026_11_16_100000_create_addresses_table.php'))->up();
        }
        $this->a = User::factory()->create();
        $this->b = User::factory()->create();
    }

    private function payload(array $changes = []): array
    {
        return [...['recipient_name' => 'Người nhận kiểm thử', 'phone' => '0900000001', 'province' => 'Thành phố Hồ Chí Minh', 'ward' => 'Phường Kiểm Thử', 'address_line' => '12 Đường Kiểm Thử', 'is_default' => false], ...$changes];
    }

    public function test_guest_admin_and_locked_customer_cannot_use_any_endpoint(): void
    {
        $routes = [['GET', ''], ['POST', ''], ['PUT', '/123'], ['DELETE', '/123'], ['PATCH', '/123/default']];
        foreach ($routes as [$method, $path]) {
            $this->json($method, $this->base.$path)->assertUnauthorized();
        }
        $this->actingAs(User::factory()->create(['role' => 'admin']), 'web');
        foreach ($routes as [$method, $path]) {
            $this->json($method, $this->base.$path)->assertForbidden();
        }
        $this->app['auth']->forgetGuards();
        $this->a->forceFill(['is_active' => false])->save();
        $this->actingAs($this->a, 'web');
        foreach ($routes as [$method, $path]) {
            $this->json($method, $this->base.$path)->assertForbidden();
        }
    }

    public function test_full_default_lifecycle_keeps_phone_string_and_uses_creation_time(): void
    {
        $this->actingAs($this->a, 'web');
        $first = $this->postJson($this->base, $this->payload())->assertCreated()->assertJsonPath('data.is_default', true)->assertJsonPath('data.phone', '0900000001')->assertJsonMissingPath('data.user_id')->json('data');
        $second = $this->postJson($this->base, $this->payload(['recipient_name' => 'Địa chỉ B']))->assertCreated()->assertJsonPath('data.is_default', false)->json('data');
        $third = $this->postJson($this->base, $this->payload(['is_default' => true]))->assertCreated()->assertJsonPath('data.is_default', true)->json('data');
        $this->assertSame(1, $this->a->addresses()->where('is_default', true)->count());
        $this->patchJson($this->base.'/'.$second['id'].'/default')->assertOk()->assertJsonPath('data.is_default', true);
        $this->patchJson($this->base.'/'.$second['id'].'/default')->assertOk()->assertJsonPath('data.is_default', true);
        $this->assertTrue($this->a->addresses()->findOrFail($second['id'])->is_default);
        $this->putJson($this->base.'/'.$second['id'], $this->payload(['recipient_name' => 'Đã sửa', 'phone' => '+84900000001', 'is_default' => true]))->assertOk()->assertJsonPath('data.phone', '+84900000001');
        $this->putJson($this->base.'/'.$second['id'], $this->payload())->assertUnprocessable()->assertJsonValidationErrors('is_default');
        $this->a->addresses()->whereKey($third['id'])->update(['created_at' => now()->subDays(3)]);
        $this->a->addresses()->whereKey($first['id'])->update(['created_at' => now()->subDays(2)]);
        $this->deleteJson($this->base.'/'.$second['id'])->assertNoContent();
        $this->assertTrue($this->a->addresses()->findOrFail($third['id'])->is_default);
        $this->deleteJson($this->base.'/'.$third['id'])->assertNoContent();
        $this->assertTrue($this->a->addresses()->findOrFail($first['id'])->is_default);
        $this->deleteJson($this->base.'/'.$first['id'])->assertNoContent();
        $this->getJson($this->base)->assertOk()->assertJsonPath('meta.total', 0)->assertJsonCount(0, 'data');
        $this->postJson($this->base, $this->payload())->assertCreated()->assertJsonPath('data.is_default', true);
    }

    public function test_other_owner_and_missing_ids_are_404_even_with_invalid_update_payload(): void
    {
        $this->actingAs($this->a, 'web');
        $id = $this->postJson($this->base, $this->payload())->assertCreated()->json('data.id');
        $before = $this->a->addresses()->first()->toArray();
        $this->app['auth']->forgetGuards();
        $this->actingAs($this->b, 'web');
        $this->getJson($this->base)->assertJsonCount(0, 'data')->assertJsonPath('meta.total', 0);
        foreach ([$id, 999999999, '99999999999999999999999999999999'] as $target) {
            $this->putJson($this->base.'/'.$target, [])->assertNotFound();
            $this->deleteJson($this->base.'/'.$target)->assertNotFound();
            $this->patchJson($this->base.'/'.$target.'/default')->assertNotFound();
        }
        $this->assertSame($before, $this->a->addresses()->first()->toArray());
        $this->assertSame(0, $this->b->addresses()->count());
    }

    public function test_invalid_fields_and_spoofed_owner_never_leave_partial_addresses(): void
    {
        $this->actingAs($this->a, 'web');
        $invalid = [['recipient_name', ''], ['recipient_name', str_repeat('đ', 256)], ['phone', 900000001], ['phone', 'abcdef'], ['phone', '123'], ['province', ''], ['ward', str_repeat('x', 101)], ['address_line', ''], ['is_default', 'yes'], ['user_id', $this->b->id], ['user_id', null], ['id', 12], ['created_at', '2020-01-01']];
        foreach ($invalid as [$field, $value]) {
            $this->postJson($this->base, $this->payload([$field => $value]))->assertUnprocessable()->assertJsonValidationErrors($field);
            $this->assertSame(0, $this->a->addresses()->count());
        }
        $id = $this->postJson($this->base, $this->payload())->assertCreated()->json('data.id');
        $this->putJson($this->base.'/'.$id, $this->payload(['ward' => '', 'is_default' => true]))->assertUnprocessable();
        $this->assertTrue($this->a->addresses()->findOrFail($id)->is_default);
        $this->assertSame('Phường Kiểm Thử', $this->a->addresses()->findOrFail($id)->ward);
    }

    public function test_pagination_scopes_total_and_orders_default_first(): void
    {
        $this->actingAs($this->a, 'web');
        for ($i = 0; $i < 12; $i++) {
            $this->a->addresses()->create($this->payload(['recipient_name' => 'Address '.$i, 'is_default' => $i === 0]));
        }
        $this->b->addresses()->create($this->payload(['is_default' => true]));
        $this->getJson($this->base)->assertOk()->assertJsonPath('meta.total', 12)->assertJsonPath('data.0.is_default', true)->assertJsonCount(10, 'data');
        $this->getJson($this->base.'?page=2')->assertJsonCount(2, 'data')->assertJsonPath('meta.total', 12);
        $this->getJson($this->base.'?per_page=51')->assertUnprocessable();
    }

    public function test_failure_after_clearing_old_default_rolls_back_every_change(): void
    {
        $this->actingAs($this->a, 'web');
        $id = $this->postJson($this->base, $this->payload())->assertCreated()->json('data.id');
        $simulate = true;
        DB::connection()->beforeExecuting(function ($query) use (&$simulate) {
            if ($simulate && str_starts_with(strtolower($query), 'insert') && str_contains($query, 'addresses')) {
                throw new RuntimeException('Simulated address insert failure');
            }
        });
        try {
            $this->postJson($this->base, $this->payload(['is_default' => true]))->assertStatus(500);
        } finally {
            $simulate = false;
        }
        $this->assertSame(1, $this->a->addresses()->count());
        $this->assertTrue($this->a->addresses()->findOrFail($id)->is_default);
    }

    public function test_service_rechecks_locked_owner_instead_of_trusting_stale_actor(): void
    {
        $cached = $this->a;
        DB::table('users')->where('id', $cached->id)->update(['is_active' => false]);
        $this->actingAs($cached, 'web')->postJson($this->base, $this->payload())->assertForbidden();
        $this->assertSame(0, $cached->addresses()->count());
    }
}
