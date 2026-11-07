# ShopHub — Thông số kỹ thuật catalog

Ngày 07/11/2026, nhánh `dev`. Chưa commit/push; giữ các thay đổi API/UI và việc chuyển báo cáo vào docs/report có sẵn khi bắt đầu task.

## Phần đã hoàn thành

Đã đọc AGENTS.md, thiết kế database mục 4.8–4.10 cùng quy ước chung/quan hệ/FK, contract catalog và báo cáo API; kiểm tra migration, model, seeder, resource/service, adapter và tab React. Trước task chưa có ba bảng thông số. Không có ARCHITECTURE.md. Không thay dependency, không sửa migration lịch sử hoặc .env cá nhân.

- Thêm ba migration riêng: specifications; pivot category_specification có **PRIMARY KEY(category_id, specification_id), timestamps, không có id**; product_specification_values có id, timestamps và **UNIQUE(product_id, specification_id)**. Cột, độ dài, unit nullable, cờ active/required và sort_order theo thiết kế. FK cascade theo mục 5 của thiết kế; chưa mở chức năng xóa/Admin.
- Thêm ba model Specification, CategorySpecification (custom Pivot), ProductSpecificationValue; bổ sung quan hệ ở Category/Product và quan hệ ngược. Pivot cast is_required boolean, sort_order integer.
- Seeder PublicCatalogSpecificationSeeder riêng, chỉ local/testing, không đăng ký DatabaseSeeder và không tự gọi seeder sản phẩm. Xác minh toàn bộ 12 fixture đúng danh mục, không xóa mềm trước khi ghi; khóa sản phẩm trong transaction. Kiểm tra thông số thực sự được cấu hình cho danh mục trước mỗi lần tạo giá trị.
- Seed lại dùng khóa code, cặp danh mục–thông số và cặp sản phẩm–thông số; chỉ thêm phần thiếu. Giữ giá trị đã chỉnh, tên/active thông số, required/sort_order hiện có và toàn bộ sản phẩm/biến thể. Unit khác dự kiến báo xung đột và rollback, không sửa hoặc tự đổi đơn vị. Thiếu fixture, fixture sai danh mục hoặc soft-deleted cũng báo lỗi và không restore/gán lại.
- API chi tiết chỉ lấy thông số active có giá trị không trống thuộc cấu hình **danh mục trực tiếp**, sắp theo pivot sort_order rồi specification id. Không kế thừa cha; giá trị ngoài danh mục bị loại cả khi dữ liệu cũ sai hoặc sản phẩm đã đổi danh mục.
- Giữ `{name, value}`. Backend ghép unit một lần: raw `16` + GB → `16 GB`; raw đã chỉnh `32 GB`/`32GB` không bị ghép thêm. Unit null giữ text; `0` không bị loại. Không sửa dữ liệu gốc để định dạng.
- Adapter catalogService và tab JSX hiện có đã hỗ trợ shape này nên **không cần sửa mã giao diện hoặc Axios**. Kiểm tra trình duyệt xác nhận bảng lấy đúng dữ liệu API. Không có thông số hợp lệ vẫn hiển thị “Thông số kỹ thuật đang được cập nhật.” Danh sách giữ specifications=[] và các field catalog khác giữ nguyên; không thêm truy vấn thông số cho card.

## Dữ liệu demo

Seeder tạo 9 định nghĩa, 10 cấu hình danh mục và 46 giá trị cho 12 public-demo-* khi nguồn ban đầu chưa có thông số:

| Nhóm | Thông số theo thứ tự | Giá trị raw / unit |
|---|---|---|
| Laptop (10 sản phẩm) | CPU, RAM, Dung lượng lưu trữ, Kích thước màn hình | Intel Core i5 (demo) / null; 16 / GB; 512 / GB; 15.6 / inch |
| Linh kiện và phụ kiện (SSD) | Dung lượng lưu trữ, Giao tiếp, Chuẩn kích thước | 1000 / GB; PCIe NVMe (demo) / null; M.2 2280 / null |
| Thiết bị gia dụng (bình đun) | Công suất, Dung tích, Chất liệu | 1800 / W; 1.8 / L; Thép không gỉ (demo) / null |

sort_order ban đầu 10/20/30/40 theo từng danh mục. storage_capacity dùng chung cho laptop/SSD với cùng unit GB. Đây là cấu hình giả lập của fixture; không phải thông tin nhà sản xuất hoặc thông số cấp biến thể. Đổi màu/SKU không thay cấu hình sản phẩm.

## File tạo/sửa trong đợt này

| Nhóm | File |
|---|---|
| Migration mới | backend/database/migrations/2026_11_07_170000_create_specifications_table.php; 2026_11_07_170001_create_category_specification_table.php; 2026_11_07_170002_create_product_specification_values_table.php |
| Model mới | backend/app/Models/Specification.php; CategorySpecification.php; ProductSpecificationValue.php |
| Quan hệ bổ sung | backend/app/Models/Category.php; Product.php |
| API đọc | backend/app/Services/PublicCatalogService.php; backend/app/Http/Resources/PublicProductResource.php |
| Seeder mới | backend/database/seeders/PublicCatalogSpecificationSeeder.php |
| Test | backend/tests/Feature/CatalogSpecificationTest.php; backend/tests/Support/CatalogDatabaseTestCase.php; backend/tests/Feature/PublicCatalogApiTest.php |
| QA trình duyệt | backend/scripts/catalog-browser-fixtures.php; frontend/scripts/catalog-api-review.mjs |
| Tài liệu | README.md; docs/api/public-catalog.md; báo cáo này; docs/catalog-specifications-review/README.md, results.json và 3 ảnh |

Test base tách phần kết nối database riêng từ suite API cũ để hai suite dùng chung kiểm tra prefix/host/SELECT DATABASE(), tạo schema 8 bảng và transaction rollback. Các test nghiệp vụ API cũ giữ nguyên. Browser có thêm cờ --specifications để giữ ảnh của đợt API trước và kiểm tra tab trước/sau seed.

## Kiểm tra thực tế

Dùng binary XAMPP tạo **instance MariaDB riêng**, loopback 33307, datadir GUID trong backend/storage/framework/testing (ignored), không cài Windows service. Server xác nhận **10.11.16-MariaDB**, driver mysql. Không migrate/seed vào database shophub hoặc database local từ .env của người dùng.

| Kiểm tra | Kết quả thực chạy |
|---|---|
| PHP syntax các model/service/resource/migration/seeder/test/helper liên quan | Không lỗi |
| PublicCatalogApiTest + CatalogSpecificationTest trên DB riêng shophub_catalog_api_test_a653fa5ab1 | **16 passed, 222 assertions** |
| php artisan migrate --no-interaction trên DB mới shophub_catalog_api_test_d1a4396a08 | Thành công; 12 migration của repo, gồm 3 migration mới |
| php artisan migrate:status trên DB này | Cả 3 migration thông số đã Ran |
| node scripts/catalog-api-review.mjs --specifications | Thành công, API HTTP thật trên DB d1a4396a08; không có JS runtime exception |
| npm run build trong frontend | Thành công, Vite 8.3.6 |
| npm run lint | Exit 0, còn warning cũ ConnectionPage.jsx:9 về set-state-in-effect |
| git diff --check | Không lỗi whitespace; có thông báo LF/CRLF theo cấu hình Git Windows |

Suite gồm 9 test hồi quy catalog và 7 test thông số:

- Khóa ghép không id, unique code, unique cặp product/spec, FK thật; quan hệ hai chiều và cast pivot; soft delete giữ giá trị, hard delete/cascade được kiểm tra trên fixture riêng.
- Thông số active đúng danh mục, thứ tự và tie-break id, không kế thừa cha, loại dữ liệu cố tình gán ngoài danh mục; giá trị rỗng bị loại nhưng `0` được giữ.
- Sản phẩm không có giá trị, cấu hình bị gỡ hoặc đổi danh mục trả []; sản phẩm draft vẫn 404. Không thêm điều kiện thông số required vào API công khai hiện có.
- Unit thêm đúng một lần, giữ text không unit và giá trị đã chứa unit.
- Seed hai lần không trùng/ghi đè; bảo toàn metadata/pivot, giá/tồn/status; từ chối thiếu fixture, sai danh mục, xóa mềm, xung đột unit và môi trường production; rollback toàn transaction.

Browser 1440px và 390px:

1. Mở cùng slug khi chưa có giá trị: tab trống hiển thị đúng trạng thái đang cập nhật.
2. Chạy seeder thông số trong DB kiểm thử, tải lại slug: so sánh chính xác từng hàng JSX với response API, đúng CPU → RAM 16 GB → lưu trữ 512 GB → màn hình 15.6 inch; không có GB GB. API SSD trả 1000 GB và bình đun 1800 W.
3. Mobile tab có 4 hàng đúng dữ liệu, không tràn ngang toàn trang. Đã tự mở cả ba ảnh để kiểm tra bảng và trạng thái trống.
4. Hồi quy duyệt danh mục/phân trang 8+2, tìm SKU, lọc giá/thương hiệu/tồn/khuyến mãi, Back, ảnh/thumbnail, đổi biến thể BLACK/SILVER đúng giá/tồn; ba thẻ danh mục, menu Tài khoản và carousel còn hoạt động.
5. Catalog rỗng, slug không công khai, backend ngắt kết nối và nút thử lại vẫn hoạt động; không fallback demo.

Ảnh/log: [docs/catalog-specifications-review/README.md](../catalog-specifications-review/README.md), [results.json](../catalog-specifications-review/results.json). API contract: [public-catalog.md](../api/public-catalog.md).

## Lệnh để chạy local

Sau khi review, bật MySQL/MariaDB local và xác minh backend/.env trỏ đúng database local cần giữ dữ liệu. Trong backend/:

```bash
php artisan migrate:status
php artisan migrate

# Chỉ cần nếu chưa có đủ bộ 12 public-demo-*:
php artisan db:seed --class=PublicCatalogDemoSeeder

php artisan db:seed --class=PublicCatalogSpecificationSeeder
```

Không cần reset database. Seeder thông số không tự tạo sản phẩm còn thiếu, không bật lại sản phẩm/thông số inactive, không chuyển draft sang active và không restore soft-deleted. Nếu có xung đột, đọc lỗi và đối chiếu dữ liệu; không dùng --force để vượt qua điều kiện môi trường hoặc xung đột unit/danh mục.

Chạy Laravel như hiện tại, frontend dùng VITE_CATALOG_SOURCE=api và đúng VITE_BACKEND_URL. Mở `/products/public-demo-laptop-1` → Thông số kỹ thuật; tương tự `/products/public-demo-ssd` và `/products/public-demo-kettle`. API trực tiếp: `/api/public/products/public-demo-laptop-1`, xem data.specifications. Nếu muốn giữ catalog chưa có thông số, chỉ migrate, không cần seed.

## Tái chạy kiểm thử riêng

Dùng hướng dẫn instance riêng trong [báo cáo API](shophub-public-catalog-api-report.md), rồi từ backend (PowerShell):

```powershell
$env:DB_HOST='127.0.0.1'
$env:DB_PORT='33307'
$env:DB_USERNAME='root'
$env:DB_PASSWORD=''
$env:DB_DATABASE='mysql'
php scripts/catalog-test-database.php
$env:CATALOG_TEST_DATABASE=(Get-Content storage/framework/testing/catalog-api-database.json -Raw | ConvertFrom-Json).database
php artisan test --compact --filter='PublicCatalogApiTest|CatalogSpecificationTest'
```

Sau đó từ frontend: `node scripts/catalog-api-review.mjs --specifications`. Test chuẩn bị 8 bảng catalog trong DB riêng; có thể chạy migrate đầy đủ trên một DB kiểm thử mới nếu muốn kiểm chứng migration tracking như lần đã thực hiện. Không migrate lại các bảng đã được dựng trực tiếp bởi test nếu database chưa có migration history; tạo database kiểm thử mới thay vì reset/xóa dữ liệu.

Suite tự fallback SQLite :memory: nếu không đặt CATALOG_TEST_DATABASE; đó không phải kiểm chứng trên MySQL/MariaDB. Kết quả 16/222 nêu trên là chạy MariaDB thật, không phải fallback. Browser tự đóng các process Laravel/Vite/Chrome do nó tạo. Instance MariaDB kiểm thử đã được dừng sau kiểm tra; datadir/log/build/profile nằm vùng ignored, không đưa vào commit.

## Giới hạn

- Chưa chạy migrate/seed trên database local của bạn; lệnh đã ghi ở trên để bạn chủ động thực hiện sau review. Không tự commit/push.
- Không có API ghi/Admin trong task này. FK riêng lẻ không cấm mọi dòng sai danh mục; seeder kiểm tra trước ghi và API loại khi đọc. Luồng Admin sau này cần kiểm tra cấu hình/required và xử lý giá trị không phù hợp khi đổi danh mục trong transaction; đồng thời chặn xóa thông số đang dùng trước thao tác xóa thật.
- Thông số vẫn là text phục vụ hiển thị; chưa có bộ lọc số học hay thông số theo từng biến thể. Ảnh SKU vẫn là placeholder của bộ demo.
- Không chạy rollback/reset hoặc toàn bộ PHPUnit; đã kiểm tra hai suite liên quan và migration thật trên database riêng.

Gợi ý commit: `feat(catalog): add category specifications and public product details`.

Bước tiếp theo đề xuất: xây luồng quản trị cấu hình/giá trị thông số với validation khi xuất bản hoặc đổi danh mục; chưa tự triển khai.
