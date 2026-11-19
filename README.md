# ShopHub

Dự án website thương mại điện tử sử dụng Laravel REST API và React.

## Công nghệ

- Backend: Laravel 12, Laravel Sanctum, Eloquent ORM
- Frontend: React, Vite, React Router DOM, Axios
- Database: MySQL

## Cấu trúc

- backend/: Laravel REST API
- frontend/: React application

## Trạng thái hiện tại

- Đã khởi tạo backend và frontend.
- Đã cấu hình database và chạy migration.
- Đã tạo API GET /api/health.
- Đã triển khai migration/model và seeder dữ liệu demo cho nhóm sản phẩm.
- Đã nối giao diện React với API catalog công khai: danh mục, thương hiệu, tìm kiếm/lọc/phân trang và chi tiết biến thể.
- Các chức năng bán hàng đang trong quá trình phát triển.

## Chạy backend

Trong thư mục backend:

1. Chạy composer install.
2. Sao chép .env.example thành .env và cấu hình MySQL.
3. Tạo database shophub.
4. Chạy php artisan key:generate.
5. Chạy php artisan migrate.
6. Chạy php artisan serve --host=localhost --port=8000.

## Dữ liệu demo sản phẩm

Sau khi chạy migration, trong thư mục `backend/` chạy riêng:

```bash
php artisan db:seed --class=ProductCatalogSeeder
```

Seeder chỉ cho phép môi trường `local` hoặc `testing`; các môi trường khác bị chặn kể cả khi có `--force`. Seeder này không được gọi mặc định từ `DatabaseSeeder`.

Dữ liệu gồm 3 danh mục, 3 thương hiệu (ASUS, Kingston, Philips), 3 sản phẩm, 4 biến thể và 6 bản ghi ảnh. Laptop có hai màu, trong đó màu bạc hết hàng; SSD và bình đun dùng biến thể mặc định. Mọi giá, tồn kho, cấu hình và bảo hành là giả lập cho đồ án. Sản phẩm mới ở trạng thái `draft`, chưa phải sản phẩm công khai.

Có thể chạy lại lệnh để bổ sung dữ liệu thiếu. Seeder nhận diện bằng slug, SKU và cặp `product_id + path`, giữ nguyên các bản ghi đã tồn tại, bao gồm giá, tồn, mô tả và trạng thái. Khi slug/SKU thuộc quan hệ khác dự kiến, tên thương hiệu đã thuộc slug khác hoặc sản phẩm đã xóa mềm, seeder báo xung đột và rollback toàn bộ thao tác ghi trong lần chạy đó. Kiểm tra dữ liệu hiện có rồi xử lý thủ công hoặc điều chỉnh fixture trong mã nguồn; seeder không tự gán lại quan hệ hay restore sản phẩm.

Hai SVG placeholder nằm ở `backend/public/images/demo/catalog-placeholder-front.svg` và `backend/public/images/demo/catalog-placeholder-detail.svg`. Database lưu đường dẫn tương đối `images/demo/...`; mỗi sản phẩm dùng hai ảnh với `sort_order` là `0`, `1`. Seeder kiểm tra file tồn tại trước transaction và không tạo/ghi đè file lúc chạy. Khi backend đang phục vụ ở cổng 8000, có thể mở `http://localhost:8000/images/demo/catalog-placeholder-front.svg` để kiểm tra ảnh.

Kiểm thử seeder bằng database SQLite trong bộ nhớ, độc lập với `shophub`:

```bash
php artisan test --compact --filter=ProductCatalogSeederTest
```

Cần extension PHP `pdo_sqlite` để chạy nhóm test này. Kết quả chạy thực tế trên MariaDB local và các giới hạn kiểm tra được ghi trong [báo cáo seeder sản phẩm](docs/report/shophub-product-catalog-seeding-report.md).

## Chạy frontend

Trong thư mục frontend:

1. Chạy npm ci.
2. Sao chép .env.example thành .env.
3. Chạy npm run dev -- --host localhost --port 5173 --strictPort.

## Tài khoản và phân quyền (T00)

Chạy `php artisan migrate` trong `backend/` để bổ sung `phone`, `role` và
`is_active` cho bảng `users`. Tài khoản đăng ký qua cửa hàng có quyền `customer`.

Mở frontend tại `http://localhost:5173` và chạy backend tại
`http://localhost:8000`. Dùng `localhost` cho cả hai địa chỉ để Sanctum nhận
cookie phiên. Nếu đang dùng cấu hình cũ, kiểm tra `VITE_BACKEND_URL` và
`CORS_ALLOWED_ORIGINS` theo các file `.env.example`. Nếu đã khai báo
`SANCTUM_STATEFUL_DOMAINS`, danh sách phải chứa `localhost:5173`. Sau khi sửa
cấu hình, chạy `php artisan config:clear` và khởi động lại các ứng dụng.

Vào **Tài khoản → Đăng ký**, đăng nhập bằng tài khoản vừa tạo, tải lại trang,
mở **Thông tin tài khoản** rồi đăng xuất. Catalog vẫn mở được sau khi đăng xuất.
`GET /api/admin/access` trả `204` cho admin đang hoạt động, `401` cho khách
chưa đăng nhập và `403` cho customer hoặc admin đã bị khóa.

Chạy nhóm kiểm thử tài khoản trong `backend/` với extension `pdo_sqlite`:

```bash
php artisan test --filter=AccountAuthenticationTest
```

## Giao diện catalog ShopHub

Frontend dùng giao diện chuyển từ **Bazaar** (uiCookies), thay lựa chọn template Phyo Htet Arkar trước đó. Header đỏ, banner và các dải sản phẩm được điều chỉnh theo bố cục ShopHub.

- `/`: trang chủ, carousel, ba banner danh mục, khuyến mãi và sản phẩm mới.
- `/products`: tìm kiếm, lọc danh mục/thương hiệu/khoảng giá/tồn hàng, sắp xếp và phân trang.
- `/products/:slug`: bộ hình minh họa, SKU, giá VND, biến thể, tồn hàng và thông số.
- `/connection`: giữ trang kiểm tra `/api/health` qua Axios hiện có.

**Catalog mặc định dùng API Laravel.** Chỉ hiển thị sản phẩm active, chưa xóa mềm, có danh mục/thương hiệu active và ít nhất một biến thể active. Các sản phẩm draft từ `ProductCatalogSeeder` tiếp tục bị ẩn. Customer có thể thêm SKU vào giỏ từ trang chi tiết; checkout và đặt hàng đang được phát triển.

Đặt `VITE_CATALOG_SOURCE=api` và `VITE_BACKEND_URL=http://localhost:8000` trong `frontend/.env`, rồi khởi động lại Vite/build lại. `.env.example` đã cấu hình API; nếu `.env` cũ của bạn còn `demo`, đổi sang `api` để xem database. Chỉ chọn rõ `VITE_CATALOG_SOURCE=demo` mới chạy fixture tại `frontend/src/data/demoCatalog.js`. Khi API lỗi, giao diện báo lỗi và cho thử lại, không tự chuyển demo.

API đọc: `/api/public/categories`, `/api/public/brands`, `/api/public/products`, `/api/public/products/{slug}`. Xem [contract API](docs/api/public-catalog.md) và [kết quả triển khai/kiểm thử](docs/report/shophub-public-catalog-api-report.md).

Để có dữ liệu active trên database local đã migrate, có thể chạy riêng trong `backend/`:

```bash
php artisan db:seed --class=PublicCatalogDemoSeeder
```

Seeder mới chỉ chạy local/testing, tạo tối đa 12 sản phẩm `public-demo-*` với ảnh placeholder; chạy lại giữ giá/tồn/trạng thái đã có, không chuyển sản phẩm draft cũ sang active, không được gọi mặc định bởi DatabaseSeeder. Chỉ chạy trên database local bạn chủ động chọn để demo; không cần chạy nếu đã có sản phẩm công khai. Môi trường chỉ có draft sẽ hiển thị catalog rỗng đúng quy tắc.

Thông số kỹ thuật dùng cấu hình danh mục và giá trị text riêng cho từng sản phẩm. Trong `backend/`, sau khi xác minh database local:

```bash
php artisan migrate
# Nếu chưa có đủ bộ public-demo-*:
php artisan db:seed --class=PublicCatalogDemoSeeder
php artisan db:seed --class=PublicCatalogSpecificationSeeder
```

Seeder thông số chỉ chạy local/testing, tạo dữ liệu demo phù hợp ba nhóm hàng, kiểm tra danh mục và giữ giá trị đã chỉnh khi chạy lại. API chi tiết trả `{name, value}`, đơn vị đã được ghép một lần ở backend; tab Thông số hiện dữ liệu hoặc trạng thái đang cập nhật nếu chưa có giá trị hợp lệ. Xem [báo cáo thông số](docs/report/shophub-catalog-specifications-report.md) và [ảnh kiểm tra API thật](docs/catalog-specifications-review/README.md).

Kiểm tra bản build trong `frontend/`:

```bash
npm run build
npm run preview -- --host localhost --port 4173 --strictPort
```

Mở `http://localhost:4173`, hoặc xem chi tiết file thay đổi, kết quả kiểm tra và checklist local tại [báo cáo tích hợp Bazaar](docs/report/shophub-catalog-bazaar-integration-report.md).

Giao diện đã được dựng lại sát khung Bazaar: hero hai cột và ưu đãi phụ, typography gốc phục vụ local, gallery lớn, tabs chi tiết và footer nhiều tầng. CSS template được giới hạn dưới `.storefront`. Xem [báo cáo chỉnh giao diện](docs/report/shophub-catalog-bazaar-restyling-report.md) và [ảnh Bazaar / trước / sau](docs/catalog-bazaar-review/README.md). Ảnh đúng SKU vẫn còn thiếu; nguồn API dùng đúng URL ảnh được trả về hoặc placeholder. Xem thêm [ảnh API thật ở desktop/mobile, catalog rỗng và backend offline](docs/catalog-api-review/README.md).

## Quản trị danh mục và thương hiệu (T02)

Sau khi đăng nhập bằng admin đang hoạt động, mở **Tài khoản → Quản trị catalog**
hoặc `/admin/categories`. Menu **Danh mục** và **Thương hiệu** hỗ trợ xem, tìm,
lọc trạng thái, phân trang, thêm, sửa và ẩn có xác nhận. Sửa trạng thái để mở lại.
Form danh mục chọn cha, loại chính nó và hậu duệ; backend kiểm tra lại để chặn
vòng lặp. Ẩn chỉ đổi `is_active`, giữ dữ liệu và các liên kết.

T02 dùng schema hiện có, không có migration hoặc tài khoản admin mặc định mới.
API dùng lại Sanctum session/cookie và Gate T00. Không cho customer vào Admin;
frontend có thông báo chưa đăng nhập/thiếu quyền, API vẫn kiểm tra quyền độc lập.

Xem [contract API Admin](docs/api/admin-catalog.md) và
[báo cáo T02](docs/report/RP-T02-admin-catalog-foundation.md).

Kiểm thử nhanh backend với database SQLite trong bộ nhớ cách ly:

```bash
php artisan test --compact --filter=AdminCatalogTest
```

Kiểm tra MariaDB và trình duyệt thật: xem quy trình database riêng trong báo cáo.
Script `frontend/scripts/t02-admin-catalog-review.mjs` không tạo screenshot,
chỉ nhận database kiểm thử mới đã migrate và tạo mật khẩu test ngẫu nhiên trong
bộ nhớ. Không chạy helper seeder trên database đang sử dụng.

## Quản trị sản phẩm, ảnh và SKU (T03)

T04 bổ sung **Thông số** trong menu Admin và vùng thông số/công bố ở trang sửa sản phẩm.
Sản phẩm active chỉ sửa tên, mô tả, ảnh và thông số; API nháp T03 vẫn giữ giới hạn cũ.
Xem [API T04](docs/api/admin-product-publishing.md) và
[báo cáo T04](docs/report/RP-T04-admin-product-publishing.md).
Nghiệm thu Chrome với Laravel/MariaDB riêng: `node scripts/t02-admin-catalog-review.mjs --publishing`
từ `frontend/`, sau khi chuẩn bị database mới theo hướng dẫn kiểm thử hiện có.

Admin mở **Sản phẩm** ở sidebar hoặc `/admin/products`. Có tìm kiếm/phân trang,
tạo và sửa bản nháp, upload bộ ảnh và nhiều SKU. Giá VND nguyên, tồn nguyên không
âm; SKU đã lưu giữ ID và ngừng dùng bằng cờ Hoạt động, không xóa cứng. Draft không
xuất hiện trên catalog public. Sản phẩm active/inactive chỉ xem trong phạm vi này.

Không có migration mới hoặc thao tác công bố/ẩn sản phẩm, không cấu hình thông số.
Ảnh runtime nằm trên public disk; route `/media/catalog/...` phục vụ ảnh nên không
cần tạo storage symlink trên Windows. Giới hạn ứng dụng là 5 MB/ảnh, 10 ảnh; khi chạy
PHP local cần cấu hình upload_max_filesize ≥5M và post_max_size ≥60M nếu gửi tối đa.

Xem [contract sản phẩm](docs/api/admin-products.md) và
[báo cáo T03](docs/report/RP-T03-admin-products.md). Kiểm thử riêng:

```bash
# backend/: database cách ly; không cần GD để tạo fixture PNG kiểm thử
php artisan test --compact --filter=AdminProductTest
# frontend/, sau khi chuẩn bị MariaDB test mới theo báo cáo:
node scripts/t02-admin-catalog-review.mjs --products
```

Harness `--products` giữ các kiểm tra T02/T01, bổ sung T03 và lưu upload vào thư
mục testing riêng. Không chạy trên database ShopHub đang dùng, không tạo screenshot.

## Sổ địa chỉ giao hàng (T05)

Khách hàng đăng nhập mở `/account` → **Địa chỉ giao hàng**, hoặc
`/account?view=addresses`, để thêm/sửa/xóa/đặt mặc định. Địa chỉ đầu tiên tự mặc
định; xóa mặc định chọn địa chỉ còn lại được tạo sớm nhất. Chưa chọn địa chỉ cho
đơn hàng (T07). Xem [API T05](docs/api/customer-addresses.md) và
[báo cáo T05](docs/report/RP-T05-customer-addresses.md).

Sau khi cấu hình đúng database XAMPP trong backend/.env, từ backend chạy:

```powershell
php artisan migrate:status
php artisan migrate
```

Migration mới chỉ thêm bảng addresses, không cần seed hoặc migrate:fresh. Dừng
và khởi động lại backend nếu môi trường đang giữ route/config cũ. Để kiểm thử,
chọn database **riêng** theo hướng dẫn trong báo cáo; không chạy reset DB thật.

## Nền tảng dữ liệu giỏ hàng (UC14-T01)

Đã bổ sung hai bảng `carts`, `cart_items`, model `Cart`/`CartItem` và quan hệ
`User::cart()`. Mỗi user tối đa một giỏ; mỗi SKU tối đa một dòng trong giỏ.
`quantity` là INT UNSIGNED bắt buộc, có CHECK >= 1. Xóa user/giỏ sẽ cascade
dữ liệu giỏ tương ứng; xóa cứng SKU sẽ bỏ dòng giỏ của SKU đó. Các quan hệ này
không áp dụng cho dữ liệu lịch sử đơn hàng.

Giỏ chỉ lưu SKU và số lượng, chưa có API/UI thêm giỏ. Không tự tạo giỏ khi đăng
ký, không giữ giá, không trừ/giữ tồn và không có seeder mới. Kiểm tra quyền,
điều kiện bán, giới hạn theo tồn và transaction nghiệp vụ thuộc UC14-T02.

Migration mới đã chạy trên `shophub` local (MariaDB 10.11.16) ngày 19/11/2026,
batch 7; chạy lại không phát sinh thay đổi. Số dòng và checksum của 18 bảng cũ
(ngoài bảng lịch sử migrations) được đối chiếu và giữ nguyên. Khi cài trên
database local khác, xác minh kết nối rồi từ `backend/` chạy riêng:

```powershell
php artisan migrate --path=database/migrations/2026_11_19_100000_create_carts_table.php --path=database/migrations/2026_11_19_100001_create_cart_items_table.php
```

Kiểm thử schema/model: mở **terminal riêng**, xác minh MySQL/MariaDB đang chạy
ở host local, rồi từ `backend/` thực hiện:

```powershell
$env:APP_ENV = 'testing'
$env:DB_CONNECTION = 'mysql'
php scripts/catalog-test-database.php
# Chỉ tiếp tục khi helper tạo database mới thành công.
$cartTestInfo = Get-Content storage/framework/testing/catalog-api-database.json -Raw | ConvertFrom-Json
$env:DB_DATABASE = $cartTestInfo.database
$env:CATALOG_TEST_DATABASE = $cartTestInfo.database
php artisan test --compact --filter=CartFoundationTest
```

Đóng terminal kiểm thử sau khi dùng để không giữ biến môi trường DB cho thao
tác local khác. Bộ test chỉ dùng database có tên test hợp lệ hoặc SQLite trong
bộ nhớ khi thiếu biến `CATALOG_TEST_DATABASE`; nhánh SQLite phục vụ tương thích,
không thay kết quả nghiệm thu MariaDB. Các ca kiểm tra rollback thật chỉ tác
động hai migration mới trên kết nối test cách ly, không rollback `shophub`.

## API thêm giỏ (UC14-T02)

Customer active dùng Sanctum cookie/session để gọi:

- `POST /api/customer/cart/items`: gửi JSON integer `product_variant_id` và
  `quantity`; tạo dòng mới (201) hoặc cộng vào dòng đã có (200).
- `GET /api/customer/cart/summary?product_variant_id=...`: đọc số dòng, tổng số
  lượng và dòng SKU được hỏi của chính tài khoản; đọc không tự tạo giỏ.

Backend kiểm tra quyền, trạng thái bán, giá và tồn trong transaction; khóa user,
giỏ và catalog theo thứ tự thống nhất. Vượt tồn trả 409, dữ liệu giỏ cũ giữ nguyên.
Thêm giỏ không giữ/trừ tồn hoặc khóa giá. Mỗi POST thành công cộng một lần; client
không tự retry khi mất phản hồi, dùng GET để đối chiếu trước khi thêm tiếp.

Xem [contract đầy đủ](docs/api/customer-cart.md). Không có migration/seeder mới
trong T02. Nút thêm giỏ và giao diện phản hồi đã được nối ở UC14-T03; API xem toàn
bộ giỏ, đổi/xóa dòng và checkout thuộc UC15, UC16, UC18.

Sau khi chuẩn bị terminal/DB test riêng theo hướng dẫn UC14-T01 ở trên, migrate
DB test rồi kiểm tra backend từ `backend/`:

```powershell
php artisan migrate --force
php artisan test --compact --filter='CartApiTest|CartConcurrencyTest'
```

Test cạnh tranh chạy các process/kết nối MariaDB độc lập, không chạy trên
database `shophub` đang dùng. Xem điều kiện và quy ước khóa trong contract.

## Giao diện thêm giỏ (UC14-T03)

Mở một sản phẩm public, chọn phiên bản và nhập **Số lượng cần thêm**. Customer
đang hoạt động có thể thêm SKU và xem số lượng đã lưu ngay tại trang chi tiết.
Khách chưa đăng nhập được đưa đến đăng nhập; lựa chọn được giữ qua cả đăng ký,
quay lại sản phẩm và xác nhận thêm bằng nút. Đường dẫn quay lại chỉ nhận ngữ
cảnh sản phẩm nội bộ đã kiểm tra. Đăng nhập thông thường vẫn về `/account`.

Form có loading, lỗi từng field/focus, phản hồi tồn hiện tại, chống submit trùng
bằng ref và thông báo thành công theo SKU. Hết hàng/admin/demo không gửi thao
tác thêm. Giao diện dùng API và Axios chung hiện có; không có dependency mới.

Nếu POST đã gửi nhưng mất phản hồi hoặc trả 5xx, form khóa thêm và cho **Kiểm
tra giỏ đã lưu** bằng GET. Một marker trong sessionStorage của tab giữ ngữ cảnh
theo backend/tài khoản, gồm ID SKU, số lượng, tên sản phẩm/phiên bản và nonce;
không chứa mật khẩu/token/địa chỉ. Refresh hoặc rời trang khi đang gửi vẫn giữ
marker. Tài khoản khác không đọc/hiển thị marker đó; cùng tài khoản quay lại
phải đối chiếu trước khi thêm tiếp. Đối chiếu không tự phát lại POST và không
khẳng định một request cụ thể đã thành công nếu có nhiều tab.

Nếu trình duyệt chặn lưu marker, form báo lỗi trước khi gửi POST. Lỗi lấy CSRF
trước POST được phân biệt với kết quả ghi chưa xác định. 401/403 xóa trạng thái
user đã cache; lựa chọn sản phẩm được giữ để đăng nhập lại. Xem thêm
[contract API và hành vi giao diện](docs/api/customer-cart.md).

Kiểm tra local: chạy Laravel và Vite theo hướng dẫn ở trên, dùng catalog nguồn
`api`, đăng nhập customer và mở chi tiết sản phẩm có SKU còn hàng. Chế độ `demo`
chỉ hiển thị thông báo, không có thao tác giỏ thật. Trang xem/chỉnh toàn bộ giỏ
thuộc UC15/UC16; checkout thuộc UC18.

Browser QA dùng MariaDB instance/datadir riêng, database test mới đã migrate và
Chrome headless. Từ `frontend/`, sau khi chuẩn bị metadata bằng hai helper DB
hiện có trong `backend/scripts/`, chạy:

```powershell
node scripts/t02-admin-catalog-review.mjs --cart
# --cart-demo cần một database test MỚI khác, đã migrate và chưa có account.
node scripts/t02-admin-catalog-review.mjs --cart-demo
```

Harness tạo password ngẫu nhiên trong bộ nhớ, dùng cookie/CSRF và API thật;
test lỗi bằng chặn mạng/đổi payload/cắt delivery sau server commit, không giả
response thành công. JSON kết quả và ảnh viewport 1440/390 nằm trong
`backend/storage/framework/testing/` (ignored). Fixture helper T03 chỉ chạy trên
database test được chọn rõ ràng. Không chạy helper trên `shophub` đang dùng.

## Địa chỉ local

- Backend: http://localhost:8000
- Frontend: http://localhost:5173
- API kiểm tra: http://localhost:8000/api/health
