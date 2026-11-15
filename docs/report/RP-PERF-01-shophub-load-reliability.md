# PERF-01 — Độ tin cậy tải ShopHub sau T04

Ngày: **16/11/2026**. Kết quả: **đã sửa các điểm nghẽn và luồng phục hồi được tái hiện; còn giới hạn về biến động tốc độ PHP CLI được ghi rõ bên dưới**.

## 1. Git, phiên bản và phạm vi

- Nhánh đang chứa sửa đổi: feature/admin-product-publishing.
- Commit nền thực tế: **f86ddfd3b5bc29408acebe377d4f0eb9173c9a48**, T04 đã commit trên nhánh tính năng. dev vẫn ở **2108e1816c33d47de8c656d9f55d31371215e827** (T03); chưa có T04 trên dev, nên giữ đúng bản T04 này, không tự merge/chuyển sang dev.
- Working tree sạch trước PERF-01. Không ghi đè thay đổi của người dùng, không commit/push/merge, không tạo Git patch hoặc screenshot.
- Đã đọc AGENTS.md, README.md, docs/report/RP-T04-admin-product-publishing.md, docs/api/public-catalog.md, docs/api/admin-product-publishing.md. Đối chiếu Axios, AccountProvider/AdminLayout, các page/hook/service React, controller/service T04 và cấu hình session/CORS/database.
- Giữ nguyên contract API, middleware/auth/Gate, validation, trạng thái bán, quy tắc SKU/giá/tồn và transaction/khóa T04. Không sửa migration/model/seeder/index hoặc dữ liệu shophub.

## 2. Môi trường và phương pháp

**Cách chạy hằng ngày đã xác minh bằng tiến trình/cổng:** PHP 8.3.36, Laravel 12.71.0, php artisan serve --host=localhost --port=8000; Vite 8.3.6 qua npm run dev, cổng 5173; Node 22.22.2. Database driver mysql, MariaDB 10.11.16, DB_HOST=127.0.0.1:3306; session và cache dùng database. APP_ENV=local, config chưa cache, OPcache CLI chưa bật. Frontend dùng VITE_BACKEND_URL=http://localhost:8000, nguồn catalog API. Không đổi .env/php.ini.

- Chạy Chrome headless qua CDP **Network + Performance**, không throttle mạng/CPU, không screenshot. Thu request URL/method/status, thời gian chờ headers/TTFB, tổng tải, bytes ảnh, lỗi/cancel, JS/layout/task duration và long tasks. Không ghi giá trị header token/cookie hoặc mật khẩu.
- Đo **5 lượt mỗi trang và kiểu điều hướng**, riêng direct URL và chuyển trang trong React; **5 lượt mỗi thao tác ghi**. Direct nạp lại document; SPA dùng Link thật khi có hoặc pushState/popstate cùng router khi menu chưa có đường dẫn trực tiếp. Cold restart cả PHP/Vite do công cụ sở hữu và xóa browser cache giữa các lượt.
- Mốc sẵn sàng: home có hero và dữ liệu feeds hoàn tất theo luồng hiện tại; danh sách có form lọc; chi tiết có vùng SKU; Admin có kết quả list; trang Thông số có form/chọn danh mục; editor có vùng thông số/công bố; mutation có thông báo/trạng thái phản ánh kết quả. Đo đến DOM đã render, không chờ mọi ảnh dưới màn hình.
- Bảng ghi **median ms**, mỗi ô bình thường có 5 mẫu. TTFB là khoảng request đến response headers từ CDP, gồm thời gian xếp hàng/preflight; không đồng nghĩa thời gian SQL. API max là request chậm nhất trong 5 lượt, không phải median. Lỗi và Reload là số lần lỗi/số lần thực sự nạp lại để phục hồi, không tính lần direct navigation theo kịch bản.
- Local thật chỉ đọc: 16 sản phẩm, 4 danh mục; browser riêng chưa đăng nhập. Ba URL Admin tại local thật chỉ xác minh guard/khởi tạo phiên. Không dùng phiên cá nhân hoặc đổi quyền tài khoản của người dùng.
- Admin đăng nhập và mọi mutation dùng **database riêng** shophub_catalog_api_test_45ac2a1824 trên instance 127.0.0.1:33368; session/cache database giống local; APP_ENV=local, cùng PHP/router/Vite, cổng động và CORS/stateful tương ứng. Seed hiện có + một sản phẩm fixture riêng, tổng 16 sản phẩm/4 danh mục; fixture reset về draft trước mỗi phép so sánh. Dữ liệu này được giữ giữa trước/sau, không ghi vào shophub thật.
- Backend regression/browser hồi quy dùng database mới riêng **shophub_catalog_api_test_1de55cce3e**, cùng MariaDB. Không dùng fresh/refresh/wipe/truncate trên database đang dùng.
- Tổng **761 mẫu Chrome đo tải/độ tin cậy**, ngoài 38 kịch bản hồi quy. Raw artifacts và Chrome profiles trong vùng ignored; không đưa output build, database, token hay ảnh vào Git.

## 3. Nguyên nhân và bằng chứng

### 3.1. GET mang header CSRF làm tăng hàng đợi

Axios trước sửa đặt withXSRFToken=true cho mọi method. Khi đã có cookie XSRF, cả GET lẫn GET bootstrap CSRF đều gửi X-XSRF-TOKEN qua hai origin khác cổng. Network ghi OPTIONS 204 trước mỗi URL; CORS max_age hiện bằng 0. Trên PHP development server một worker, các request cộng dồn thời gian chờ.

Ví dụ home-direct-2 local: categories GET 1.554s, brands 1.906s, api/user 2.299s; dải gia dụng GET 3.653s. Cùng pha có 8 OPTIONS. API đọc đo riêng bằng curl lúc đầu chỉ 0.253–0.286s. Performance của document đó: ScriptDuration 0.137s, LayoutDuration 0.026s, TaskDuration 0.311s, không long task ghi nhận; phần chờ mạng lớn hơn render.

Cold trước sửa: **1/5 home không sẵn sàng sau 30s**. Ba GET sản phẩm bị ERR_ABORTED khoảng 9.963–9.986s, khớp timeout Axios 10000ms, trong khi các preflight đã chờ 2.094–6.248s và GET trước đó tới 9.245s. Không có HTTP 500 cho các request bị timeout. Không coi mọi canceled request là lỗi: cancel tức thời do StrictMode/đổi route được tách khỏi timeout gần 10s.

Sau sửa: **GET/HEAD/OPTIONS không mang header CSRF**, vẫn gửi session cookie. OPTIONS của các GET về 0. POST/PUT/PATCH vẫn có token; thử POST không token thực tế trả **419**, không đổi trạng thái. Timeout Axios giữ nguyên 10000ms.

### 3.2. T04 tải lại toàn form sau mutation và báo lỗi chưa rõ kết quả

Sau publish trước sửa, Network có lại product detail, product options, category preview, product specification schema, kèm preflight; code còn khởi động retry schema rồi hủy nó khi parent remount. Thời gian UI sau công bố/ẩn khoảng 3s dù API ghi/SQL nhanh.

- Lưu thông số giờ dùng schema trả về trong response.
- Publish/hide HTTP 200 xác nhận trạng thái đã commit theo action; cập nhật trạng thái/notice tại chỗ. Không refetch toàn bộ product/options/schema. Preview danh mục có thể tải lại khi form được khởi tạo lại.
- Trong phép thử **chủ động mất delivery sau response POST hide 200**, server đã ẩn nhưng UI cũ vẫn báo “Vui lòng thử lại”, trạng thái còn active và nút gửi lại còn bật. Cả 5 lượt trước sửa phải nạp lại editor trong kịch bản để thấy trạng thái thật. Đây là fault injection sau API thật, không phải phản hồi giả và không được gọi là lỗi tự phát của mạng người dùng.
- Sau sửa: trạng thái chưa xác định có giải thích, khóa gửi lặp tại vùng thông số/công bố, đóng dialog và cung cấp nút **Kiểm tra kết quả đã lưu** chỉ GET. Cả 5 lượt phục hồi thành inactive, **0 reload, không tự gửi lại POST**. Lỗi khi bootstrap CSRF trước khi gửi write được phân biệt. Lỗi 5xx sau write cũng được coi là chưa rõ kết quả.
- Xóa notice thành công cũ khi bắt đầu thao tác mới; không để thông báo cũ làm người dùng tưởng lần lưu đang chạy đã thành công. Lỗi validation giữ dữ liệu nhập/focus.

### 3.3. Chuỗi request phụ và môi trường PHP

- Danh sách/chi tiết trước sửa chờ metadata rồi mới bắt đầu API chính. Chi tiết còn chờ API cùng danh mục trước khi hiện SKU; lỗi API phụ làm mất cả trang.
- Nay bắt đầu API chính độc lập metadata; sản phẩm cùng danh mục tải riêng, lỗi/retry riêng, giữ SKU và thông số chính. Trang Thông số tải definitions/options đồng thời.
- Ảnh lớn nhất ghi nhận: lenovo-ideapad.jpg **845681 bytes / 35ms**, keyboard.jpg 394968 bytes / 7ms, philips-kettle.jpg 212382 bytes / 30ms. Trong local này chúng không giải thích các giây chờ API; không sửa assets để suy đoán cải thiện.
- **PHP CLI chưa nạp OPcache**; DLL tương ứng đã có sẵn. Thêm launcher local dùng OPcache CLI, validate_timestamps=1 và revalidate_freq=0 để vẫn nhận sửa tệp mỗi request; không sửa php.ini, Laravel config cache hay database. Giới hạn upload 5MB/post 60MB. Launcher riêng cổng 33380 chạy thật 5 health GET 200: TTFB 33.8/8.5/14.3/18.5/10.5ms.
- Có biến động runtime: khi đo lượt dev sau sửa, curl đối chứng trên **server 8000 không đổi** tăng từ khoảng 0.28s lên 0.71s; PHP đo đang dùng khoảng 1 CPU-second trong 1 giây lấy mẫu. Không có bằng chứng để quy biến động này cho một ứng dụng nền cụ thể. Báo đầy đủ số dev xấu hơn ở mục 5, không dùng chúng làm bằng chứng đã nhanh hơn. Bổ sung so sánh cả bản cũ/mới với cùng bật OPcache để kiểm chứng hiệu quả giảm request.

### 3.4. SQL và log

Profiler service chạy 5 lượt, gồm đọc lại product cần thiết; không tính bootstrap/session HTTP. Lưu dùng payload giá trị thực của fixture. Không ghi SQL bindings/dữ liệu cá nhân.

| Service | Số query/lượt | SQL trung bình ms | Wall trung bình ms | Query chậm nhất ms |
|---|---|---|---|---|
| Categories | 2 | 1.06 | 2.49 | 1.09 |
| Products | 6 | 7.30 | 10.10 | 9.33 |
| Detail | 6 | 2.42 | 5.52 | 0.90 |
| Product schema | 10 | 3.10 | 6.11 | 0.48 |
| Lưu thông số | 17 | 5.21 | 13.97 | 0.70 |
| Publish | 12 | 3.47 | 7.73 | 0.64 |
| Hide | 6 | 1.86 | 3.84 | 0.66 |

Innodb_row_lock_waits và Innodb_row_lock_time trước/sau đều **0**. Có đọc quan hệ lặp trong schema nhưng trên dữ liệu đo không phải điểm nghẽn giây; chưa có căn cứ thêm index hoặc bỏ khóa/transaction. Giữ invariant công bố và tính nhất quán T04. Chưa stress nhiều worker DB.

Log Laravel gốc không có local.ERROR mới trùng lỗi tải lạnh; lỗi timeout/delivery thuộc phía kết nối. Những testing.ERROR do test cố tình làm hỏng ghi metadata ảnh được phân loại là fixture rollback, không phải lỗi người dùng. Log và dữ liệu test không được đưa vào Git.

## 4. Đo lại cách chạy hằng ngày

Giữ server 8000/5173 của người dùng và database thật; không khởi động lại/dừng các tiến trình này. Các dòng Admin là **khách vãng lai**, nên mốc ready là thông báo cần đăng nhập. Không kết luận tốc độ màn admin cá nhân từ các dòng này.

| Trang (5 lượt mỗi loại) | Direct, ms T→S | SPA, ms T→S | API max TTFB direct, ms T→S | Lỗi/Reload T→S |
|---|---|---|---|---|
| Trang chủ | 4436 → 3069 | 3710 → 2718 | 3793 → 1598 | 0/0 → 0/0 |
| Danh sách | 2206 → 2130 | 588 → 582 | 1680 → 2345 | 0/0 → 0/0 |
| Chi tiết | 2628 → 2066 | 1051 → 546 | 1516 → 2016 | 0/0 → 0/0 |
| Admin/Danh mục (khách) | 652 → 1084 | 17 → 12 | 1538 → 1091 | 0/0 → 0/0 |
| Thông số (khách) | 613 → 536 | 12 → 11 | 789 → 465 | 0/0 → 0/0 |
| Sửa sản phẩm (khách) | 619 → 571 | 11 → 8 | 765 → 493 | 0/0 → 0/0 |

Trang chủ local median direct **4436→3069ms**, chi tiết **2628→2066ms**; list gần như không đổi trong đợt này. Một số API max/guard session vẫn dao động, ví dụ Admin guest direct chậm hơn; không ghi mọi trang đều cải thiện.

## 5. So sánh trên dữ liệu Admin riêng

### 5.1. Production build, PHP mặc định không OPcache

Cùng database/config/luồng trước–sau, không thay API giả. Mọi ô 5 lượt, tất cả hoàn thành; các max đầu đợt sau chịu biến động PHP nêu trên.

| Trang/thao tác | Direct/thao tác, ms T→S | SPA, ms T→S | API max total/TTFB, ms T→S | Lỗi/Reload T→S |
|---|---|---|---|---|
| Trang chủ | 4188 → 2072 | 3571 → 1772 | 3114/3112 → 4275/4272 | 0/0 → 0/0 |
| Danh sách | 2057 → 802 | 580 → 292 | 1690/1688 → 2135/2136 | 0/0 → 0/0 |
| Chi tiết | 2624 → 1081 | 1062 → 262 | 1603/1599 → 2561/2558 | 0/0 → 0/0 |
| Admin/Danh mục | 1524 → 1161 | 1001 → 707 | 1088/1087 → 1746/1743 | 0/0 → 0/0 |
| Thông số | 1499 → 734 | 983 → 485 | 527/525 → 1209/1207 | 0/0 → 0/0 |
| Sửa sản phẩm | 2514 → 1224 | 1955 → 928 | 1129/1129 → 1347/1338 | 0/0 → 0/0 |
| Lưu thông số | 1534 → 647 | — | 543/540 → 436/435 | 0/0 → 0/0 |
| Công bố | 2917 → 615 | — | 982/982 → 418/417 | 0/0 → 0/0 |
| Ẩn | 2941 → 810 | — | 1108/1107 → 419/419 | 0/0 → 0/0 |
| Công bố lại | 3000 → 856 | — | 1217/1219 → 486/487 | 0/0 → 0/0 |

Ở cột công bố lại, API max của pha còn có request phục hồi fixture/đi vào vòng kế tiếp của công cụ; thời gian thao tác UI không tính phần phục hồi đó. Không dùng số request của pha này để khẳng định một lần công bố lại gửi nhiều mutation.

### 5.2. Vite dev và biến động runtime

Không loại bỏ dữ liệu dev xấu hơn khỏi báo cáo. Mọi dòng trước/sau mặc định vẫn 5/5 thành công, 0 reload. Cột OPcache là **cấu hình chạy bổ sung**, không trộn với kết quả chỉ sửa frontend.

| Trang/thao tác | Dev mặc định direct, ms T→S | Dev mặc định SPA, ms T→S | Dev + OPcache sau sửa, direct/thao tác ms |
|---|---|---|---|
| Trang chủ | 4421 → 7209 | 3767 → 6047 | 1010 |
| Danh sách | 2234 → 5154 | 633 → 1524 | 695 |
| Chi tiết | 2669 → 4957 | 1074 → 1337 | 692 |
| Admin/Danh mục | 1576 → 4754 | 1036 → 3386 | 521 |
| Thông số | 1562 → 3127 | 974 → 2289 | 520 |
| Sửa sản phẩm | 2601 → 5410 | 1967 → 4594 | 807 |
| Lưu thông số | 1490 → 1687 | — | 203 |
| Công bố | 3063 → 1565 | — | 213 |
| Ẩn | 2963 → 2615 | — | 341 |
| Công bố lại | 2950 → 2744 | — | 320 |

Chưa kết luận wall time Vite dev mặc định cải thiện ổn định trong mọi trạng thái máy. Bản production đã chậm tương đương dev trước sửa (home 4188 vs 4421ms), nên build riêng không xử lý nguyên nhân preflight. Launcher local giải quyết thêm chi phí biên dịch PHP; không thay kết quả đang chạy của server 8000 cho tới khi người dùng khởi động bằng launcher.

### 5.3. Đối chiếu bản cũ/mới với cùng OPcache

Giữ bundle trước sửa trong cache ignored để chạy bản cũ, cùng DB/driver/session, cùng PHP flags, cùng Chrome và 5 lượt mỗi ô. Phần backend nghiệp vụ không đổi. Đây là đối chiếu bổ sung; không thay bảng cấu hình mặc định.

| Bản build, cùng bật OPcache (5 lượt) | Direct/thao tác ms T→S | SPA ms T→S |
|---|---|---|
| Trang chủ | 963 → 671 | 815 → 581 |
| Danh sách | 481 → 275 | 150 → 113 |
| Chi tiết | 565 → 287 | 231 → 108 |
| Admin/Danh mục | 338 → 363 | 225 → 225 |
| Thông số | 360 → 233 | 246 → 188 |
| Sửa sản phẩm | 589 → 403 | 430 → 328 |
| Lưu thông số | 350 → 224 | — |
| Công bố | 650 → 201 | — |
| Ẩn | 618 → 253 | — |
| Công bố lại | 636 → 246 | — |

Admin direct 338→363ms trong đối chiếu này không cải thiện; có thể bị giới hạn bởi đọc phiên/biến động nhỏ. Không báo toàn bộ Admin nhanh hơn trong mọi cấu hình.

## 6. Lỗi, cold start và phục hồi

| Kịch bản | Trước sửa | Sau sửa | Kết luận |
|---|---|---|---|
| Cold home, 5 lượt, PHP/Vite restart + cache browser trống | 1 lỗi/5; 4 lượt thành công median 5412ms, max 8250ms; lượt lỗi chưa ready sau 30068ms | 0 lỗi/5; median 3476ms, max 3703ms | PASS |
| Cold Admin đăng nhập, 5 lượt | 0 lỗi; median 2550ms, max 9112ms | 0 lỗi; median 2040ms, max 2162ms | PASS |
| Cold với launcher-equivalent OPcache, 5 lượt sau sửa | Không trộn vào baseline mặc định | Home 1902ms, Admin 1349ms; 0 lỗi | PASS cấu hình bổ sung |
| 3 tab đồng thời ×5 vòng, cùng session | 15/15 tải đầu lỗi; 15 lần bấm Retry, 11 phục hồi, 4 chưa phục hồi sau một lần Retry; không tự reload | 15/15 ready, 0 Retry, 0 Reload; ready 3999–7671ms | PASS |
| Mất delivery sau server hide 200, 5 lượt | 5 trạng thái UI cũ; không có read-only check; script reload editor 5 lần để xác nhận | 5/5 read-only check đúng inactive, chặn gửi lặp; 0 Reload | PASS, lỗi được chủ động tạo |
| Backend chưa chạy lúc mở Admin, 5 lượt | Có nút retry theo code cũ; không có đo baseline fault riêng | Sau bật lại backend, bấm Retry: 5/5 phục hồi, 0 Reload | PASS |
| API cùng danh mục bị chặn, 5 lượt | Code cũ chờ API phụ; không đo fault baseline riêng | SKU/thông số chính vẫn thao tác; retry riêng 5/5 phục hồi, 0 Reload | PASS |
| POST không CSRF | Không đổi middleware | 419, trạng thái DB không đổi | PASS |

Reload=0 ở baseline cold/stress có nghĩa công cụ **không thực hiện** reload để cứu trang, không chứng minh trang bị lỗi sẽ tự phục hồi. Không đo số lần hard reload cần thiết cho cold failure cũ; ghi rõ lượt chưa ready và hành động Retry đã thử. Không tái hiện lỗi kiểu nhiều hard reload khi chỉ mở tuần tự bình thường: 5 lượt direct + 5 SPA mỗi trang trước sửa đều đạt. Đã tái hiện lỗi khi cold/tải đồng thời và trạng thái sai sau mất phản hồi ghi, không suy diễn chúng là mọi nguyên nhân có thể trên máy người dùng.

## 7. Lệnh kiểm tra và kết quả

| Lệnh/nhóm lệnh | Kết quả thực tế |
|---|---|
| git status --short / branch / log / rev-parse dev, HEAD | PASS; nền/nhánh và working tree đầu phiên như mục 1 |
| powershell ... scripts/start-catalog-test-db.ps1 -Port 33368 | PASS; instance/datadir riêng |
| php scripts/catalog-test-database.php; php artisan migrate --force; helper seed/specifications | PASS; database prefix cách ly, 13 migration, dữ liệu từ seeder hiện có |
| node scripts/perf-load-review.mjs --label=before/after --mode=local | PASS thực thi; 60 mẫu mỗi đợt, chỉ đọc local thật |
| ... --mode=dev / --mode=build | PASS thực thi; 80 mẫu mỗi mode/đợt; từng số lỗi/latency ở bảng, không đồng nhất PASS công cụ với nhanh hơn |
| ... --mode=dev --cold | Đo được FAIL 1 cold home trước; sau PASS 10/10 home+Admin |
| ... --mode=dev --stress | Đo được FAIL 15/15 tải đầu trước; sau PASS 15/15 |
| ... --mode=dev --delivery | Đo được UI chưa rõ kết quả trước; sau PASS 5/5 read-only reconciliation |
| ... --label=paired-before --mode=build --baseline-bundle --opcache; paired-after --mode=build --opcache | PASS, mỗi đợt 80 mẫu |
| ... --label=after --mode=dev --opcache / --cold --opcache / --resilience --opcache | PASS; 80/10/11 mẫu tương ứng |
| php scripts/perf-query-profile.php before, env test prefix | PASS; 35 lượt service, số query/timing/lock ở mục 3 |
| powershell ... scripts/serve-local.ps1 -Port 33380 | PASS; 5 health 200, dừng đúng launcher/test child |
| php artisan test --compact, DB mới MariaDB riêng | **PASS 56 test, 1075 assertions**, 25.30s, gồm hồi quy auth/catalog/T03/T04 |
| CATALOG_PHP_OPCACHE=1; node scripts/t02-admin-catalog-review.mjs --publishing | **PASS 38 kịch bản**, 579 response API thật, 0 Runtime exception; gồm draft→spec→publish→storefront→active edit→hide→404→republish, desktop/mobile |
| npm run lint | PASS exit 0; chỉ warning cũ ConnectionPage.jsx:9 react(set-state-in-effect) |
| npm run build | PASS, **127 modules, 225ms**, exit 0 |
| vendor/bin/pint scripts/perf-load-fixtures.php scripts/perf-query-profile.php | PASS sau format hai helper mới |
| pint --test và php -l hai helper; node --check bốn script perf mới | PASS, exit 0 |
| Xác minh PID/datadir rồi mysqladmin shutdown --port=33368 | PASS; đã dừng instance kiểm thử và PHP child của lần setup đầu. Cổng 8000/5173/3306 vẫn do đúng PID ban đầu sở hữu; không xóa datadir/database |
| git diff --check | PASS ở rà soát cuối; có cảnh báo LF→CRLF theo cấu hình Git, không có lỗi whitespace |

Trở ngại công cụ đã xử lý: sandbox chặn đọc process/cổng nên xin quyền đúng thao tác đọc/xác minh; lần đăng nhập đầu của công cụ đo bấm trước khi nút hết disabled đã sửa bằng chờ trạng thái ready và chạy lại. Probe PHP -r ban đầu gặp lỗi quote PowerShell đã thay bằng script kiểm tra; không tính các lần setup lỗi vào số đo thành công. Không đổi ứng dụng để làm qua lỗi công cụ.

## 8. Tệp thay đổi

- Frontend transport/service: frontend/src/api/axios.js, services/catalogService.js, services/adminPublishingService.js, services/adminCatalogService.js.
- Page: frontend/src/pages/public/ProductsPage.jsx, ProductDetailPage.jsx; frontend/src/pages/admin/AdminProductsPage.jsx, AdminSpecificationsPage.jsx.
- Component: sửa frontend/src/components/admin/ProductPublishingPanel.jsx; thêm ProductPublishingEditor.jsx và frontend/src/components/RelatedProducts.jsx. Dùng lại style/field/feedback/dialog hiện có; không sửa CSS hoặc giao diện cửa hàng ngoài trạng thái tải của vùng liên quan.
- Công cụ đo mới: frontend/scripts/perf-load-review.mjs, perf-concurrent-pages.mjs, perf-delivery-failure.mjs, perf-resilience-scenarios.mjs; backend/scripts/perf-load-fixtures.php, perf-query-profile.php.
- Launcher mới backend/scripts/serve-local.ps1; harness frontend/scripts/t02-admin-catalog-review.mjs thêm opt-in CATALOG_PHP_OPCACHE, giữ nguyên kiểm tra nghiệp vụ.
- Tài liệu: README.md, docs/api/public-catalog.md, docs/api/admin-product-publishing.md, báo cáo này.
- Raw đo: backend/storage/framework/testing/perf-*.json; chúng cùng database/profile/upload test đều ignored. Không đưa vào Git.

## 9. Chạy local và phần còn mở

Tại backend, dừng artisan serve cũ bằng Ctrl+C nếu muốn dùng cùng cổng rồi chạy:

    powershell -NoProfile -ExecutionPolicy Bypass -File scripts/serve-local.ps1

Frontend vẫn npm run dev. Launcher kiểm tra OPcache hiện có, dùng localhost:8000 và không sửa cấu hình riêng; server 8000/5173 đang dùng của người dùng không bị tự dừng/restart trong phiên điều tra.

Để tái đo, chuẩn bị **database mới riêng** bằng helper/biến môi trường testing như báo cáo T04; giữ metadata DB đo riêng, seed catalog/specifications rồi chạy perf-load-review theo mode/flag đã liệt kê. Không chạy fixture/profiler ghi trên shophub. Mode local của công cụ từ chối cold/delivery/resilience và chỉ dùng đọc; tài khoản đo có mật khẩu ngẫu nhiên truyền qua môi trường, không có admin mặc định.

**Còn mở/CHƯA CHẠY:** chưa kiểm tra phiên admin cá nhân trên DB thật; không tự dùng/cập nhật tài khoản người dùng. Chưa benchmark mạng WAN, máy khác/trình duyệt khác, dataset lớn hoặc nhiều worker cạnh tranh. Vite dev/PHP mặc định vẫn chịu biến động tốc độ máy; giảm request đã được xác nhận nhưng wall time không cải thiện trong mọi lượt, vì vậy có launcher đã đo riêng. Không có căn cứ để hứa tuyệt đối không còn lỗi mạng hoặc mọi nguyên nhân phải reload đều được loại bỏ.

Không còn lỗi chặn các kịch bản bắt buộc đã chạy. Không thực hiện module mới. Gợi ý commit sau review: fix: reduce redundant reads and reconcile uncertain catalog writes. Bước tiếp theo đề xuất: người dùng review diff/báo cáo và thử launcher trong phiên local hằng ngày; chưa commit/push/merge.
