<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Route;
use Tests\TestCase;

class AccountAuthenticationTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config([
            'app.key' => 'base64:'.base64_encode(random_bytes(32)),
            'database.connections.account_test' => [
                'driver' => 'sqlite',
                'database' => ':memory:',
                'prefix' => '',
                'foreign_key_constraints' => true,
            ],
        ]);
        DB::setDefaultConnection('account_test');
        self::assertSame(':memory:', DB::connection()->getDatabaseName());
        $this->artisan('migrate', ['--database' => 'account_test'])->assertSuccessful();
        $this->withHeader('Origin', 'http://localhost:5173');
    }

    public function test_registration_creates_a_customer_and_rejects_duplicate_email(): void
    {
        $payload = [
            'name' => 'Khách ShopHub',
            'email' => 'SHOP@example.com',
            'password' => 'ShopHub-test-123',
            'password_confirmation' => 'ShopHub-test-123',
            'role' => 'admin',
            'is_active' => false,
        ];

        $this->postJson('/register', $payload)->assertCreated();
        $this->assertGuest();
        $user = User::where('email', 'shop@example.com')->firstOrFail();
        self::assertSame('customer', $user->role);
        self::assertTrue($user->is_active);
        self::assertTrue(Hash::check($payload['password'], $user->password));
        $this->postJson('/register', $payload)->assertUnprocessable()->assertJsonValidationErrors('email');
    }

    public function test_login_returns_the_account_and_logout_ends_the_session(): void
    {
        $user = User::factory()->create();

        $this->getJson('/api/user')->assertUnauthorized();
        $this->postJson('/login', ['email' => $user->email, 'password' => 'wrong-password'])
            ->assertUnprocessable()->assertJsonValidationErrors('email');
        $this->postJson('/login', ['email' => $user->email, 'password' => 'password'])
            ->assertOk()->assertJsonPath('id', $user->id)->assertJsonMissingPath('password');
        $this->assertAuthenticatedAs($user, 'web');
        $this->getJson('/api/user')->assertOk()->assertJsonPath('role', 'customer');
        $this->postJson('/logout')->assertNoContent();
        $this->assertGuest('web');
        $this->app['auth']->forgetGuards();
        $this->getJson('/api/user')->assertUnauthorized();
        $this->getJson('/api/public/categories')->assertOk();
    }

    public function test_repeated_invalid_credentials_are_throttled(): void
    {
        $payload = ['email' => 'missing@example.com', 'password' => 'wrong-password'];
        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->postJson('/login', $payload)->assertUnprocessable();
        }
        $this->postJson('/login', $payload)->assertTooManyRequests()->assertHeader('Retry-After');
    }

    public function test_only_active_admins_can_pass_admin_authorization(): void
    {
        Route::middleware(['api', 'auth:sanctum', 'can:access-admin'])
            ->get('/api/test-admin', fn () => response()->noContent());

        $customer = User::factory()->create();
        $admin = User::factory()->create(['role' => 'admin']);

        $this->getJson('/api/test-admin')->assertUnauthorized();
        $this->actingAs($customer, 'web')->getJson('/api/test-admin')->assertForbidden();
        $this->app['auth']->forgetGuards();
        $this->actingAs($admin, 'web')->getJson('/api/test-admin')->assertNoContent();

        $admin->forceFill(['is_active' => false])->save();
        $this->getJson('/api/test-admin')->assertForbidden();
        $this->getJson('/api/user')->assertForbidden();
        $this->postJson('/logout')->assertNoContent();
        $this->postJson('/login', ['email' => $admin->email, 'password' => 'password'])
            ->assertUnprocessable()->assertJsonValidationErrors('email');
    }
}
