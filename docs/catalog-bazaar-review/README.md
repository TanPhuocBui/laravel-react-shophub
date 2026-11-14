# Kiểm tra tab thông số qua API thật

Ngày 07/11/2026. Chrome headless, viewport 1440px/390px, Laravel HTTP + MariaDB 10.11.16 trên database kiểm thử riêng `shophub_catalog_api_test_d1a4396a08`. Frontend chạy source API, không dùng fixture React.

- [Chi tiết trước seed thông số, 1440px](detail-variant-api-1440.png): sản phẩm vẫn hiển thị và tab báo đang cập nhật.
- [Chi tiết sau seed thông số, 1440px](detail-specifications-api-1440.png): CPU → RAM 16 GB → Dung lượng lưu trữ 512 GB → Màn hình 15.6 inch.
- [Tab thông số 390px](detail-api-390.png): cùng dữ liệu API, không tràn ngang toàn trang.
- [Kết quả và request thực tế](results.json): có kiểm tra thêm SSD 1000 GB, gia dụng 1800 W, gallery/biến thể và các luồng catalog trước đó; không có JS runtime exception.

Giá, cấu hình và ảnh placeholder là dữ liệu demo, không phải thông tin cấu hình của SKU thương mại. Script `frontend/scripts/catalog-api-review.mjs --specifications` seed thông số sau khi đã kiểm tra tab trống, rồi mở lại cùng slug để đối chiếu bảng JSX với response API. Chế độ này lưu ảnh riêng, giữ ảnh đợt API trước.

Tái chạy sau khi chuẩn bị database kiểm thử riêng: xem [báo cáo thông số](../report/shophub-catalog-specifications-report.md).
