# API thông số và công bố sản phẩm — T04 (UC09–UC11)

Mọi endpoint bên dưới dùng prefix `/api/admin`, middleware Sanctum session/cookie và Gate `access-admin` của T00/T02. Guest 401; customer và admin bị khóa 403. Mutation cần CSRF. Lỗi validation trả 422 với `message/errors` chuẩn Laravel.

| Method | Đường dẫn | Hành vi |
|---|---|---|
| GET | `/specifications` | `{data:[{id,name,code,unit,is_active}]}` |
| POST | `/specifications` | Tạo định nghĩa, 201 |
| PUT | `/specifications/{id}` | Sửa định nghĩa, 200 |
| GET | `/categories/{id}/specifications` | Cấu hình danh mục trực tiếp |
| PUT | `/categories/{id}/specifications` | Thay toàn bộ cấu hình trong transaction |
| GET | `/products/{id}/specifications` | Trường áp dụng, giá trị đã lưu, trạng thái và điều kiện công bố |
| PUT | `/products/{id}/specifications` | Lưu giá trị, không đổi trạng thái |
| POST | `/products/{id}/publish` | Công bố nháp/công bố lại; kiểm tra điều kiện, 200 |
| POST | `/products/{id}/hide` | Active → inactive, không xóa dữ liệu, 200 |
| PUT | `/products/{id}/content` | Sửa nội dung active, dùng JSON hoặc multipart POST + `_method=PUT` |

## Thông số văn bản

Thiết kế/schema v1 chỉ có text, chưa có kiểu số, enum hay tập lựa chọn. Không thêm cột kiểu dữ liệu giả hoặc suy diễn đơn vị thành validation số. Backend nhận chuỗi hoặc null/chuỗi rỗng để xóa giá trị tùy chọn; số JSON, boolean, object, array bị từ chối. ID thông số phải nằm trong cấu hình đang hoạt động của đúng danh mục sản phẩm, không kế thừa danh mục cha.

Định nghĩa: `name` bắt buộc ≤100, `code` unique ≤100 khớp `[a-z][a-z0-9_-]*`, `unit` nullable ≤30, `is_active` boolean. Khi đã có giá trị, không đổi code/unit; vẫn được sửa tên. Không ngừng hoạt động thông số còn cấu hình hoặc giá trị.

Cấu hình: `{"items":[{"specification_id":1,"is_required":true,"sort_order":0}]}`. Tối đa 100 dòng, ID không lặp, phải tồn tại và active; sort_order nguyên 0..4294967295. `items:[]` gỡ cấu hình nếu chưa có giá trị. Không gỡ thông số đã được nhập trên sản phẩm thuộc danh mục, kể cả dữ liệu lịch sử/soft-delete. Không thêm điều kiện bắt buộc nếu sản phẩm active trong danh mục còn thiếu giá trị. Yêu cầu lỗi giữ nguyên toàn bộ cấu hình/giá trị. Có thể gắn tùy chọn, nhập đủ giá trị rồi đặt bắt buộc.

Giá trị: `{"values":[{"specification_id":1,"value":"16"}]}`; tối đa 100 dòng, value text ≤5000 ký tự, trim trước khi lưu. Bỏ một ID khỏi payload giữ giá trị cũ; gửi rỗng/null xóa giá trị của ID đó. Nháp/inactive có thể chưa nhập đủ; active không được xóa giá trị bắt buộc. Lỗi bất kỳ dòng nào rollback toàn bộ. Trường khác danh mục/inactive không được nhập; giá trị cũ ngoài cấu hình được giữ, không công khai.

GET sản phẩm trả `{data:{category_id,fields:[{id,name,code,unit,is_active,is_required,sort_order,value}],status,publication:{can_publish,issues:[]}}}`. Lý do công bố dựa trên dữ liệu **đã lưu**. Trang public dùng logic có sẵn: chỉ thông số active, thuộc danh mục trực tiếp, giá trị không rỗng; sort_order rồi id; đơn vị được thêm một lần, ví dụ `16` → `16 GB`, `16GB` giữ nguyên.

## Trạng thái và sửa nội dung công khai

Publish kiểm tra danh mục và thương hiệu active, ít nhất một ảnh, ít nhất một SKU active hợp lệ (mã/tên không rỗng, giá VND nguyên theo giới hạn T03, 0 < sale_price ≤ list_price ≤999999999999, tồn không âm), và đầy đủ thông số active bắt buộc. SKU tồn 0 vẫn đủ điều kiện công bố. Không tự kích hoạt danh mục/thương hiệu/SKU. Lỗi trả `errors.publication` chứa từng điều kiện chưa đạt.

Chuyển `draft → active`, `inactive → active`; gọi publish khi active vẫn kiểm tra điều kiện rồi giữ active. Hide `active → inactive`; hide inactive giữ inactive; hide draft trả 409. Không hard delete ảnh/SKU/giá trị. Public list loại inactive/draft, public detail trả 404; không cần sửa contract T01.

Content chỉ nhận `name`, `short_description`, `description`, `images` và `_method` kỹ thuật. **Từ chối mọi field khác kể cả khi null**, gồm slug/category_id/brand_id/variants/status/warranty_months/prices/stock/specifications. Chỉ active; trạng thái khác 409. Giá trị thông số dùng endpoint riêng ở trên. Đổi tên không đổi slug. Endpoint sửa nháp T03 vẫn giữ guard draft, không được dùng để sửa active/inactive.

Ảnh dùng cùng validation, thứ tự, sở hữu ID và hàm ghi ảnh T03: JPG/PNG/WebP ≤5 MB, ≤6000×6000, 1..10 ảnh, UUID theo MIME. Transaction lỗi rollback metadata/tên/mô tả và xóa tệp mới; tệp cũ giữ nguyên theo chính sách T03. Không nhận path từ client.

Các mutation T04 và lưu nháp khóa danh mục theo id trước, sau đó khóa bản ghi sản phẩm khi cần; publication khóa thêm thương hiệu/SKU. Quy ước khóa danh mục đồng bộ với T02 nhằm tránh cấu hình thay đổi xen giữa kiểm tra và ghi dữ liệu trong phạm vi catalog nhỏ của đồ án. Không đổi schema/migration/seeder hoặc API public.

## Phản hồi và lỗi kết nối — PERF-01

Frontend dùng schema có sẵn trong response lưu giá trị. HTTP 200 công bố/ẩn xác nhận trạng thái đã commit theo action, cập nhật giao diện tại chỗ và thông báo thành công; không tải lại toàn bộ form/options/schema. Cấu hình preview trong form có thể được tải lại khi vùng form được khởi tạo lại.

Không tự retry mutation. Nếu request ghi đã bắt đầu nhưng mất phản hồi/timeout hoặc nhận 5xx, chưa thể kết luận đã rollback: hiển thị trạng thái chưa xác định, khóa gửi lặp trong vùng thông số/công bố, đóng dialog ẩn và cung cấp **Kiểm tra kết quả đã lưu**. Nút này chỉ GET schema/trạng thái mới, cập nhật form từ dữ liệu thực tế để admin đối chiếu; không phát lại request ghi. Nếu kiểm tra kết quả tiếp tục lỗi, giữ dữ liệu nhập và trạng thái chặn ghi. Lỗi 401/403/419/422 vẫn báo đúng ngữ cảnh; lỗi validation giữ dữ liệu nhập và focus tới field phù hợp.

Request CSRF bootstrap lỗi trước khi gửi mutation được phân biệt với lỗi sau khi request ghi bắt đầu. GET không mang header CSRF, nhưng vẫn gửi cookie và chịu cùng middleware; request ghi vẫn cần CSRF.
