# API Admin catalog — T02 (UC05–UC06)

Mọi endpoint dùng Sanctum SPA session/cookie hiện có, `auth:sanctum` và Gate `access-admin` (admin đang hoạt động). Gửi `Accept: application/json`; mutation gửi CSRF token theo Axios dùng chung sau `/sanctum/csrf-cookie`. Guest nhận 401, customer hoặc admin bị khóa nhận 403.

| Method | URL | Kết quả |
|---|---|---|
| GET | `/api/admin/categories` | Danh sách phân trang, gồm cả bản ghi ẩn |
| GET | `/api/admin/categories/options` | Tất cả lựa chọn cha: id, name, slug, parent_id, sort_order, is_active |
| GET | `/api/admin/categories/{id}` | Chi tiết để sửa |
| POST | `/api/admin/categories` | Tạo, HTTP 201 |
| PUT/PATCH | `/api/admin/categories/{id}` | Cập nhật đầy đủ các field bắt buộc, HTTP 200 |
| PATCH | `/api/admin/categories/{id}/hide` | Đổi is_active=false, HTTP 200 |
| GET/POST | `/api/admin/brands` | Danh sách phân trang / tạo thương hiệu |
| GET/PUT/PATCH | `/api/admin/brands/{id}` | Đọc / cập nhật đầy đủ thương hiệu |
| PATCH | `/api/admin/brands/{id}/hide` | Đổi is_active=false, HTTP 200 |

Không có endpoint DELETE. Ẩn lặp vẫn thành công; không xóa sản phẩm, danh mục con, cấu hình thông số hoặc liên kết hiện có. Chọn `is_active=true` khi sửa để mở lại.

Query danh sách: `q` tối đa 150 ký tự (tên hoặc slug, ký tự `%` và `_` được tìm literal), `status=all|active|inactive`, `page=1..1000000`, `per_page=1..50` (mặc định 10). Danh mục theo sort_order rồi id; thương hiệu theo name rồi id. Slug không dấu, lowercase, nối bằng gạch ngang; không tự đổi slug khi sửa tên.

Payload category:

```json
{"name":"Linh kiện","slug":"linh-kien","parent_id":null,"sort_order":0,"is_active":true}
```

Payload brand:

```json
{"name":"Tên thương hiệu","slug":"ten-thuong-hieu","is_active":true}
```

Tên tối đa 150 ký tự; slug tối đa 180 và unique trong từng bảng; tên thương hiệu unique; sort_order nguyên 0..4294967295. parent_id null cho danh mục gốc hoặc ID có thật. Cha có thể đang ẩn; trạng thái của con vẫn độc lập theo T01. Backend chặn tự làm cha, mọi hậu duệ và chuỗi cha đã có vòng lặp. Service kiểm tra lại invariant trong transaction; các mutation danh mục khóa cùng tập bản ghi theo id để tuần tự hóa việc thay đổi cây. Yêu cầu không hợp lệ rollback toàn bộ, trả 422 với `message` và `errors` Laravel.

Response bản ghi: `{ "data": { "id", "name", "slug", "is_active", ... } }`. Category thêm parent_id, sort_order. Danh sách thêm products_count (quan hệ sản phẩm chưa soft-delete), `links`/`meta` chuẩn Resource Laravel. Endpoint options không phân trang để lựa chọn cha không thiếu dữ liệu. Bản ghi không tồn tại trả 404.

Tác động public giữ nguyên [contract T01](public-catalog.md): sản phẩm trực tiếp thuộc danh mục ẩn hoặc thương hiệu ẩn bị loại khỏi danh sách và chi tiết trả 404. Ẩn cha không tự ẩn con; truy vấn nhánh cha ẩn không trả sản phẩm hậu duệ, nhưng danh mục con active vẫn có thể được truy cập riêng. Không đổi trạng thái sản phẩm hoặc SKU khi ẩn/mở lại danh mục/thương hiệu.

UI: `/admin/categories`, `/admin/categories/create`, `/admin/categories/:id/edit` và tương tự với `brands`. Không thêm API quản lý sản phẩm, ảnh upload, SKU, giá hoặc tồn ở T02. Các đường dẫn ảnh/logo đã có được giữ nguyên khi cập nhật.
