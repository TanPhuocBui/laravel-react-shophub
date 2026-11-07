# ShopHub

Dự án website thương mại điện tử sử dụng Laravel REST API và React.

## Công nghệ

- Backend: Laravel 12, Laravel Sanctum, Eloquent ORM
- Frontend: React, Vite, React Router DOM, Axios
- Database: MySQL

## Cấu trúc

- backend/: Laravel REST API
- frontend/: React application

## Trạng thái hiện tại

- Đã khởi tạo backend và frontend.
- Đã cấu hình database và chạy migration.
- Đã tạo API GET /api/health.
- Đã triển khai migration/model và seeder dữ liệu demo cho nhóm sản phẩm.
- Đã nối giao diện React với API catalog công khai: danh mục, thương hiệu, tìm kiếm/lọc/phân trang và chi tiết biến thể.
- Các chức năng bán hàng đang trong quá trình phát triển.

## Chạy backend

Trong thư mục backend:

1. Chạy composer install.
2. Sao chép .env.example thành .env và cấu hình MySQL.
3. Tạo database shophub.
4. Chạy php artisan key:generate.
5. Chạy php artisan migrate.
6. Chạy php artisan serve --host=localhost --port=8000.

## Dữ liệu demo sản phẩm

Sau khi chạy migration, trong thư mục `backend/` chạy riêng:

```bash
php artisan db:seed --class=ProductCatalogSeeder
```

Seeder chỉ cho phép môi trường `local` hoặc `testing`; các môi trường khác bị chặn kể cả khi có `--force`. Seeder này không được gọi mặc định từ `DatabaseSeeder`.

Dữ liệu gồm 3 danh mục, 3 thương hiệu (ASUS, Kingston, Philips), 3 sản phẩm, 4 biến thể và 6 bản ghi ảnh. Laptop có hai màu, trong đó màu bạc hết hàng; SSD và bình đun dùng biến thể mặc định. Mọi giá, tồn kho, cấu hình và bảo hành là giả lập cho đồ án. Sản phẩm mới ở trạng thái `draft`, chưa phải sản phẩm công khai.

Có thể chạy lại lệnh để bổ sung dữ liệu thiếu. Seeder nhận diện bằng slug, SKU và cặp `product_id + path`, giữ nguyên các bản ghi đã tồn tại, bao gồm giá, tồn, mô tả và trạng thái. Khi slug/SKU thuộc quan hệ khác dự kiến, tên thương hiệu đã thuộc slug khác hoặc sản phẩm đã xóa mềm, seeder báo xung đột và rollback toàn bộ thao tác ghi trong lần chạy đó. Kiểm tra dữ liệu hiện có rồi xử lý thủ công hoặc điều chỉnh fixture trong mã nguồn; seeder không tự gán lại quan hệ hay restore sản phẩm.

Hai SVG placeholder nằm ở `backend/public/images/demo/catalog-placeholder-front.svg` và `backend/public/images/demo/catalog-placeholder-detail.svg`. Database lưu đường dẫn tương đối `images/demo/...`; mỗi sản phẩm dùng hai ảnh với `sort_order` là `0`, `1`. Seeder kiểm tra file tồn tại trước transaction và không tạo/ghi đè file lúc chạy. Khi backend đang phục vụ ở cổng 8000, có thể mở `http://localhost:8000/images/demo/catalog-placeholder-front.svg` để kiểm tra ảnh.

Kiểm thử seeder bằng database SQLite trong bộ nhớ, độc lập với `shophub`:

```bash
php artisan test --compact --filter=ProductCatalogSeederTest
```

Cần extension PHP `pdo_sqlite` để chạy nhóm test này. Kết quả chạy thực tế trên MariaDB local và các giới hạn kiểm tra được ghi trong [báo cáo seeder sản phẩm](docs/report/shophub-product-catalog-seeding-report.md).

## Chạy frontend

Trong thư mục frontend:

1. Chạy npm ci.
2. Sao chép .env.example thành .env.
3. Chạy npm run dev -- --host localhost --port 5173 --strictPort.

## Giao diện catalog ShopHub

Frontend dùng giao diện chuyển từ **Bazaar** (uiCookies), thay lựa chọn template Phyo Htet Arkar trước đó. Header đỏ, banner và các dải sản phẩm được điều chỉnh theo bố cục ShopHub.

- `/`: trang chủ, carousel, ba banner danh mục, khuyến mãi và sản phẩm mới.
- `/products`: tìm kiếm, lọc danh mục/thương hiệu/khoảng giá/tồn hàng, sắp xếp và phân trang.
- `/products/:slug`: bộ hình minh họa, SKU, giá VND, biến thể, tồn hàng và thông số.
- `/connection`: giữ trang kiểm tra `/api/health` qua Axios hiện có.

**Catalog mặc định dùng API Laravel.** Chỉ hiển thị sản phẩm active, chưa xóa mềm, có danh mục/thương hiệu active và ít nhất một biến thể active. Các sản phẩm draft từ `ProductCatalogSeeder` tiếp tục bị ẩn. Chưa có giỏ hàng hoặc đặt hàng trong giao diện này.

Đặt `VITE_CATALOG_SOURCE=api` và `VITE_BACKEND_URL=http://localhost:8000` trong `frontend/.env`, rồi khởi động lại Vite/build lại. `.env.example` đã cấu hình API; nếu `.env` cũ của bạn còn `demo`, đổi sang `api` để xem database. Chỉ chọn rõ `VITE_CATALOG_SOURCE=demo` mới chạy fixture tại `frontend/src/data/demoCatalog.js`. Khi API lỗi, giao diện báo lỗi và cho thử lại, không tự chuyển demo.

API đọc: `/api/public/categories`, `/api/public/brands`, `/api/public/products`, `/api/public/products/{slug}`. Xem [contract API](docs/api/public-catalog.md) và [kết quả triển khai/kiểm thử](docs/report/shophub-public-catalog-api-report.md).

Để có dữ liệu active trên database local đã migrate, có thể chạy riêng trong `backend/`:

```bash
php artisan db:seed --class=PublicCatalogDemoSeeder
```

Seeder mới chỉ chạy local/testing, tạo tối đa 12 sản phẩm `public-demo-*` với ảnh placeholder; chạy lại giữ giá/tồn/trạng thái đã có, không chuyển sản phẩm draft cũ sang active, không được gọi mặc định bởi DatabaseSeeder. Chỉ chạy trên database local bạn chủ động chọn để demo; không cần chạy nếu đã có sản phẩm công khai. Môi trường chỉ có draft sẽ hiển thị catalog rỗng đúng quy tắc.

Thông số kỹ thuật dùng cấu hình danh mục và giá trị text riêng cho từng sản phẩm. Trong `backend/`, sau khi xác minh database local:

```bash
php artisan migrate
# Nếu chưa có đủ bộ public-demo-*:
php artisan db:seed --class=PublicCatalogDemoSeeder
php artisan db:seed --class=PublicCatalogSpecificationSeeder
```

Seeder thông số chỉ chạy local/testing, tạo dữ liệu demo phù hợp ba nhóm hàng, kiểm tra danh mục và giữ giá trị đã chỉnh khi chạy lại. API chi tiết trả `{name, value}`, đơn vị đã được ghép một lần ở backend; tab Thông số hiện dữ liệu hoặc trạng thái đang cập nhật nếu chưa có giá trị hợp lệ. Xem [báo cáo thông số](docs/report/shophub-catalog-specifications-report.md) và [ảnh kiểm tra API thật](docs/catalog-specifications-review/README.md).

Kiểm tra bản build trong `frontend/`:

```bash
npm run build
npm run preview -- --host localhost --port 4173 --strictPort
```

Mở `http://localhost:4173`, hoặc xem chi tiết file thay đổi, kết quả kiểm tra và checklist local tại [báo cáo tích hợp Bazaar](docs/report/shophub-catalog-bazaar-integration-report.md).

Giao diện đã được dựng lại sát khung Bazaar: hero hai cột và ưu đãi phụ, typography gốc phục vụ local, gallery lớn, tabs chi tiết và footer nhiều tầng. CSS template được giới hạn dưới `.storefront`. Xem [báo cáo chỉnh giao diện](docs/report/shophub-catalog-bazaar-restyling-report.md) và [ảnh Bazaar / trước / sau](docs/catalog-bazaar-review/README.md). Ảnh đúng SKU vẫn còn thiếu; nguồn API dùng đúng URL ảnh được trả về hoặc placeholder. Xem thêm [ảnh API thật ở desktop/mobile, catalog rỗng và backend offline](docs/catalog-api-review/README.md).

## Địa chỉ local

- Backend: http://localhost:8000
- Frontend: http://localhost:5173
- API kiểm tra: http://localhost:8000/api/health
