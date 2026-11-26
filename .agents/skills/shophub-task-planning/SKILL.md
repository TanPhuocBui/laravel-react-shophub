---
name: shophub-task-planning
description: Lập hoặc rà soát Mini Plan và kiến trúc cho thay đổi nghiệp vụ ShopHub. Dùng khi chia task theo use case, chốt contract hoặc tiếp tục công việc Laravel và React theo từng phần có thể nghiệm thu.
---

# Lập kế hoạch ShopHub

Đọc [hướng dẫn repo](../../../AGENTS.md), [kiến trúc nghiệp vụ](../../../docs/design/SHOPHUB_BUSINESS_ARCHITECTURE.md) và phần liên quan trong [danh mục use case](../../../docs/design/shophub-usecase-system.md). Với thay đổi dữ liệu, đọc [ERD](../../../docs/design/shophub-erd.md) và migration liên quan. Ưu tiên bằng chứng trên nhánh đang làm khi xác định hiện trạng.

## Trước khi sửa

- Ghi nhận nhánh, trạng thái Git và diff có sẵn. Khi tiếp tục một task, kiểm lại điểm đã bàn giao và bằng chứng đã có.
- Truy vết entry point theo chiều người dùng thao tác. Đọc route, middleware, Form Request, controller, service, model, Resource, nơi frontend gọi API và kiểm thử liên quan theo phạm vi task.
- Xác định tác nhân, quyền sở hữu, dữ liệu đầu vào, bất biến và kết quả. Với nghiệp vụ ghi dữ liệu, chỉ rõ bên quyết định giá/tồn/trạng thái, phạm vi transaction, thứ tự khóa và kết quả khi gửi lại hoặc ghi cạnh tranh.
- Tách điều repo đã hỗ trợ, điều thiết kế đã chốt và quyết định còn mở. Nếu có quyết định nghiệp vụ quan trọng chưa đủ căn cứ, tiếp tục phần độc lập và hỏi riêng phần bị ảnh hưởng.

## Mini Plan trên chat

1. **Mục tiêu và hiện trạng.** Nêu UC, tác nhân, đường vào, phần đã có và khoảng trống.
2. **Ranh giới kiến trúc.** Nêu trách nhiệm từng tầng và nơi tái sử dụng code. Backend theo middleware và Form Request, controller, service, Eloquent, Resource. Frontend theo page, domain service, Axios chung.
3. **Dữ liệu và contract.** Nêu request/response, quyền, lỗi và quy tắc nghiệp vụ liên quan. Đánh dấu endpoint đề xuất và quyết định còn mở.
4. **Phạm vi file.** Liệt kê file hoặc nhóm file dự kiến tạo/sửa và lý do. Ghi rõ phần phụ thuộc đang nằm ở UC khác.
5. **Chia task và thứ tự.** Mỗi task có đầu vào, mini plan thao tác, đầu ra và cách kiểm chứng. Dùng mốc bàn giao có thể xem hoặc kiểm tra riêng.
6. **Tiêu chí nghiệm thu.** Gắn mỗi tiêu chí với hành vi quan sát được và cách kiểm tra dự kiến. Dùng mã AC khi có nhiều tiêu chí cần theo dõi.

Nếu ưu tiên thiết kế UI, xác định trước các trạng thái hiển thị và giả định contract, rồi tách bản xem trước khỏi bước tích hợp. Ví dụ với giỏ hàng, ghi rõ cách biểu diễn SKU hết hàng, cách tính tạm tính và cách cập nhật số lượng khi dữ liệu đã đổi ở tab khác. Dữ liệu mẫu chỉ chứng minh bố cục và hành vi bản xem trước.

Khi người dùng chỉ yêu cầu kế hoạch, bàn giao Mini Plan. Khi đã giao triển khai, chia sẻ Mini Plan ngắn và thực hiện phần đã được giao. Điều chỉnh kế hoạch khi mã nguồn cho thấy giả định ảnh hưởng đến nghiệp vụ hoặc cách kiểm chứng.
