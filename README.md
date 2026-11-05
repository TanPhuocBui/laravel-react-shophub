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
- Các chức năng bán hàng đang trong quá trình phát triển.

## Chạy backend

Trong thư mục backend:

1. Chạy composer install.
2. Sao chép .env.example thành .env và cấu hình MySQL.
3. Tạo database shophub.
4. Chạy php artisan key:generate.
5. Chạy php artisan migrate.
6. Chạy php artisan serve --host=localhost --port=8000.

## Chạy frontend

Trong thư mục frontend:

1. Chạy npm ci.
2. Sao chép .env.example thành .env.
3. Chạy npm run dev -- --host localhost --port 5173 --strictPort.

## Địa chỉ local

- Backend: http://localhost:8000
- Frontend: http://localhost:5173
- API kiểm tra: http://localhost:8000/api/health