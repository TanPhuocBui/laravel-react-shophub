# RP-T03 — Sản phẩm, hình ảnh và SKU (UC07–UC08)

Ngày: **15/11/2026**. Nhánh: **`feature/admin-products`**.

**Hoàn thành phạm vi T03:** danh sách quản trị, tạo/sửa bản nháp, upload/quản lý bộ ảnh và nhiều SKU. Backend liên quan đạt 32 test/638 assertion; browser thật đạt 29 kịch bản/661 response API. Không triển khai công bố/ẩn sản phẩm hoặc thông số T04.

## 1. Nền triển khai và tài liệu

- Commit nền và `dev` cùng là **`9c87c324ec53e519141ac67f9d5a00a6f1e3e172`**, merge PR #2 từ `feature/admin-catalog-foundation`.
- `git merge-base --is-ancestor 8614972 dev` trả 0. Đã kiểm tra tree/routes/App của dev: thực sự có controller/service/route quản trị danh mục, thương hiệu và AdminLayout/UI T02. Không dựa riêng vào báo cáo cũ để suy ra đã tích hợp.
- Working tree sạch khi bắt đầu, nhánh đã đúng tên yêu cầu nên triển khai trực tiếp, không cần worktree mới. Không đổi lịch sử Git hoặc động tới worktree T01 cũ.
- Chưa commit/push/merge, không tạo bản vá hoặc screenshot.

Đã đọc:

| Tài liệu | Cách áp dụng |
|---|---|
| `AGENTS.md`, `README.md` | Phân lớp Laravel, React service/Axios, quyền, transaction, dữ liệu lịch sử và môi trường chạy. |
| `docs/design/SHOPHUB_BUSINESS_ARCHITECTURE.md` | Ranh giới catalog, UC07–UC08 và quan hệ với T04/checkout. |
| `docs/design/shophub-usecase-system.md` | Admin tạo nháp, tải ảnh hợp lệ, nhiều SKU; chặn trùng, giá sai, tồn âm. |
| `docs/design/shophub-erd.md`, `docs/report/shophub-database-design.md` | Schema product/images/variants, unique SKU/slug, giá VND nguyên và giữ liên kết. |
| `docs/api/admin-catalog.md` | Tái sử dụng Sanctum session/cookie và Gate T02, Resource/pagination và validation Laravel. |
| `docs/api/public-catalog.md` | Giữ điều kiện public, URL ảnh, sort ảnh và dữ liệu giá/tồn của SKU. |
| `docs/report/RP-T02-admin-catalog-foundation.md` | Layout/sidebar/breadcrumb, field/feedback, responsive và quy trình QA đã có. |

Đã tìm trong `docs/design/` và các tài liệu frontend; không có file cấu trúc UI riêng ngoài ba tài liệu design trên. Không có `ARCHITECTURE.md` ở gốc. Giao diện T03 kế thừa trực tiếp UI T02 đã có, dùng font/icon/CSS Admin hiện hành.

Đối chiếu migration/model/seeder cho thấy schema đáp ứng T03: **không thêm hoặc sửa migration, model, seeder hay dependency/lockfile**. Báo cáo lịch sử nói T02 chưa tích hợp không còn là hiện trạng; bằng chứng Git hiện tại là merge commit nêu trên.

## 2. API và backend

| Method | Route | Hành vi |
|---|---|---|
| GET | `/api/admin/products` | Tìm tên/slug/SKU; lọc status/category/brand; phân trang |
| GET | `/api/admin/products/options` | Danh mục/thương hiệu thật, có trạng thái để chọn trong form |
| GET | `/api/admin/products/{id}` | Chi tiết sản phẩm, bộ ảnh và toàn bộ SKU |
| POST | `/api/admin/products` | Tạo nháp, HTTP 201 |
| PUT/PATCH | `/api/admin/products/{id}` | Lưu đầy đủ bản nháp, HTTP 200 |
| GET | `/media/catalog/{filename}` | Đọc ảnh public disk với filename UUID/đuôi ảnh hợp lệ |

Toàn bộ API Admin sản phẩm có `auth:sanctum` + `can:access-admin` như T02. Guest 401, customer/admin khóa 403. Không thêm DELETE, endpoint đổi status hoặc API thông số. API media là đường đọc file public, không phải thao tác quản trị/công bố sản phẩm.

Form Request kiểm tra payload HTTP; `AdminProductService` giữ invariant khi gọi nội bộ, khóa product rồi các SKU theo id và ảnh trước khi cập nhật. Product, metadata ảnh và SKU nằm trong cùng transaction. Form Request không bị controller gọi validate lặp; service kiểm tra lại dữ liệu nghiệp vụ trong transaction.

Backend gán `draft` khi tạo; không nhận status/is_featured/specifications từ biểu mẫu. Theo phạm vi “tạo/sửa sản phẩm nháp”, active/inactive chỉ đọc được; update hợp lệ vào sản phẩm không còn draft trả **409**. Sản phẩm có giá trị thông số sẵn sẽ bị chặn đổi danh mục, tránh tự làm sai cấu hình trước T04.

Response dùng Resource Laravel; collection giữ data/links/meta. List có số SKU, số ảnh và giá SKU thấp nhất (gồm SKU ngừng dùng, ghi rõ là số liệu quản trị); không đổi `card_price` hoặc contract public.

Chi tiết: [contract Admin products](../api/admin-products.md).

## 3. Quyết định về ảnh

Thiết kế có yêu cầu tải ảnh nhưng chưa chốt cơ chế runtime. T03 chọn cách tương thích schema/API sẵn có:

- Ảnh thuộc **sản phẩm**, không thuộc SKU: `product_images` hiện chỉ có product_id. Không thêm variant_id hoặc bảng liên kết mới.
- Upload thật JPG/JPEG, PNG, WebP; kiểm tra nội dung ảnh/MIME, dung lượng tối đa **5 MB**, kích thước tối đa **6000×6000**, tối đa **10 ảnh/sản phẩm**, cần ít nhất một ảnh.
- Tên lưu là UUID và extension theo MIME; bỏ qua tên gốc khi tạo đường dẫn. Public disk mặc định lưu `backend/storage/app/public/catalog/products/...`.
- Database lưu `media/catalog/{uuid}.{ext}`. `CatalogImageUrl` hiện có chuyển thành URL theo origin request; route media đọc đúng thư mục, có filename pattern và header `X-Content-Type-Options: nosniff`. Không cần storage symlink/đặc quyền symlink trên Windows.
- Ảnh theo sort_order rồi id; đầu danh sách đại diện. UI thêm nhiều file, xem trước, sửa alt text, thay tệp, đưa lên/xuống và bỏ ảnh khỏi bộ ảnh. Khi thay tệp ảnh cũ, giữ ID metadata.
- Thay/gỡ ảnh thành công chỉ cập nhật/xóa metadata của chính sản phẩm. **File cũ được giữ** để bảo toàn URL lịch sử hoặc ảnh seed dùng chung; chưa có tác vụ dọn file cũ trong T03.
- File mới được ghi trong quá trình transaction và được theo dõi; bất kỳ lỗi validation/nghiệp vụ/DB/exception sau đó đều rollback DB và xóa file mới đã ghi. Không xóa file cũ khi lưu thất bại.
- Ảnh nằm trên public disk, URL đọc được độc lập với status sản phẩm nếu biết UUID. Điều này không công bố draft trên API sản phẩm. Không tuyên bố URL ảnh là dữ liệu riêng tư.

Client dùng multipart; khi sửa gửi POST kèm `_method=PUT` để PHP nhận file đầy đủ. Đã xử lý trường hợp file bag/input bag trộn thứ tự key số: chuẩn hóa thứ tự trước validation, vẫn kiểm tra danh sách liên tục và ownership theo từng dòng.

Giới hạn PHP có thể áp dụng trước Laravel. README/contract ghi cách đặt `upload_max_filesize≥5M`, `post_max_size≥60M` cho tối đa 10 ảnh. QA đặt riêng bằng CLI; không sửa php.ini hoặc `.env` cá nhân.

## 4. SKU, tiền và tồn kho

- Ít nhất 1, tối đa 50 SKU; mã tối đa 100 ký tự, unique toàn hệ thống, kể cả SKU ngừng dùng hoặc thuộc sản phẩm soft-delete. Payload trùng mã (không phân biệt hoa/thường) bị từ chối.
- Sửa mã của đúng ID hiện tại được giữ; ID biến thể/ảnh phải thuộc đúng product. Không nhận product_id tùy ý. Kiểm tra tại request và service, cùng FK/unique index hiện có.
- Giá VND là **số nguyên**, `1..999999999999`, `sale_price ≤ list_price`. Giới hạn ứng dụng nhỏ hơn BIGINT và số nguyên an toàn JavaScript, tương thích khoảng giá public. Không dùng float.
- Tồn kho nguyên **0..4294967295**, theo unsigned INT; bảo hành nguyên 0..65535 tháng.
- SKU mới chưa lưu có thể bỏ dòng trên UI. SKU đã lưu giữ nguyên ID; payload phải chứa đủ các ID cũ, không delete/recreate. Bỏ Hoạt động để ngừng dùng; unique vẫn giữ mã đó. Chưa có order_items trong schema hiện tại nhưng chính sách này giữ được liên kết khi các module sau được bổ sung.
- DB unique index là bảo vệ cuối cho khoảng hở giữa validation và insert/update. UniqueConstraintViolationException được chuyển thành 422 ở slug hoặc `variants.N.sku`, với thông báo dễ sửa; transaction và file được rollback/dọn.
- Khóa product/SKU trong update bảo vệ thao tác ghi. T03 chỉ sửa draft nên chưa mở luồng ghi tồn sản phẩm đang bán hoặc workflow checkout.

## 5. Màn hình và component

- Sidebar T02 thêm đúng mục **Sản phẩm**; breadcrumb nhận biết danh sách, tạo, sửa và chi tiết.
- `/admin/products`: tìm kiếm/phân trang, lọc trạng thái/danh mục, status Nháp/Đang công khai/Đã ẩn, số SKU, giá thấp nhất; draft có Sửa nháp, trạng thái khác chỉ Xem.
- `/admin/products/create`: ba nhóm **Thông tin sản phẩm**, **Hình ảnh**, **Phiên bản/SKU**, nút **Lưu bản nháp** và nhãn Nháp.
- `/admin/products/:id/edit`: mở lại ảnh/giá/tồn/mã; lưu bằng ID cũ. `/admin/products/:id`: chế độ chỉ đọc.
- Dùng lại AdminLayout, breadcrumb, toolbar/table styles, `AdminField`, `AdminFeedback`, `useCatalog`, Axios/CSRF T00, `catalogReturnTo`, slug suggestion và icon/font T02. AdminField chỉ được bổ sung textarea tùy chọn, không đổi hành vi form T02 cũ.
- Dữ liệu chọn category/brand lấy từ API thật. Danh mục/thương hiệu ẩn vẫn chọn được cho draft và được ghi nhãn; quy tắc bán được sẽ do luồng công bố kiểm tra sau.
- Mỗi SKU có lỗi đúng dòng từ key API. Lỗi không làm mất tên, giá/tồn hoặc file đã chọn; đưa focus tới field lỗi đầu tiên phù hợp. Có guard và nút disabled chống gửi lặp.
- Loading/empty/error/retry/success và trạng thái readonly đều có hành động rõ ràng. Giữ URL danh sách khi quay lại từ form. CSS chỉ giới hạn dưới Admin.
- Không render HTML mô tả do người dùng nhập; dùng text/textarea. Không thêm thông số, công bố, banner, dashboard hoặc chức năng T04.

## 6. Kiểm thử và kết quả thực tế

PHP **8.3.36**, Laravel **12.71.0**, Sanctum **4.3.3**, Node **22.22.2**, React **19.3.1**, Vite **8.3.6**, Axios **1.21.0** theo môi trường/lockfile. Không nâng package.

MariaDB **10.11.16**, driver mysql, instance loopback riêng **33348**. Database backend `shophub_catalog_api_test_2c2d776fb2`; database browser cuối **`shophub_catalog_api_test_8cd18cdd24`**. Không migrate/seed/reset database ShopHub đang dùng; không chạy migrate:fresh/rollback/truncate.

Browser dùng Chrome headless thật + Laravel + React production build, session cookie thật và upload multipart thật. Upload của browser nằm trong `backend/storage/framework/testing/t03-media-*` nhờ `CATALOG_MEDIA_ROOT`, tách khỏi upload người dùng. Tài khoản test có mật khẩu ngẫu nhiên trong bộ nhớ. Ảnh đầu vào browser dùng asset sẵn `frontend/src/assets/hero.png`; ảnh PNG nhỏ của unit test là fixture dữ liệu, không phải ảnh review. **Không tạo screenshot/ảnh review/bản vá.**

| Kịch bản | Kết quả | Bằng chứng |
|---|---|---|
| Guest/customer/admin khóa trên API sản phẩm | PASS | PHPUnit kiểm tra các method/list/options/show/create/update: 401/403; Chrome kiểm tra guest/customer cùng session thật. |
| Admin tạo nháp có ảnh và ít nhất hai SKU | PASS | Browser lưu multipart, một POST dù gửi hai submit; response draft, hai mã/giá/tồn đúng và ảnh media trả 200/image/nosniff. |
| Mở lại form đối chiếu dữ liệu | PASS | Giá 1.800.000 và 1.900.000, tồn 5 và 0 ở lần tạo; đổi SKU đầu thành 1.700.000/tồn 7 được lưu với cùng ID. |
| SKU trùng payload | PASS | Backend/browser trả 422 đúng dòng; chưa tạo product; dữ liệu và file nhập còn để sửa/gửi lại. |
| SKU trùng DB, giữ mã đúng SKU hiện tại | PASS | Giữ mã khi sửa thành công; đổi sang mã của sản phẩm khác bị từ chối ở đúng dòng, không đổi dữ liệu. |
| Giá 0, giá bán vượt niêm yết, phân số/quá giới hạn | PASS | Bộ test và HTTP validation, rollback toàn bộ. |
| Tồn âm, không nguyên, vượt UINT | PASS | PHPUnit/HTTP 422; dữ liệu sản phẩm giữ nguyên. |
| Variant/image ID thuộc product khác | PASS | 422, so sánh toàn response trước/sau không thay đổi; không chuyển quyền sở hữu. |
| Bỏ SKU đã lưu | PASS | API từ chối; UI chỉ cho ngừng dùng, ID được giữ. |
| Ảnh thêm/thay/sắp xếp/bỏ metadata | PASS | PHPUnit và browser; ảnh thứ hai đưa lên đầu, ID cũ giữ, bỏ ảnh khỏi bộ còn đúng ảnh đại diện mới. |
| MIME không hợp lệ/SVG | PASS | API/browser 422; không có draft hoặc file mới bị bỏ dở. |
| Unique DB lỗi muộn sau upload | PASS | Test gây va chạm unique thực sau validation/file write; product/images/variants đều rollback, file mới bị xóa, lỗi đúng SKU. |
| Exception khi cập nhật sau upload | PASS | Test gây exception sau thay ảnh; tên/metadata/variant cũ còn nguyên, chỉ file mới bị dọn. |
| Hai HTTP cùng mã SKU | PASS, có giới hạn | Promise.all trả 1×200 + 1×422, chỉ một product có mã; PHP CLI server tuần tự hóa request nên không coi là stress test hai transaction đồng thời. |
| Draft không public | PASS | Danh sách public không có draft, slug public 404. Không đổi contract/public service. |
| Chặn công bố/T04 | PASS | Client status bị từ chối; sản phẩm active chỉ xem, update hợp lệ trả 409. |
| Desktop/tablet/mobile 1440/768/390 | PASS | List/create/edit có ảnh thật và hai dòng SKU, không tràn ngang toàn trang; lưu tồn 8 trên mobile được đọc lại đúng. |
| Hồi quy T01/T02 | PASS | Giữ 19 kịch bản browser T02 và T01, gồm quyền, chu kỳ ẩn/mở lại, cây danh mục, filters, slug, responsive, public 8+2 và SKU hết hàng. |
| Stress test nhiều transaction/tiến trình cùng thời điểm | CHƯA CHẠY | Đã kiểm tra index/catch lỗi muộn và hai HTTP, chưa chạy môi trường nhiều worker để đo cạnh tranh thực. |

### Lệnh đã chạy

| Lệnh | Kết quả |
|---|---|
| Git status/log/tree, ancestor T02/dev | Xác nhận nền và working tree sạch như mục 1. Không sửa lịch sử. |
| `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-catalog-test-db.ps1 -Port 33348` | PASS, tạo instance riêng. |
| `php scripts/catalog-test-database.php` + `php artisan migrate --force` với env test | PASS, database mới và đủ 13 migration hiện có. |
| `php artisan test --compact --filter=AdminProductTest` | PASS cuối: **7 test, 197 assertion, 1.13 giây**, SQLite memory + public disk fake; có kiểm tra bổ sung thay ảnh thành công giữ ID và giữ file cũ. Không coi đây là MariaDB. |
| `php artisan test --compact --filter='AdminProductTest\|AdminCatalogTest\|PublicCatalogApiTest\|CatalogSpecificationTest\|AccountAuthenticationTest'` | **32 passed, 638 assertion, 9.34 giây**. Trong đó 28 test T03/catalog chạy MariaDB test; 4 test T00 dùng SQLite riêng theo suite có sẵn. Ký tự `\|` trong bảng là `|` của filter. |
| `php -l` trên 10 file PHP T03 | PASS, không lỗi cú pháp. |
| `php vendor/bin/pint` trên 10 file PHP T03 | PASS; chuẩn hóa format test, không refactor ngoài phạm vi. |
| `php artisan route:list --path=api/admin/products -v` | 5 route objects, có auth/Gate; PUT/PATCH cùng action. |
| `php artisan route:list --path=media/catalog` | 1 route GET/HEAD đọc ảnh, giới hạn filename. |
| `npm run lint` | Exit 0; chỉ warning cũ tại `src/pages/public/ConnectionPage.jsx:9`, không có warning T03. |
| `npm run build` | **PASS: 121 modules, 438 ms**. |
| `node --check scripts/t02-admin-catalog-review.mjs`, `node --check scripts/t03-admin-products-scenarios.mjs` | PASS. |
| `node scripts/t02-admin-catalog-review.mjs --products` | **PASS: 29 kịch bản, 661 response API thật, 0 Runtime exception, 0 screenshot**. |
| `git diff --check` | PASS; cảnh báo LF→CRLF của Git theo cấu hình Windows, không có lỗi whitespace. |
| Shutdown MariaDB test `--port=33348` | Đã dừng instance test sau nghiệm thu; Chrome/Laravel/preview do script tự đóng. |

Các lần chưa đạt đã xử lý:

- PHP CLI thiếu GD làm UploadedFile::fake()->image() thất bại. Đã dùng fixture PNG có nội dung thực, không yêu cầu GD và không sửa PHP global. Production upload không thực hiện resize nên không cần GD cho luồng này.
- Test chọn first() của SKU mà không orderBy nhận SKU inactive trước do index; đã chọn theo ID cần kiểm tra.
- Lỗi multipart trộn key số giữa ảnh cũ và file mới làm rule list từ chối dữ liệu hợp lệ: đã chuẩn hóa key tại validation/service và kiểm tra lại thành công.
- Browser lần đầu dừng vì helper payload chia sẻ tham chiếu variants với snapshot rồi sửa ID kỳ vọng. Server đã giữ nguyên dữ liệu; đã clone payload kiểm thử, tạo database mới và chạy lại toàn bộ đạt.

## 7. File thay đổi

Tạo mới:

- `backend/app/Http/Controllers/Api/AdminProductController.php`
- `backend/app/Http/Controllers/CatalogMediaController.php`
- `backend/app/Http/Requests/AdminProductIndexRequest.php`
- `backend/app/Http/Requests/AdminProductWriteRequest.php`
- `backend/app/Http/Resources/AdminProductResource.php`
- `backend/app/Services/AdminProductService.php`
- `backend/tests/Feature/AdminProductTest.php`
- `frontend/src/pages/admin/AdminProductsPage.jsx`
- `frontend/src/services/adminProductService.js`
- `frontend/scripts/t03-admin-products-scenarios.mjs`
- `docs/api/admin-products.md`
- `docs/report/RP-T03-admin-products.md`

Sửa:

- `backend/routes/api.php`, `backend/routes/web.php`
- `backend/config/filesystems.php` — root tùy chọn phục vụ test media cách ly, mặc định không đổi.
- `frontend/src/App.jsx`, `frontend/src/layouts/AdminLayout.jsx`
- `frontend/src/components/admin/AdminFeedback.jsx` — textarea tùy chọn.
- `frontend/src/styles/admin.css`, `frontend/src/utils/adminCatalog.js`
- `frontend/scripts/t02-admin-catalog-review.mjs` — cờ --products, module QA bổ sung và media root riêng, giữ kiểm tra T02.
- `README.md`

Không sửa model, migration, seeder, auth/Gate, public controller/service, dependency/lockfile hoặc `.env`. Build, Chrome profile, kết quả QA, database và file upload test nằm trong vùng ignored.

## 8. Chạy local, tái kiểm tra và bàn giao

Chạy Laravel/React theo README; admin mở **Sản phẩm**, thêm draft, chọn ảnh và ít nhất một SKU rồi **Lưu bản nháp**. Không có tài khoản admin mặc định mới được tạo trên database thật. Nếu cần nhận ảnh lớn tới giới hạn ứng dụng, chạy PHP với giới hạn phù hợp, ví dụ:

```powershell
# backend/
php -d upload_max_filesize=5M -d post_max_size=60M artisan serve --host=localhost --port=8000
```

Để tái chạy QA, tạo **instance/database mới** bằng helper, chọn env test loopback đúng cổng, migrate (không fresh), chạy test backend trước browser nếu dùng cùng database. Xem quy trình T02 và đổi cổng sang 33348. Sau đó từ frontend chạy:

```powershell
node scripts/t02-admin-catalog-review.mjs --products
```

Kết quả local được ghi vào `backend/storage/framework/testing/t03-browser-results.json` (ignored). Harness tự tạo tài khoản ephemeral, dùng ảnh đầu vào sẵn có, giữ toàn bộ hồi quy T02 rồi chạy T03, lưu file vào root testing riêng và đóng các tiến trình ứng dụng. Dừng đúng instance MariaDB test khi xong; không dùng lệnh reset/xóa database đang giữ dữ liệu.

Giới hạn: chưa stress test nhiều worker, chưa kiểm tra trình duyệt/thiết bị vật lý khác Chrome emulation; giữ file cũ sau thay/gỡ metadata, chưa có garbage collection. Các giới hạn này đã được tách khỏi kết quả đã chạy. Không còn trở ngại chặn luồng bắt buộc T03.

Gợi ý commit: `feat(admin): manage draft products, uploaded images and persistent SKUs`.

Bước tiếp theo đề xuất: review và tích hợp T03 bằng quy trình GitHub Desktop, rồi giao riêng T04 khi sẵn sàng; chưa tự triển khai T04.

## 9. Đồng bộ toolbar tìm kiếm/lọc Admin — 15/11/2026

- Danh mục, Thương hiệu và Sản phẩm cùng dùng `frontend/src/components/admin/AdminFilterToolbar.jsx`: icon tìm kiếm trong input, cùng nhãn/chiều cao/khoảng cách, nút Lọc kết quả và liên kết Xóa bộ lọc có icon.
- Bỏ CSS riêng làm ô tìm kiếm Sản phẩm rộng khác hai màn còn lại; trên mobile, mọi trường lọc xếp đầy hàng và hai thao tác nằm cùng hàng dưới. Giữ bộ lọc Danh mục của Sản phẩm.
- Dropdown giữ giá trị được chọn khi danh mục tải từ API. Giữ ID/name, giới hạn tìm kiếm, callback submit và query contract của từng module.
- File sửa: `AdminCatalogPage.jsx`, `AdminProductsPage.jsx`, `admin.css`, báo cáo này; thêm component toolbar chung. Không sửa backend/API hoặc dữ liệu.
- `npm run lint`: exit 0, chỉ warning cũ ở ConnectionPage.jsx. `npm run build`: PASS, 122 modules, 278 ms. `git diff --check`: PASS.
- Chưa chạy lại browser trong lượt chỉnh toolbar nhỏ này; kết quả 29 kịch bản ở mục 6 thuộc lượt nghiệm thu T03 trước đó.
