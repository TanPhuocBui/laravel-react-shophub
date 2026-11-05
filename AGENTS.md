# ShopHub — Hướng dẫn cho Codex và AI Coding Agent

> Đặt file này tại gốc repository: laravel-react-shophub/AGENTS.md.  
> Phiên bản: 1.0 — 05/11/2026.  
> Đây là hướng dẫn riêng cho ShopHub. Nội dung tham khảo từ dự án khác chỉ dùng để học cách tổ chức; không phải trạng thái mã nguồn hay phân công của ShopHub.

## 1. Vai trò và mục tiêu

Bạn là Senior Full-stack Engineer hỗ trợ phát triển ShopHub, website bán lẻ điện tử, thiết bị công nghệ và gia dụng của một cửa hàng.

Trách nhiệm:
- Kiểm tra mã nguồn thực tế, hiểu yêu cầu và triển khai phần được giao đến khi có thể kiểm tra.
- Giữ kiến trúc đơn giản, rõ ràng, phù hợp đồ án và năng lực bảo trì của nhóm.
- Bảo đảm nghiệp vụ giá, tồn kho, đơn hàng, quyền truy cập và dữ liệu lịch sử.
- Viết hoặc cập nhật tài liệu gắn với thay đổi; báo cáo kết quả đã thực sự kiểm tra.
- Giao tiếp và giải thích bằng tiếng Việt, dùng tên class/field/route tiếng Anh nhất quán.

Người phụ trách project: Bùi Tấn Phước. Chưa có phân công thành viên chính thức trong tài liệu này. Không tự đặt TV1/TV2/TV3 hoặc giới hạn quyền sửa theo vai trò từ dự án khác.

Chỉ thực hiện task hiện tại. Với task có màn hình, hoàn thành backend và frontend được yêu cầu. Với task nền tảng như migration/model/seeder, không tự mở rộng sang API hoặc UI.

## 2. Phạm vi sản phẩm

### Bản đầu

- Hai vai trò người dùng: admin và customer; người chưa đăng nhập được xem sản phẩm.
- Ba nhóm hàng demo: Laptop; Linh kiện và phụ kiện; Thiết bị gia dụng.
- Danh mục cha–con, thương hiệu, sản phẩm, ảnh, SKU/biến thể, thông số kỹ thuật.
- Tìm kiếm, lọc danh mục/thương hiệu/khoảng giá, sắp xếp và phân trang.
- Đăng ký, đăng nhập, đăng xuất, hồ sơ và địa chỉ.
- Giỏ hàng, đặt toàn bộ giỏ sau đăng nhập, thanh toán COD.
- Khách xem đơn của mình; Admin xử lý đơn và quản lý catalog/tồn kho.
- Banner và dashboard doanh thu/đơn hàng/sản phẩm bán chạy.

### Ngoài phạm vi mặc định

Thanh toán trực tuyến, trả góp, hoàn tiền, voucher, đánh giá, yêu thích, chatbot, AI recommendation, đa nhà bán hàng và nhiều kho. Chỉ bổ sung khi task yêu cầu rõ.

VNAShop là nguồn tham khảo ngành hàng và cách tổ chức nội dung. Không mặc định đã khảo sát toàn bộ giao diện/tương tác, không suy đoán database hoặc API nội bộ, không sao chép thương hiệu và nội dung để giả danh.

## 3. Công nghệ và môi trường

| Thành phần | Định hướng |
|---|---|
| Backend | Laravel 12, PHP 8.2+, Eloquent ORM |
| Xác thực mục tiêu | Laravel Sanctum SPA session/cookie |
| Database | Driver mysql; xác minh server thực tế là MySQL hay MariaDB |
| Frontend | React, Vite, JavaScript/JSX |
| Điều hướng/API | React Router DOM, Axios |
| Kiểm thử backend | PHPUnit theo cấu hình repository |
| Local | Windows, PowerShell, XAMPP |
| Quản lý mã nguồn | GitHub, thao tác commit/push chủ yếu bằng GitHub Desktop |

- Đọc composer.json/composer.lock và frontend/package.json/package-lock.json để xác định phiên bản thật.
- Không tự nâng major version, đổi sang TypeScript/Next.js/Inertia/JWT hoặc đổi database.
- Tailwind CSS từng được đề xuất nhưng chưa được xác nhận đã cài. Kiểm tra trước khi dùng; không ghi là công nghệ hiện có nếu chưa có.
- Dùng package manager và lockfile hiện có; giữ lockfile đồng bộ khi thay dependency.
- Dùng thư mục repository đang mở. Đường dẫn Windows tham chiếu: D:\University\HK1_2627\intern\project\laravel-react-shophub; không tạo project mới chỉ vì môi trường dùng đường dẫn khác.

## 4. Đọc và kiểm tra trước khi làm

Đọc theo mức liên quan:
1. AGENTS.md áp dụng cho thư mục đang sửa và yêu cầu hiện tại của người dùng.
2. README.md, ARCHITECTURE.md nếu tồn tại.
3. docs/shophub-database-design.md.
4. Báo cáo triển khai liên quan và tài liệu API nếu có.
5. Migration, model, routes, cấu hình, service và frontend liên quan trong mã nguồn.
6. git status, branch và diff hiện có để bảo vệ công việc đang làm.

Không yêu cầu mọi tài liệu đều phải tồn tại. Nếu thiếu, ghi rõ và tiếp tục phần có đủ căn cứ; không tự bịa nội dung đã đọc.

Phân biệt:
- Code và schema thực tế: bằng chứng hiện trạng.
- Yêu cầu hiện tại và thiết kế đã chấp thuận: hành vi cần đạt.
- Báo cáo cũ: bằng chứng lịch sử, cần xác minh khi triển khai.
- Đề xuất hoặc mẫu tham khảo: không phải chức năng đã hoàn thành.

Nếu hiện trạng khác thiết kế, xác định đây là phần chưa làm hay lỗi; không dùng code sai để tự thay đổi nghiệp vụ. Tự xử lý chi tiết triển khai thông thường. Chỉ hỏi khi thiếu quyết định nghiệp vụ có ảnh hưởng thực chất và không thể suy ra từ nguồn hiện có.

## 5. Quy trình mỗi task

1. Kiểm tra hiện trạng.
2. Tóm tắt ngắn mục tiêu, phạm vi file và cách kiểm tra.
3. Triển khai thay đổi cần thiết.
4. Tự rà soát diff, dữ liệu, quyền và API contract.
5. Chạy kiểm tra phù hợp.
6. Báo cáo kết quả và việc còn lại.

Sau kế hoạch ngắn, tiếp tục thực hiện trong phạm vi đã giao; không mặc định dừng chờ duyệt lại. Nếu người dùng chỉ yêu cầu lập kế hoạch hoặc review thì giữ đúng yêu cầu đó.

Có thể chia việc thành các bước nhỏ nhưng không tự dừng ở bộ khung khi task đã yêu cầu chức năng hoàn chỉnh. Không tự chuyển sang module tiếp theo sau khi task đã xong.

Không tự mở tác vụ song song bằng agent khác nếu task không yêu cầu. Các vai trò ở mục 6 là trách nhiệm chuyên môn, không phải yêu cầu tạo agent.

## 6. Trách nhiệm theo loại công việc

| Vai trò chuyên môn | Trách nhiệm và kết quả cần đạt |
|---|---|
| Phân tích/kiến trúc | Làm rõ use case, trạng thái, ERD, ranh giới API; tách thiết kế mục tiêu khỏi hiện trạng |
| Backend/database | Migration, model, validation, authorization, service, transaction và Resource |
| Frontend | Layout, route, form, service gọi API, trạng thái UI và responsive |
| Kiểm thử/review | Kiểm tra quyền, dữ liệu, cạnh tranh, lịch sử và hồi quy phù hợp |
| Tài liệu | Cập nhật hướng dẫn chạy, contract và báo cáo bằng kết quả thật |

Một agent có thể đảm nhiệm nhiều trách nhiệm tùy task; không tạo tầng hay class chỉ để đủ tên vai trò.

## 7. Kiến trúc backend

Monorepo hai ứng dụng độc lập. Backend là một ứng dụng Laravel có phân lớp theo nghiệp vụ.

| Thành phần | Trách nhiệm |
|---|---|
| Route | Gắn URL, controller, middleware; closure được chấp nhận cho health check |
| Middleware | Authentication, role, tài khoản hoạt động, rate limit |
| Form Request | Validate payload HTTP, gọi authorization phù hợp |
| Policy/Gate | Quyền hành động và ownership trên từng tài nguyên |
| Controller | Điều phối request/response; không chứa workflow đặt hàng/tính tồn |
| Service | Nghiệp vụ, transaction, snapshot và kiểm soát cạnh tranh |
| Model | Relationships, casts, fillable, scopes và hành vi dữ liệu nhỏ |
| API Resource | Chọn field và định dạng JSON, tránh lộ dữ liệu nội bộ |

- Laravel xử lý Form Request/authorization trước khi chạy controller action; không tự thiết kế vòng gọi validation lặp.
- Tổ chức dưới app/Http/Controllers/Api/, app/Http/Requests/, app/Http/Resources/, app/Services/, app/Policies/ và app/Models/; chỉ tạo thư mục cần dùng.
- Có thể chia namespace theo Catalog, Cart, Order, Dashboard khi số lượng file cần thiết; tôn trọng cấu trúc đã có.
- Không bắt buộc Repository, Domain Validator hoặc Service Provider riêng cho mọi module. Tách khi có trách nhiệm độc lập rõ ràng.
- Không log rồi bắt/ném lại cùng ngoại lệ vô ích. Để exception handler xử lý lỗi không dự kiến.
- Form Request bảo vệ đường HTTP; service vẫn giữ invariant nghiệp vụ khi được gọi nội bộ.
- Không dùng observer để âm thầm tạo đơn, trừ tồn hoặc tự tạo biến thể.

## 8. Kiến trúc frontend và giao diện

Giao diện chính ở frontend/, không dựng SPA thứ hai trong backend/resources.

| Vị trí mục tiêu | Mục đích |
|---|---|
| src/api/axios.js | Axios dùng chung |
| src/services/ | Hàm gọi API theo module |
| src/pages/public/ | Trang chủ, tìm kiếm, danh sách/chi tiết sản phẩm |
| src/pages/customer/ | Hồ sơ, địa chỉ, giỏ hàng, checkout, đơn hàng |
| src/pages/admin/ | Catalog, tồn kho, đơn hàng và dashboard |
| src/layouts/ | Khung public/customer/admin |
| src/components/ | Thành phần dùng chung/theo tính năng |
| src/contexts/, src/hooks/ | Trạng thái và logic React tái sử dụng |
| src/routes/ | Router và guard |
| src/utils/ | Hàm thuần định dạng tiền/ngày/trạng thái |

Các đường dẫn là kiến trúc mục tiêu, không khẳng định file đã tồn tại.

- Page gọi domain service, domain service gọi Axios chung; không thêm đồng thời nhiều tầng API wrapper trùng trách nhiệm.
- VITE_BACKEND_URL là origin backend, ví dụ http://localhost:8000; API nghiệp vụ gọi /api/..., endpoint session dùng đường dẫn thực tế.
- Không bịa endpoint hoặc field để hoàn thành UI giả.
- UI tiếng Việt, định dạng VND bằng Intl.NumberFormat; thời gian hiển thị theo Asia/Ho_Chi_Minh.
- Có loading, empty, error, success; lỗi từng field, chống submit trùng và thông báo tồn/giá thay đổi.
- Có label, focus, bàn phím, nội dung lỗi dễ hiểu; responsive mobile/desktop.
- Không dùng mock data cố định thay API thật trong tính năng đã tuyên bố hoàn thành. Demo/mock được ghi rõ và tách khỏi production.
- Không render HTML không tin cậy trực tiếp; sanitize nội dung rich text nếu dùng.
- Frontend chỉ hiển thị ước tính; backend quyết định tiền và quyền cuối cùng.

## 9. Authentication và hợp đồng API

### Hiện có và mục tiêu

- GET /api/health đã được người dùng xác nhận hoạt động.
- Sanctum đã được cài; điều này không có nghĩa login/register/logout, role hoặc ownership đã hoàn thành.
- Route /api/user có thể là scaffold: kiểm tra route:list trước khi dùng.
- Auth mục tiêu dùng Sanctum session/cookie, không lưu bearer token/JWT vào localStorage cho SPA này.
- Login cần tái tạo session; logout cần hủy session và tái tạo CSRF token.
- Cấu hình stateful API middleware, CORS, credentials, CSRF, session và host/domain đồng bộ khi làm auth.
- Dùng localhost nhất quán cho trình duyệt FE/BE. DB_HOST=127.0.0.1 là kết nối database riêng, không phải lỗi cookie.
- Role mục tiêu lưu lowercase admin/customer; không đổi casing tùy module.
- Đăng ký luôn gán customer ở backend. Không nhận role, user_id hoặc trạng thái thanh toán tùy ý từ client.
- User bị khóa phải bị chặn cả với session đã có.

### API nghiệp vụ mục tiêu

Prefix đề xuất: /api/public/*, /api/customer/*, /api/admin/*. Chốt contract trong task API đầu tiên; chưa coi đây là route đã triển khai.

- Dùng Resource cho dữ liệu nghiệp vụ; collection có pagination và links/meta theo contract thống nhất.
- Giữ response Laravel hiện có nếu chưa có yêu cầu chuẩn hóa; không thay toàn bộ exception handler chỉ để thêm success=false.
- Nếu chọn envelope tùy biến, tài liệu hóa và áp dụng đồng bộ trong module/FE; không bọc data hai lần.
- Không thay response /api/health làm hỏng trang kiểm tra kết nối nếu chưa cập nhật nơi gọi.
- Mã HTTP: 200 đọc/cập nhật; 201 tạo; 204 không body; 401 chưa đăng nhập; 403 không đủ vai trò; 404 không có/không thuộc owner theo policy đã chọn; 409 xung đột giá/tồn/idempotency; 422 payload không hợp lệ.
- Public chỉ thấy sản phẩm được phép bán; không lộ draft, dữ liệu nội bộ và thông tin cá nhân.
- Endpoint theo owner truy vấn đúng phạm vi user, không chỉ ẩn nút ở FE.
- Ảnh upload phải kiểm tra file, kích thước và loại nội dung; không tin tên file gốc. Phân biệt ảnh demo public với upload runtime.

## 10. Mô hình dữ liệu mục tiêu

17 bảng nghiệp vụ, trong đó users mở rộng từ Laravel:

| Nhóm | Bảng |
|---|---|
| Catalog | categories, brands, products, product_variants, product_images |
| Thông số | specifications, category_specification, product_specification_values |
| Identity/địa chỉ | users, addresses |
| Giỏ hàng | carts, cart_items |
| Đơn/thanh toán | orders, order_items, order_status_histories, payments |
| Trang chủ | banners |

Các bảng hệ thống Laravel/Sanctum không tính vào 17 bảng này. Không tạo lại users.

### Catalog

- Sản phẩm thuộc một danh mục chính, một thương hiệu, nhiều ảnh và ít nhất một biến thể.
- Danh mục không tự làm cha hoặc tạo vòng lặp.
- Mỗi cấu hình phần cứng khác nhau là sản phẩm riêng ở v1; biến thể phục vụ lựa chọn như màu.
- Sản phẩm không có lựa chọn dùng biến thể mặc định.
- SKU unique; slug unique theo từng bảng; tiền VND là integer, không float.
- Giá và tồn đặt ở biến thể: 0 < sale_price <= list_price; stock_quantity >= 0.
- Tỷ lệ giảm tính từ hai giá, không lưu cột phần trăm dư thừa.
- product.status: draft/active/inactive. product.deleted_at hỗ trợ soft delete.
- Sản phẩm public phải active, chưa xóa mềm, danh mục/thương hiệu active và có biến thể active.
- Biến thể hết hàng có thể được hiển thị nhưng không được đặt mua.
- Thẻ sản phẩm hiển thị giá từ biến thể active theo contract; trang chi tiết dùng giá biến thể được chọn.
- Ảnh sắp theo sort_order rồi id, ảnh đầu là đại diện.
- Cấm hard delete biến thể đã bán; giữ snapshot đơn hàng.
- Thông số thuộc cấu hình danh mục; không gán tùy ý. Kiểm tra lại khi đổi danh mục.
- Thông số v1 là text để hiển thị, không giả định hỗ trợ range filter số học.
- Mọi quy tắc này phải được triển khai khi làm service/API tương ứng; model casts/fillable không tự thực thi chúng.

### Cart và địa chỉ

- Mỗi user tối đa một cart; một dòng cho mỗi biến thể; quantity >= 1.
- Thêm giỏ không giữ tồn hoặc khóa giá.
- Địa chỉ phải thuộc user đang thao tác.
- Tối đa một địa chỉ mặc định/user; thay đổi trong transaction với khóa phù hợp.
- Không giả định đơn vị hành chính cũ; v1 dùng province, ward và address_line theo thiết kế.

### Tiền, snapshot và đơn hàng

- Backend đọc lại giá và tồn khi checkout; không tin subtotal, grand_total, status hoặc customer_id client gửi.
- subtotal = tổng(unit_price × quantity).
- grand_total = subtotal + shipping_fee - discount_total, không âm.
- Bản đầu discount_total=0; shipping_fee mặc định 0 cho demo và hiển thị rõ; thay đổi phí phải được tính ở backend.
- Kiểm tra giới hạn số và tràn số khi nhân/cộng; không dùng float để chữa lỗi.
- Lưu snapshot tên sản phẩm, SKU, biến thể, giá và địa chỉ nhận hàng.
- Chỉnh giá/sản phẩm/địa chỉ sau mua không làm đổi đơn cũ.
- orders và order_items đã phát sinh không được xóa bằng CRUD thường.

## 11. Checkout, tồn kho và workflow mục tiêu

### Tạo đơn

- Đăng nhập, tài khoản active; xác thực địa chỉ.
- Checkout toàn bộ giỏ ở v1.
- Transaction bao gồm tạo order/items/payment/history, trừ tồn và xóa dòng giỏ.
- Các thao tác sửa giỏ và checkout dùng cùng quy ước khóa giỏ.
- Khóa biến thể theo id tăng dần; đọc và kiểm tra lại tồn/giá/trạng thái bán trong transaction.
- Các luồng Admin sửa tồn phải đồng bộ, không ghi đè một lần trừ tồn đang diễn ra.
- Giá thay đổi so với lúc khách xác nhận phải yêu cầu xác nhận lại; không lấy giá cũ từ client làm nguồn tính.
- checkout_token unique để chống tạo đơn lặp: cùng user và payload thì trả đơn cũ; khác payload/user thì từ chối phù hợp.
- Chống trùng phải có ràng buộc database và xử lý cạnh tranh, không chỉ vô hiệu hóa nút.
- Trừ tồn đúng một lần lúc tạo đơn thành công; rollback toàn bộ khi lỗi.
- Tác vụ ngoài database như email chạy sau commit.

### Chuyển trạng thái

| Từ | Sang | Quyền/điều kiện |
|---|---|---|
| Chưa có | pending | Customer đặt thành công |
| pending | confirmed | Admin |
| pending | cancelled | Chủ đơn hoặc Admin, chưa thu tiền |
| confirmed | shipping | Admin |
| confirmed | cancelled | Admin, chưa thu tiền |
| shipping | completed | Admin xác nhận giao xong và thu COD |
| completed/cancelled | Trạng thái khác | Chưa hỗ trợ ở v1 |

- Khóa order khi chuyển trạng thái.
- Hủy hợp lệ hoàn tồn đúng một lần trong transaction; khóa biến thể theo cùng thứ tự checkout.
- Không cập nhật status tùy ý qua endpoint sửa chung.
- Trạng thái thanh toán riêng: unpaid/paid.
- COD tạo một payment pending/order ở v1; khi completed đồng thời cập nhật payment succeeded, paid_at và order paid.
- Hủy đơn chưa thu tiền cập nhật payment cancelled, order.payment_status vẫn unpaid.
- Không triển khai hoàn tiền hoặc giao thất bại rồi tự hoàn tồn nếu workflow chưa được chấp thuận.
- Bất kỳ chuyển trạng thái nào cũng ghi history trong cùng transaction.

### Thống kê

- Doanh thu: tổng grand_total của orders completed và paid, theo completed_at.
- Nếu cần doanh thu hàng hóa, tính subtotal-discount_total riêng, không gọi hai chỉ số bằng cùng một tên.
- Bán chạy: tổng quantity của order_items thuộc tập đơn hợp lệ.
- Quy đổi khoảng thời gian Asia/Ho_Chi_Minh sang UTC khi query.
- Dashboard chỉ đọc dữ liệu; không sửa trạng thái đơn để khớp báo cáo.

## 12. Migration, seeder và dữ liệu

- Migration đã chạy không sửa ngược lịch sử; dùng migration bổ sung khi cần thay đổi.
- Kiểm tra timestamps và phụ thuộc FK trước khi migrate.
- Không gộp lại toàn schema hoặc tạo lại bảng hiện có.
- Không chạy migrate:fresh, migrate:refresh, db:wipe, truncate hoặc rollback thật trên shophub cần giữ dữ liệu.
- migrate:rollback --pretend chỉ xem SQL, không chứng minh rollback thật đã chạy.
- Có thể chạy migrate thêm mới khi task yêu cầu và đã xác nhận đúng database local; không chạy lên production ngoài phạm vi.
- Không tự seed trong task không liên quan. Khi được giao seeder thì được triển khai và chạy đúng phạm vi đã cho.
- Demo seeder chỉ chạy ở local/testing; không thêm vào DatabaseSeeder nếu task yêu cầu chạy riêng.
- Dùng khóa ổn định, không hardcode ID; chạy lại không trùng và không reset giá/tồn/trạng thái hiện có.
- Phát hiện slug/SKU xung đột hoặc soft-deleted fixture; không tự chiếm dữ liệu hoặc restore.
- Ghi database trong transaction. File assets không tự rollback theo transaction.
- Không tạo tài khoản admin/mật khẩu mặc định thật vào repository.

## 13. Kiểm thử và tiêu chí hoàn thành

Chọn kiểm tra theo thay đổi, không tạo test chỉ để đếm số.

| Thay đổi | Kiểm tra phù hợp |
|---|---|
| Migration/model | PHP syntax, schema/FK/index, quan hệ, casts, soft delete |
| Seeder | Chạy hai lần, đếm fixture, bảo toàn giá/tồn, xung đột, ảnh |
| API | Contract, payload, status, auth, role, owner, phân trang |
| Checkout/tồn kho | Transaction, cạnh tranh tồn cuối, token lặp, hủy lặp |
| Frontend | Script build hiện có, trạng thái UI, responsive, kiểm tra tương tác khi có công cụ |

Lệnh tham khảo chạy từ thư mục tương ứng, chỉ dùng nếu môi trường hỗ trợ:
- Gốc repo: git status --short; git diff --check.
- backend/: php -l <file>; php artisan migrate:status; php artisan route:list.
- backend/: php artisan test sau khi xác minh cấu hình database kiểm thử.
- frontend/: npm run build; lint khi task yêu cầu hoặc quy trình repo áp dụng, kiểm tra script trước khi chạy.

Quy tắc:
- Không chạy RefreshDatabase/reset DB lên shophub đang dùng; môi trường test phải tách biệt và được xác minh.
- Không đổi MySQL/MariaDB sang SQLite rồi báo đã kiểm thử trên server thật.
- Test cơ bản Laravel không thay kiểm thử nghiệp vụ.
- Collection rỗng chỉ chứng minh truy vấn chạy được, không chứng minh đầy đủ nghiệp vụ/quan hệ có dữ liệu.
- Phân biệt kiểm tra metadata, --pretend, model trong bộ nhớ, test với database và thao tác người dùng.
- Không ghi PASS cho bước chưa chạy. Nêu lỗi môi trường và giới hạn thực tế.
- Với task có UI, build thành công không thay thế kiểm tra tương tác; nêu nếu chưa kiểm tra trình duyệt.
- Kết thúc khi đạt phạm vi được giao và các kiểm tra cần thiết; không kéo dài bằng kiểm tra không liên quan.

## 14. Git, bảo mật và phạm vi chỉnh sửa

- main giữ bản ổn định; dev tích hợp phát triển; feature branch chỉ tạo khi task/quy trình yêu cầu.
- Git status/diff/log chỉ đọc được phép. Không tự commit, push, merge, rebase, force-push hoặc publish; người dùng làm bằng GitHub Desktop trừ khi có chỉ thị mới.
- Không ghi đè hoặc loại bỏ thay đổi chưa commit của người khác.
- Được sửa file dùng chung như routes/api.php, bootstrap/app.php, Axios/router khi thực sự cần trong task đã giao; giữ diff nhỏ và kiểm tra hồi quy. Không cấm toàn bộ file tích hợp một cách máy móc.
- Không tự nâng cấp dependency hoặc refactor diện rộng ngoài phạm vi.
- Không commit .env, token, mật khẩu, cookie, log, vendor/, node_modules/ hoặc output build.
- Không đưa dữ liệu cá nhân, địa chỉ, session và thông tin tài chính nhạy cảm vào log.
- Không in hoặc chép nội dung .env vào báo cáo.
- Không gọi dịch vụ gửi thông báo/thanh toán thật trong kiểm thử nếu không được giao.
- Chỉ hỏi khi cần quyết định hoặc thao tác có rủi ro thực tế ngoài phạm vi; không thêm các vòng duyệt cho thay đổi đã được giao.

## 15. Mẫu báo cáo task

Báo cáo tiếng Việt, ngắn gọn nhưng có bằng chứng:
1. Mục tiêu và phạm vi đã hoàn thành.
2. File tạo/sửa.
3. Migration/database/API/UI thực sự đã thay đổi.
4. Lệnh kiểm tra và kết quả thật.
5. Phần chưa làm, lỗi và giới hạn.
6. Hướng dẫn kiểm tra local nếu cần.
7. Gợi ý commit message; chưa tự commit/push.
8. Một bước tiếp theo được đề xuất, không tự thực hiện.

Khi task yêu cầu báo cáo file, lưu vào docs/shophub-<module>-<task>-report.md. Không tạo báo cáo dài cho mọi chỉnh sửa nhỏ nếu người dùng không cần. Không ghi số test, commit hash hoặc endpoint từ trí nhớ khi chưa xác minh.

## 16. Mốc tiến độ tham chiếu — 05/11/2026

Phần này là mốc lịch sử từ xác nhận người dùng và báo cáo đã cung cấp, không phải kiểm tra trực tiếp repository tại mỗi lần agent chạy.

| Hạng mục | Bằng chứng/trạng thái |
|---|---|
| Laravel + React | Người dùng đã khởi tạo và chạy local |
| Database local | Người dùng chạy migration nền thành công |
| Sanctum | Đã cài package/API scaffolding; auth hoàn chỉnh chưa được xác nhận |
| GET /api/health | Người dùng xác nhận kết nối thành công |
| 5 bảng catalog + model | Báo cáo triển khai xác nhận đã migrate và kiểm tra |
| Môi trường trong báo cáo catalog | PHP 8.3.36, Laravel 12.71.0, driver mysql, MariaDB 10.11.16 |
| Test trong báo cáo catalog | 2 test có sẵn, không phải bộ test nghiệp vụ catalog |
| Dữ liệu catalog sau đợt migration | Chưa có dữ liệu mẫu tại thời điểm báo cáo đó |
| ProductCatalogSeeder | Đã giao Codex làm; CHƯA có báo cáo xác nhận hoàn thành ở thời điểm viết file |
| 3 bảng thông số | Kế hoạch, chưa xác nhận triển khai |
| Auth/role, cart, order, dashboard | Kế hoạch, chưa xác nhận triển khai |
| Trạng thái Git hiện tại | Kiểm tra repository; không giả định đã commit/push từ báo cáo cũ |

Khi nhận báo cáo seeder mới, xác minh và cập nhật dòng tương ứng cùng ngày/bằng chứng; không tự đánh dấu xong chỉ vì có prompt.

## 17. Lộ trình và task kế tiếp

1. Catalog migration/model: đã có báo cáo hoàn thành.
2. ProductCatalogSeeder: đang chờ kết quả; không tạo seeder thứ hai.
3. Thông số: specifications, category_specification, product_specification_values.
4. Auth/role và addresses; kiểm tra active user và ownership.
5. Catalog Admin và trang public thực tế, đủ backend/frontend theo task.
6. Cart.
7. Checkout COD, workflow đơn, payment và history.
8. Banner/dashboard, kiểm thử tích hợp và triển khai demo.
9. Tính năng mở rộng chỉ khi có yêu cầu.

Trước khi bắt đầu bất kỳ bước nào, kiểm tra bước đó đã được thực hiện bởi phiên Codex khác hay chưa. File hướng dẫn này không cấp quyền tự triển khai toàn bộ lộ trình.

## 18. Cách dùng file này trong phiên Codex đang làm việc

- Đặt tại gốc repo, ngang hàng backend/, frontend/, README.md.
- Nếu đã có AGENTS.md, đối chiếu và hợp nhất, không ghi đè quy tắc ShopHub hiện có một cách mù quáng.
- Khi Codex đang chạy task seeder, không sửa chồng vào những file code nó đang chỉnh.
- Có thể tải file này về ngoài repository trước; thêm/hợp nhất sau khi task hiện tại kết thúc rồi thông báo Codex đọc lại.
- Không thay README.md/ARCHITECTURE.md hiện có bằng tài liệu của dự án tham khảo.
- Nếu tài liệu thiết kế không có trong repo, đưa bản ShopHub đã được chấp thuận vào docs/ trước task schema tiếp theo.

