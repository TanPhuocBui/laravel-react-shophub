# T04 — Thông số kỹ thuật và công bố sản phẩm (UC09–UC11)

Ngày triển khai: 15/11/2026. Nhánh: `feature/admin-product-publishing`.

## 1. Nền triển khai và căn cứ

- HEAD/dev nền: `2108e1816c33d47de8c656d9f55d31371215e827` (merge PR #3 của T03). Xác minh trực tiếp `git show dev:backend/routes/api.php`, service sản phẩm và UI trên dev; không chỉ dựa báo cáo. Working tree sạch trước T04. Không merge, commit, push hoặc ghi đè công việc cục bộ.
- Tài liệu đã đọc: `AGENTS.md`, `README.md`, `docs/design/SHOPHUB_BUSINESS_ARCHITECTURE.md`, `docs/design/shophub-usecase-system.md`, `docs/design/shophub-erd.md`, `docs/report/shophub-database-design.md`, `docs/api/admin-products.md`, `docs/api/public-catalog.md`, `docs/report/RP-T03-admin-products.md`.
- Không tìm thấy file cấu trúc UI riêng trong repo. Áp dụng khung T02/T03 thực tế: AdminLayout, menu navy, breadcrumb, màu đỏ hành động chính, AdminField/AdminFeedback, dialog xác nhận và focus trap, CSS chỉ trong `.admin-shell`. Toolbar sản phẩm vẫn dùng component chung với Danh mục/Thương hiệu.
- ERD và schema v1 dùng **text**, unit, is_active; pivot danh mục có is_required/sort_order. Không có data_type hay enum/options cho thông số. Không tự thêm kiểu số/tập lựa chọn; “sai kiểu” là gửi số JSON/boolean/array/object, “ngoài tập hợp” là ID không thuộc cấu hình active của danh mục trực tiếp. Không kế thừa cha.
- Migration/model/seeder và public service/resource hiện có đáp ứng T04; không thêm migration, không sửa schema/seeder/auth hoặc API public. Giữ guard T03: sản phẩm đã có giá trị không được đổi danh mục qua form nháp.

## 2. API và màn hình

Contract chi tiết: [admin-product-publishing.md](../api/admin-product-publishing.md).

| API dưới `/api/admin` | Chức năng |
|---|---|
| GET/POST specifications; PUT specifications/{id} | Xem/thêm/sửa định nghĩa text, mã, đơn vị và hoạt động |
| GET/PUT categories/{id}/specifications | Cấu hình đầy đủ thông số cho danh mục, bắt buộc và thứ tự |
| GET/PUT products/{id}/specifications | Đọc schema/giá trị/điều kiện; lưu giá trị đúng danh mục |
| POST products/{id}/publish | Công bố/công bố lại sau kiểm tra dữ liệu |
| POST products/{id}/hide | Ẩn, giữ dữ liệu và liên kết |
| PUT products/{id}/content | Sửa nội dung active theo whitelist, hỗ trợ upload multipart |

- `/admin/specifications`: danh sách định nghĩa, form thêm/sửa có lỗi từng trường; chọn danh mục và cấu hình sử dụng/bắt buộc/thứ tự. Có tải, rỗng, lỗi và thử lại, phản hồi lưu.
- `/admin/products/create`: tải phần xem trước cấu hình khi đổi danh mục; lưu nháp T03 trước rồi nhập giá trị trên trang sửa.
- `/admin/products/:id/edit`: form T03 + vùng nhập thông số, trạng thái và từng lý do chưa thể công bố; công bố/ẩn/công bố lại. Nút ẩn mở dialog nêu tên và tác động, hủy không gửi mutation.
- Active mở được luồng sửa tên, mô tả, ảnh; khóa slug/danh mục/thương hiệu/bảo hành/SKU/giá/tồn ở UI. Backend từ chối mọi root field ngoài name/short_description/description/images/_method, kể cả field được gửi null. Thông số lưu qua endpoint riêng. Đổi tên giữ slug và trạng thái active.
- `/admin/products/:id` vẫn là màn chỉ xem; API sửa nháp T03 vẫn từ chối payload hợp lệ vào active bằng 409. Inactive giữ thông tin/SKU chỉ đọc, cho nhập thông số và công bố lại.

## 3. Quy tắc dữ liệu và transaction

- Chỉ ID thông số active cấu hình cho đúng danh mục được nhập. Giá trị text trim, tối đa 5000 ký tự; chuỗi `"0"` hợp lệ. Omit ID giữ giá trị; rỗng/null xóa giá trị tùy chọn. Draft/inactive được thiếu bắt buộc; active không được xóa giá trị bắt buộc.
- Không gỡ cấu hình khi còn giá trị trên sản phẩm thuộc danh mục (kể cả dữ liệu lịch sử). Không thay code/unit đã có dữ liệu; không ngừng hoạt động thông số đang dùng. Không đặt bắt buộc nếu còn sản phẩm active thiếu giá trị. Mọi yêu cầu lỗi giữ nguyên cây cấu hình và dữ liệu đã lưu.
- Publish yêu cầu danh mục/thương hiệu active, có ảnh, có SKU active hợp lệ theo giới hạn giá/tồn T03 và đủ thông số bắt buộc. **Tồn 0 được công bố**; không tự kích hoạt danh mục/thương hiệu/SKU. Lý do trả từng mục ở errors.publication và hiển thị tại form.
- Trạng thái: draft→active, active→inactive, inactive→active; hide draft 409. Gọi lại hide inactive giữ inactive; publish active vẫn kiểm tra điều kiện. Không hard delete dữ liệu/liên kết.
- Sửa nội dung active dùng chung hàm ghi/cleanup ảnh của T03: metadata/tên/mô tả trong transaction; lỗi dọn tệp mới. Tệp cũ được giữ theo chính sách ảnh lịch sử T03. Bảo vệ sở hữu ID ảnh.
- Mutation catalog khóa danh mục theo id trước, đồng bộ T02; sau đó khóa product/brand/SKU tùy nghiệp vụ. Tránh cấu hình thay đổi xen giữa kiểm tra và lưu. Đây là khóa thô phù hợp dữ liệu đồ án, chưa benchmark tải lớn.
- Public dùng service/resource hiện có: active, category/brand active, SKU active; thông số đúng danh mục/đơn vị/thứ tự. Hidden detail 404; công bố lại khôi phục truy cập.

## 4. Môi trường và lệnh kiểm tra

PHP 8.3.36, Laravel 12.71.0, Node 22.22.2, Vite 8.3.6; driver mysql, server MariaDB 10.11.16. Instance kiểm thử riêng `127.0.0.1:33358`, datadir dưới `backend/storage/framework/testing/`. Không dùng database shophub thật, không chạy fresh/refresh/wipe/truncate/rollback dữ liệu thật. Không sửa `.env` hay php.ini; GD thiếu nên test upload dùng nội dung PNG thật sẵn có, browser upload `frontend/src/assets/hero.png`.

| Lệnh / kiểm tra | Kết quả thực tế |
|---|---|
| git status --short; git branch --show-current; git rev-parse HEAD/dev; git log và đọc file dev | PASS; nền/dev và trạng thái ban đầu như mục 1 |
| php artisan test --compact --filter='AdminProductTest\|CatalogSpecificationTest\|PublicCatalogApiTest\|AdminCatalogTest' (đợt đầu SQLite cô lập) | 27 PASS, 1 SKIP, 507 assertions; không coi là nghiệm thu MariaDB |
| php artisan test --compact --filter=AdminPublishingTest (đợt đầu) | FAIL 1 test do helper cleanup truy cập protected property, 6 PASS; sửa helper dùng cờ callback, không sửa framework |
| powershell -NoProfile -ExecutionPolicy Bypass -File scripts/start-catalog-test-db.ps1 -Port 33358 | PASS; tạo instance/datadir riêng |
| php scripts/catalog-test-database.php + php artisan migrate --force, env testing/loopback/test-prefix | PASS; browser DB `shophub_catalog_api_test_7813aaf066`; DB backend cuối `shophub_catalog_api_test_5466fa51e0`; 13 migration mỗi DB |
| php artisan test --compact (MariaDB riêng, đợt đầu) | PASS 54 test, 1049 assertions |
| php artisan test --compact (MariaDB riêng, sau bổ sung text zero và active upload) | **PASS 56 test, 1075 assertions**, 18.80s; gồm T01/T02/T03/T04 và auth |
| vendor/bin/pint --dirty; vendor/bin/pint --dirty --test | PASS; chỉ các file PHP của T04 |
| php artisan route:list --path=api/admin --except-vendor | PASS; 27 route Admin, T04 dùng cùng auth/Gate |
| npm run lint | PASS exit 0; warning có sẵn ConnectionPage.jsx:9 react(set-state-in-effect), không có lỗi T04 |
| npm run build (lần cuối) | PASS; 125 modules, 244ms, exit 0 |
| node --check scripts/t04-admin-publishing-scenarios.mjs; node --check scripts/t02-admin-catalog-review.mjs | PASS exit 0 |
| node scripts/t02-admin-catalog-review.mjs --publishing | **PASS 38 kịch bản**, 929 phản hồi API thật, không Runtime exception; Chrome + Laravel + MariaDB, không screenshot |
| git diff --check | PASS exit 0 khi rà soát cuối; Git chỉ cảnh báo LF→CRLF theo cấu hình working copy, không có lỗi whitespace |
| Xác minh PID/datadir và mysqladmin shutdown --host=127.0.0.1 --port=33358 --user=root | PASS; đã dừng đúng instance kiểm thử. Get-CimInstance ban đầu bị sandbox chặn; chạy lại với quyền được cấp để xác minh trước khi dừng. Không dừng MariaDB đang dùng và không xóa datadir/database |

## 5. Ma trận nghiệm thu

| Kịch bản | Kết quả | Bằng chứng |
|---|---|---|
| Guest 401; customer/admin khóa 403 cho 10 endpoint mới | PASS | AdminPublishingTest kiểm tra mọi endpoint; browser kiểm tra thêm danh sách definitions |
| Admin cấu hình danh mục, thứ tự, bắt buộc, thêm/sửa định nghĩa | PASS | Test API; Chrome tạo định nghĩa và cấu hình danh mục thật |
| Sai danh mục/ID chưa cấu hình, số/boolean/object/array thay text | PASS | 422; không ghi dở giá trị |
| Gỡ thông số đã có dữ liệu; đổi đơn vị/code; xóa required active; đặt required khi active thiếu | PASS | 422, giữ cấu hình/giá trị |
| Thiếu category/brand active, ảnh, active SKU, required | PASS | Lỗi từng điều kiện; giữ draft |
| Công bố SKU tồn 0, text zero, public đúng đơn vị/thứ tự | PASS | Public API và test dữ liệu |
| Active whitelist; giữ slug/SKU/trạng thái, chống ảnh ID khác sản phẩm | PASS | API 422/200 tương ứng |
| Lỗi ghi metadata ảnh sau upload active | PASS | 500 mô phỏng, rollback DB và dọn tệp mới |
| Draft→nhập thông số→publish→storefront→sửa thông số active | PASS | Chrome + Laravel/MariaDB thật; storefront cập nhật 16 GB→32 GB, giữ active |
| Hủy/ẩn→404→republish qua Chrome | PASS | Mobile 390px: hủy không phát sinh mutation, ẩn loại cả list/detail, công bố lại giữ giá trị 32 GB |
| Desktop/mobile 1440/768/390, không tràn ngang, focus | PASS | Cả trang định nghĩa/cấu hình và form active; text field có focus outline, không tràn ngang toàn trang |
| Hồi quy browser T01/T02/T03 | PASS | 29 kịch bản cũ đạt; giữ nghiệp vụ, chỉ cập nhật mô tả guard T03 cho endpoint sửa nội dung T04 |

Browser kiểm tra qua CDP Network với session thật. Đối chiếu response giá trị/trạng thái, SKU/slug/giá giữ nguyên, metadata ảnh và tác động public. 9 kịch bản T04 bổ sung 29 kịch bản hồi quy. Artifact local `backend/storage/framework/testing/t04-browser-results.json` (ignored) ghi checks, status URL/method, mutation và exception; không lưu mật khẩu/cookie hoặc ảnh review. Harness tự đóng Chrome, PHP và Vite preview sau khi hoàn tất.

## 6. File thay đổi

- Backend mới: `app/Services/AdminSpecificationService.php`, `app/Services/ProductPublishingService.php`, `app/Http/Controllers/Api/AdminPublishingController.php`, `tests/Feature/AdminPublishingTest.php` (đều dưới backend/).
- Backend sửa: `backend/app/Services/AdminProductService.php` (dùng chung ghi/cleanup ảnh, khóa catalog), `backend/routes/api.php`.
- Frontend mới: `frontend/src/pages/admin/AdminSpecificationsPage.jsx`, `frontend/src/components/admin/ProductPublishingPanel.jsx`, `frontend/src/services/adminPublishingService.js`, `frontend/scripts/t04-admin-publishing-scenarios.mjs`.
- Frontend sửa: `frontend/src/pages/admin/AdminProductsPage.jsx`, `frontend/src/services/adminProductService.js`, `frontend/src/components/admin/ConfirmHideDialog.jsx`, `frontend/src/layouts/AdminLayout.jsx`, `frontend/src/utils/adminCatalog.js`, `frontend/src/styles/admin.css`, `frontend/src/App.jsx`, `frontend/scripts/t02-admin-catalog-review.mjs`, `frontend/scripts/t03-admin-products-scenarios.mjs`.
- Tài liệu: `README.md`, `docs/api/admin-products.md`, `docs/api/admin-product-publishing.md`, báo cáo này.

## 7. Bàn giao

**T04 hoàn tất trong phạm vi UC09–UC11 đã giao**, gồm các luồng browser bắt buộc với API thật. Không còn kịch bản bắt buộc bị chặn. Chưa kiểm tra nhiều worker cạnh tranh, trình duyệt/thiết bị vật lý khác Chrome emulation; chưa thêm kiểu số/enum vì schema v1 không có; chưa có garbage collection tệp ảnh cũ theo chính sách T03. Các giới hạn này không được ghi là PASS.

Chạy local theo README bằng admin hiện có; không có tài khoản/mật khẩu mặc định mới. Vào **Thông số**, khai báo và cấu hình danh mục; tạo nháp, mở sửa, nhập giá trị, lưu rồi công bố. Lý do công bố dựa trên dữ liệu đã lưu.

Gợi ý commit sau khi review: `feat(admin): configure specifications and publish products safely`. Chưa tự commit/push/merge. Bước tiếp theo đề xuất: review diff và tích hợp T04 bằng quy trình GitHub Desktop; chưa tự làm module kế tiếp.
