# ShopHub — Báo cáo triển khai seeder sản phẩm demo

Ngày thực hiện: 05/11/2026  
Nhánh: `dev`  
Trạng thái: Đã triển khai, chạy seeder hai lần trên MariaDB local và kiểm tra kết quả.

## 1. Phạm vi và kiểm tra ban đầu

Đợt này bổ sung dữ liệu mẫu cho đúng 5 bảng `categories`, `brands`, `products`, `product_variants`, `product_images`. Tham chiếu [thiết kế database](shophub-database-design.md) và [báo cáo migration/model](shophub-product-catalog-implementation-report.md).

Trước khi chỉnh sửa, đã kiểm tra mã nguồn thực tế, Git, các model, quan hệ và danh sách cột trên database. Repository đang ở nhánh `dev`, working tree sạch; các migration/model của đợt trước đã có trong mã nguồn. Không tìm thấy `AGENTS.md` áp dụng. Chưa có placeholder trong `backend/public/`, nên đã bổ sung hai SVG mới, không ghi đè ảnh có sẵn.

Không thay đổi schema, migration hoặc model. Không triển khai API CRUD, frontend, authentication, đơn hàng hoặc thông số kỹ thuật. `DatabaseSeeder` được giữ nguyên; phải gọi `ProductCatalogSeeder` riêng.

## 2. Các file đã tạo/sửa

| File | Thay đổi |
|---|---|
| [backend/database/seeders/ProductCatalogSeeder.php](../backend/database/seeders/ProductCatalogSeeder.php) | Tạo seeder với guard môi trường, transaction và phát hiện xung đột |
| [backend/public/images/demo/catalog-placeholder-front.svg](../backend/public/images/demo/catalog-placeholder-front.svg) | Tạo SVG placeholder trung tính, dùng cho ảnh thứ nhất |
| [backend/public/images/demo/catalog-placeholder-detail.svg](../backend/public/images/demo/catalog-placeholder-detail.svg) | Tạo SVG placeholder trung tính, dùng cho ảnh thứ hai |
| [backend/tests/Feature/ProductCatalogSeederTest.php](../backend/tests/Feature/ProductCatalogSeederTest.php) | Tạo test dùng SQLite trong bộ nhớ, tách biệt database local |
| [README.md](../README.md) | Bổ sung lệnh seed, dữ liệu mẫu, điều kiện chạy, xử lý xung đột và cách kiểm tra ảnh |
| `docs/shophub-product-catalog-seeding-report.md` | Tạo báo cáo này |

## 3. Môi trường thực tế

### Chạy seeder và xác minh dữ liệu local

| Thuộc tính | Giá trị đã xác nhận |
|---|---|
| App environment | `local` |
| Driver database | `mysql` |
| Host | Local |
| Database đang kết nối, kiểm tra bằng `SELECT DATABASE()` | `shophub` |
| Server, kiểm tra bằng `SELECT VERSION()` | `10.11.16-MariaDB` |

Đã xác nhận môi trường, driver, host và database đích trước khi seed. Không sửa `.env`, không in mật khẩu. Database `shophub` vẫn dùng MariaDB trong toàn bộ quá trình seed và xác minh thực tế.

### Kiểm thử tự động

Test mới sử dụng connection riêng tên `catalog_seeder_test`, driver `sqlite`, database `:memory:`. Mỗi test tạo 5 bảng sản phẩm bằng các migration đã có trong database bộ nhớ mới, không dùng `RefreshDatabase`, không reset hoặc ghi vào `shophub`. Test xác nhận tên connection và database bộ nhớ trước khi tạo bảng.

SQLite chỉ phục vụ kiểm thử tự động độc lập, không được dùng thay cho kết quả xác minh MariaDB trong báo cáo này.

## 4. Dữ liệu mẫu đã tạo

Mọi giá, tồn kho, cấu hình và thời hạn bảo hành là giả lập cho đồ án, không phải thông tin bán hàng thực tế.

### Danh mục và thương hiệu

| Danh mục gốc | Slug | sort_order |
|---|---|---|
| Laptop | `laptop` | 1 |
| Linh kiện và phụ kiện | `linh-kien-phu-kien` | 2 |
| Thiết bị gia dụng | `thiet-bi-gia-dung` | 3 |

Các danh mục mới có `parent_id = null`, `is_active = true`. Thương hiệu mới gồm ASUS (`asus`), Kingston (`kingston`), Philips (`philips`), đều có `is_active = true`.

### Sản phẩm và biến thể

| Sản phẩm | Slug | Danh mục / thương hiệu | Bảo hành giả lập |
|---|---|---|---|
| Laptop ASUS Demo | `laptop-asus-demo` | Laptop / ASUS | 24 tháng |
| SSD Kingston Demo 1TB | `ssd-kingston-demo-1tb` | Linh kiện và phụ kiện / Kingston | 36 tháng |
| Bình đun Philips Demo | `binh-dun-philips-demo` | Thiết bị gia dụng / Philips | 12 tháng |

Cả 3 sản phẩm mới có `status = draft`, `is_featured = false`, mô tả ngắn ghi rõ là dữ liệu demo. Chưa xuất bản sản phẩm vì chưa triển khai đầy đủ validation và thông số kỹ thuật. Giá/tồn kho chỉ nằm ở biến thể.

| SKU | Tên biến thể | options | Giá niêm yết (VND) | Giá bán (VND) | Tồn |
|---|---|---|---|---|---|
| `DEMO-ASUS-BLACK` | Đen | `{"color":"Đen"}` | 20.000.000 | 18.500.000 | 10 |
| `DEMO-ASUS-SILVER` | Bạc | `{"color":"Bạc"}` | 20.000.000 | 18.800.000 | 0 |
| `DEMO-SSD-1TB` | Mặc định | `null` | 2.000.000 | 1.700.000 | 20 |
| `DEMO-KETTLE` | Mặc định | `null` | 700.000 | 550.000 | 15 |

Cả 4 biến thể mới có `is_active = true`. Màu bạc có tồn `0`, thể hiện hết hàng. Có đủ tình huống sản phẩm nhiều biến thể và sản phẩm dùng biến thể mặc định.

### Ảnh

Mỗi sản phẩm có 2 bản ghi ảnh, tổng cộng 6 bản ghi, dùng chung 2 file SVG:

- `images/demo/catalog-placeholder-front.svg`, `sort_order = 0`.
- `images/demo/catalog-placeholder-detail.svg`, `sort_order = 1`.

Các path lưu tương đối trong database, không chứa đường dẫn máy hoặc URL bên ngoài. `alt_text` chứa tên sản phẩm và thứ tự ảnh demo. Đã xác nhận file thực sự tồn tại và XML hợp lệ với phần tử gốc SVG. Không tải ảnh Internet.

## 5. Cách chạy và hành vi khi chạy lại

Trong thư mục `backend/`:

```bash
php artisan db:seed --class=ProductCatalogSeeder
```

- Chỉ được ghi dữ liệu trong môi trường `local` hoặc `testing`. Môi trường khác bị chặn ngay đầu seeder, kể cả khi truyền `--force`.
- Nhận diện danh mục/thương hiệu/sản phẩm bằng slug, biến thể bằng SKU, ảnh bằng cặp `product_id + path`.
- Dùng `firstOrCreate` để bổ sung bản ghi thiếu, không cập nhật lại bản ghi đã tồn tại. Giá, tồn, tên, mô tả, trạng thái và dữ liệu ảnh đã sửa được giữ nguyên.
- Không dùng ID cố định, không gán lại quan hệ hoặc chiếm bản ghi sẵn có.
- Toàn bộ thao tác ghi database nằm trong một transaction. Khi có xung đột, các thao tác ghi của lần chạy đó bị rollback.
- Hai file SVG đã được chuẩn bị trong repository trước transaction. Seeder chỉ kiểm tra sự tồn tại của chúng, không tạo hoặc ghi đè file; transaction database không quản lý rollback file.

Seeder báo lỗi rõ ràng nếu:

1. Slug danh mục dự kiến là danh mục gốc nhưng bản ghi hiện có có `parent_id`.
2. Slug sản phẩm thuộc danh mục hoặc thương hiệu khác với fixture.
3. SKU đã thuộc sản phẩm khác.
4. Sản phẩm cùng slug đã bị xóa mềm, được phát hiện bằng `withTrashed()`; không tự restore hay tạo lại.
5. Tên thương hiệu cần tạo đã thuộc một slug khác, gây xung đột unique.
6. File placeholder bị thiếu.

Khi gặp xung đột, đọc slug/SKU/quan hệ trong thông báo, kiểm tra bản ghi hiện có rồi quyết định xử lý thủ công hoặc điều chỉnh fixture trong mã nguồn. Chạy lại sau khi đã giải quyết nguyên nhân; không cần reset database.

## 6. Các lệnh đã chạy và kết quả

Các lệnh PHP bên dưới được chạy trong `backend/`.

| Lệnh hoặc kiểm tra | Kết quả thực tế |
|---|---|
| `git status --short`, `git branch --show-current` | Working tree ban đầu sạch, nhánh `dev` |
| Bootstrap Laravel, kiểm tra environment, connection, `SELECT DATABASE()`, `SELECT VERSION()` | `local`, `mysql`, `shophub`, MariaDB 10.11.16 trên máy local |
| `Schema::getColumnListing()` cho 5 bảng | Đủ các cột để seeder sử dụng; không cần sửa schema |
| `php -l database/seeders/ProductCatalogSeeder.php` | Không có lỗi cú pháp |
| `php -l tests/Feature/ProductCatalogSeederTest.php` | Không có lỗi cú pháp |
| `php vendor/bin/pint --test database/seeders/ProductCatalogSeeder.php tests/Feature/ProductCatalogSeederTest.php` | Passed |
| `php artisan test --compact --filter=ProductCatalogSeederTest` | 13 test đạt, 248 assertions, trên SQLite bộ nhớ độc lập |
| `php artisan db:seed --class=ProductCatalogSeeder --no-interaction --no-ansi` — lần 1 | Thành công trên `shophub`, tạo đủ fixture |
| Cùng lệnh seed — lần 2 | Thành công, không tạo trùng hoặc thay đổi bản ghi |
| Script PHP chỉ đọc xác minh dữ liệu/quan hệ/ảnh trên MariaDB | Đạt các kiểm tra mô tả ở mục 7 |
| `php artisan test --compact` | Toàn bộ 15 test đạt, 250 assertions; gồm 13 test mới và 2 test có sẵn |
| `git diff --check` | Không báo lỗi whitespace ở các thay đổi được Git theo dõi |

### Số lượng fixture trước/sau hai lần seed

Số lượng được lọc bằng slug/SKU demo và cặp product/path của ảnh, không suy luận từ việc database có dữ liệu khác hay không.

| Bảng | Trước seed | Sau lần 1 | Sau lần 2 |
|---|---|---|---|
| `categories` | 0 | 3 | 3 |
| `brands` | 0 | 3 | 3 |
| `products` (kể cả soft deleted) | 0 | 3 | 3 |
| `product_variants` | 0 | 4 | 4 |
| `product_images` | 0 | 6 | 6 |

Đã đọc thêm tổng số bản ghi của 5 bảng tại từng thời điểm: trùng với số fixture trong bảng trên, vì database local lúc bắt đầu chưa có bản ghi sản phẩm nào.

Đã so sánh SHA-256 nội dung từng bản ghi theo ID giữa sau lần 1 và sau lần 2. Toàn bộ bản ghi giữ nguyên, bao gồm giá, tồn, mô tả, trạng thái, `created_at` và `updated_at`. Không sửa giá hoặc tồn trên `shophub` chỉ để thử seeder.

## 7. Kết quả kiểm tra quan hệ và an toàn

### Trên MariaDB local

Đã chạy truy vấn eager loading các sản phẩm demo:

```php
App\Models\Product::with(['category', 'brand', 'variants', 'images'])
    ->whereIn('slug', [
        'laptop-asus-demo',
        'ssd-kingston-demo-1tb',
        'binh-dun-philips-demo',
    ])
    ->get();
```

Kết quả trả đủ 3 sản phẩm; cả 4 quan hệ đều đã được eager load. Đã đối chiếu:

- Đúng danh mục, thương hiệu, thời hạn bảo hành giả lập và trạng thái `draft`.
- Danh mục là gốc, có thứ tự `1`, `2`, `3`; danh mục và thương hiệu hoạt động.
- SKU thuộc đúng sản phẩm; giá và tồn khớp bảng dữ liệu mẫu, casts thành integer.
- `options` của laptop thành array màu tương ứng; hai biến thể mặc định có `options = null` ở cả database lẫn model.
- Các thuộc tính boolean trả về đúng kiểu, biến thể hoạt động.
- Ảnh trả về theo `sort_order` là `0`, `1`; alt text phù hợp, path tương đối, file tồn tại và XML SVG hợp lệ.
- Laptop có 2 biến thể, SSD/bình đun có biến thể mặc định và màu bạc có tồn `0`.

### Trên database kiểm thử SQLite bộ nhớ

13 trường hợp test bao gồm:

- Tạo đầy đủ fixture trong từng môi trường `local`, `testing` (2 trường hợp).
- Bổ sung dữ liệu còn thiếu nhưng giữ nguyên danh mục, thương hiệu, sản phẩm, biến thể và ảnh đã được chỉnh sửa; chạy lại không đổi toàn bộ snapshot (1 trường hợp).
- Từ chối danh mục không phải gốc (1 trường hợp).
- Báo xung đột tên thương hiệu thuộc slug khác và rollback (1 trường hợp).
- Báo xung đột quan hệ danh mục hoặc thương hiệu của sản phẩm (2 trường hợp).
- SKU của fixture cuối cùng đã thuộc sản phẩm khác: rollback cả các fixture vừa tạo trước đó (1 trường hợp).
- Không restore hoặc tạo lại sản phẩm đã xóa mềm (1 trường hợp).
- Chặn `production`, `staging`, `development` dù truyền `--force` (3 trường hợp).
- File placeholder bị thiếu: dừng trước khi ghi bản ghi (1 trường hợp).

## 8. Giới hạn và trạng thái còn lại

- Các tình huống chủ động đổi giá/tồn, xung đột, soft delete và rollback được thử trên SQLite bộ nhớ. Chưa chạy các tình huống ghi/xóa này trên một database MariaDB kiểm thử riêng.
- Trên MariaDB `shophub` đã thực hiện seed thật hai lần, xác minh dữ liệu và so sánh toàn bộ bản ghi giữa hai lần. Không chủ động sửa tồn/giá hoặc xóa sản phẩm local để kiểm thử.
- Chưa kiểm thử hai tiến trình seeder chạy đồng thời. Chưa bổ sung unique ghép ở bảng ảnh vì đợt này không thay đổi schema.
- File SVG đã được kiểm tra tồn tại và cấu trúc XML; chưa kiểm tra hiển thị ảnh bằng trình duyệt trong đợt này. Có thể kiểm tra theo mục 9.
- Sản phẩm demo mới vẫn là `draft`; chưa có API công khai hoặc luồng xuất bản trong đợt này.
- Không phát hiện lỗi qua các kiểm tra đã thực hiện.

Không truncate/reset bảng, không tắt foreign key, không chạy `migrate:fresh`, `migrate:refresh` hoặc `db:wipe`. Không sửa `.env`, không tải ảnh ngoài, không thay đổi `DatabaseSeeder`. Chưa commit, push, merge hoặc publish.

## 9. Kiểm tra thủ công

1. Trong phpMyAdmin, chọn `shophub`, xem các bảng sản phẩm và lọc theo slug/SKU trong mục 4.
2. Kiểm tra `products.status = draft`, các giá/tồn nằm trên `product_variants`, SKU màu bạc có `stock_quantity = 0`.
3. Kiểm tra `product_images` có 2 ảnh cho mỗi sản phẩm với path `images/demo/...`, `sort_order` là `0`, `1`.
4. Khi backend đang chạy ở `http://localhost:8000`, mở:
   - `http://localhost:8000/images/demo/catalog-placeholder-front.svg`
   - `http://localhost:8000/images/demo/catalog-placeholder-detail.svg`
5. Có thể chạy lại lệnh seed riêng trong môi trường `local` để bổ sung dữ liệu thiếu; các bản ghi đã có sẽ được giữ nguyên.

## 10. Gợi ý commit

```text
feat: add idempotent product catalog demo seeder
```

Người dùng tự commit/push bằng GitHub Desktop.
