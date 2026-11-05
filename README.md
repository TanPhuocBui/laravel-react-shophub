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

## Địa chỉ local

- Backend: http://localhost:8000
- Frontend: http://localhost:5173
- API kiểm tra: http://localhost:8000/api/health
