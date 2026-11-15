# API quản trị sản phẩm và SKU — T03 (UC07–UC08)

Toàn bộ `/api/admin/products*` dùng Sanctum SPA session/cookie và Gate `access-admin` của T02. Guest 401; customer/admin khóa 403. Mutation cần CSRF; React dùng Axios chung, không bearer token.

| Method | Route | Kết quả |
|---|---|---|
| GET | `/api/admin/products` | Resource collection có data/links/meta, mặc định 10/trang |
| GET | `/api/admin/products/options` | `{data:{categories:[id,name,parent_id,is_active],brands:[id,name,is_active]}}` |
| GET | `/api/admin/products/{id}` | Dữ liệu sản phẩm, ảnh, toàn bộ SKU để mở form |
| POST | `/api/admin/products` | Tạo nháp, 201 |
| PUT/PATCH | `/api/admin/products/{id}` | Cập nhật đầy đủ bản nháp, 200 |

Query: `q` ≤200 ký tự (tên/slug/SKU, `%` và `_` literal), `status=draft|active|inactive`, `category_id`, `brand_id`, `page=1..1000000`, `per_page=1..50`. Bỏ query để không lọc. Sắp id giảm dần; không đọc sản phẩm đã soft-delete.

Danh sách có category/brand, variants_count, images_count, min_sale_price (giá thấp nhất của **tất cả** SKU, gồm ngừng dùng). Đây là chỉ số quản trị, không thay card_price của API public.

## Payload và multipart

Field sản phẩm: `name` (255), `slug` (255, unique kể cả bản ghi đã soft-delete), `category_id`, `brand_id`, `short_description` (nullable, 5000), `description` (nullable, 50000, text), `warranty_months` (nguyên 0..65535).

`variants`: danh sách 1..50 dòng:

```json
{"id":123,"sku":"SH-LAPTOP-BLACK","name":"Đen","options":{"color":"Đen"},"list_price":20000000,"sale_price":18000000,"stock_quantity":5,"is_active":true}
```

- Bỏ id khi tạo dòng mới. ID có sẵn phải thuộc chính sản phẩm đang sửa; id không được lặp.
- Mã SKU tối đa 100, unique toàn hệ thống kể cả SKU ngừng dùng. Payload trùng mã bị từ chối; khi sửa giữ mã của đúng ID vẫn hợp lệ. DB unique index là lớp bảo vệ cuối khi có cạnh tranh; vi phạm được chuyển thành 422 ở `variants.N.sku`.
- Giá là VND nguyên trong **1..999999999999**, sale_price ≤ list_price. Giới hạn này tương thích khoảng giá public và nhỏ hơn giới hạn số nguyên an toàn JavaScript; không dùng float để xử lý tiền.
- stock_quantity nguyên **0..4294967295**. options nullable hoặc map tối đa 10 giá trị text (150 ký tự), dùng cho lựa chọn như màu; không thay cấu hình phần cứng sản phẩm.
- SKU đã lưu không được bỏ khỏi payload/xóa cứng. Gửi đầy đủ ID cũ, đặt `is_active=false` nếu ngừng dùng. ID và product_id được giữ; không nhận product_id tùy ý từ client.

`images`: danh sách 1..10 dòng, mỗi dòng gồm id (chỉ ảnh cũ), file (bắt buộc với ảnh mới), alt_text nullable ≤255, sort_order nguyên 0..4294967295. ID ảnh phải thuộc sản phẩm này. Bỏ ảnh cũ khỏi danh sách để gỡ metadata; gửi file cùng ID để thay ảnh và giữ ID.

React gửi `multipart/form-data`, ví dụ `images[0][file]`, `images[0][alt_text]`, `variants[0][sku]`, `variants[0][sale_price]`... Cập nhật gửi **POST kèm `_method=PUT`** để PHP parse file chính xác. Không tự đặt Content-Type/boundary. Update JSON không có file cũng dùng được khi mọi ảnh là ID hiện có.

Backend chuẩn hóa thứ tự key số do multipart file/input bags có thể trộn theo thứ tự khác, nhưng vẫn yêu cầu chỉ số liên tục và kiểm tra từng dòng.

## Trạng thái, transaction và dữ liệu lịch sử

- Backend luôn gán `draft` khi tạo. Không nhận status/is_featured/specifications từ biểu mẫu T03.
- Chỉ sửa sản phẩm draft; active/inactive đọc được nhưng cập nhật trả **409**. Không có endpoint công bố/ẩn/xóa sản phẩm ở T03.
- Khóa product, SKU theo id và ảnh trong transaction; kiểm tra lại invariant, lưu product + metadata ảnh + SKU, trả response sau khi commit. Lỗi rollback toàn bộ.
- Giữ nguyên SKU cũ thay vì delete/recreate. Nếu draft đã có giá trị thông số, đổi danh mục bị chặn để tránh tự làm sai cấu hình trước T04.
- 422 chuẩn Laravel: `message`, `errors`, key như `variants.1.sale_price`, `images.0.file`. Frontend hiển thị đúng dòng, giữ dữ liệu nhập và file đã chọn để sửa/gửi lại.

## Lưu và đọc ảnh

- Ảnh gắn **product_id**, không gắn SKU vì schema hiện tại không có variant_id.
- Chấp nhận JPG/JPEG, PNG, WebP thật; tối đa 5 MB và 6000×6000 pixel/ảnh. Không nhận SVG, đường dẫn hoặc tên file tùy ý từ client.
- Public disk lưu `catalog/products/{UUID}.{extension theo MIME}`; mặc định vật lý dưới `backend/storage/app/public/`. DB lưu `media/catalog/{UUID}.{ext}` tương thích `CatalogImageUrl` và API public sẵn có.
- `GET /media/catalog/{filename}` trả nội dung ảnh với `nosniff`; filename bị giới hạn mẫu UUID/đuôi ảnh, không cần storage symlink trên Windows. URL ảnh là public theo public disk, không phải endpoint công bố sản phẩm; UUID không đoán theo tên gốc.
- Nếu transaction thất bại, xóa mọi file **mới** đã ghi trong lần lưu. Khi gỡ/thay ảnh thành công, tệp **cũ** được giữ để không phá URL lịch sử hoặc ảnh seed dùng chung; T03 chỉ gỡ metadata, chưa có tác vụ dọn file cũ.
- Ảnh hiển thị theo sort_order rồi id; ảnh đầu đại diện. React hỗ trợ thêm, thay, mô tả, đưa lên/xuống và bỏ ảnh.
- Biến môi trường tùy chọn `CATALOG_MEDIA_ROOT` đổi root public disk để browser QA lưu file vào vùng testing riêng, không chạm upload thật. Mặc định không đổi.

Khi dùng PHP server local, đặt `upload_max_filesize=5M`, `post_max_size=60M` hoặc lớn hơn để nhận đủ 10 ảnh; nếu PHP giới hạn thấp hơn thì giới hạn máy chủ áp dụng trước validation Laravel. Harness QA đặt riêng hai giá trị bằng CLI, không sửa php.ini cá nhân.

UI: `/admin/products`, `/admin/products/create`, `/admin/products/:id/edit` (draft), `/admin/products/:id` (chỉ xem). Xem [báo cáo T03](../report/RP-T03-admin-products.md).
