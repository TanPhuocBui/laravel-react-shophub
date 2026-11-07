# ShopHub — Báo cáo triển khai migration và model sản phẩm

Ngày thực hiện: 05/11/2026  
Nhánh làm việc: `dev`  
Trạng thái: Đã tạo mã nguồn, chạy migration và kiểm tra trên database local.

## 1. Phạm vi và môi trường

Đã triển khai 5 bảng: `categories`, `brands`, `products`, `product_variants`, `product_images`, cùng 5 Eloquent model tương ứng.

Tài liệu tham chiếu: [Thiết kế database ShopHub v1](shophub-database-design.md). Yêu cầu triển khai của đợt này giới hạn ở migration và model; chưa tạo seeder dù tài liệu thiết kế có đề cập dữ liệu mẫu ở các bước tiếp theo.

| Thành phần | Môi trường đã kiểm tra |
|---|---|
| PHP CLI | 8.3.36 |
| Laravel | 12.71.0 |
| Driver database | `mysql` |
| Database server thực tế | MariaDB 10.11.16 |
| Database | `shophub` trên máy local |

Trước khi chỉnh sửa, repository đang ở nhánh `dev`, working tree sạch. Không tìm thấy `AGENTS.md` áp dụng cho các đường dẫn triển khai. Backend chỉ có model `User` và 4 migration Laravel/Sanctum đã chạy; chưa có 5 bảng sản phẩm, nên đã tạo migration mới, không sửa migration cũ.

## 2. Các file đã tạo

Các đường dẫn dưới đây tính từ thư mục gốc repository.

| Bảng | Migration | Model |
|---|---|---|
| `categories` | [2026_11_05_160000_create_categories_table.php](../backend/database/migrations/2026_11_05_160000_create_categories_table.php) | [Category.php](../backend/app/Models/Category.php) |
| `brands` | [2026_11_05_160001_create_brands_table.php](../backend/database/migrations/2026_11_05_160001_create_brands_table.php) | [Brand.php](../backend/app/Models/Brand.php) |
| `products` | [2026_11_05_160002_create_products_table.php](../backend/database/migrations/2026_11_05_160002_create_products_table.php) | [Product.php](../backend/app/Models/Product.php) |
| `product_variants` | [2026_11_05_160003_create_product_variants_table.php](../backend/database/migrations/2026_11_05_160003_create_product_variants_table.php) | [ProductVariant.php](../backend/app/Models/ProductVariant.php) |
| `product_images` | [2026_11_05_160004_create_product_images_table.php](../backend/database/migrations/2026_11_05_160004_create_product_images_table.php) | [ProductImage.php](../backend/app/Models/ProductImage.php) |

File báo cáo bổ sung: `docs/shophub-product-catalog-implementation-report.md`.

## 3. Schema đã triển khai

Tất cả 5 bảng có `id` kiểu `BIGINT UNSIGNED` tự tăng và `created_at`, `updated_at`. Khóa ngoại dùng `foreignId`, cùng kiểu với khóa chính được tham chiếu. Các migration tạo bảng theo thứ tự phụ thuộc và có `down()` để xóa bảng theo thứ tự ngược khi rollback.

### 3.1. categories

- `parent_id`: nullable, tham chiếu `categories.id`, `ON DELETE RESTRICT`; có index hỗ trợ khóa ngoại.
- `name`: `VARCHAR(150)`.
- `slug`: `VARCHAR(180)`, unique.
- `image_path`: `VARCHAR(255)`, nullable.
- `sort_order`: `INT UNSIGNED`, mặc định `0`.
- `is_active`: boolean, mặc định `true`.

### 3.2. brands

- `name`: `VARCHAR(150)`, unique.
- `slug`: `VARCHAR(180)`, unique.
- `logo_path`: `VARCHAR(255)`, nullable.
- `is_active`: boolean, mặc định `true`.

### 3.3. products

- `category_id`: tham chiếu `categories.id`, `ON DELETE RESTRICT`.
- `brand_id`: tham chiếu `brands.id`, `ON DELETE RESTRICT`.
- `name`, `slug`: `VARCHAR(255)`; `slug` unique.
- `short_description`: `TEXT`, nullable.
- `description`: `LONGTEXT`, nullable.
- `warranty_months`: `SMALLINT UNSIGNED`, mặc định `0`.
- `status`: `VARCHAR(20)`, mặc định `draft`.
- `is_featured`: boolean, mặc định `false`.
- `deleted_at`: nullable, được tạo bằng `softDeletes()`.
- Index ghép: `(category_id, status)` và `(brand_id, status)`.

### 3.4. product_variants

- `product_id`: tham chiếu `products.id`, `ON DELETE CASCADE`.
- `sku`: `VARCHAR(100)`, unique.
- `name`: `VARCHAR(150)`.
- `options`: JSON, nullable.
- `list_price`, `sale_price`: `BIGINT UNSIGNED`, lưu tiền VND bằng số nguyên.
- `stock_quantity`: `INT UNSIGNED`, mặc định `0`.
- `is_active`: boolean, mặc định `true`.
- Index ghép: `(product_id, is_active)`.

Trên MariaDB local, cột JSON được biểu diễn bằng `LONGTEXT` kèm kiểm tra `JSON_VALID(options)`. Đã xác nhận kiểm tra JSON trong câu lệnh `SHOW CREATE TABLE product_variants`; migration vẫn khai báo `$table->json('options')->nullable()`.

### 3.5. product_images

- `product_id`: tham chiếu `products.id`, `ON DELETE CASCADE`.
- `path`: `VARCHAR(255)`.
- `alt_text`: `VARCHAR(255)`, nullable.
- `sort_order`: `INT UNSIGNED`, mặc định `0`.
- Index ghép: `(product_id, sort_order)`.

## 4. Eloquent model đã triển khai

Tất cả model nằm trong namespace `App\Models`, khai báo `$fillable` rõ ràng cho các cột nghiệp vụ, không cho mass assignment `id`/timestamps và không dùng `$guarded = []`. Model `Product` cũng không đưa `deleted_at` vào `$fillable`.

| Model | Casts | Quan hệ |
|---|---|---|
| `Category` | `is_active` → boolean; `sort_order` → integer | `parent(): BelongsTo`, `children(): HasMany`, `products(): HasMany` |
| `Brand` | `is_active` → boolean | `products(): HasMany` |
| `Product` | `warranty_months` → integer; `is_featured` → boolean | `category(): BelongsTo`, `brand(): BelongsTo`, `variants(): HasMany`, `images(): HasMany` |
| `ProductVariant` | `options` → array; `list_price`, `sale_price`, `stock_quantity` → integer; `is_active` → boolean | `product(): BelongsTo` |
| `ProductImage` | `sort_order` → integer | `product(): BelongsTo` |

- `Category::children()` sắp xếp tăng dần theo `sort_order`, sau đó `id`.
- `Product::images()` sắp xếp tăng dần theo `sort_order`, sau đó `id`; ảnh đầu là ảnh đại diện theo quy ước thiết kế.
- `Product` dùng trait `SoftDeletes` và có 3 hằng số `STATUS_DRAFT = 'draft'`, `STATUS_ACTIVE = 'active'`, `STATUS_INACTIVE = 'inactive'`.
- Xóa mềm sản phẩm giữ lại biến thể và ảnh. `ON DELETE CASCADE` áp dụng khi bản ghi sản phẩm bị xóa vật lý.
- Không thêm observer hoặc sự kiện tự tạo biến thể hay xử lý tồn kho.

## 5. Các kiểm tra đã chạy và kết quả

Các lệnh Artisan và Pint được chạy trong thư mục `backend/`.

| Lệnh hoặc kiểm tra | Kết quả thực tế |
|---|---|
| `git status --short`, `git branch --show-current` | Trước triển khai: working tree sạch, đang ở `dev` |
| `php --version`, `php artisan --version` | PHP 8.3.36, Laravel 12.71.0 |
| Bootstrap Laravel và đọc cấu hình/kết nối database | Xác nhận driver `mysql`, host local, database đang kết nối là `shophub`; không in mật khẩu |
| `php -l <file>` cho từng file PHP mới | Cả 10 file không có lỗi cú pháp |
| `php vendor/bin/pint --test` với danh sách 10 file mới | Passed |
| `php artisan migrate --pretend --no-interaction --no-ansi` | SQL tạo bảng, khóa ngoại, unique và index đúng thứ tự |
| `php artisan migrate --no-interaction --no-ansi` | Cả 5 migration chạy thành công |
| `php artisan migrate:status --no-ansi` | Cả 5 migration ở trạng thái `Ran`, batch `3` |
| `php artisan test --compact` | 2 test có sẵn đạt, 2 assertions; không tạo test mới |
| `php artisan migrate:rollback --pretend --step=5 --no-interaction --no-ansi` | SQL rollback theo thứ tự ảnh → biến thể → sản phẩm → thương hiệu → danh mục; chỉ xem trước, không xóa bảng thực tế |

Ngoài các lệnh trên, đã chạy script PHP kiểm tra chỉ đọc thông qua Laravel:

- Đối chiếu metadata thực tế bằng `Schema::getColumns()`, `getIndexes()` và `getForeignKeys()`: đúng kiểu cột, nullable, defaults, unique, index và hành vi xóa của khóa ngoại.
- Kiểm tra `$fillable`, cấu hình casts và kết quả cast trên các model trong bộ nhớ: đạt.
- Kiểm tra kiểu quan hệ, return type, model liên quan, tên khóa ngoại và chạy truy vấn SELECT cho từng quan hệ: đạt.
- Kiểm tra thứ tự sắp xếp `children()` và `images()`, hằng số trạng thái và điều kiện lọc `deleted_at IS NULL` của `Product`: đạt.
- Kiểm tra biểu diễn JSON trên server MariaDB local: đạt.

Truy vấn được yêu cầu đã chạy thành công:

```php
App\Models\Product::with(['category', 'brand', 'variants', 'images'])->get();
```

Kết quả là collection rỗng, `0` sản phẩm, hợp lệ vì chưa nạp dữ liệu. Các kiểm tra bổ sung chỉ dùng SELECT và model trong bộ nhớ, không ghi bản ghi sản phẩm mẫu vào database.

## 6. Giới hạn và phần dành cho đợt tiếp theo

- Chưa kiểm thử thao tác ghi bằng dữ liệu mẫu trên database kiểm thử riêng; chưa thử vi phạm unique/FK hoặc hành vi cascade bằng thao tác ghi/xóa thực tế.
- Rollback mới được kiểm tra bằng `--pretend`, chưa thực hiện rollback thật.
- Hai test PHPUnit hiện có là test khởi tạo của project, không thay thế kiểm thử nghiệp vụ sản phẩm.
- Chưa triển khai validation nghiệp vụ như chống vòng lặp danh mục, kiểm tra `0 < sale_price <= list_price`, bảo đảm sản phẩm có ít nhất một biến thể hoặc điều kiện xuất bản sản phẩm. Những quy tắc này thuộc đợt API/service; `$fillable`, casts và hằng số trạng thái không phải validation.
- Khi triển khai API bán hàng, cần kiểm tra trạng thái sản phẩm, danh mục, thương hiệu và biến thể; đặc biệt không bán biến thể của sản phẩm đã xóa mềm.
- Không phát hiện lỗi qua các kiểm tra đã thực hiện.

Không thay đổi các bảng Laravel/Sanctum hiện có, không sửa `.env`, không triển khai controller/API CRUD/frontend/authentication/giỏ hàng/đơn hàng hoặc seeder. Không chạy `migrate:fresh`, `migrate:refresh`, `db:wipe` hay reset database. Chưa commit, push, merge hoặc publish.

## 7. Kiểm tra trong phpMyAdmin

1. Mở phpMyAdmin và chọn database `shophub`.
2. Refresh danh sách bảng, xác nhận có `categories`, `brands`, `products`, `product_variants`, `product_images`.
3. Mở tab **Structure** của từng bảng để kiểm tra cột, nullable, defaults và indexes.
4. Mở **Relation view** để kiểm tra khóa ngoại và hành vi RESTRICT/CASCADE.
5. Mở bảng `migrations`, kiểm tra 5 migration mới thuộc batch `3`.
6. Các bảng sản phẩm đang rỗng do chưa có seeder; đây là trạng thái dự kiến. Cột `options` hiển thị `LONGTEXT` trên MariaDB là biểu diễn JSON của server local như đã giải thích ở trên.

## 8. Gợi ý commit

```text
feat: add product catalog migrations and models
```

Có thể đưa báo cáo này vào cùng commit hoặc tạo commit tài liệu riêng. Việc commit và push do người dùng thực hiện bằng GitHub Desktop.
