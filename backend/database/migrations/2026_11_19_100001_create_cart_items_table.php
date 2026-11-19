<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        $connection = Schema::getConnection();
        $sqlite = $connection->getDriverName() === 'sqlite';

        Schema::create('cart_items', function (Blueprint $table) use ($sqlite) {
            $table->id();
            $table->foreignId('cart_id')->constrained()->cascadeOnDelete();
            $table->foreignId('product_variant_id')->constrained()->cascadeOnDelete();
            if ($sqlite) {
                // Existing auth tests migrate SQLite; enforce the same UINT32 storage range there.
                $table->rawColumn('quantity', 'INTEGER CHECK (quantity BETWEEN 1 AND 4294967295)');
            } else {
                $table->unsignedInteger('quantity');
            }
            $table->timestamps();

            $table->unique(['cart_id', 'product_variant_id']);
        });

        if (! $sqlite) {
            $table = $connection->getQueryGrammar()->wrapTable('cart_items');
            $connection->statement("ALTER TABLE {$table} ADD CONSTRAINT cart_items_quantity_positive CHECK (quantity >= 1)");
        }
    }

    public function down(): void
    {
        Schema::dropIfExists('cart_items');
    }
};
