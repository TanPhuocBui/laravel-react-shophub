---
name: shophub-react
description: Thiết kế, triển khai hoặc kiểm tra giao diện React/Vite ShopHub. Dùng cho route, layout, form, trạng thái giao diện, bản xem trước và tích hợp API Laravel.
---

# React ShopHub

Đọc hướng dẫn frontend trong [AGENTS.md](../../../AGENTS.md), [kiến trúc nghiệp vụ](../../../docs/design/SHOPHUB_BUSINESS_ARCHITECTURE.md) và contract trong [docs/api](../../../docs/api). Xác định route, layout, CSS và domain service hiện có trước khi thêm trang.

## Thiết kế và tích hợp

- Tái sử dụng layout ShopHub, component và style phù hợp. Thiết kế desktop/mobile và các trạng thái giỏ hoặc form trước khi chốt giao diện. Dùng tiếng Việt, định dạng VND bằng Intl.NumberFormat.
- Page/component giữ tương tác và trạng thái hiển thị. Domain service gọi Axios chung tại frontend/src/api/axios.js. Tái sử dụng session, CSRF và luồng đăng nhập đang dùng, kiểm tra các consumer nếu sửa phần dùng chung.
- Đối chiếu payload/response thật, phân biệt danh sách rỗng với phản hồi sai định dạng. Khi tài khoản, bộ lọc hoặc tài nguyên đổi, hủy request hoặc bỏ kết quả đã cũ nếu có nguy cơ cập nhật sai màn hình.
- Ngăn gửi ghi trùng. Với timeout hoặc mất phản hồi sau khi đã gửi, dùng luồng đọc lại và đối chiếu theo contract trước khi cho gửi lại. Quyền, giá và tồn cuối cùng do Laravel xác định.
- Bản xem trước dùng fixture riêng, có nhãn dữ liệu mẫu và entry point phát triển khi thích hợp. Kiểm chứng tích hợp bằng session và API thật. Giữ tải/rỗng/lỗi/thành công và lỗi từng trường theo thao tác.

Kiểm tra nhãn, thứ tự focus, bàn phím, overflow và các luồng thật trên kích thước liên quan. Chạy script build, lint hoặc kiểm thử có sẵn phù hợp. Ghi riêng bằng chứng bản mẫu, build và trình duyệt nối API.
