# RP-T02 — Khung Admin, danh mục và thương hiệu (UC05–UC06)

Ngày: **14/11/2026**. Nhánh triển khai: **`feature/admin-catalog-foundation`**.

**Cập nhật UI/UX mới nhất:** xem mục **8. Nâng cấp UI/UX Admin**. Đợt nâng cấp đạt 19 kịch bản Chrome với 465 response API thật tại 1440/768/390px. Các mục 1–7 ghi nhận đợt triển khai T02 nền trước nâng cấp.

**Đã hoàn thành phạm vi T02:** backend và frontend UC05–UC06, kiểm thử trên database riêng, 11 kịch bản browser đạt với 201 response API thật và không có Runtime exception. File design UI riêng chưa được cung cấp là giới hạn đối chiếu giao diện, không bị thay bằng tài liệu giả định.

## 1. Cơ sở Git và tài liệu

- HEAD nền: `a23a511d41c69755a485f3bc0ae64fc0dcca4206` (`fix catalog`). Working tree sạch khi bắt đầu; triển khai ngay trên nhánh người dùng yêu cầu, không cần worktree mới.
- `dev`: `de3ea879b8587ac67ebdc17e808a813ebd365f55`. Đã có commit T00 `33730ff` trong lịch sử dev, các endpoint `/login`, `/logout`, `/api/user`, `/api/admin/access`, middleware `auth:sanctum` và Gate `access-admin`.
- Nhánh T02 đã có sẵn không chứa merge commit `dev` trong ancestry; merge-base là `227e566c6347d57837acf5522c612d152766e778`. Tuy nhiên `git diff --quiet dev HEAD -- backend frontend/src frontend/package.json frontend/package-lock.json` trả 0: mã ứng dụng nền khớp dev. Khác biệt commit nền chỉ gồm ba file bằng chứng T01 và script QA T01. Giữ nguyên nhánh/lịch sử có sẵn, không tự merge/rebase để đổi ancestry.
- Gate T00 yêu cầu `role=admin` và `is_active=true`. T02 tái sử dụng nguyên cơ chế này; không thay model User, session flow hoặc middleware T00.
- Không commit, push, merge, rebase hoặc tạo bản vá. Tất cả thay đổi T02 đang ở working tree của nhánh trên.

Tài liệu đã đọc và sử dụng:

| Đường dẫn | Cách áp dụng |
|---|---|
| `AGENTS.md` | Cấu trúc Laravel/React, dùng Form Request/Resource/Service, quyền tại backend, API thật, CSS và kiểm thử phù hợp, không mở rộng T03. |
| `README.md` | Quy trình chạy, Sanctum cookie/session và nguồn API catalog đang có. |
| `docs/design/SHOPHUB_BUSINESS_ARCHITECTURE.md` | Ranh giới UC05–UC06, thêm API `/api/admin/*`, giữ hợp đồng `/api/public/*`, bảo toàn dữ liệu liên kết. |
| `docs/design/shophub-usecase-system.md` | Các màn danh sách, thêm/sửa/ẩn; 401/403, chặn vòng lặp; nhánh T02 và phụ thuộc T00. |
| `docs/design/shophub-erd.md` | Cột name/slug/parent_id/sort_order/is_active; unique của thương hiệu; ưu tiên ẩn thay xóa. |
| `docs/report/shophub-database-design.md` | Đối chiếu schema và quan hệ đã triển khai. |
| `docs/api/public-catalog.md` | Giữ nguyên điều kiện public và hành vi danh mục cha bị ẩn của T01. |

**File cấu trúc design mới chưa được cung cấp:** đã tìm file mới/chưa theo dõi, `docs/design/`, các file tài liệu và template dưới `frontend/`, cùng tên liên quan design/structure/layout. Không tìm thấy tài liệu UI Admin riêng ngoài ba tài liệu design trên. Không có `ARCHITECTURE.md` ở gốc. Đã nêu thiếu tài liệu trong chat trước khi sửa code và tiếp tục phần có căn cứ.

Ba tài liệu design xác định nghiệp vụ và cấu trúc dữ liệu, không quy định token/mẫu UI Admin cụ thể. Vì vậy layout được chọn là sidebar + topbar + vùng nội dung: chỉ hai menu Danh mục/Thương hiệu, bảng và form dùng chung, màu đỏ theo ShopHub, nền sáng, CSS giới hạn dưới `.admin-shell`. Đây là lựa chọn triển khai T02, chưa phải kết quả đối chiếu với file design UI chưa có.

## 2. Backend và hợp đồng API

Tất cả route mới nằm trong group `auth:sanctum` + `can:access-admin`. Form Request kiểm tra quyền và payload; service kiểm tra lại invariant khi được gọi nội bộ. Giữ response Resource Laravel, không thay exception handler hoặc `/api/health`.

| Method | Route | Chức năng |
|---|---|---|
| GET/POST | `/api/admin/categories` | Danh sách phân trang / tạo |
| GET | `/api/admin/categories/options` | Toàn bộ lựa chọn cha, gồm trạng thái ẩn |
| GET/PUT/PATCH | `/api/admin/categories/{category}` | Xem / sửa đầy đủ |
| PATCH | `/api/admin/categories/{category}/hide` | Ẩn danh mục |
| GET/POST | `/api/admin/brands` | Danh sách phân trang / tạo |
| GET/PUT/PATCH | `/api/admin/brands/{brand}` | Xem / sửa đầy đủ |
| PATCH | `/api/admin/brands/{brand}/hide` | Ẩn thương hiệu |

Danh sách có tìm tên/slug, lọc trạng thái và phân trang. Category gồm name, slug, parent_id, sort_order, is_active; brand gồm name, slug, is_active. Response danh sách thêm products_count. Tên tối đa 150, slug tối đa 180 với chữ thường/số/gạch ngang; unique slug theo từng bảng, unique tên thương hiệu. Chi tiết contract tại [admin-catalog.md](../api/admin-catalog.md).

**Không có migration mới:** schema, FK, index và casts hiện có đáp ứng T02. Không đổi các cột ảnh/logo; giá trị sẵn có được giữ nguyên. Không thêm API quản lý sản phẩm, SKU, giá hoặc tồn kho.

### Ẩn và hiển thị public

- Ẩn đổi `is_active=false`, không DELETE, không cascade đổi trạng thái con/sản phẩm/SKU và không xóa liên kết. Gọi ẩn lặp vẫn thành công. Có thể mở lại qua form sửa.
- Sản phẩm trực tiếp thuộc danh mục ẩn hoặc thương hiệu ẩn bị loại khỏi danh sách public, chi tiết trả 404 theo T01.
- Tài liệu thiết kế nói giữ liên kết và ẩn catalog; contract hiện tại chi tiết hơn về cây: ẩn cha không tự ẩn con. Nhánh cha bị ẩn trả rỗng, con active vẫn truy cập riêng được. T02 giữ quy tắc này, không tự đổi nghiệp vụ T01.

### Chống vòng lặp

- parent_id null là gốc; ID khác phải tồn tại.
- Trước khi ghi, service đi theo chuỗi cha, chặn chính bản ghi, mọi hậu duệ và chuỗi cha đã có vòng lặp.
- Mutation danh mục dùng transaction, khóa tập category theo id cùng thứ tự, kiểm tra lại rồi mới lưu. Các lần đổi cây qua service này được tuần tự hóa; deadlock có retry hữu hạn.
- Yêu cầu lỗi trả 422 theo field parent_id; transaction rollback, cả tên/slug/thứ tự lẫn cây không bị thay đổi.
- UI loại chính bản ghi và hậu duệ khỏi lựa chọn cha; backend vẫn kiểm tra độc lập để chặn request thủ công.

## 3. Frontend

- `AdminLayout` bảo vệ `/admin/*` bằng AccountContext T00, xử lý kiểm tra phiên, lỗi kết nối, guest và thiếu quyền. Quyền cuối cùng vẫn do API quyết định.
- Route `/admin` chuyển tới `/admin/categories`. Hai module có danh sách, `/create`, `/:id/edit`.
- Tái sử dụng Axios, session/CSRF T00, hook `useCatalog` với loader riêng và React Router. Service Admin gọi API trực tiếp qua client dùng chung.
- Component dùng chung: `AdminFeedback`, `AdminField`, `ConfirmHideDialog`; hai loại catalog dùng cùng list/form page.
- Có loading, empty, retry, lỗi từng field, lỗi phiên/quyền, thông báo thành công và khóa submit trùng. Dialog xác nhận có cả khi ẩn từ bảng và khi bỏ trạng thái hoạt động trong form sửa; hủy dialog không ghi dữ liệu.
- Giao diện tiếng Việt, label, focus/error association, dialog bàn phím, sidebar chuyển thành menu trên mobile, bảng cuộn trong vùng riêng.
- Menu tài khoản public thêm “Quản trị catalog” cho admin đang hoạt động. Không đổi cách đăng nhập/đăng xuất T00.

## 4. Môi trường và kiểm thử thực tế

PHP 8.3.36; Laravel 12.71.0; Sanctum 4.3.3; React 19.3.1; Vite 8.3.6. Không đổi package hoặc lockfile.

Instance MariaDB **10.11.16**, driver `mysql`, loopback cổng **33328**, datadir riêng dưới `backend/storage/framework/testing/`. Database PHPUnit: `shophub_catalog_api_test_1a22d6be8f`. Database browser cuối: `shophub_catalog_api_test_b1f568dd67`, kết quả ghi trong `backend/storage/framework/testing/t02-browser-results.json`. Mỗi lần chạy browser dùng database mới; không reset/truncate database cũ, không chạm database ShopHub đang dùng và không sửa `.env` cá nhân.

Browser sử dụng Chrome headless thật, React production build và Laravel HTTP thật; đăng nhập qua form T00 với cookie phiên. Helper chỉ tạo tài khoản giả ở database test mới, password ngẫu nhiên trong bộ nhớ, không ghi mật khẩu mặc định vào repo hoặc báo cáo. Network theo dõi qua CDP, không mock/intercept response. **Không tạo screenshot, ảnh review hoặc bản vá.**

| Kiểm tra | Kết quả | Bằng chứng |
|---|---|---|
| Guest trên mọi route Admin mới | PASS | PHPUnit kiểm tra 401 cho list/create/show/update/hide/options trước validation; Chrome kiểm tra UI và 401 của hai list. |
| Customer và admin bị khóa | PASS | PHPUnit trả 403 cho mọi route trên; Chrome customer bị chặn ở UI và hai API. |
| Admin xem/thêm/sửa/ẩn/mở lại category và brand | PASS | API test có 201/200, đọc lại dữ liệu; Chrome gửi form thật, có xác nhận ẩn và hủy. |
| Cha không tồn tại, tự làm cha, vòng ba cấp | PASS | PHPUnit và browser HTTP trả 422; so sánh toàn cây trước/sau giữ nguyên. Test gọi service nội bộ cũng bị từ chối. |
| Slug/tên trùng, payload sai, 404 và không có DELETE | PASS | PHPUnit; Chrome hiển thị lỗi slug ngay tại field. |
| Ẩn giữ dữ liệu và liên kết | PASS | PHPUnit kiểm tra product/category/brand/variant còn nguyên; Chrome kiểm tra con giữ parent_id sau ẩn cha. |
| Tác động public và mở lại | PASS | Chrome ẩn Laptop/ASUS qua UI, public danh sách rỗng/chi tiết 404; mở lại phục hồi 10 laptop. PHPUnit kiểm tra thêm con active dưới cha ẩn. |
| Loading, empty và phục hồi | PASS | Browser nhận dữ liệu thật, tìm không khớp hiện empty, xóa lọc phục hồi. |
| Hồi quy T01 | PASS | PublicCatalogApiTest + CatalogSpecificationTest trên MariaDB; browser danh mục 8+2, chi tiết, SKU bạc hết hàng 18.400.000 VND, bốn thông số thật. |
| Admin list/form ở 1440px và 390px | PASS | Chrome kiểm tra thao tác desktop, DOM/layout mobile không tràn ngang trang; không chụp ảnh. |
| Đối chiếu file design UI riêng | CHƯA CHẠY | Đường dẫn vẫn là placeholder, không tìm được file; đã dùng các tài liệu hiện có và ghi rõ lựa chọn layout. |

Lệnh đã chạy:

| Lệnh | Kết quả thực tế |
|---|---|
| `git status --short`, `git log -1 ... dev`, `git worktree list`, kiểm tra ancestor T00/dev | Xác minh nhánh, commit nền và T00 tích hợp; không thay lịch sử Git. |
| `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-catalog-test-db.ps1 -Port 33328` | PASS, instance riêng. |
| `php scripts/catalog-test-database.php` và `php artisan migrate --force` với biến môi trường test | PASS, database mới, đủ 13 migration có sẵn. Không thêm migration cho T02. |
| `php artisan test --compact --filter=AdminCatalogTest` | PASS: 5 test, 138 assertion trên SQLite `:memory:` cách ly. |
| `php artisan test --compact --filter='AdminCatalogTest\|PublicCatalogApiTest\|CatalogSpecificationTest'` | PASS: **21 test, 375 assertion**, MariaDB test riêng; lần chạy cuối 2.30 giây. Dấu `\|` trong bảng biểu diễn ký tự `|` của filter. |
| `php artisan test --compact --filter=AccountAuthenticationTest` | PASS: **4 test, 51 assertion**, SQLite cách ly, 2.67 giây. |
| `php artisan route:list --path=api/admin -v` | PASS: 12 route gồm `/admin/access` đã có và 11 route T02, đều có auth/Gate. |
| `php -l` trên 9 file PHP thay đổi/tạo mới | PASS, không lỗi cú pháp. |
| `php vendor/bin/pint` với danh sách 9 file PHP T02 | PASS; chuẩn hóa braces trong test và thứ tự imports route. |
| `npm run build` bản cuối | PASS, **116 modules**, 271 ms. |
| `npm run lint` bản cuối | Exit 0; còn đúng **1 warning có sẵn** tại `src/pages/public/ConnectionPage.jsx:9`. Không còn warning mới ở T02. |
| `node --check scripts/t02-admin-catalog-review.mjs` | PASS. |
| `node scripts/t02-admin-catalog-review.mjs` | **PASS: 11 kịch bản, 201 response API thật, 0 Runtime exception, 0 screenshot**; script đã đóng Chrome, Laravel và preview. |
| `git diff --check` | PASS. |
| `mysqladmin.exe ... --port=33328 --user=root shutdown` | Đã dừng đúng instance MariaDB kiểm thử sau nghiệm thu. |

Những trở ngại đã xử lý: build lần đầu bị sandbox chặn `spawn EPERM`, chạy lại với quyền được cấp thành công. Các lần browser đầu thất bại do harness: gán role bằng mass assignment (được T00 bảo vệ), biến ID không được truyền vào hàm CDP và predicate trả DOM node thay vì boolean. Đã sửa fixture/assertion, dùng database mới và chạy lại; không sửa T00 hoặc logic public để làm test đạt.

## 5. File thay đổi

Tạo mới:

- `backend/app/Http/Controllers/Api/AdminCategoryController.php`
- `backend/app/Http/Controllers/Api/AdminBrandController.php`
- `backend/app/Http/Requests/AdminCatalogIndexRequest.php`
- `backend/app/Http/Requests/AdminCatalogWriteRequest.php`
- `backend/app/Http/Resources/AdminCatalogResource.php`
- `backend/app/Services/AdminCatalogService.php`
- `backend/tests/Feature/AdminCatalogTest.php`
- `backend/scripts/t02-browser-fixtures.php`
- `frontend/src/layouts/AdminLayout.jsx`
- `frontend/src/pages/admin/AdminCatalogPage.jsx`
- `frontend/src/components/admin/AdminFeedback.jsx`
- `frontend/src/components/admin/ConfirmHideDialog.jsx`
- `frontend/src/services/adminCatalogService.js`
- `frontend/src/styles/admin.css`
- `frontend/scripts/t02-admin-catalog-review.mjs`
- `docs/api/admin-catalog.md`
- `docs/report/RP-T02-admin-catalog-foundation.md`

Sửa: `backend/routes/api.php`, `frontend/src/App.jsx`, `frontend/src/components/HeaderUtilities.jsx`, `README.md`.

## 6. Chạy local và tái kiểm tra

Chạy Laravel/React theo README, đăng nhập admin đang hoạt động rồi mở `/admin/categories` hoặc `/admin/brands`. Không có tài khoản/mật khẩu admin mới được tạo trên database đang dùng.

Để tái chạy browser QA, từ **backend/** trên Windows/XAMPP:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-catalog-test-db.ps1 -Port 33328
$env:APP_ENV='testing'
$env:DB_CONNECTION='mysql'
$env:DB_URL=''
$env:DB_HOST='127.0.0.1'
$env:DB_PORT='33328'
$env:DB_USERNAME='root'
$env:DB_PASSWORD=''
$env:DB_DATABASE='mysql'
$env:CACHE_STORE='array'
php scripts/catalog-test-database.php
$env:CATALOG_TEST_DATABASE=(Get-Content storage/framework/testing/catalog-api-database.json -Raw | ConvertFrom-Json).database
$env:DB_DATABASE=$env:CATALOG_TEST_DATABASE
php artisan migrate --force
# Có thể chạy PHPUnit trước bước browser; test rollback fixture của riêng nó.
Set-Location ../frontend
node scripts/t02-admin-catalog-review.mjs
```

Script cần Chrome và các binary XAMPP theo đường dẫn mặc định hiện tại (có thể đặt `CATALOG_CHROME`/`CATALOG_PHP`). Script đọc metadata, chỉ nhận prefix test, build vào cache ignored, tạo account ephemeral, ghi kết quả JSON không chứa credentials vào vùng testing ignored và tự đóng các tiến trình ứng dụng. Sau đó shutdown đúng MariaDB test:

```powershell
& 'D:/xampp/mysql/bin/mysqladmin.exe' --no-defaults --protocol=tcp --host=127.0.0.1 --port=33328 --user=root shutdown
```

## 7. Giới hạn và bàn giao

- Chưa có file design UI riêng để đối chiếu chi tiết giao diện. Layout hiện tại có đủ căn cứ nghiệp vụ từ tài liệu đã có.
- Browser kiểm tra Chrome desktop/mobile emulation; chưa chạy thiết bị vật lý hoặc trình duyệt khác.
- Khóa chống cạnh tranh đã triển khai; chưa có test stress hai tiến trình cùng đổi cây. Không dùng kết quả kiểm tra tuần tự để khẳng định đã chạy concurrency test.
- Không triển khai T03, upload ảnh/logo hoặc dashboard ngoài phạm vi. Không chạy toàn bộ suite không liên quan.

Gợi ý commit: `feat(admin): manage categories and brands with protected catalog UI`.

Bước tiếp theo đề xuất: review và tích hợp T02 theo quy trình GitHub Desktop; chưa tự triển khai T03.

## 8. Nâng cấp UI/UX Admin

### 8.1. Căn cứ và bảo vệ thay đổi cục bộ

- Nhánh vẫn là `feature/admin-catalog-foundation`, HEAD nền `a23a511d41c69755a485f3bc0ae64fc0dcca4206`. T02 chưa được commit vào `dev`; không đổi nhánh hoặc lịch sử Git.
- Working tree đã có các file T02 sửa/tạo từ đợt trước. Đã đọc trạng thái thực tế và lưu bản sao file UI/report/script liên quan dưới `backend/storage/framework/testing/t02-ui-before/` (ignored), rồi nâng cấp trực tiếp các file trong phạm vi yêu cầu. Không loại bỏ thay đổi khác.
- Đã đọc lại `AGENTS.md`, `README.md`, ba file `docs/design/SHOPHUB_BUSINESS_ARCHITECTURE.md`, `docs/design/shophub-usecase-system.md`, `docs/design/shophub-erd.md`, `docs/api/admin-catalog.md`, báo cáo này, AdminLayout/AdminCatalogPage/admin.css, component dùng chung, API client và kịch bản browser.
- Không tìm thấy file cấu trúc UI mới trong tài liệu thiết kế hoặc frontend. Bốn ảnh được nhắc trong yêu cầu không có trong ngữ cảnh đính kèm nhận được, nên chưa thể so sánh trực tiếp với ảnh. Căn cứ thiết kế là nhận diện ShopHub hiện hành và các yêu cầu UI/UX cụ thể trong task; không tuyên bố đã đối chiếu ảnh chưa nhận được.
- Tái sử dụng font **IBM Plex Sans/IBM Plex Mono** được phục vụ local và component Icon có sẵn. Không thêm dependency hoặc tài sản ảnh.

### 8.2. Thay đổi theo màn hình

| Khu vực | Thay đổi |
|---|---|
| Khung Admin | Sidebar navy, trạng thái chọn có nền/viền/icon, Xem cửa hàng ở cuối sidebar. Topbar gọn gồm breadcrumb theo route và tên/vai trò từ AccountContext thật. Bỏ eyebrow và mô tả lặp của form. |
| Mobile | Sidebar chuyển thành dialog điều hướng; mở bằng nút/Enter, đóng bằng nút/Escape hoặc chọn liên kết. Có khóa cuộn nền, giữ Tab trong dialog và trả focus về nút mở khi đóng. Chỉ có hai module T02. |
| Danh sách | Toolbar tìm/lọc/xóa gọn, số kết quả và khoảng đang xem lấy từ metadata API, nút Thêm nổi bật. Tên/slug có phân cấp chữ; số sản phẩm và thứ tự căn phải; nhãn trạng thái có chữ, không chỉ dựa vào màu. |
| Danh mục | Cha trực tiếp hiển thị bằng tên từ API `/categories/options`, kể cả khi cha không nằm trong trang/bộ lọc hiện tại. Thứ tự lấy từ bản ghi thật. Có chú thích đây là danh sách phân trang, không biểu diễn toàn bộ cây. |
| Điều hướng quay lại | Link thêm/sửa lưu URL danh sách trong router state; Quay lại, breadcrumb, Hủy và lưu thành công giữ query tìm kiếm, trạng thái, per_page và page khi phù hợp. Có trạng thái riêng khi trang hiện tại không còn dữ liệu nhưng tổng vẫn lớn hơn 0. |
| Empty/error/loading | Tách chưa có dữ liệu (Thêm), tìm không khớp (Xóa bộ lọc), trang rỗng (Về trang đầu), lỗi tải (Thử lại), phiên/quyền và loading. Thông báo thành công có nút đóng. |
| Form | Desktop có cột form chính và cột ngữ cảnh hẹp; mobile một cột với Lưu/Hủy dễ thao tác. Nhóm Thông tin cơ bản, Phân cấp (chỉ danh mục), Trạng thái hiển thị. Label, hint, lỗi field và focus được liên kết. |
| Slug | Tạo mới tự gợi ý từ tên tiếng Việt, có `đ/Đ`; dừng gợi ý sau khi sửa slug thủ công, có nút dùng lại gợi ý. Khi sửa bản ghi, đổi tên giữ nguyên slug. Định dạng/trùng được backend kiểm tra và trả lỗi tại field; giữ dữ liệu đã nhập. |
| Cha và ngữ cảnh | Loại chính nó/hậu duệ như T02 cũ; lựa chọn gốc rõ ràng, cha ẩn có nhãn và giải thích. Hiển thị trạng thái hiện tại riêng với thay đổi sẽ lưu. products_count từ API được ghi là **sản phẩm liên kết**, không dùng làm số sản phẩm public sẽ biến mất. |
| Xác nhận ẩn | Nêu tên bản ghi, số liên kết nếu có, tác động theo loại và khả năng mở lại; danh mục giải thích ẩn cha không tự ẩn con. Hủy/nút Giữ lại/Escape không gửi mutation. Lưu có guard chống gửi trùng và focus lỗi đầu tiên sau khi đóng modal. |

CSS mới đều nằm dưới `.admin-shell`; không thay CSS/markup của storefront, font/icon dùng chung, router, API client, quyền T00/T02 hay logic backend. Không thêm menu sản phẩm/SKU/tồn kho/dashboard.

API hiện tại đã đủ. List gọi thêm category options để tra tên cha. Form sửa đọc products_count từ response danh sách phù hợp với bản ghi, không giả định API chi tiết có trường này; nếu không tìm được số liệu thì không hiển thị count. Không đổi contract hoặc thêm endpoint.

### 8.3. Kiểm thử thực tế

Database driver `mysql`, **MariaDB 10.11.16**, instance test riêng tại `127.0.0.1:33338`. Không sửa `.env` cá nhân, không tạo tài khoản hoặc ghi catalog vào database ShopHub đang dùng.

- Backend regression chạy trên `shophub_catalog_api_test_3c30ae0be7` trước khi browser tạo fixture.
- Browser nghiệm thu cuối dùng database mới `shophub_catalog_api_test_9f0ffe6a2d`. Helper tạo hai tài khoản ephemeral với mật khẩu ngẫu nhiên trong bộ nhớ. Ban đầu chỉ có tài khoản để kiểm tra empty state thật; sau đó dùng các seeder có sẵn để chạy nghiệp vụ catalog. Không mock API hoặc thay response.
- Kết quả JSON local (ignored): `backend/storage/framework/testing/t02-browser-results.json`, có checks, status Network và danh sách mutation không chứa payload/credentials. Không tạo ảnh/screenshot hoặc bản vá.

| Kiểm tra | 1440px | 768px | 390px |
|---|---|---|---|
| Danh sách Danh mục và Thương hiệu, tên Việt dài, không tràn ngang toàn trang | PASS | PASS | PASS |
| Form thêm của cả hai module, nhóm trường và không tràn ngang | PASS | PASS | PASS |
| Form sửa của cả hai module, breadcrumb và dữ liệu thật | PASS | PASS | PASS |
| Tab từ Tên tới Slug, outline focus rõ ít nhất 3px | PASS | PASS | PASS |
| Tương phản chữ trên nút chính, mô tả, tên bản ghi, badge và hint/label | PASS | PASS | PASS |
| Menu mobile mở Enter, Tab không thoát dialog, Escape trả focus, nút đóng | Không áp dụng (sidebar desktop) | PASS | PASS |

Tương phản được tính từ màu computed thực tế của các vị trí nêu trên, ngưỡng **4.5:1** cho chữ thường. Đây không phải báo cáo quét toàn bộ WCAG hoặc đối chiếu pixel với ảnh.

| Luồng tương tác/API thật | Kết quả |
|---|---|
| Guest 401, customer 403, admin đăng nhập bằng T00 | PASS |
| Hai danh sách ban đầu chưa có dữ liệu và CTA Thêm đúng module | PASS |
| Thêm/sửa/ẩn/mở lại cả hai module; giữ liên kết; tác động public | PASS — giữ toàn bộ kiểm tra nghiệp vụ T02 gốc |
| Cha thiếu, tự làm cha, vòng ba cấp trả 422 và giữ nguyên cây | PASS |
| Gợi ý slug tiếng Việt `đ/Đ`, khóa gợi ý sau sửa thủ công, đổi tên khi edit không đổi slug | PASS — cả hai module |
| Slug sai định dạng/trùng trả lỗi API tại field; giữ tên/slug nhập, focus Slug | PASS |
| Gửi hai submit liên tiếp chỉ phát sinh một POST | PASS — cả hai module |
| Hủy xác nhận từ bảng hoặc Escape trong form không gửi mutation | PASS |
| Giữ tìm kiếm/trạng thái/per_page/page 2 qua Quay lại, Hủy và Lưu | PASS — cả hai module |
| Tên cha thật khi lọc; cảnh báo cha ẩn; count được mô tả là liên kết | PASS |
| Tìm không khớp, xóa lọc; dừng Laravel thật gây lỗi, bật lại và Thử lại phục hồi | PASS |
| Hồi quy T01: danh mục 8+2, chi tiết, SKU bạc hết hàng và bốn thông số thật | PASS |
| So sánh trực tiếp bốn ảnh và file UI design riêng | CHƯA CHẠY — ảnh không có trong ngữ cảnh nhận được, không tìm thấy file UI riêng |

| Lệnh | Kết quả lần nâng cấp này |
|---|---|
| `npm run lint` | Exit 0, không có warning mới; còn warning cũ `react(set-state-in-effect)` tại `src/pages/public/ConnectionPage.jsx:9`. |
| `npm run build` cuối | PASS, **119 modules**, **249 ms**. |
| `node --check scripts/t02-admin-catalog-review.mjs` | PASS. |
| `node scripts/t02-admin-catalog-review.mjs` cuối | **PASS: 19 kịch bản, 465 response API thật, 0 Runtime exception, 0 screenshot**. |
| `php artisan test --compact --filter='AdminCatalogTest\|PublicCatalogApiTest\|CatalogSpecificationTest'` với DB test riêng | **PASS: 21 test, 375 assertion, 3.55 giây**, MariaDB thật. Dấu `\|` trong bảng biểu diễn ký tự `|` trong biểu thức filter. |
| `php -l scripts/t02-browser-fixtures.php` | PASS. |
| Tạo DB mới bằng helper và `php artisan migrate --force` với biến môi trường test | PASS; 13 migration đã có, không tạo migration mới. |
| `git diff --check` | PASS; đã đối chiếu hash app/routes/schema backend với snapshot trước nâng cấp: không đổi. |
| Shutdown MariaDB test cổng 33338 | Thành công; Chrome/Laravel/preview cũng đã được script đóng. |

Lần browser đầu đạt nghiệp vụ, slug và 1440px nhưng dừng ở Enter mở menu 768px. Nguyên nhân là harness gửi Enter thiếu `text/unmodifiedText` để Chrome phát sự kiện phím đầy đủ. Đã sửa cách gửi phím CDP, tạo database mới và chạy lại toàn bộ đạt cả ba kích thước; không thêm handler bàn phím giả vào nút để né lỗi kiểm thử.

### 8.4. File sửa/tạo trong lần nâng cấp UI

Sửa:

- `frontend/src/layouts/AdminLayout.jsx`
- `frontend/src/pages/admin/AdminCatalogPage.jsx`
- `frontend/src/components/admin/AdminFeedback.jsx`
- `frontend/src/components/admin/ConfirmHideDialog.jsx`
- `frontend/src/styles/admin.css`
- `frontend/scripts/t02-admin-catalog-review.mjs` — cập nhật selector và thêm nghiệm thu UI, giữ kiểm tra nghiệp vụ.
- `backend/scripts/t02-browser-fixtures.php` — chỉ bổ sung tùy chọn QA `--accounts-only` để kiểm tra danh sách trống trước khi seed; không thay mã ứng dụng backend.
- `docs/report/RP-T02-admin-catalog-foundation.md`

Tạo:

- `frontend/src/utils/adminCatalog.js` — gợi ý slug, URL quay lại và nhãn cha.
- `frontend/src/components/admin/AdminStatusBadge.jsx`
- `frontend/src/components/admin/dialogFocus.js`

Các thay đổi T02 đã có trước phiên vẫn được giữ. Chưa commit, push hoặc merge. Không tạo review image, screenshot hoặc patch Git.

Gợi ý commit cho phần nâng cấp: `feat(admin): refine catalog management UI and keyboard navigation`.

Bước tiếp theo đề xuất: review giao diện local với tài khoản admin hiện có; khi bốn ảnh hoặc file design UI có sẵn, đối chiếu chi tiết thị giác trong một lượt review tiếp theo. Chưa tự mở rộng T03.
