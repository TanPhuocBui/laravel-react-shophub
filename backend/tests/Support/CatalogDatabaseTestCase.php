<?php

namespace Tests\Support;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Tests\TestCase;

abstract class CatalogDatabaseTestCase extends TestCase
{
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
            $connection = ['driver' => 'sqlite', 'database' => ':memory:', 'prefix' => '', 'foreign_key_constraints' => true];
        }
        config(['database.connections.catalog_api_test' => $connection]);
        DB::setDefaultConnection('catalog_api_test');
        self::assertSame($database ?: ':memory:', DB::connection()->getDatabaseName());
        if ($database) {
            self::assertSame($database, DB::selectOne('SELECT DATABASE() AS db')->db);
        }
        foreach (['categories', 'brands', 'products', 'product_variants', 'product_images',
            'specifications', 'category_specification', 'product_specification_values'] as $table) {
            if (! Schema::hasTable($table)) {
                (require glob(database_path("migrations/*_create_{$table}_table.php"))[0])->up();
            }
        }
        DB::beginTransaction();
    }

    protected function tearDown(): void
    {
        if (DB::connection('catalog_api_test')->transactionLevel() > 0) {
            DB::connection('catalog_api_test')->rollBack();
        }
        DB::purge('catalog_api_test');
        parent::tearDown();
    }
}
