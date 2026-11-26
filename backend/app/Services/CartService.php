<?php

namespace App\Services;

use App\Exceptions\CartConflictException;
use App\Models\Brand;
use App\Models\Cart;
use App\Models\Category;
use App\Models\Product;
use App\Models\ProductVariant;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class CartService
{
    public const MAX_QUANTITY = 4294967295;

    private const MAX_JSON_INTEGER = 9_007_199_254_740_991;

    private function lockOwner(User $actor): User
    {
        $owner = User::lockForUpdate()->findOrFail($actor->getKey());
        abort_unless($owner->is_active && $owner->role === 'customer', 403, 'Chỉ khách hàng đang hoạt động được sử dụng giỏ hàng.');

        return $owner;
    }

    private function positiveInteger(mixed $value, string $field, int $max): int
    {
        if (! is_int($value) || $value < 1 || $value > $max) {
            throw ValidationException::withMessages([$field => 'Giá trị phải là số nguyên dương trong giới hạn cho phép.']);
        }

        return $value;
    }

    private function lockSaleableVariant(int $id): ProductVariant
    {
        // This first read only discovers lock targets. All decisions use fresh locking reads below.
        $hint = DB::table('product_variants')->join('products', 'products.id', '=', 'product_variants.product_id')
            ->where('product_variants.id', $id)->first(['products.id as product_id', 'products.category_id']);
        abort_unless($hint, 404, 'Không tìm thấy SKU đang được bán.');

        // Matches Admin catalog/publishing: category -> product -> brand -> variants ordered by ID.
        $category = Category::whereKey($hint->category_id)->lockForUpdate()->first();
        $product = Product::whereKey($hint->product_id)->lockForUpdate()->first();
        abort_unless($category && $product && $product->category_id === $category->id, 404, 'Không tìm thấy SKU đang được bán.');
        $brand = Brand::whereKey($product->brand_id)->lockForUpdate()->first();
        $variant = ProductVariant::whereKey($id)->orderBy('id')->lockForUpdate()->first();
        abort_unless($category->is_active && $brand?->is_active && $product->status === Product::STATUS_ACTIVE
            && $variant?->is_active && $variant->product_id === $product->id, 404, 'Không tìm thấy SKU đang được bán.');

        if (! $variant->hasValidPrices()) {
            throw new CartConflictException('SKU hiện chưa có giá bán hợp lệ. Vui lòng chọn sản phẩm khác.', 'INVALID_VARIANT_PRICE');
        }

        return $variant;
    }

    public function add(User $actor, mixed $variantId, mixed $quantity): array
    {
        return DB::transaction(function () use ($actor, $variantId, $quantity) {
            $owner = $this->lockOwner($actor);
            $variantId = $this->positiveInteger($variantId, 'product_variant_id', PHP_INT_MAX);
            $quantity = $this->positiveInteger($quantity, 'quantity', self::MAX_QUANTITY);
            $cart = $owner->cart()->lockForUpdate()->first() ?? $owner->cart()->create();
            $variant = $this->lockSaleableVariant($variantId);
            $item = $cart->items()->where('product_variant_id', $variantId)->lockForUpdate()->first();
            $current = $item?->quantity ?? 0;

            if ($current > self::MAX_QUANTITY - $quantity) {
                throw new CartConflictException('Số lượng trong giỏ vượt quá giới hạn cho phép.', 'CART_QUANTITY_LIMIT');
            }
            $next = $current + $quantity;
            if ($next > $variant->stock_quantity) {
                throw new CartConflictException('Số lượng yêu cầu vượt quá tồn kho hiện tại.', 'INSUFFICIENT_STOCK', [
                    'product_variant_id' => $variantId, 'stock_quantity' => $variant->stock_quantity,
                    'cart_quantity' => $current, 'requested_quantity' => $quantity,
                ]);
            }

            $created = $item === null;
            $item ??= $cart->items()->make(['product_variant_id' => $variantId]);
            $item->quantity = $next;
            $item->save();

            return ['item' => $item, 'summary' => $this->totals($cart), 'created' => $created];
        }, 3);
    }

    public function details(User $actor): array
    {
        return DB::transaction(function () use ($actor) {
            $owner = $this->lockOwner($actor);
            $cart = $owner->cart()->lockForUpdate()->first();
            $items = [];
            $totalQuantity = 0;
            $subtotal = 0;

            $lines = $cart?->items()->with([
                'productVariant.product.category',
                'productVariant.product.brand',
                'productVariant.product.images' => fn ($images) => $images->limit(1),
            ])->orderBy('id')->get() ?? [];

            // Sum the same loaded lines that are serialized in the response.
            foreach ($lines as $item) {
                $variant = $item->productVariant;
                $product = $variant?->product;
                $visible = $variant?->is_active && $product?->status === Product::STATUS_ACTIVE
                    && $product->category?->is_active && $product->brand?->is_active;
                $status = match (true) {
                    ! $visible => 'unavailable',
                    ! $variant->hasValidPrices() => 'invalid_price',
                    $variant->stock_quantity <= 0 => 'out_of_stock',
                    $item->quantity > $variant->stock_quantity => 'insufficient_stock',
                    default => 'available',
                };
                $lineTotal = null;

                if ($status === 'available') {
                    if ($item->quantity > intdiv(self::MAX_JSON_INTEGER - $subtotal, $variant->sale_price)) {
                        throw new CartConflictException('Tạm tính giỏ hàng vượt quá giới hạn cho phép.', 'CART_AMOUNT_LIMIT');
                    }
                    $lineTotal = $variant->sale_price * $item->quantity;
                    $subtotal += $lineTotal;
                }

                if ($item->quantity > self::MAX_JSON_INTEGER - $totalQuantity) {
                    throw new CartConflictException('Tổng số lượng giỏ hàng vượt quá giới hạn cho phép.', 'CART_QUANTITY_LIMIT');
                }
                $totalQuantity += $item->quantity;
                $items[] = [
                    'item' => $item,
                    'visible_variant' => $visible ? $variant : null,
                    'availability' => $status,
                    'line_total' => $lineTotal,
                ];
            }

            return ['items' => $items, 'summary' => [
                'item_count' => count($items),
                'total_quantity' => $totalQuantity,
                'subtotal' => $subtotal,
            ]];
        }, 3);
    }

    public function summary(User $actor, mixed $variantId = null): array
    {
        return DB::transaction(function () use ($actor, $variantId) {
            $owner = $this->lockOwner($actor);
            if ($variantId !== null) {
                $variantId = $this->positiveInteger($variantId, 'product_variant_id', PHP_INT_MAX);
            }
            $cart = $owner->cart()->lockForUpdate()->first();
            $summary = $this->totals($cart);
            $summary['selected_item'] = $cart && $variantId !== null
                ? $cart->items()->where('product_variant_id', $variantId)->first() : null;

            return $summary;
        }, 3);
    }

    private function totals(?Cart $cart): array
    {
        if (! $cart) {
            return ['item_count' => 0, 'total_quantity' => 0];
        }
        $totals = $cart->items()->selectRaw('COUNT(*) AS item_count, COALESCE(SUM(quantity), 0) AS total_quantity')->first();
        $count = filter_var($totals->item_count, FILTER_VALIDATE_INT, ['options' => ['min_range' => 0]]);
        $quantity = filter_var($totals->total_quantity, FILTER_VALIDATE_INT, ['options' => ['min_range' => 0]]);
        if ($count === false || $quantity === false) {
            throw new CartConflictException('Tổng số lượng giỏ hàng vượt quá giới hạn cho phép.', 'CART_QUANTITY_LIMIT');
        }

        return ['item_count' => $count, 'total_quantity' => $quantity];
    }
}
