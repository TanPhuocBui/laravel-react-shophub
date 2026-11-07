# ShopHub — API catalog công khai và kết nối React

Ngày 07/11/2026, nhánh `dev`. Chưa commit/push.

## Phạm vi hoàn thành

Đã đọc AGENTS.md, README, thiết kế database và các báo cáo catalog/seeding/Bazaar/header trong `docs/report/`; kiểm tra Git, routes, migrations, models, seeder, Axios, catalogService và useCatalog trước khi sửa. Trước task chưa có endpoint catalog, React dùng fixture demo. Không có nhóm bảng/model thông số. Composer lock xác nhận Laravel 12.71.0; frontend dùng React 19, Vite 8, Router 7 và Axios hiện có; không thêm/nâng dependency.

Triển khai 4 endpoint đọc: categories có product_count, brands, products có bộ lọc/sắp xếp/phân trang, chi tiết theo slug. Service dùng chung điều kiện công khai và tập danh mục con active cho danh sách/count. Giá card/lọc/sort là giá thấp nhất biến thể active, kể cả hết hàng. Resource chỉ trả field công khai, ảnh theo thứ tự, biến thể active; draft/inactive/soft-deleted/không đủ điều kiện trả 404. Query được validate, giới hạn page size tối đa 48; tìm kiếm wildcard literal và tham số hóa SQL.

React gọi Axios chung qua adapter catalogService. Trang chủ lấy metadata và các truy vấn giới hạn 4/5 sản phẩm cho từng dải; tổng lấy từ meta.total. Danh sách dùng server pagination/filter/sort, giữ query string và Back. Chi tiết dùng slug API, ảnh API, chọn biến thể đúng SKU/giá/tồn; giữ gallery, tabs và liên quan. Hook hủy request cũ, có loading/error/retry/404. Không thay CSS hoặc cấu trúc Bazaar, dải danh mục và tiện ích header. Source mặc định API; demo chỉ hoạt động khi chọn rõ `VITE_CATALOG_SOURCE=demo`, không fallback khi API lỗi.

Không thêm migration, không sửa model hay ProductCatalogSeeder cũ, không tự publish sản phẩm draft. Thêm PublicCatalogDemoSeeder riêng, chỉ local/testing, tạo 12 sản phẩm active mới thuộc namespace `public-demo-*`; giữ giá, tồn, trạng thái và quan hệ đã có khi chạy lại, từ chối xung đột/soft-deleted. Không thêm vào DatabaseSeeder.

## File tạo/sửa

| Nhóm | File |
|---|---|
| Route/controller/request | `backend/routes/api.php`; `backend/app/Http/Controllers/Api/PublicCatalogController.php`; `backend/app/Http/Requests/PublicProductIndexRequest.php` |
| Truy vấn công khai | `backend/app/Services/PublicCatalogService.php` |
| Resource/ảnh | `backend/app/Http/Resources/PublicCategoryResource.php`, `PublicBrandResource.php`, `PublicProductResource.php`; `backend/app/Support/CatalogImageUrl.php` |
| Cấu hình CORS | `backend/config/cors.php`; `backend/.env.example` |
| Fixture và kiểm thử | `backend/database/seeders/PublicCatalogDemoSeeder.php`; `backend/tests/Feature/PublicCatalogApiTest.php` |
| Công cụ database kiểm thử riêng | `backend/scripts/start-catalog-test-db.ps1`; `catalog-test-database.php`; `catalog-browser-fixtures.php` |
| Adapter, hook, Axios | `frontend/src/services/catalogService.js`; `frontend/src/hooks/useCatalog.js`; `frontend/src/api/axios.js`; `frontend/src/utils/catalog.js`; `frontend/.env.example` |
| Trang catalog | `frontend/src/pages/public/HomePage.jsx`; `ProductsPage.jsx`; `ProductDetailPage.jsx` |
| Thành phần/khung | `frontend/src/components/ProductMedia.jsx`; `FlashDeals.jsx`; `StorefrontFooter.jsx`; `frontend/src/layouts/PublicLayout.jsx` |
| Kiểm tra trình duyệt | `frontend/scripts/catalog-api-review.mjs` |
| Tài liệu/bằng chứng | `README.md`; `docs/api/public-catalog.md`; báo cáo này; `docs/catalog-api-review/README.md`, `results.json` và 7 ảnh PNG |

Git lúc bắt đầu đã có 6 báo cáo bị xóa ở `docs/` và thư mục `docs/report/` chưa track do người dùng chuyển tài liệu. Giữ nguyên việc chuyển này, không khôi phục/ghi đè tài liệu cũ. README cập nhật các link báo cáo tương ứng. Không sửa `.env` cá nhân, lockfile, router React hoặc tính năng auth/cart.

## Contract

Chi tiết field, envelope, query, quy tắc danh mục, giá và lỗi: [docs/api/public-catalog.md](../api/public-catalog.md).

| Endpoint | Kết quả |
|---|---|
| `GET /api/public/categories` | `{data:[{id,parent_id,name,slug,image_url,product_count}]}` |
| `GET /api/public/brands` | `{data:[{id,name,slug,logo_url}]}` |
| `GET /api/public/products` | `{data:[product],links,meta}`, mặc định 8/trang |
| `GET /api/public/products/{slug}` | `{data:product}` hoặc 404 |

Query: `q`, `category`, `brand`, `min_price`, `max_price`, `in_stock=1`, `promotion=1`, `sort=newest|price_asc|price_desc|name`, `page`, `per_page`. Validation sai trả 422 chuẩn Laravel. Danh mục cha gồm hậu duệ qua nhánh active; product_count khớp truy vấn chỉ lọc danh mục. Biến thể còn hàng/giảm giá có thể khác biến thể rẻ nhất; không đổi quy tắc giá vì bộ lọc. `specifications=[]` do chưa có schema; UI hiển thị trạng thái đang cập nhật.

## Kiểm tra thực tế

MySQL/MariaDB local cổng 3306 ban đầu không chạy. Không khởi động lại hoặc ghi database `shophub`. Dùng binary MariaDB của XAMPP để tạo **instance riêng**: datadir GUID trong `backend/storage/framework/testing/` (ignored), bind loopback cổng 33307, không cài Windows service. Server trả `10.11.16-MariaDB`, PDO driver mysql, collation database `utf8mb4_unicode_ci`.

Database kiểm thử tên `shophub_catalog_api_test_c4a6d6848b`, tạo mới hoàn toàn. Test xác minh tên database, loopback và SELECT DATABASE() trước DDL; chỉ dựng 5 bảng catalog bằng migration hiện có. Mỗi test dùng transaction/rollback; không dùng RefreshDatabase/reset/truncate trên shophub. Browser seed vào chính database kiểm thử, không lấy dữ liệu production hoặc dùng fixture React.

| Kiểm tra | Kết quả thực chạy |
|---|---|
| `php artisan route:list --path=api` | 4 route public mới; health và scaffold user giữ nguyên, tổng 6 route API |
| `php -l` các PHP tạo/sửa | Không lỗi cú pháp |
| `php artisan test --compact --filter=PublicCatalogApiTest` với DB kiểm thử MariaDB riêng | **9 passed, 124 assertions** |
| `npm run build` trong frontend | Thành công, Vite 8.3.6 |
| `npm run lint` | Exit 0; còn 1 warning đã có tại ConnectionPage.jsx:9 (`react/set-state-in-effect`), không sửa ngoài phạm vi |
| `node scripts/catalog-api-review.mjs` | Đạt các bước trong results.json; không có JS runtime exception |
| `git diff --check` | Không lỗi whitespace; Git có thông báo chuyển LF/CRLF theo cấu hình Windows |

Test API bao gồm: loại draft/inactive/soft-deleted, category/brand inactive, không có active variant; SKU inactive không lộ; slug 404; count cha/con và nhánh inactive; giá rẻ nhất ở biến thể hết hàng; min/max/stock/promotion/sort; tìm SKU và ký tự `%`, từ khóa `0`; phân trang không trùng; ảnh/field công khai/spec rỗng; 422/empty; tìm không dấu theo collation MariaDB; seeder cũ vẫn draft; seeder mới chạy lại giữ giá/tồn/trạng thái và chặn production, rollback khi SKU xung đột.

Trình duyệt thật qua Laravel HTTP + Axios/CORS, viewport 1440px và 390px:

- Home có 12 sản phẩm công khai; ba count danh mục **10 / 1 / 1**, khớp meta.total của filter tương ứng; request từng dải có per_page=4/5, không nạp JS demoCatalog.
- **Trang chủ → Tất cả Laptop → danh sách 8 + 2 sản phẩm → chi tiết public-demo-laptop-1 → đổi Đen/Bạc**. Đen: SKU BLACK, 18.100.000 VND, tồn 10. Bạc: SKU SILVER, 18.400.000 VND, hết hàng. Thumbnail, tab thông số trống và ảnh từ backend tải được.
- Lọc ASUS + giá 18.100.000 trả đúng 1 card; tìm SKU SILVER trả đúng sản phẩm; còn hàng + khuyến mãi + giá tăng trả 9 Laptop. Back khôi phục query danh mục và trang 8 card.
- Cả ba thẻ danh mục mở đúng danh sách trên mobile; menu Tài khoản còn đúng 3 mục và Escape đóng được. Carousel phản hồi trước/sau. Home/detail không tràn ngang toàn trang.
- Chuyển riêng 12 fixture active thành draft trong **database kiểm thử**, home/list hiển thị rỗng, chi tiết trả 404; sau đó phục hồi riêng fixture. Dừng process Laravel do script tạo: có lỗi tiếng Việt + Thử lại, không có card demo. Khởi động lại Laravel và bấm Thử lại tải lại dữ liệu. Ép lỗi URL ảnh: hiển thị placeholder.

Đã tự mở ảnh home/detail desktop và mobile, ảnh offline để đối chiếu. Bố cục Bazaar, header đỏ và rail được giữ; sản phẩm không có thông số không bị chèn spec demo. Hai danh mục chỉ có một sản phẩm nên dải đó có khoảng trống đúng dữ liệu, không nhân bản card để lấp đầy.

Ảnh và log: [docs/catalog-api-review/README.md](../catalog-api-review/README.md), [results.json](../catalog-api-review/results.json).

## Chạy local để review

1. Chạy database local của bạn, xác minh backend/.env trỏ đúng database đã migrate. Không cần reset/migrate lại schema trong task này.
2. Chạy Laravel trong backend: `php artisan serve --host=localhost --port=8000`.
3. Trong frontend/.env đặt `VITE_BACKEND_URL=http://localhost:8000`, `VITE_CATALOG_SOURCE=api`. File .env cá nhân không được task tự thay đổi; nếu còn `demo` từ đợt trước phải đổi rõ sang `api`.
4. `npm run dev -- --host localhost --port 5173 --strictPort`. Nếu xem build: `npm run build`, rồi `npm run preview -- --host localhost --port 4173 --strictPort`. CORS mặc định cho cả hai origin; thay CORS_ALLOWED_ORIGINS khi dùng cổng khác.
5. Nếu local chỉ có draft, API trả rỗng là đúng. Khi chủ động muốn bổ sung fixture active để demo: `php artisan db:seed --class=PublicCatalogDemoSeeder` trong backend, môi trường local/testing. Lệnh tạo fixture mới public-demo-*; không publish các draft cũ. Chạy lại không reset giá/tồn/status đã có. Ảnh/giá/tồn/bảo hành của fixture này là giả lập.

Kiểm tra API nhanh: mở `http://localhost:8000/api/public/products?category=laptop&sort=price_asc&per_page=8`. Khi chưa có bảng thông số, trang chi tiết vẫn hoạt động và báo đang cập nhật.

## Tái chạy kiểm thử cách ly trên Windows/XAMPP

Các helper bên dưới dùng đường dẫn binary XAMPP của workspace (`D:/xampp`); đổi đường dẫn nếu máy khác. Instance riêng, không cần MySQL local đang chạy. Thực hiện từ backend trong PowerShell mới:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-catalog-test-db.ps1
$env:DB_HOST='127.0.0.1'
$env:DB_PORT='33307'
$env:DB_USERNAME='root'
$env:DB_PASSWORD=''
$env:DB_DATABASE='mysql'
php scripts/catalog-test-database.php
$env:CATALOG_TEST_DATABASE=(Get-Content storage/framework/testing/catalog-api-database.json -Raw | ConvertFrom-Json).database
php artisan test --compact --filter=PublicCatalogApiTest
```

Sau đó, từ frontend: `node scripts/catalog-api-review.mjs`. Script đọc metadata test database/server, kiểm tra prefix, seed 3 draft + 12 active vào DB riêng; build API với origin Laravel cổng động trong node_modules/.cache; tự chạy/đóng Laravel, Vite và Chrome headless, phục hồi fixture khi kết thúc kể cả assertion thất bại. Không dùng backend/.env làm nơi ghi cấu hình QA. Nếu chạy lại PHPUnit sau browser (database đã có fixture), hãy tạo **database kiểm thử mới** bằng catalog-test-database.php rồi cập nhật CATALOG_TEST_DATABASE; không xóa database cũ để làm sạch. Nếu không đặt CATALOG_TEST_DATABASE, suite dùng SQLite :memory: an toàn và bỏ qua bài kiểm tra collation MariaDB; không coi lần chạy đó là kiểm chứng MySQL/MariaDB.

Khi xong, dừng đúng instance kiểm thử cổng 33307 đã tạo:

```powershell
& 'D:/xampp/mysql/bin/mysqladmin.exe' --no-defaults --protocol=tcp --host=127.0.0.1 --port=33307 --user=root shutdown
```

Datadir, manifest, log và profile Chrome/build tạm nằm trong vùng ignored; không đưa vào commit. Task đã dừng instance MariaDB kiểm thử sau kiểm tra. Không chạy migrate:fresh, rollback hoặc seed trên database shophub.

## Giới hạn và bước tiếp theo

- Đã kiểm tra bằng API thật và MariaDB thật với fixture trên database riêng; chưa chạy trên database shophub đang dùng vì server 3306 chưa chạy. Người dùng cần bật database local để review nguồn dữ liệu của mình.
- Toàn bộ 12 sản phẩm demo công khai mới (13 SKU) dùng 2 SVG placeholder; chưa có ảnh SKU thật. API không dùng ảnh tham khảo laptop của fixture React để giả làm ảnh SKU. Banner giữ ảnh/nguồn/giấy phép đã ghi ở đợt giao diện.
- Chưa có schema thông số, chưa có Admin publish catalog. Không thêm module này trong task hiện tại.
- Auth, tra cứu đơn, yêu thích và giỏ hàng vẫn báo đang phát triển như trước; không thêm route giả/badge giả.
- Chưa chạy toàn bộ PHPUnit; đã chạy suite nghiệp vụ catalog riêng trên MariaDB. Warning lint ConnectionPage đã có vẫn còn.

Gợi ý commit: `feat(catalog): expose public API and connect React storefront`.

Bước tiếp theo đề xuất: bổ sung module thông số theo thiết kế database, rồi mở rộng resource/adapter; chưa tự triển khai.
