# API catalog công khai ShopHub

Contract triển khai ngày 07/11/2026. Origin local: `http://localhost:8000`.
Gửi `Accept: application/json`. Các endpoint này không cần đăng nhập, chỉ đọc dữ liệu.

## Điều kiện công khai và danh mục

Một sản phẩm xuất hiện khi đồng thời thỏa:

- `products.status = active`, chưa xóa mềm.
- Danh mục trực tiếp và thương hiệu đều `is_active = true`.
- Có ít nhất một biến thể `is_active = true`.

Biến thể hết hàng vẫn được hiển thị. Biến thể inactive bị loại khỏi mọi response, tính giá, tìm SKU và bộ lọc tồn/khuyến mãi. Sản phẩm draft/inactive/đã xóa mềm trả 404 khi truy cập slug, giống slug không tồn tại.

Lọc danh mục bao gồm chính danh mục đó và hậu duệ qua các nhánh **đều active**. Không đi xuyên một danh mục inactive. Điều kiện công khai toàn catalog kiểm tra danh mục trực tiếp; một danh mục active dưới cha inactive vẫn có thể được truy cập riêng. Không tự thay đổi trạng thái tổ tiên hoặc dữ liệu lỗi. `product_count` áp dụng đúng tập ID danh mục và điều kiện sản phẩm như truy vấn danh sách chỉ lọc danh mục. Đếm sản phẩm, không đếm SKU hay tồn kho. Không cộng các count cha/con để tính tổng catalog vì có thể trùng sản phẩm.

## Endpoint

| Method / URL | Response thành công |
|---|---|
| `GET /api/public/categories` | `{ "data": [category, ...] }`, tất cả danh mục active, kể cả count 0; thứ tự sort_order rồi id |
| `GET /api/public/brands` | `{ "data": [brand, ...] }`, tất cả thương hiệu active, kể cả chưa có sản phẩm công khai; thứ tự name rồi id |
| `GET /api/public/products` | `{ "data": [product, ...], "links": {...}, "meta": {...} }` theo pagination Resource Laravel |
| `GET /api/public/products/{slug}` | `{ "data": product }`, hoặc HTTP 404 |

Query của danh sách giữ tên tham số React đang dùng:

| Query | Ý nghĩa / giới hạn |
|---|---|
| `q` | Chuỗi tối đa 200 ký tự; tìm chứa trong tên sản phẩm, tên thương hiệu hoặc SKU active; trim; `%`, `_` được tìm như ký tự thường |
| `category` | Slug danh mục, tối đa 180 ký tự; gồm hậu duệ active như trên |
| `brand` | Slug thương hiệu, tối đa 180 ký tự |
| `min_price`, `max_price` | VND nguyên, 0…999999999999, bao gồm hai đầu; max ≥ min nếu có cả hai |
| `in_stock` | `1`: có ít nhất một biến thể active stock_quantity > 0; `0` hoặc bỏ qua: không giới hạn tồn |
| `promotion` | `1`: có ít nhất một biến thể active sale_price < list_price; `0` hoặc bỏ qua: không giới hạn khuyến mãi |
| `sort` | `newest` (mặc định), `price_asc`, `price_desc`, `name` |
| `page` | Số nguyên 1…1000000, mặc định 1 |
| `per_page` | Số nguyên 1…48, mặc định 8 |

Các điều kiện kết hợp bằng AND. Slug danh mục/thương hiệu không tồn tại cho danh sách rỗng HTTP 200. Trang vượt last_page cho data rỗng, vẫn trả tổng thật; không tự đổi query. Query không hợp lệ trả HTTP 422 với `message`, `errors` chuẩn Laravel.

`card_price` là **sale_price thấp nhất của các biến thể active**, kể cả hết hàng. Lọc khoảng giá và sắp xếp giá dùng đúng biểu thức này ở database. Bộ lọc còn hàng và khuyến mãi độc lập: một biến thể khác có thể thỏa tồn/giảm giá; không thay giá card bằng giá của biến thể đó. Vì vậy sản phẩm lọc `promotion=1` có thể có biến thể rẻ nhất không giảm. Trang chi tiết hiển thị giá/tồn/SKU của biến thể đang chọn, không dùng card_price thay cho giá lựa chọn.

Sắp xếp có khóa id để ổn định khi trùng giá/tên/thời điểm. `newest` dùng created_at giảm dần rồi id giảm dần; các sort khác dùng id tăng dần khi bằng nhau. Tìm kiếm tuân collation database; đã kiểm tra tìm `chuot` khớp `Chuột` với MariaDB `utf8mb4_unicode_ci`.

## Field công khai

```text
category:
  id, parent_id, name, slug, image_url (URL|null), product_count (integer)

brand:
  id, name, slug, logo_url (URL|null)

product (cả danh sách và chi tiết):
  id, slug, name, short_description, description, warranty_months,
  created_at (ISO 8601), card_price (integer VND),
  category: { id, name, slug }, brand: brand,
  images: [{ id, url (URL|null), alt, sort_order }],
  variants: [{ id, sku, name, options (object|null),
               list_price, sale_price, stock_quantity }],
  specifications: [{ name, value }] (chi tiết); [] (danh sách)

meta (danh sách):
  current_page, last_page, per_page, total, from, to, ...Laravel
links:
  first, last, prev, next
```

Giá/tồn trả số nguyên. Không trả status, deleted_at hoặc cờ nội bộ. Ảnh sắp theo sort_order rồi id; biến thể active sắp id. Đường dẫn ảnh tương đối được đổi thành URL tuyệt đối theo origin request Laravel; URL http/https tuyệt đối được giữ. Đường dẫn sai scheme, traversal hoặc không an toàn trả null. React hiển thị placeholder rõ ràng nếu không có ảnh hoặc ảnh tải lỗi; không tự gán ảnh tham khảo theo slug cho sản phẩm API. Các ảnh seed hiện tại là SVG placeholder.

Trang chi tiết trả `specifications` theo cấu hình **danh mục trực tiếp** trong `category_specification`; không tự kế thừa danh mục cha. Chỉ lấy specifications active có giá trị cho sản phẩm, loại giá trị trống/whitespace và giá trị ngoài cấu hình danh mục, kể cả dữ liệu cũ sai hoặc sau khi đổi danh mục. Sắp theo `category_specification.sort_order`, rồi specification id để ổn định khi trùng thứ tự. `is_required` là cấu hình dành cho luồng xuất bản sau này; API đọc không ẩn sản phẩm chỉ vì thiếu thông số.

Giữ contract `{name, value}`. Backend ghép `unit` vào giá trị hiển thị; frontend không ghép lại. Ví dụ database lưu `value="16"`, `unit="GB"`, API trả `{ "name": "RAM", "value": "16 GB" }`. Giá trị đã chỉnh có hậu tố đơn vị (như `32 GB` hoặc `32GB`) được giữ, không thành `32 GB GB`. Unit null không thêm hậu tố; giá trị `0` vẫn được hiển thị. Giá trị trong database vẫn là text, không đổi thành bộ lọc số học.

Nếu chưa có thông số hợp lệ, chi tiết trả `specifications: []`, giao diện hiển thị “Thông số kỹ thuật đang được cập nhật.” Danh sách giữ field `specifications: []` như contract trước, không thực hiện thêm truy vấn thông số cho các card. Các field catalog khác và quy tắc công khai/giá không đổi.

Schema thông số được bổ sung bằng ba migration `2026_11_07_170000`–`170002`; cần chạy `php artisan migrate` trước khi dùng API chi tiết mới. Dữ liệu mẫu riêng cho public-demo-* được tạo bởi `PublicCatalogSpecificationSeeder` (local/testing), lưu giá trị không kèm đơn vị và không ghi đè giá trị đã sửa. Xem [báo cáo thông số và lệnh local](../report/shophub-catalog-specifications-report.md).

Ví dụ:

```text
/api/public/products?category=laptop&brand=asus&min_price=10000000&max_price=20000000&in_stock=1&promotion=1&sort=price_asc&page=1&per_page=8
```

## React và môi trường

Trong `frontend/.env`:

```dotenv
VITE_BACKEND_URL=http://localhost:8000
VITE_CATALOG_SOURCE=api
```

Khởi động lại Vite hoặc build lại khi đổi biến. Không đặt source cũng mặc định API; chỉ `VITE_CATALOG_SOURCE=demo` mới dùng fixture React cũ. Source không hợp lệ báo lỗi cấu hình. API lỗi báo lỗi + nút thử lại, không fallback demo.

`catalogService` dùng Axios chung, adapter resource sang shape UI; `useCatalog` quản lý tải, hủy request khi đổi query/route và thử lại. Metadata dùng categories/brands; homepage gọi riêng promotion per_page=4, newest per_page=5 (meta.total là tổng catalog), mỗi dải danh mục per_page=5. Danh sách lọc/sắp xếp/phân trang ở server; URLSearchParams và Back giữ hành vi cũ. Chi tiết gọi slug và tối đa 6 sản phẩm cùng danh mục để loại chính nó, hiển thị tối đa 5 liên quan.

Backend `CORS_ALLOWED_ORIGINS` mặc định `http://localhost:5173,http://localhost:4173`; thêm origin cụ thể nếu đổi cổng. `VITE_BACKEND_URL` là origin, không thêm `/api`. Axios giữ cấu hình credentials hiện có; API catalog không triển khai thêm xác thực, giỏ hàng hay đặt hàng.

Hướng dẫn fixture local, kiểm thử database riêng và kết quả: [báo cáo triển khai](../report/shophub-public-catalog-api-report.md).
