---
name: shophub-laravel
description: Triển khai hoặc review Laravel API và service của ShopHub. Dùng cho route, Form Request, authorization, Eloquent, transaction và API Resource.
---

# Laravel ShopHub

Đọc [kiến trúc nghiệp vụ](../../../docs/design/SHOPHUB_BUSINESS_ARCHITECTURE.md) và API contract tương ứng trong [docs/api](../../../docs/api). Truy vết route đang đăng ký đến frontend hoặc client gọi nó trước khi đổi hợp đồng.

## Biên HTTP và nghiệp vụ

- Dùng middleware cho Sanctum session/cookie, vai trò và tài khoản active. Xác định owner từ phiên được xác thực và truy vấn đúng phạm vi trước khi trả hoặc ghi dữ liệu. Giữ quy ước status và thứ tự lỗi đã được client dùng.
- Form Request kiểm tra payload và gọi authorization phù hợp trước controller. Kiểm tra kiểu và giới hạn dữ liệu thô khi ép kiểu có thể che lỗi. Controller điều phối service và Resource.
- Service đảm bảo bất biến cả khi được gọi ngoài HTTP. Dùng Eloquent, quan hệ và scopes hiện có. Tách thêm lớp khi có trách nhiệm riêng hoặc nhu cầu tái sử dụng rõ.
- Resource chọn field công khai, định dạng và giữ shape JSON. Với endpoint có người dùng hiện tại, kiểm tra cách client xử lý nullable, envelope, pagination và status trước khi đổi.

## Luồng ghi có cạnh tranh

- Xác định transaction và thứ tự khóa từ tất cả luồng cùng ghi. Đọc lại điều kiện có thể thay đổi khi chờ khóa. Ví dụ với giỏ, đọc [contract UC14](../../../docs/api/customer-cart.md) và CartService trước khi thêm thao tác cập nhật, xóa hoặc checkout.
- Giá, tồn, owner và trạng thái do backend quyết định. Dùng số nguyên VND và kiểm tra giới hạn khi nhân/cộng. Dữ liệu lịch sử đơn lấy từ snapshot theo đặc tả.
- Đặt công việc ngoài database sau commit nếu nghiệp vụ cần. Chỉ bắt ngoại lệ khi cần phân loại, trả lỗi nghiệp vụ hoặc phục hồi có chủ đích.

Xác minh auth, role, ownership, validation và response tại URL thật. Với mutation có rủi ro cạnh tranh, kiểm tra rollback và retry theo quy ước của luồng. Nếu thay đổi có schema hoặc cần kiểm tra khóa trên MariaDB/MySQL, đọc skill database của repo.
