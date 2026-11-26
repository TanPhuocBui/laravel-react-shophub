# Giỏ khách hàng — UC14 (T01–T04)

Prefix `/api/customer/cart`. Sanctum SPA session/cookie, middleware tài khoản
active và Gate `manage-cart` dành cho customer. Mutation cần CSRF theo cấu hình
Sanctum hiện có. Không nhận token bearer cho luồng SPA này.

API chỉ triển khai thêm SKU và đọc tổng hợp để đối chiếu kết quả. Danh sách giỏ,
đổi/xóa dòng và checkout thuộc UC15, UC16, UC18. Schema/model đã có từ UC14-T01.

## Endpoint và payload

| Method | URL | Thành công |
|---|---|---|
| POST | `/api/customer/cart/items` | 201 tạo dòng SKU mới; 200 cộng số lượng vào dòng đã có |
| GET | `/api/customer/cart/summary` | 200, đọc tổng hợp của chính customer |

POST nhận đúng hai field dưới đây. Cả hai phải là **JSON integer**, không nhận
chuỗi số, boolean, số thập phân hoặc null. ID trong khoảng 1..PHP_INT_MAX;
quantity trong khoảng 1..4294967295. Trường ngoài contract bị từ chối với 422,
kể cả `user_id`, `cart_id`, giá/tổng tiền hoặc field có giá trị null.

```json
{
  "product_variant_id": 123,
  "quantity": 2
}
```

quantity là số lượng **cần thêm**, không phải số lượng thay thế. Đang có 3,
gửi thêm 2 thì lưu 5. Một giỏ/user, một dòng/SKU; chủ giỏ lấy từ session.

Response POST:

```json
{
  "data": {
    "item": { "id": 10, "product_variant_id": 123, "quantity": 5 },
    "summary": { "item_count": 1, "total_quantity": 5 }
  }
}
```

`item_count` đếm số dòng SKU, `total_quantity` cộng số lượng mọi dòng. Chỉ trả
field cần thiết; không trả cart_id, owner hoặc dữ liệu tài khoản. Response dùng
Resource và một lớp `data`, không có snapshot giá trong giỏ.

GET hỗ trợ duy nhất query tùy chọn `product_variant_id` là số nguyên dương trong
giới hạn ID, ví dụ `/api/customer/cart/summary?product_variant_id=123`. ID trong
query được truyền dạng chuỗi số HTTP. Gửi rỗng/sai định dạng hoặc thêm query
ngoài contract trả 422.

```json
{
  "data": {
    "item_count": 1,
    "total_quantity": 5,
    "selected_item": { "id": 10, "product_variant_id": 123, "quantity": 5 }
  }
}
```

Không hỏi SKU hoặc không có dòng tương ứng thì `selected_item=null`. ID không
tồn tại trong catalog cũng trả null khi không có dòng trong giỏ, không dùng
endpoint này để kiểm tra catalog. Giỏ chưa tồn tại trả tổng bằng 0 và không tạo
giỏ. Summary phản ánh dữ liệu đã lưu, gồm cả dòng có sản phẩm sau đó bị ẩn;
không xác nhận còn hàng/đủ điều kiện mua và không tính tiền checkout.

## Quy tắc bán và lỗi

- Sản phẩm phải active, chưa xóa mềm; danh mục trực tiếp và thương hiệu active;
  SKU active. Quy tắc đồng nhất với catalog public hiện tại.
- Backend đọc lại giá và tồn; giá thỏa `0 < sale_price <= list_price` và giới
  hạn giá catalog hiện có. Thêm giỏ không giữ giá, giữ tồn hoặc trừ tồn.
- Tổng số lượng SKU sau cộng không vượt tồn tại thời điểm thêm. Vượt tồn thì
  từ chối toàn bộ lần thêm, giữ nguyên số lượng cũ.
- Kiểm tra giới hạn integer trước khi cộng; tổng hợp vượt giới hạn integer
  hệ thống cũng bị từ chối. Không dùng float cho số lượng.

| HTTP | Tình huống |
|---|---|
| 401 | Chưa đăng nhập |
| 403 | Role không phải customer hoặc tài khoản bị khóa; kể cả phiên đã có |
| 404 | POST với SKU không tồn tại/không được bán, thông báo chung không lộ draft |
| 409 | Thiếu tồn, vượt giới hạn số lượng hoặc giá SKU chưa hợp lệ |
| 419 | CSRF thiếu/hết hạn trong request SPA stateful thực tế |
| 422 | Payload/query sai, dùng envelope Laravel `message/errors` theo field |

Lỗi 409 có `message`, `code` và object `context`. Các code:
`INSUFFICIENT_STOCK`, `CART_QUANTITY_LIMIT`, `INVALID_VARIANT_PRICE`. Context rỗng
là `{}`; thiếu tồn trả dữ liệu của SKU bán công khai và dòng giỏ của chính chủ:

```json
{
  "message": "Số lượng yêu cầu vượt quá tồn kho hiện tại.",
  "code": "INSUFFICIENT_STOCK",
  "context": {
    "product_variant_id": 123,
    "stock_quantity": 3,
    "cart_quantity": 2,
    "requested_quantity": 2
  }
}
```

## Transaction, khóa và gửi lại

Mọi add chạy trong transaction. Thứ tự khóa: **user → cart → category → product
→ brand → SKU → dòng giỏ**. SKU được truy vấn theo id tăng dần. Chỉ khóa các
bản ghi liên quan; catalog giữ thứ tự tương thích với các service Admin hiện có.
Lần đọc đầu để tìm ID liên quan chỉ là gợi ý lấy khóa; quyết định mua dựa trên
locking read sau đó, kiểm tra lại cả liên kết. Nếu danh mục bị đổi giữa lúc tìm
và lúc khóa thì từ chối, không dùng thông tin cũ để thêm giỏ.

Khóa user trước giúp tuần tự hóa cả khi chưa có cart. Đọc lại role/active sau
khóa, tạo giỏ khi cần, kiểm tra và lưu một dòng. Unique trong DB vẫn bảo vệ một
giỏ/user và một dòng/SKU. Lỗi rollback cả cart mới, item và số lượng; retry
deadlock tối đa 3 lần sau rollback. Không có side effect ngoài DB.

GET cũng khóa user/cart trong transaction để đọc summary và selected_item nhất
quán với các thao tác giỏ tuân thủ cùng quy ước; không tạo hay sửa dữ liệu.
Các task chỉnh giỏ và checkout sau này phải dùng cùng thứ tự khóa, xử lý nhiều
SKU theo ID tăng dần. Không được khóa SKU trước rồi quay lại khóa cart.

**Mỗi POST thành công là một lần cộng.** Hai request hợp lệ cùng payload cộng
hai lần; endpoint chưa có idempotency token. Frontend T03 phải chặn submit trùng,
không tự retry POST khi timeout/mất phản hồi. Dùng GET summary kèm SKU để đối
chiếu dữ liệu đã lưu trước khi người dùng quyết định thêm tiếp; số lượng đọc
được không chứng minh một request cụ thể đã thành công nếu có nhiều tab.

## Kiểm thử local

Giao diện UC14-T03 gọi các endpoint trên từ trang chi tiết. Guest được giữ
SKU/số lượng qua đăng nhập/đăng ký rồi tự xác nhận thêm; đường dẫn quay lại chỉ
được dựng từ slug/ID/số lượng hợp lệ, không nhận URL tùy ý. Customer nhận thông
báo số lượng đã lưu, 409 hiển thị tồn và số lượng hiện có, 422 giữ input/focus
trường lỗi, 419 cho thực hiện lại sau khi làm mới CSRF. 401/403 làm mất hiệu lực
user cache ở frontend; admin, hết hàng và nguồn demo bị chặn thao tác trên UI.

Frontend ghi marker đối chiếu theo backend/user vào sessionStorage của tab
ngay trước POST. Marker gồm SKU/số lượng/tên công khai và nonce, không có dữ
liệu xác thực; đây không phải idempotency token gửi backend. Khi có kết quả
chắc chắn, chỉ xóa marker đúng nonce. Mất phản hồi/5xx/abort sau gửi giữ marker
và khóa thêm. Tải lại/rời trang giữ marker; user khác không hiển thị kết quả của
chủ marker. GET đối chiếu thành công mới mở lại thao tác để user tự quyết định.
GET thất bại tiếp tục khóa ghi. Lỗi CSRF trước khi gửi POST không tạo marker.

Chuẩn bị DB test mới và biến môi trường theo mục UC14-T01 trong README, migrate
DB test trước, rồi chạy từ backend:

```powershell
php artisan migrate --force
php artisan test --compact --filter='CartApiTest|CartConcurrencyTest'
```

Chỉ chạy lệnh migrate trên terminal đã xác minh đang trỏ database test riêng.
Test cạnh tranh bắt buộc có `CATALOG_TEST_DATABASE` hợp lệ, MySQL/MariaDB host
loopback và `proc_open`. Hai process dùng kết nối khác nhau, barrier đồng bộ,
giữ ngắn khóa thật trong service và kiểm tra Innodb_row_lock_waits tăng. Worker
từ chối chạy trên database live. Test fixture được xóa đúng ID trên database
test; không seed/reset dữ liệu `shophub`.

Browser QA T03 dùng instance riêng. Mở terminal kiểm thử mới, từ backend thực
hiện theo thứ tự; dừng nếu bất kỳ lệnh chuẩn bị nào lỗi:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File scripts/start-catalog-test-db.ps1 -Port 33414
if ($LASTEXITCODE -ne 0) { throw 'Không khởi động được instance kiểm thử.' }
$env:APP_ENV = 'testing'
$env:DB_CONNECTION = 'mysql'
$env:DB_HOST = '127.0.0.1'
$env:DB_PORT = '33414'
$env:DB_DATABASE = 'mysql'
php scripts/catalog-test-database.php
if ($LASTEXITCODE -ne 0) { throw 'Không tạo được database kiểm thử.' }
$cartUiDb = Get-Content storage/framework/testing/catalog-api-database.json -Raw | ConvertFrom-Json
$env:DB_DATABASE = $cartUiDb.database
$env:CATALOG_TEST_DATABASE = $cartUiDb.database
php artisan migrate --force
if ($LASTEXITCODE -ne 0) { throw 'Migration kiểm thử chưa hoàn tất.' }
Set-Location ../frontend
node scripts/t02-admin-catalog-review.mjs --cart
```

`--cart-demo` cần database test mới khác (chạy lại helper tạo DB và migrate trên
instance đó trước), vì fixture không chiếm account/catalog đã có. Sau khi kiểm
tra, đối chiếu PID/port/datadir trong `storage/framework/testing/catalog-test-server.json`
để dừng đúng instance test; không dừng MySQL XAMPP đang phục vụ `shophub`. Không
ghi password test vào lệnh: harness tự tạo password ngẫu nhiên trong bộ nhớ.

## Ma trận nghiệm thu UC14-T04

Lượt 19/11/2026 dùng bản mã nền `5a6d141` cùng diff công cụ T04. Mọi thao tác
ghi và rollback kiểm thử chạy trên database test được chọn rõ ràng. Không
thêm API, schema hoặc thay nghiệp vụ ở T04.

| Tiêu chí | Bằng chứng kiểm tra | Kết quả |
|---|---|---|
| Một cart/user, một dòng/SKU; FK, CHECK, casts/quan hệ | CartFoundationTest: ghi DB thật, trường hợp hợp lệ/vi phạm, cascade, rollback và migrate lại hai migration mới | Đạt |
| Thêm mới/cộng cùng SKU, tách SKU, lưu sau refresh | CartApiTest; Chrome API và read-back | Đạt |
| Auth/role/active/owner, payload ngoài contract | CartApiTest, service với actor cũ; Chrome cookie/CSRF, 401/403 và đổi tài khoản | Đạt |
| Điều kiện public, tồn và giá hiện tại, giới hạn integer | CartApiTest; Chrome 404/409/422 và ngừng SKU trong lúc login | Đạt |
| Không giữ giá/tồn; lỗi rollback đầy đủ | CartFoundationTest, CartApiTest và hai customer cùng thêm SKU cuối trong CartConcurrencyTest | Đạt |
| Không trùng/lost update; đọc snapshot; tương thích Admin hide | 7 ca CartConcurrencyTest, các process/kết nối MariaDB độc lập và lock wait thật | Đạt |
| Login/register quay lại lựa chọn, xác nhận thêm riêng | Chrome đăng ký/login/phiên hết hạn; return context ngoài website bị từ chối | Đạt |
| Mất delivery 200/201, refresh/rời trang, đối chiếu tài khoản/sản phẩm | Chrome cắt response sau server commit, chỉ GET đối chiếu; không tự phát lại POST | Đạt |
| Chặn storage trước POST, lỗi CSRF trước/sau gửi, GET đối chiếu lỗi | Chrome chặn storage/mạng, bỏ header CSRF, backend trả lỗi thật | Đạt |
| Responsive, bàn phím, demo, hồi quy tài khoản/catalog/địa chỉ | Chrome API 1440/768/390px, demo 1440px; backend suite; build/lint | Đạt |

Backend: `php artisan test --compact` đạt 143 test/2002 assertions trên DB test
riêng; các ca cart/concurrency chạy MariaDB, các test auth/seeder cũ dùng SQLite
in-memory vẫn được phân biệt. Browser `--cart-acceptance` đạt 21 kịch bản/229
response API thật; `--cart-acceptance --cart-demo` đạt một kịch bản demo và
không có POST giỏ. Cả hai không có Runtime exception. Kết quả JSON/ảnh T04 lưu
trong testing storage ignored, tách khỏi T03. Viewport trong JSON demo chỉ ghi
1440px đã thực sự chạy.

Giới hạn: đọc lại schema local 127.0.0.1:3306 không kết nối được, không coi là
PASS metadata local; nghiệm thu schema dùng MariaDB test và không sửa dữ liệu
`shophub`. Kiểm tra UI bằng Chrome emulation; chưa có bằng chứng thiết bị vật
lý/trình duyệt khác. Không diễn giải submit guard hoặc summary thành backend
idempotency: mỗi POST thành công vẫn là một lần cộng.

Bổ sung sau khôi phục API ngày 19/11/2026: MariaDB local cổng 3306 đã chạy lại.
Kiểm tra chỉ đọc `shophub` xác nhận hai migration giỏ batch 7, các cột/FK/index
và CHECK số lượng; giới hạn không kết nối được ở lượt T04 phía trên đã được
giải quyết. Không migrate/seed/reset local; snapshot metadata được lưu trong
`backend/storage/framework/testing/uc14-t04-local-results.json` (ignored).
