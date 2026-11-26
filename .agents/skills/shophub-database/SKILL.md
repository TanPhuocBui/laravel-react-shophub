---
name: shophub-database
description: Thiết kế hoặc kiểm tra schema ShopHub, migration Laravel, Eloquent, seeder và giao dịch MariaDB/MySQL. Dùng khi thay đổi cấu trúc, ràng buộc dữ liệu hoặc kiểm tra cạnh tranh.
---

# Database ShopHub

Đọc [ERD và từ điển dữ liệu](../../../docs/design/shophub-erd.md), migration và model tương ứng. Phân biệt schema dự kiến, migration trong repo và schema đã áp dụng. Kiểm tra phiên bản server thực tế, vì driver mysql dùng được với cả MariaDB và MySQL.

## Schema và dữ liệu

- Đối chiếu kiểu, giới hạn, nullable/default, casts và dữ liệu cũ. Kiểm tra khóa duy nhất, FK và delete action theo các truy vấn/cập nhật thực tế. Giữ dữ liệu lịch sử, tiền VND dạng số nguyên và snapshot đơn.
- Tạo migration bổ sung nếu migration cũ đã áp dụng. Xem thứ tự phụ thuộc, cách chuyển dữ liệu cũ và phạm vi tác động nếu lỗi giữa chừng. Với seeder, dùng khóa ổn định và bảo toàn dữ liệu đã sửa.
- Với workflow có khóa, xác định bản ghi nào được bảo vệ trên cùng connection và lúc nào đọc lại dữ liệu. Kiểm tra quy ước khóa của các service cùng ghi trước khi thêm đường cập nhật.

## Môi trường kiểm tra

- Xác minh connection hiệu lực, database và instance do ứng dụng thật sự sử dụng trước thao tác ghi. Dùng database kiểm thử tách biệt đã xác minh cho RefreshDatabase và kiểm thử thay đổi dữ liệu. Giữ dữ liệu local đang làm việc và tránh đưa cấu hình nhạy cảm ra output.
- Với cạnh tranh, dùng những connection độc lập trên engine cần kiểm tra và xác nhận có tranh chấp thật. Ghi bằng chứng SQLite, MariaDB/MySQL, kiểm tra metadata và SQL pretend theo từng loại.
- Với seeder, kiểm tra chạy lại, xung đột và bảo toàn giá/tồn/trạng thái. Nếu có file asset, tính riêng vòng đời file với transaction database.
