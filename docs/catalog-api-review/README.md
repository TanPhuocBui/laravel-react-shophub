# Ảnh kiểm tra catalog với API thật

Ngày 07/11/2026. Chrome headless, Laravel HTTP thật, MariaDB 10.11.16 chạy instance riêng ở loopback; database kiểm thử có prefix `shophub_catalog_api_test_`. Không dùng database `shophub` và không dùng fixture React trong ảnh này.

- [Trang chủ 1440px](home-api-1440.png): count danh mục 10/1/1; các dải sản phẩm giới hạn bằng truy vấn server.
- [Danh sách Laptop, trang 2, 1440px](products-api-1440.png): 2 kết quả trong tổng 10, per_page=8.
- [Chi tiết, biến thể Bạc, 1440px](detail-variant-api-1440.png): SKU SILVER, 18.400.000 VND, hết hàng; thumbnail thứ hai và tab thông số trống.
- [Trang chủ 390px](home-api-390.png).
- [Chi tiết 390px](detail-api-390.png).
- [Catalog rỗng 390px](empty-api-390.png).
- [Backend ngắt kết nối 390px](offline-api-390.png): lỗi + nút thử lại, không có sản phẩm demo.

Ảnh full-page; các ảnh sản phẩm là placeholder SVG của seeder, không phải ảnh SKU thật. Mã fixture có chữ demo để phân biệt dữ liệu thử dù nguồn giao diện là API. Các banner nhận diện ShopHub/Bazaar được giữ từ giao diện hiện có.

[results.json](results.json) ghi các bước đã đạt, không có JS runtime exception, cùng request API thực tế (đã bỏ origin cổng động). Script tái chạy: `node scripts/catalog-api-review.mjs` trong `frontend/`, sau khi tạo database/schema kiểm thử riêng theo [báo cáo](../report/shophub-public-catalog-api-report.md). Script dùng build tạm trong node_modules/.cache, không thay `.env`, tự đóng các process Laravel/Vite/Chrome do nó tạo; MariaDB test server được dừng riêng sau kiểm tra.
