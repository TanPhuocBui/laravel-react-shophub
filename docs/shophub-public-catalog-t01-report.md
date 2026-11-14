# ShopHub — T01: Nghiệm thu catalog công khai (UC23–UC25)

Ngày kiểm tra: **14/11/2026**.

**Kết luận: T01 hoàn tất trên commit `dev` `de3ea879b8587ac67ebdc17e808a813ebd365f55`.** Đã kiểm tra đủ luồng bắt buộc bằng React, Chrome và API Laravel thật trên MariaDB cách ly. Không phát hiện lỗi chức năng cần sửa trong phạm vi T01.

## Git và phạm vi

- `dev` và ref local `origin/dev` cùng trỏ tới commit trên; không fetch hoặc thay đổi lịch sử Git.
- Repository đang mở giữ nguyên nhánh `feature/cobalt-orbit-auth`, HEAD `227e566`. Lúc bắt đầu có **61 file bị xóa chưa commit** (ảnh báo cáo cũ và `shophub-cobalt-orbit.patch`); toàn bộ trạng thái xóa này được giữ nguyên.
- Kiểm thử trong worktree detached tại `backend/storage/framework/testing/t01-worktree`, HEAD chính là commit `dev` nêu trên. Không dùng mã chưa commit trong working tree chính làm cơ sở nghiệm thu.
- Không cần tạo `fix/public-catalog` vì không có lỗi chức năng. Các file QA/báo cáo mới được đưa về working tree chính trên `feature/cobalt-orbit-auth` để người dùng review; chưa commit, push hoặc merge.
- Không đổi mã ứng dụng, migration, API contract, T00, giỏ hàng hoặc T02. Không tạo bản vá Git.

Đã đọc `AGENTS.md`, `README.md`, `docs/design/shophub-usecase-system.md`, thiết kế tại `docs/report/shophub-database-design.md`, contract `docs/api/public-catalog.md`, báo cáo catalog cũ và các helper/test/mã catalog liên quan. Không có `ARCHITECTURE.md` ở gốc; đường dẫn thiết kế database thực tế nằm dưới `docs/report/`.

## Môi trường và dữ liệu thực sự sử dụng

- PHP **8.3.36**, Laravel **12.71.0**, Sanctum **4.3.3**; Node **22.22.2**, React **19.3.1**, Vite **8.3.6**, React Router DOM **7.18.5**, Axios **1.21.0**. Phiên bản package lấy từ lockfile hiện có; không đổi dependency.
- Driver `mysql`, server **MariaDB 10.11.16**, instance local riêng ở `127.0.0.1:33318`.
- Database chạy PHPUnit catalog: `shophub_catalog_api_test_2ae020cfd0`.
- Database browser nghiệm thu cuối: `shophub_catalog_api_test_0b57400ef2`. Mỗi lần cần dữ liệu sạch đều **tạo database mới**, không reset database cũ.
- Chạy đủ **13 migration có sẵn** trên database cách ly. Không migrate/seed hoặc xóa dữ liệu trên database ShopHub đang dùng. Không chỉnh `.env` cá nhân; chỉ tạo `.env` cho worktree kiểm thử.
- Dùng `ProductCatalogSeeder`, `PublicCatalogDemoSeeder`, `PublicCatalogSpecificationSeeder` qua helper sẵn có: 3 sản phẩm draft bị ẩn, 12 sản phẩm public (10 laptop, 1 SSD, 1 bình đun), 13 SKU public. Ảnh là SVG placeholder được khai báo rõ.
- Chrome headless dùng profile mới, không đăng nhập; chạy React production build qua Vite preview và Laravel HTTP thật ở các cổng động. Không mock, intercept hoặc thay API bằng fixture React. Network được đọc qua Chrome DevTools Protocol.
- Đã xem ảnh chi tiết desktop/mobile và kết quả tìm kiếm rỗng để kiểm tra trực quan; không có tràn ngang toàn trang tại các kích thước đã kiểm tra.

## Kết quả từng kịch bản

| Kịch bản | Kết quả | Bằng chứng thực tế |
|---|---|---|
| a. Trang chủ, danh mục và danh sách đúng danh mục | **PASS** | Bấm cả ba danh mục ở 390px, đi từ trang chủ tới Laptop ở 1440px; danh sách slug và danh mục trên UI khớp API. Count API lần lượt 10/1/1. |
| b1. Tìm theo tên và SKU | **PASS** | Gửi form tìm `Laptop catalog demo 1` được 2 sản phẩm (1 và 10); tìm SKU bạc được 1 sản phẩm. Danh sách UI khớp query API. |
| b2. Áp dụng và xóa bộ lọc | **PASS** | Kết hợp tên + Laptop + ASUS + giá 18.100.000 được đúng 1 sản phẩm; xóa bộ lọc trở lại tổng 12, trang đầu 8 card. Còn hàng + khuyến mãi cho 9 laptop; Back phục hồi query. |
| b3. Sắp xếp | **PASS** | Thao tác select cho `price_asc`, `price_desc`, `name`, `newest`; thứ tự slug UI khớp API tương ứng. Backend test kiểm tra thêm giá và khóa phụ ổn định. |
| b4. Phân trang | **PASS** | Laptop 8+2; toàn catalog 8+4. Trang 2 có metadata đúng, không trùng slug trang 1. Tìm kiếm mới xóa tham số page. |
| c. Chi tiết, chọn SKU và thông số | **PASS** | Đối chiếu cả SKU, giá và tồn với response Laravel: Đen **18.100.000 VND, tồn 10**; Bạc **18.400.000 VND, tồn 0**. Thông số UI khớp mảng API, đúng thứ tự CPU, RAM 16 GB, lưu trữ 512 GB, màn hình 15.6 inch. Có kiểm tra thông số trước khi seed, SSD 1000 GB và bình đun 1800 W. |
| d1. SKU hết hàng | **PASS** | Chọn Bạc hiển thị SKU tương ứng, giá 18.400.000, nhãn “Tạm hết hàng” và lựa chọn “Hết hàng”. |
| d2. Chặn thêm SKU hết hàng vào giỏ | **CHƯA CHẠY — không áp dụng ở T01** | Chi tiết chỉ có “Xem cùng danh mục” và “Xem thông số”; chưa có nút mua/thêm giỏ nối nghiệp vụ. Đã xác nhận không có hành động mua trong vùng này. Không triển khai giỏ ngoài phạm vi. |
| e1. Tìm kiếm không khớp và tìm lại | **PASS** | `q=zzzz-t01-no-match` trả HTTP 200, `data=[]`, `meta.total=0`; UI báo chưa tìm thấy. Tìm lại `Bình đun` ra 1 sản phẩm; xóa bộ lọc về 12. |
| e2. Bộ lọc cho danh sách rỗng và phục hồi | **PASS** | Giá 1–2 VND trả HTTP 200, mảng rỗng; bấm “Xem tất cả sản phẩm” trở lại trang đầu, 8 card. |
| Sản phẩm draft/bị ẩn | **PASS** | Draft cũ không xuất hiện; API slug trả 404. Tạm ẩn riêng fixture public trong database test: trang chủ/danh sách rỗng, chi tiết báo không tìm thấy; phục hồi sau kiểm tra. |
| Lỗi kết nối, thử lại và ảnh hỏng | **PASS** | Dừng đúng Laravel test: UI báo lỗi, không rơi về demo; bật lại và Thử lại tải được dữ liệu. Ảnh lỗi hiển thị placeholder. |

Kịch bản d2 là điều kiện “nếu nút đã được nối nghiệp vụ” trong yêu cầu; điều kiện này chưa xảy ra, không phải luồng bắt buộc còn bị bỏ sót.

## Lệnh đã chạy và kết quả

Các lệnh Laravel/React bên dưới chạy trong worktree từ `dev`, với database/cấu hình kiểm thử đã xác minh.

| Lệnh | Kết quả thực tế |
|---|---|
| `git status --short`, `git branch --show-current`, `git log -1 ... dev`, `git worktree list`, `git rev-parse dev`, `git rev-parse origin/dev` | Đã xác minh nhánh, commit và thay đổi sẵn có như trên. |
| `git worktree add --detach backend/storage/framework/testing/t01-worktree dev` | Thành công sau khi cấp quyền ghi metadata Git; lần đầu sandbox báo Permission denied. |
| `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-catalog-test-db.ps1 -Port 33318` | Tạo instance MariaDB riêng thành công. |
| `php scripts/catalog-test-database.php` | Tạo từng database mới với prefix bảo vệ; xác minh server MariaDB. |
| `php artisan key:generate` | Thành công cho `.env` worktree kiểm thử. Không xuất khóa vào báo cáo. |
| `php artisan migrate --force` | 13 migration thành công trên database cách ly dùng để nghiệm thu. |
| `php artisan migrate:status` | 13 migration ở trạng thái Ran trên database PHPUnit catalog. |
| `php artisan route:list --path=api/public` | 4 route GET/HEAD thực tế: categories, brands, products, products/{slug}. |
| `php artisan test --compact --filter='PublicCatalogApiTest\|CatalogSpecificationTest'` | **16 passed, 222 assertions**, 31.77 giây, chạy trên MariaDB test riêng. Ký tự `\|` trong bảng biểu diễn dấu `|` của biểu thức filter. |
| `php artisan test --compact --filter=ProductCatalogSeederTest` | **13 passed, 248 assertions**, 2.06 giây; bộ test có sẵn dùng SQLite `:memory:` riêng. Không coi đây là kiểm chứng seeder trên MariaDB; browser đã chạy chính các seeder trên MariaDB riêng. |
| `npm run build` | **PASS**, 110 modules; 531 ms. Lần đầu sandbox chặn tiến trình Vite (`spawn EPERM`), chạy lại với quyền đã cấp thì thành công. |
| `node scripts/catalog-api-review.mjs --specifications` | **PASS**, toàn bộ assertion của script có sẵn với API thật. |
| `node scripts/t01-public-catalog-review.mjs` | **PASS** ở lần nghiệm thu cuối: đủ a–e, Network ghi được **95 response public**, **0 lỗi thu body**, không có Runtime exception. |
| `node --check frontend/scripts/t01-public-catalog-review.mjs` | **PASS** (từ gốc worktree và sau khi đưa script về repo chính). |
| `git diff --check` | **PASS** trong worktree và repository chính; các thay đổi có sẵn được giữ nguyên. |
| `mysqladmin.exe --no-defaults --protocol=tcp --host=127.0.0.1 --port=33318 --user=root shutdown` | Thành công; đã dừng instance kiểm thử sau nghiệm thu. |

Các lần chạy chưa đạt đã xử lý:

- Instance thử đầu ở cổng 33317 có datadir nằm sâu trong worktree. Migration tới `product_specification_values` nhận lỗi MariaDB `Unknown database`. Đã dừng instance đó, đặt datadir ngắn hơn dưới vùng testing của repo chính, tạo database mới và chạy đủ migration thành công. Không sửa migration để né lỗi môi trường.
- Lần đầu script T01 bổ sung dùng sai tên fixture `Laptop ASUS demo 1`; API trả rỗng đúng dữ liệu, assertion của script chờ 2 sản phẩm nên thất bại. Đã sửa **từ khóa trong script kiểm thử** thành tên có thật `Laptop catalog demo 1`, tạo database mới và chạy lại toàn bộ script đạt. Đây không phải lỗi tìm kiếm của ứng dụng.

## File tạo mới và bằng chứng

- `frontend/scripts/t01-public-catalog-review.mjs`: kịch bản browser T01, mở rộng từ helper catalog hiện có; thao tác form/selector, đối chiếu dữ liệu và thu response public qua Network. Script tự quản lý Laravel, preview, Chrome và phục hồi fixture trong `finally`; chỉ nhận database có prefix kiểm thử.
- `docs/shophub-public-catalog-t01-report.md`: báo cáo này.
- `docs/t01-public-catalog-review/results.json`: bảng a–e, các assertion bổ sung và request API đã phát sinh.
- `docs/t01-public-catalog-review/network.json`: URL, status và body JSON của 95 response public từ Chrome; không lưu cookie, token, header xác thực hoặc dữ liệu tài khoản.
- `docs/t01-public-catalog-review/`: 9 ảnh mới: `home-api-1440.png`, `home-api-390.png`, `products-api-1440.png`, `detail-variant-api-1440.png`, `detail-specifications-api-1440.png`, `detail-api-390.png`, `empty-search-1440.png`, `empty-api-390.png`, `offline-api-390.png`.

Ví dụ bằng chứng: [kết quả máy đọc](t01-public-catalog-review/results.json), [Network thật](t01-public-catalog-review/network.json), [SKU bạc hết hàng](t01-public-catalog-review/detail-variant-api-1440.png), [thông số desktop](t01-public-catalog-review/detail-specifications-api-1440.png), [chi tiết mobile](t01-public-catalog-review/detail-api-390.png), [tìm kiếm rỗng](t01-public-catalog-review/empty-search-1440.png).

Không sửa file đã theo dõi nào trong task này. Các database, `.env`, dependencies sao chép, build và profile Chrome của worktree nằm trong vùng runtime/ignored; không đưa vào commit. Worktree giữ lại để đối chiếu commit, các tiến trình test đã đóng.

## Chạy lại và giới hạn

Để chạy lại trên chính commit đã nghiệm thu, dùng worktree `backend/storage/framework/testing/t01-worktree`. Khởi động lại instance MariaDB test bằng helper ở `backend/scripts/start-catalog-test-db.ps1` của repo chính (datadir ngắn), rồi sao chép `catalog-test-server.json` mới vào `backend/storage/framework/testing` của worktree. Trong backend worktree, đặt biến môi trường DB loopback/cổng test, `DB_DATABASE=mysql`, chạy `php scripts/catalog-test-database.php` để tạo **database mới**. Đọc tên database từ metadata, đặt `DB_DATABASE` và `CATALOG_TEST_DATABASE` bằng tên đó, chạy migrate và PHPUnit trước khi browser seed. Sau đó từ frontend worktree chạy `node scripts/t01-public-catalog-review.mjs`. Script đọc metadata test, build nguồn API và tự chạy các server. Kết thúc thì shutdown đúng cổng MariaDB test; không reset database ShopHub.

- Phạm vi nghiệm thu là dữ liệu seeder trên MariaDB riêng, không phải dữ liệu thực tế trong database ShopHub của người dùng.
- Kiểm tra trình duyệt bằng Chrome headless tại 1440px và 390px; chưa kiểm tra Safari/Firefox hoặc thiết bị vật lý.
- Chưa chạy toàn bộ suite auth/ứng dụng; đã chạy hai nhóm nghiệp vụ catalog và nhóm seeder liên quan. Không mở rộng sang T00/T02.
- Không còn trở ngại ngăn nghiệm thu T01. Giỏ hàng chưa nối là giới hạn đã xác nhận của phạm vi hiện tại.

Gợi ý commit cho tài liệu/QA: `test(catalog): verify T01 with real Laravel API and MariaDB`.

Bước tiếp theo đề xuất: người phụ trách review và ghi nhận mốc T01 trong kế hoạch tiến độ trên cơ sở commit `dev` nêu trên; task này chưa tự bắt đầu module tiếp theo.
