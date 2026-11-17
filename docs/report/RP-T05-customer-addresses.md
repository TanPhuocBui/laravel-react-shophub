# T05 — Địa chỉ giao hàng (UC17)

Ngày triển khai/kiểm thử: **16/11/2026**. Kết quả: **Hoàn tất backend, frontend và nghiệm thu T05 bằng API thật trên database riêng**.

## 1. Nền Git và tài liệu

- Nhánh: `feature/customer-addresses`, đã tồn tại khi bắt đầu. HEAD và dev cùng commit **11323ce19117564eea2a2025b3f1705999163ee6** (merge PR #4 T04/PERF). Working tree ban đầu sạch; giữ nhánh này, không tạo project/worktree khác và không merge.
- Xác minh T00 trên dev bằng route login/register/logout, `/api/user`, Sanctum stateful middleware, User role/is_active, Gate và UI `/account`; không chỉ dựa báo cáo lịch sử.
- Tìm trong repo Windows không có Address, migration addresses, service/API/UI/test hoặc báo cáo T05 trước đó. Triển khai mới theo yêu cầu hiện tại; không khẳng định đã nhập mã từ workspace khác.
- Đã đọc `AGENTS.md`, `README.md`, `docs/design/SHOPHUB_BUSINESS_ARCHITECTURE.md`, `docs/design/shophub-usecase-system.md` (UC17), `docs/design/shophub-erd.md` mục 3.2, AccountPage, AccountContext, Axios, middleware và test auth hiện có. Không tìm thấy file cấu trúc UI riêng. `docs/shophub-database-design.md` và bản từng đặt dưới docs/report không có trên bản repo hiện tại; dùng ERD đã có làm căn cứ schema.
- Giao diện dùng nhận diện Tài khoản Cobalt Orbit hiện có, tách AccountField dùng chung cho auth và địa chỉ; CSS mới giới hạn trong `.storefront` và các class địa chỉ, không đổi Admin/catalog layout. Không cài dependency hoặc đổi lockfile.

## 2. Migration, model và API

Migration mới: `backend/database/migrations/2026_11_16_100000_create_addresses_table.php`.

| Trường | Cấu trúc |
|---|---|
| id | BIGINT unsigned PK |
| user_id | FK users, index của FK, cascade khi xóa tài khoản |
| recipient_name | VARCHAR(255), bắt buộc |
| phone | VARCHAR(20), bắt buộc; giữ chuỗi và số 0 đầu |
| province, ward | VARCHAR(100), bắt buộc, văn bản tự nhập |
| address_line | VARCHAR(255), bắt buộc |
| is_default | Boolean, mặc định false ở schema |
| created_at, updated_at | Timestamps |

Model Address có belongsTo User; User có hasMany addresses. Không mass assign user_id từ payload. Resource chỉ trả thông tin địa chỉ, ID và timestamps; không trả user_id/email. Không sửa migration cũ, không seed địa chỉ thật.

Contract đầy đủ: [customer-addresses.md](../api/customer-addresses.md).

| Method | API | Thành công |
|---|---|---|
| GET | `/api/customer/addresses` | 200, data/links/meta; page mặc định 1, 10 dòng/trang, per_page tối đa 50 |
| POST | `/api/customer/addresses` | 201, data địa chỉ |
| PUT | `/api/customer/addresses/{id}` | 200, dữ liệu đã sửa |
| DELETE | `/api/customer/addresses/{id}` | 204, không body |
| PATCH | `/api/customer/addresses/{id}/default` | 200, địa chỉ mặc định |

Middleware: auth:sanctum → EnsureAccountIsActive → Gate manage-addresses. Chỉ role customer active được dùng. Guest 401; admin/customer khóa 403. Mọi ID scope quan hệ user đang đăng nhập, không tồn tại/thuộc người khác 404. Form Request kiểm tra ownership trước validation khi sửa, service kiểm tra lại sau khóa. ID số quá lớn cũng trả 404, không lỗi ép kiểu int. user_id/id/timestamps bị từ chối kể cả gửi null. Validation 422 theo field, không đổi dữ liệu cũ.

Phone nhận string 8–15 chữ số, có thể bắt đầu bằng +; không nhận số JSON/chữ/dấu phân cách. Đây là kiểm tra định dạng, không xác minh số điện thoại thật. Tỉnh/thành phố và phường/xã nhập text; không áp danh mục hành chính cũ, không thêm quận/huyện hoặc dịch vụ địa giới.

## 3. Mặc định, ownership và transaction

- Địa chỉ đầu tiên tự mặc định dù client gửi false. Khi còn địa chỉ, các thao tác service duy trì đúng một mặc định.
- Tạo/đặt một địa chỉ khác làm mặc định bỏ cờ trên các dòng **khác** cùng owner. Đặt lại địa chỉ đang mặc định là idempotent, không làm mất cờ.
- Sửa mặc định giữ cờ nếu không gửi is_default. Không cho PUT false lên địa chỉ đang mặc định để tránh sổ không còn mặc định; trả 422 tại is_default, giữ nội dung. UI khóa checkbox mặc định hiện tại và hướng dẫn chọn địa chỉ khác.
- Xóa mặc định chọn dòng còn lại có created_at sớm nhất, tie-break id nhỏ nhất. Thứ tự này khác UI (default trước, rồi mới nhất). Xóa thường giữ mặc định; xóa hết trả rỗng; lần tạo sau lại mặc định.
- Mọi mutation chạy transaction, khóa **bản ghi user trước** để serialize cả khi sổ chưa có dòng; đọc lại role/active, sau đó khóa địa chỉ của owner. Lỗi rollback cả nội dung/cờ. Không dùng unique(user_id,is_default), vì sẽ hạn chế sai số dòng không mặc định.
- Có retry deadlock nội bộ sau rollback, tối đa 3 lần; không có side effect ngoài DB. Frontend không tự gửi lại HTTP write chưa rõ kết quả.
- Test cạnh tranh dùng hai PHP process/kết nối MariaDB độc lập và barrier đồng bộ. Worker giữ ngắn khóa user thực tế do service lấy để tạo tranh chấp; kiểm tra cả hai quan sát FOR UPDATE và bộ đếm Innodb_row_lock_waits tăng. Cặp tạo đồng thời, hai yêu cầu đổi mặc định, xóa mặc định đồng thời đặt địa chỉ khác đều giữ invariant. Không dùng server PHP một worker để tự nhận đã kiểm tra cạnh tranh DB.

## 4. Frontend và phản hồi

- `/account` có hai mục cho customer: Thông tin tài khoản và **Địa chỉ giao hàng**; deep link `/account?view=addresses`. Admin không có mục này. Không thêm route Checkout hay chọn địa chỉ cho đơn cụ thể.
- Sổ hiển thị người nhận, phone, địa chỉ gồm address_line/ward/province, nhãn Mặc định, thao tác Thêm/Sửa/Xóa/Đặt mặc định và phân trang theo metadata API.
- Desktop có vùng tài khoản rộng hơn; 768/390px một cột. Dùng AccountField/label/focus và dialog native với focus trap; xác nhận xóa nêu tác động tới mặc định. Giữ lại/Escape không gửi DELETE.
- Tải/rỗng/lỗi/Thử lại, thông báo thành công, lỗi tại trường và focus đầu tiên; input giữ lại sau 422. Ref chặn gửi lặp kể cả hai submit trong cùng frame. Hủy GET khi unmount/đổi lần tải; không cache sổ địa chỉ giữa hai tài khoản.
- Nếu write mất phản hồi/timeout/5xx, giữ form, khóa write và cho **Kiểm tra danh sách đã lưu** bằng GET. Nếu write đã thành công nhưng read-back lỗi cũng chỉ cho đọc lại trước. Sau GET thành công người dùng đối chiếu dữ liệu rồi tự quyết định gửi tiếp; không suy đoán trùng nội dung là cùng request, không tự retry POST/PUT/PATCH/DELETE.

## 5. Môi trường và kiểm tra thực tế

PHP 8.3.36, Laravel 12.71.0, Sanctum 4.3.3; Node 22.22.2, React 19.3.1, Vite 8.3.6. Driver mysql, **MariaDB 10.11.16** trên instance/datadir kiểm thử riêng `127.0.0.1:33378`, không dùng database shophub.

- DB full backend cuối: `shophub_catalog_api_test_3148d0f28a`; full backend trước đó: `shophub_catalog_api_test_bd7d101b04`.
- DB browser đạt: `shophub_catalog_api_test_17ab093359`. Chrome + PHP server + Vite preview dùng cổng động, cùng localhost, Sanctum cookie/CSRF thật, session database. Có OPcache CLI trong browser harness để giảm overhead PHP, vẫn validate tệp mỗi request. Không mock response thành công, không screenshot.
- Các test T05/DB concurrency chạy trên MariaDB. Một số test auth có sẵn tự dùng SQLite in-memory riêng theo thiết kế của test đó; không gọi chúng là xác minh auth trên MySQL. Phân quyền/session đã kiểm tra thêm qua Chrome với MariaDB thật.
- 14 migration được chạy thành công trên các database riêng, gồm addresses. Không fresh/refresh/wipe/rollback/truncate dữ liệu đang dùng. Tài khoản test/mật khẩu ngẫu nhiên chỉ tồn tại ở DB riêng và môi trường tiến trình, không có admin mặc định trong repo.

| Kịch bản | Kết quả | Bằng chứng |
|---|---|---|
| Guest 401, admin 403, customer khóa 403 | PASS | PHPUnit mọi endpoint; Chrome mọi endpoint guest/admin và session customer đã bị khóa |
| A tạo hai địa chỉ; đầu tiên tự mặc định | PASS | API + UI thật; giữ phone 0 đầu |
| Đổi/sửa/đặt lại mặc định | PASS | Một mặc định, ID giữ nguyên, PATCH lặp không bỏ cờ |
| Xóa mặc định chọn địa chỉ tạo sớm nhất | PASS | PHPUnit có timestamps khác thứ tự ID; Chrome fallback về địa chỉ còn lại |
| Xóa hết rồi tạo lại | PASS | Danh sách 0, dòng đầu lần sau tự mặc định |
| B không thấy/sửa/xóa/đặt mặc định địa chỉ A | PASS | List B trống/riêng; ID A trả 404, dữ liệu A giữ nguyên |
| Không tồn tại/ID số quá lớn | PASS | 404, không lỗi ép kiểu |
| Validation và spoof user_id | PASS | 422, không ghi dở; UI giữ input và focus phone |
| Rollback sau khi bỏ mặc định cũ nhưng insert lỗi | PASS | Mô phỏng lỗi DB, địa chỉ/cờ cũ được giữ |
| Cạnh tranh hai kết nối thật | PASS | 3 cặp operation, FOR UPDATE và lock waits thực tế, cuối cùng một mặc định |
| Desktop/mobile 1440/768/390px | PASS | List/thêm/sửa, tên tiếng Việt dài, save thật, focus, không tràn ngang toàn trang |
| Hủy/Escape dialog xóa | PASS | Không mutation, trả focus tới nút mở |
| Mất delivery sau server đã tạo 201 | PASS | Chủ động cắt delivery bằng CDP; chỉ một POST, input còn, khóa gửi lặp, GET đối chiếu |
| Read-back lỗi sau write thành công; tải list lỗi | PASS | Nút kiểm tra/Thử lại phục hồi, không phát lại write |
| Phân trang | PASS | Meta owner đúng; Chrome chuyển trang 2, hiển thị đúng 2 dòng còn lại |

## 6. Lệnh và kết quả

| Lệnh/nhóm | Kết quả thực tế |
|---|---|
| git status --short; branch; log; rev-parse HEAD/dev; đọc file auth trên dev | PASS, nền và trạng thái mục 1 |
| powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-catalog-test-db.ps1 -Port 33378 | PASS, tạo instance riêng |
| php scripts/catalog-test-database.php; php artisan migrate --force, env testing/test-prefix | PASS, 14 migration trên DB riêng |
| php artisan migrate:status (DB test cuối) | PASS, 14 migration Ran, batch 1 |
| php artisan db:table addresses --database=mysql | FAIL do PHP thiếu intl khi CLI định dạng output; không phải lỗi migration |
| Đọc metadata bằng Schema::getColumns/getIndexes/getForeignKeys trên DB test | PASS; 10 cột, phone varchar(20), index user_id và FK users ON DELETE CASCADE; không cần đổi php.ini/cài intl |
| php artisan test --compact --filter='CustomerAddressTest\|AccountAuthenticationTest' đợt đầu | FAIL 2, PASS 9; phát hiện lỗi cờ Eloquent và guard cache khi test chuyển user; đã sửa và chạy lại |
| php artisan test --compact --filter=AddressConcurrencyTest | PASS 1, 27 assertions sau sửa chuẩn hóa đường dẫn barrier Windows; trước đó worker chưa tới barrier, không tính PASS |
| php artisan test --compact toàn bộ, trước bổ sung ID lớn | PASS 64 test, 1257 assertions, 21.04s |
| php artisan test --compact toàn bộ, lần cuối | **PASS 64 test, 1260 assertions**, 12.53s, không skip |
| CATALOG_PHP_OPCACHE=1; node scripts/t02-admin-catalog-review.mjs --addresses | **PASS 11 kịch bản, 178 phản hồi API thật, 0 Runtime exception** |
| npm run lint | PASS exit 0; chỉ warning cũ ConnectionPage.jsx:9 react(set-state-in-effect) |
| npm run build lần cuối | **PASS 131 modules, 225ms**, exit 0 |
| vendor/bin/pint --dirty; vendor/bin/pint --dirty --test | PASS; chỉ PHP của thay đổi T05 |
| php artisan route:list --path=api/customer --except-vendor | PASS, 5 endpoint, cùng auth/active/customer gate |
| node --check script T05 và harness | PASS exit 0 |
| git diff --check | PASS, không lỗi whitespace |
| Kiểm tra schema/migrate:status trên cấu hình shophub thật 127.0.0.1:3306, lượt nghiệm thu đầu | FAIL môi trường: server từ chối kết nối; đã kiểm tra lại khi xử lý lỗi ở mục 9 |
| Chạy migration trên shophub thật, lượt nghiệm thu đầu | CHƯA CHẠY ở lượt đầu; đã áp dụng riêng migration T05 ở mục 9 |
| Xác minh PID/datadir rồi dừng MariaDB test 33378 | PASS; đã dừng đúng instance T05, giữ datadir và không đụng MySQL XAMPP thật |

Trong hai lượt browser đầu, công cụ cần sửa việc focus trước khi click mô phỏng và truyền ID vào callback CDP (callback chạy trong browser không đóng trên biến Node). UI đã xóa đúng nhưng callback chờ sai. Đã sửa công cụ và chạy lại toàn bộ trên DB mới; không bỏ các assert nghiệp vụ. Lỗi Eloquent thật được sửa bằng bỏ cờ trên dòng khác, thay vì clear cả dòng đích rồi trông chờ dirty tracking ghi lại true.

Artifact local: `backend/storage/framework/testing/t05-browser-results.json` (ignored), chỉ lưu checks/status URL/method, không mật khẩu/cookie. Worker/barrier/upload/profile đều trong vùng kiểm thử. Harness tự đóng Chrome/PHP/Vite sau khi xong.

## 7. File tạo/sửa

- Migration mới nêu ở mục 2; model `backend/app/Models/Address.php`, quan hệ trong `backend/app/Models/User.php`.
- Backend mới: `backend/app/Services/CustomerAddressService.php`, `backend/app/Http/Requests/CustomerAddressRequest.php`, `backend/app/Http/Resources/AddressResource.php`, `backend/app/Http/Controllers/Api/CustomerAddressController.php`.
- Backend tích hợp: `backend/routes/api.php`, `backend/app/Providers/AppServiceProvider.php`.
- Test/tool mới: `backend/tests/Feature/CustomerAddressTest.php`, `backend/tests/Feature/AddressConcurrencyTest.php`, `backend/scripts/address-concurrency-worker.php`, `backend/scripts/t05-browser-fixtures.php`, `frontend/scripts/t05-customer-address-scenarios.mjs`.
- Frontend mới: `frontend/src/pages/customer/CustomerAddressBook.jsx`, `frontend/src/components/account/AccountField.jsx`, `frontend/src/services/customerAddressService.js`, `frontend/src/styles/customer-addresses.css`.
- Frontend sửa: `frontend/src/pages/public/AccountPage.jsx`, `frontend/scripts/t02-admin-catalog-review.mjs` (cờ --addresses, giữ nhánh kiểm thử cũ).
- Tài liệu: `README.md`, `docs/api/customer-addresses.md`, báo cáo này. Không sửa .env, lockfile, auth controller, API catalog, dữ liệu thật hoặc triển khai T07.

## 8. Chạy migration Windows/XAMPP và bàn giao

Ở lượt nghiệm thu đầu database shophub chưa kết nối được. Lượt xử lý bổ sung ở mục 9 đã xác minh và áp dụng migration T05 trên local. Hướng dẫn cho lần cài đặt mới:

1. Mở XAMPP Control Panel, bật MySQL/MariaDB. Xác minh DB_HOST/DB_PORT/DB_DATABASE trong backend/.env trỏ đúng database local cần giữ.
2. Từ thư mục backend, kiểm tra trạng thái migration rồi chạy migration bổ sung:

```powershell
cd D:\University\HK1_2627\intern\project\laravel-react-shophub\backend
php artisan migrate:status
php artisan migrate
php artisan serve --host=localhost --port=8000
```

3. Từ frontend chạy npm run dev, đăng nhập customer và mở `/account?view=addresses`. Không cần seeder địa chỉ hoặc tài khoản mới. Không dùng migrate:fresh/refresh để bổ sung bảng này.

Để tái kiểm tra tự động, dùng helper MariaDB riêng + tạo DB mới và env testing/CATALOG_TEST_DATABASE như các báo cáo T02–T04, migrate trước, chạy PHPUnit trước browser nếu dùng cùng DB. Browser --addresses yêu cầu DB mới không có accounts; seed fixture không được chạy trên shophub thật. Chạy test cạnh tranh cần proc_open và MariaDB riêng; không đổi sang SQLite rồi gọi đó là test cạnh tranh MySQL.

Không còn luồng bắt buộc T05 chưa chạy trên môi trường kiểm thử. Chưa thử trên thiết bị vật lý/trình duyệt khác Chrome emulation. Migration local đã được bổ sung ở mục 9. Chọn địa chỉ cho một đơn cụ thể, cart/checkout và snapshot đơn vẫn thuộc T07, không triển khai ở đây.

Gợi ý commit: `feat(customer): add shipping address book with safe default selection`. Chưa tự commit, push hoặc merge. Bước tiếp theo đề xuất: review T05 trên phiên customer của người dùng trước khi tích hợp bằng quy trình Git hiện có.

## 9. Xử lý màn hình không tải được — 16/11/2026

- Sau khi MySQL local đã chạy, người dùng báo lỗi tải sổ địa chỉ. Health Laravel trả 200; log đúng thời điểm ghi SQLSTATE[42S02]/1146 vì bảng `shophub.addresses` chưa tồn tại. UI dùng thông báo lỗi chung nên hiện như lỗi kết nối.
- Kiểm tra chỉ đọc xác nhận driver mysql, database shophub, addresses chưa tồn tại; migrate:status cho thấy duy nhất migration T05 Pending. Chạy --pretend thấy chỉ CREATE addresses và FK sang users.
- Đã chạy **riêng** `php artisan migrate --path=database/migrations/2026_11_16_100000_create_addresses_table.php` trên database local đã xác minh: **PASS, 67.98ms**. Không chạy seed/fresh/reset; giữ nguyên các bảng và dữ liệu cũ.
- Kiểm tra lại: addresses_exists=true; migration T05 **Ran, batch 6**. Gọi HTTP API địa chỉ không session trả 401 đúng quyền. Không dùng cookie/mật khẩu hoặc giả lập đăng nhập tài khoản cá nhân để tự nhận đã kiểm tra UI trong phiên đó.
- Người dùng có thể bấm **Thử lại** ở màn hình đang mở để tải sổ địa chỉ. Các file patch đang được người dùng xóa được giữ nguyên trạng thái Git, không khôi phục.
