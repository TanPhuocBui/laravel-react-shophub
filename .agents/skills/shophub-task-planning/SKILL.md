---
name: shophub-task-planning
description: Lập hoặc tiếp tục kế hoạch triển khai ShopHub trên Laravel, React và MariaDB/MySQL. Dùng để xác định người thực hiện, hiện trạng, kiến trúc, phụ thuộc, phạm vi file và tiêu chí nghiệm thu trước khi sửa một tính năng.
---

# Lập kế hoạch ShopHub

Dùng cho task có phạm vi triển khai cụ thể. Đọc [hướng dẫn repo](../../../AGENTS.md), [kiến trúc nghiệp vụ ShopHub](../../../docs/design/SHOPHUB_BUSINESS_ARCHITECTURE.md) và UC tương ứng trong [danh mục use case](../../../docs/design/shophub-usecase-system.md). Với task liên quan đến dữ liệu, đọc thêm [ERD](../../../docs/design/shophub-erd.md).

## Xác định hiện trạng

1. Ghi nhận nhánh Git, HEAD và diff hiện có. Dùng working tree hiện tại làm mốc đối chiếu khi có thay đổi đã được chấp nhận và còn chưa commit.
2. Truy từ điểm vào của người dùng qua route đã đăng ký, middleware, validation, quyền, controller, service, persistence và Resource. Kiểm tra phía gọi API và bộ test liên quan. Đọc schema, migration và seeder nếu task chạm tới dữ liệu.
3. Xác định phần đã chạy, phần dùng contract cũ, bản xem trước và phần phụ thuộc UC khác. Xác minh route và hành vi có thể quan sát trước khi coi chức năng là sẵn sàng.
4. Xác định tác nhân nghiệp vụ, quyền sở hữu dữ liệu, người phụ trách nếu đã được chỉ định, phạm vi file được giao và các phụ thuộc dùng chung. Nêu contract phụ thuộc và người phụ trách nếu đã biết.
5. Chia từng UC thành phần có thể nghiệm thu riêng. Dùng khoảng 30–90 phút để ước lượng một phần triển khai phù hợp khi có đủ căn cứ. Khi phạm vi gồm tính năng người dùng hoàn chỉnh, lập kế hoạch cho cả backend, frontend và kiểm tra điểm vào thật. Giữ task riêng ở phạm vi được giao, ví dụ API đọc giỏ của UC15.

## Áp dụng kiến trúc ShopHub

- Backend đi theo route và middleware → Form Request khi có input cần validate → controller → service và Eloquent → API Resource. Form Request và Gate/Policy kiểm tra quyền ở biên HTTP. Controller điều phối và trả status phù hợp. Service giữ bất biến nghiệp vụ và phạm vi transaction.
- Tái sử dụng model, quan hệ, scope và service hiện có. Tách lớp khi có trách nhiệm riêng rõ ràng. Kiểm tra các consumer của endpoint hiện có trước khi thay đổi URL, status hoặc cấu trúc JSON.
- Lập kế hoạch kiểm tra input thô trước khi ép kiểu nếu kiểu dữ liệu hoặc thứ tự lỗi có ý nghĩa. Lấy tác nhân từ phiên đã xác thực. Với thao tác ghi, nêu nguồn quyết định giá, tồn, trạng thái, thứ tự khóa và cách xử lý khi gửi lại hoặc ghi cạnh tranh.
- Frontend đi theo page/component → domain service → Axios chung. Nêu shape dữ liệu mà UI cần, cách ánh xạ lỗi, xử lý request cũ, session/CSRF và đối chiếu khi mất phản hồi sau thao tác ghi. Nếu ưu tiên UI, tách bản xem trước bằng dữ liệu mẫu khỏi bước tích hợp và nghiệm thu API thật.
- Liệt kê contract và quyết định nghiệp vụ còn mở, như cách tính tạm tính hoặc điều kiện chuyển trạng thái. Chốt các điểm ảnh hưởng thực chất trước khi triển khai phần phụ thuộc. Tiếp tục các phần độc lập đã có đủ căn cứ.

## Mini Plan trên chat

Trình bày đủ bảy phần và giữ độ chi tiết tương xứng với task.

1. **Mục tiêu, hiện trạng và khoảng trống.** Nêu UC, tác nhân, điểm vào và kết quả cần đạt.
2. **Cách làm và ranh giới backend/frontend.** Nêu trách nhiệm, mã tái sử dụng và nơi xử lý từng quyết định.
3. **Schema, nghiệp vụ và contract API.** Nêu dữ liệu, request/response, quyền, lỗi, hợp đồng hiện có và các quyết định còn mở.
4. **Kế hoạch kiểm chứng.** Nêu cách kiểm tra luồng thành công, lỗi, quyền sở hữu và các tình huống runtime như rollback, cạnh tranh hoặc thao tác trình duyệt khi liên quan.
5. **Bảng file dự kiến.** Ghi đường dẫn từng file, hành động tạo/sửa/xóa và lý do. Đánh dấu file còn phụ thuộc quyết định hoặc kết quả rà soát.
6. **Tiêu chí nghiệm thu.** Gán mã như `AC-01`, `AC-02`. Gắn mỗi tiêu chí với hành vi quan sát được, bằng chứng dự kiến và trạng thái ban đầu.
7. **Thứ tự triển khai, phụ thuộc, rủi ro và ước lượng.** Nếu chia nhiều task, nêu đầu vào, các bước và đầu ra kiểm chứng được của từng task.

Bàn giao Mini Plan khi người dùng chỉ yêu cầu lập kế hoạch hoặc phần tiếp theo cần phê duyệt. Khi đã được giao triển khai, tiếp tục phạm vi đã giao sau Mini Plan. Khi tiếp tục kế hoạch đã chốt, xác minh hiện trạng và bắt đầu từ mốc cuối đã kiểm chứng. Ghi quyết định và bằng chứng vào tài liệu hoặc checklist liên quan nếu có trong phạm vi. Cập nhật plan khi có thông tin làm thay đổi nghiệp vụ, contract hoặc tiêu chí nghiệm thu.
