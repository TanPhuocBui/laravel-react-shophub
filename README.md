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

Cần extension PHP `pdo_sqlite` để chạy nhóm test này. Kết quả chạy thực tế trên MariaDB local và các giới hạn kiểm tra được ghi trong [báo cáo seeder sản phẩm](docs/shophub-product-catalog-seeding-report.md).

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

**Catalog hiện là demo UI, chưa nối database.** Backend chưa có API catalog. Fixture riêng nằm ở `frontend/src/data/demoCatalog.js`, không lấy các sản phẩm `draft` từ seeder và không sửa dữ liệu backend. Giá, tồn, thông số và hình minh họa không phải thông tin chào bán thật. Chưa có giỏ hàng hoặc đặt hàng trong giao diện này.

`VITE_CATALOG_SOURCE=demo` trong `frontend/.env.example` chọn nguồn demo; khi chưa đặt biến này, nguồn mặc định cũng là demo để có thể xem giao diện ngay. Giá trị khác sẽ hiển thị trạng thái chưa có dữ liệu, không gọi endpoint catalog giả hoặc tự chuyển sang demo khi API lỗi. Khi có API, cập nhật `frontend/src/services/catalogService.js` để dùng Axios chung và thay phần lọc/phân trang demo theo contract đã thống nhất.

Kiểm tra bản build trong `frontend/`:

```bash
npm run build
npm run preview -- --host localhost --port 4173 --strictPort
```

Mở `http://localhost:4173`, hoặc xem chi tiết file thay đổi, kết quả kiểm tra và checklist local tại [báo cáo tích hợp Bazaar](docs/shophub-catalog-bazaar-integration-report.md).

Giao diện đã được dựng lại sát khung Bazaar: hero hai cột và ưu đãi phụ, typography gốc phục vụ local, gallery lớn, tabs chi tiết và footer nhiều tầng. CSS template được giới hạn dưới `.storefront`. Xem [báo cáo chỉnh giao diện](docs/shophub-catalog-bazaar-restyling-report.md) và [ảnh Bazaar / trước / sau](docs/catalog-bazaar-review/README.md). Ảnh đúng SKU vẫn còn thiếu; giao diện phân biệt ảnh tham khảo dòng máy và placeholder.

## Địa chỉ local

- Backend: http://localhost:8000
- Frontend: http://localhost:5173
- API kiểm tra: http://localhost:8000/api/health
