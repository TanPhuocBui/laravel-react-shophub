# ShopHub — Kiến trúc nghiệp vụ, vai trò và kế hoạch triển khai

**Ngày lập:** 13/11/2026 · **Phạm vi:** cửa hàng bán lẻ điện máy, công nghệ và gia dụng · **Nền tảng:** Laravel 12, Sanctum, React/Vite, MySQL/MariaDB.

Tài liệu dùng để chia việc theo chuỗi **vai trò → use case → task → tiêu chí nghiệm thu**. Giữ mã UC01–UC22 đã thống nhất. Các mã từ UC23 trở đi bổ sung catalog công khai, vận hành và mở rộng. Các mục ghi «đề xuất» cần được xác nhận khi nhận task tương ứng.

## 1. Hiện trạng và quyết định phạm vi

Đối chiếu ngày 26/11/2026 trên nhánh `feature/uc15-uc16-shopping-cart`.

| Hạng mục | Có trong mã nguồn trên nhánh hiện tại |
|---|---|
| Storefront Bazaar và catalog công khai | Trang chủ, danh mục, tìm kiếm, lọc, sắp xếp, phân trang, chi tiết, SKU và thông số kỹ thuật. |
| Tài khoản Cobalt Orbit | Đăng ký, đăng nhập, xem hồ sơ, đăng xuất và phân quyền qua Sanctum. |
| Quản trị catalog | Danh mục, thương hiệu, sản phẩm, ảnh, SKU, thông số, công bố và ẩn sản phẩm. Quản trị catalog dùng các route và Gate Admin hiện có. |
| Địa chỉ và giỏ hàng | Quản lý địa chỉ giao hàng (UC17). Thêm SKU và đọc số lượng tổng hợp (UC14). Có API đọc toàn bộ giỏ (UC15). Giao diện giỏ đang ở bản xem trước DEV với dữ liệu mẫu. |
| Công việc tiếp theo | Tích hợp trang xem giỏ với API, đổi số lượng hoặc xóa dòng (UC16), checkout COD, theo dõi và xử lý đơn, quản trị banner và dashboard. |

### Tham khảo và chuyển thành phạm vi ShopHub

| Quan sát trên website công khai | Áp dụng cho ShopHub |
|---|---|
| VNAShop phân loại hàng điện máy và có trang tra cứu đơn theo mã. [Trang chủ](https://www.vnashop.vn/) · [Tra cứu đơn](https://vnashop.vn/product/track) | Tổ chức catalog theo danh mục cha–con, thương hiệu, SKU và thông số. Đặt mục tra cứu trong menu Tài khoản. MVP đưa người mua đến đơn thuộc tài khoản của mình. |
| VNAShop có COD và các phương thức thanh toán khác, kèm chính sách đổi trả. [Thanh toán](https://vnashop.vn/phuong-thuc-thanh-toan) · [Đổi trả](https://vnashop.vn/blog-detail/chinh-sach-doi-tra) | MVP dùng COD và ghi riêng trạng thái thu tiền. Bố trí trang chính sách. Luồng yêu cầu đổi trả và thanh toán online thuộc giai đoạn mở rộng. |
| Điện Máy Chợ Lớn công khai hướng dẫn mua, giỏ hàng và mục theo dõi đơn. [Hướng dẫn mua](https://dienmaycholon.com/trang-huong-dan-mua-hang) · [Trang chủ](https://dienmaycholon.com/) | Dùng luồng chọn biến thể → giỏ → xác nhận giao hàng → đặt COD → theo dõi đơn. Hiển thị tóm tắt phí giao và tổng tiền trước khi xác nhận. |
| Điện Máy Chợ Lớn công bố giao hàng/lắp đặt và bảo hành/đổi trả. [Giao hàng](https://dienmaycholon.com/trang-quy-dinh-giao-hang) · [Hậu mãi](https://dienmaycholon.com/trang-bao-tri-bao-hanh-doi-tra) | V1 công khai chính sách ShopHub và vận hành giao hàng qua Admin. Tích hợp nhà vận chuyển, lịch lắp đặt và xử lý hậu mãi được xem xét sau. |

**MVP:** Một cửa hàng, một nguồn tồn kho, ba nhóm hàng demo hiện có. Khách vãng lai xem catalog. Khách hàng đăng nhập để dùng giỏ, lưu địa chỉ và đặt toàn bộ giỏ bằng COD. Admin quản trị catalog, tồn, đơn, banner và xem báo cáo. Yêu thích, voucher, thanh toán online, trả góp, đa kho và đa nhà bán hàng thuộc phạm vi mở rộng. Phí giao và vùng phục vụ là tham số nghiệp vụ cần chốt ở T07.

## 2. Vai trò và quyền

| Vai trò nghiệp vụ | Đại diện trong hệ thống | Trách nhiệm và phạm vi dữ liệu |
|---|---|---|
| Khách vãng lai | Trạng thái chưa đăng nhập | Đọc catalog đã công bố và chính sách, đăng ký hoặc đăng nhập. |
| Khách hàng | `customer`, tài khoản hoạt động | Xem hồ sơ của mình, sửa địa chỉ và giỏ của mình, đặt COD, theo dõi và hủy đơn của mình theo trạng thái. |
| Quản trị catalog | Nhóm trách nhiệm của `admin` | Quản lý danh mục, thương hiệu, ảnh, thông số, SKU, giá, trạng thái bán và tồn kho. |
| Nhân sự xử lý đơn | Nhóm trách nhiệm của `admin` | Kiểm tra đơn, xác nhận, chuyển giao, hủy theo quy tắc và xác nhận đã giao/thu COD. |
| Quản trị nội dung và theo dõi kinh doanh | Nhóm trách nhiệm của `admin` | Quản lý banner, xem thống kê. |
| Nhà vận chuyển, cổng thanh toán | Tác nhân ngoài dự kiến | Chỉ xuất hiện khi có tích hợp giai đoạn sau. V1 Admin cập nhật kết quả giao và thu COD. |

V1 lưu hai giá trị role `customer` và `admin`. Ba nhóm công việc Admin có cùng quyền kỹ thuật hiện tại. Khi cần phân quyền chi tiết cho nhân viên, bổ sung permission theo chức năng và kiểm thử lại quyền truy cập. Laravel thực thi Gate và kiểm tra chủ sở hữu trên từng tài nguyên. React dùng quyền để điều hướng và hiển thị thao tác. Đăng ký công khai luôn tạo `customer`, tài khoản khóa bị từ chối trên các API cần xác thực.

## 3. Danh mục use case và task thực hiện

**Mốc:** Có mã trên GitHub · MVP · Sau MVP. Các task tương ứng được mô tả ở mục 6.

| Mã | Use case | Tác nhân | Task | Mốc |
|---|---|---|---|---|
| UC01 | Đăng ký tài khoản khách hàng | Khách vãng lai | T00 | Nhánh auth |
| UC02 | Đăng nhập | Người có tài khoản | T00 | Nhánh auth |
| UC03 | Xem thông tin tài khoản | Customer, Admin | T00 | Nhánh auth |
| UC04 | Đăng xuất | Customer, Admin | T00 | Nhánh auth |
| UC05 | Quản lý danh mục cha–con | Admin | T02 | MVP |
| UC06 | Quản lý thương hiệu | Admin | T02 | MVP |
| UC07 | Quản lý sản phẩm và hình ảnh | Admin | T03 | MVP |
| UC08 | Quản lý biến thể, SKU, giá và tồn kho | Admin | T03 | MVP |
| UC09 | Cấu hình thông số theo danh mục | Admin | T04 | MVP |
| UC10 | Nhập giá trị thông số của sản phẩm | Admin | T04 | MVP |
| UC11 | Công bố hoặc ẩn sản phẩm | Admin | T04 | MVP |
| UC12 | Xem danh sách yêu thích | Customer | T12 | Sau MVP |
| UC13 | Thêm hoặc bỏ sản phẩm yêu thích | Customer | T12 | Sau MVP |
| UC14 | Thêm biến thể vào giỏ | Customer | T06 | MVP |
| UC15 | Xem giỏ hàng | Customer | T06 | MVP |
| UC16 | Đổi số lượng hoặc xóa dòng giỏ | Customer | T06 | MVP |
| UC17 | Quản lý địa chỉ giao hàng | Customer | T05 | MVP |
| UC18 | Đặt toàn bộ giỏ bằng COD | Customer | T07 | MVP |
| UC19 | Xem lịch sử và chi tiết đơn của mình | Customer | T08 | MVP |
| UC20 | Tra cứu trạng thái đơn | Customer | T08 | MVP qua tài khoản |
| UC21 | Xem danh sách và chi tiết đơn | Admin | T09 | MVP |
| UC22 | Xác nhận, giao, hoàn tất hoặc hủy đơn | Admin | T09 | MVP |
| UC23 | Xem trang chủ, danh mục và danh sách sản phẩm | Mọi người | T01 | Có trên dev |
| UC24 | Tìm, lọc, sắp xếp và phân trang | Mọi người | T01 | Có trên dev |
| UC25 | Xem chi tiết, chọn SKU, xem thông số | Mọi người | T01 | Có trên dev |
| UC26 | Hủy đơn của mình khi còn chờ xác nhận | Customer | T09 | MVP |
| UC27 | Xem chính sách mua hàng, giao hàng và hậu mãi | Mọi người | T10 | MVP |
| UC28 | Quản lý banner trang chủ | Admin | T10 | MVP |
| UC29 | Xem doanh thu, đơn và sản phẩm bán chạy | Admin | T11 | MVP |
| UC30 | Yêu cầu và xử lý đổi trả/bảo hành | Customer, Admin | T13 | Sau MVP |
| UC31 | Thanh toán trực tuyến và xác nhận giao dịch | Customer, cổng thanh toán | T13 | Sau MVP |
| UC32 | Tra cứu đơn khi chưa đăng nhập | Người mua | T13 | Sau MVP, đề xuất |

**Quan hệ giữa use case:** UC18 cần giỏ hợp lệ từ UC14–UC16 và địa chỉ của UC17. UC20 có thể tìm theo mã trong tập đơn của chính tài khoản và dẫn sang chi tiết UC19. UC26 và UC22 dùng chung quy tắc hủy. UC11 phụ thuộc dữ liệu sản phẩm, SKU và cấu hình thông số áp dụng. Đăng nhập là tiền điều kiện của nhóm use case cần tài khoản.

## 4. Kiến trúc module và dữ liệu

| Module | Trách nhiệm Laravel và dữ liệu sở hữu | Điểm vào React / API |
|---|---|---|
| Tài khoản | `users`, phiên Sanctum, Gate và xác minh tài khoản hoạt động | Menu Tài khoản, Cobalt Orbit, API phiên hiện có |
| Catalog | `categories`, `brands`, `products`, `product_images`, `product_variants`, `specifications`, `category_specification`, `product_specification_values` | Storefront và Admin Catalog. Duy trì hợp đồng `/api/public/*` hiện tại, thêm API ghi dưới `/api/admin/*`. |
| Địa chỉ và giỏ | `addresses`, `carts`, `cart_items`. Đọc SKU và giá từ Catalog. | Địa chỉ trong tài khoản, nút thêm vào giỏ và trang Giỏ hàng. API dưới `/api/customer/*`. |
| Đặt hàng và vận hành | `orders`, `order_items`, `order_status_histories`, `payments`. Điều phối địa chỉ, giỏ và tồn kho trong cùng transaction. | Checkout, lịch sử và tra cứu. Admin có màn hình xử lý đơn và các hành động chuyển trạng thái riêng. |
| Nội dung và báo cáo | `banners` và trang chính sách. Báo cáo chỉ đọc đơn, dòng đơn và thanh toán. | Banner trang chủ, footer và dashboard Admin. |

Laravel giữ quy tắc quyền, giá, tồn và chuyển trạng thái. Controller nhận yêu cầu, Form Request kiểm tra dữ liệu, Gate/Policy kiểm tra quyền, service xử lý các thao tác có transaction, Resource trả dữ liệu cho UI. React quản lý giao diện, hiển thị lỗi và gọi API bằng client hiện có. Chốt contract của API mới trong Mini Plan trước khi triển khai.

Giới hạn giá và điều kiện hợp lệ của cặp giá nằm ở `ProductVariant`. Quản trị SKU, công bố và thêm giỏ dùng cùng quy tắc. Các bước giữ khóa và quyết định trả lỗi thuộc từng service. Ở frontend, các luồng thêm giỏ, địa chỉ và công bố dùng chung bước chuẩn bị CSRF và phân loại kết quả ghi. Domain service giữ endpoint và payload. Mỗi giao diện giữ cách đọc lại dữ liệu và đối chiếu của riêng nghiệp vụ đó.

## 5. Quy tắc nghiệp vụ và luồng chính

### 5.1. Catalog và tồn kho

- Một sản phẩm có thể có nhiều SKU. Giỏ và tồn kho dùng SKU đã chọn. Chi tiết công khai dùng điều kiện hiển thị của catalog hiện có.
- Admin nhập giá và tồn hợp lệ, kiểm tra SKU duy nhất. Tồn bằng 0 được biểu diễn là hết hàng. Sản phẩm đủ điều kiện công bố vẫn có thể hiển thị để khách xem.
- Chặn vòng lặp danh mục và thao tác xóa làm mất liên kết đang được dùng. Giữ snapshot dòng đơn để tên, SKU và giá lịch sử vẫn đọc được sau khi chỉnh catalog.
- Cấu hình thông số theo danh mục gồm thông số được gán, thứ tự hiển thị và trạng thái hoạt động theo schema hiện có. Schema đã có cờ bắt buộc theo danh mục. T04 cần chốt thời điểm kiểm tra cờ này trong luồng công bố.

### 5.2. Giỏ, địa chỉ và checkout COD

1. Khách xem sản phẩm, chọn SKU và đăng nhập nếu cần. Giỏ lưu một dòng cho mỗi SKU trong mỗi giỏ. Thêm giỏ chưa giữ tồn.
2. Khách chọn địa chỉ thuộc tài khoản. Hệ thống hiển thị tiền hàng, phí giao và tổng tiền do backend tính. Địa chỉ đơn được lưu snapshot để giữ lịch sử.
3. Khi đặt hàng, Laravel khóa giỏ rồi khóa các SKU theo ID tăng dần. Kiểm tra lại điều kiện bán, số lượng, tồn và giá. Nếu giá thay đổi, trả dữ liệu mới để khách xác nhận lại. Luồng chỉnh tồn từ Admin phải tương thích với khóa hoặc cập nhật nguyên tử.
4. Tạo đơn `pending`, snapshot dòng đơn, payment COD `pending` và lịch sử. Trừ tồn một lần và xóa các dòng giỏ đã đặt trong cùng transaction. Lỗi ở bất kỳ bước nào phải rollback toàn bộ.
5. `checkout_token` duy nhất ở database. Gửi lại cùng người dùng và cùng yêu cầu trả lại đơn cũ. Token đã dùng cho yêu cầu khác bị từ chối. Khách nhận mã đơn và link đến chi tiết đơn của mình.

API đọc giỏ của UC15 giữ các dòng đã lưu và chỉ tính tạm tính từ dòng đủ điều kiện. Khi thiết kế UC16, chốt phản hồi cho trường hợp một tab cập nhật dòng đã đổi ở tab khác. Đối chiếu thứ tự khóa đang dùng trong [contract giỏ hàng](../api/customer-cart.md) với luồng quản trị catalog.

### 5.3. Trạng thái đơn và thu COD

| Từ | Sang | Tác nhân và hiệu lực |
|---|---|---|
| Khởi tạo | `pending` | Customer đặt thành công. Trừ tồn, payment `pending`, đơn `unpaid`. |
| `pending` | `confirmed` | Admin xác nhận đơn. |
| `pending` | `cancelled` | Chủ đơn hoặc Admin, khi chưa thu tiền. Hoàn tồn một lần. |
| `confirmed` | `shipping` | Admin ghi nhận chuyển giao. |
| `confirmed` | `cancelled` | Admin, khi chưa thu tiền. Hoàn tồn một lần. |
| `shipping` | `completed` | Admin xác nhận đã giao và đã thu COD. Cập nhật `paid`, payment `succeeded`, thời điểm thu và hoàn tất. |

Mọi lần chuyển trạng thái ghi lịch sử trong cùng transaction. `completed` và `cancelled` là trạng thái cuối ở v1. Khi hủy, khóa đơn và khóa SKU theo cùng thứ tự checkout, chuyển payment sang `cancelled`, giữ đơn `unpaid`. UC20 chỉ đọc đơn của chủ tài khoản. UC32 là đề xuất riêng, cần cơ chế xác minh người mua, giới hạn số lần thử và phản hồi rút gọn trạng thái.

### 5.4. Dashboard

Doanh thu COD là tổng `grand_total` của đơn `completed` và `paid`, lọc theo `completed_at`. Sản phẩm bán chạy tính tổng số lượng từ cùng tập đơn. Đơn mới và đơn hủy là hai chỉ số riêng. Khoảng ngày dùng giờ Việt Nam trên UI và quy đổi sang UTC khi truy vấn. Định nghĩa bộ lọc thời gian và trường ngày cho từng chỉ số trước khi viết API.

## 6. Backlog theo task và tiêu chí nghiệm thu

**Đầu mối** là vai trò thực hiện kỹ thuật, có thể do cùng một người đảm nhiệm. **Tác nhân** ở mục 3 là vai trò dùng hệ thống.

| Task | Use case | Đầu mối | Phụ thuộc | Tiêu chí nghiệm thu |
|---|---|---|---|---|
| T00 · Tích hợp auth | UC01–UC04 | Backend + Frontend + QA | Nhánh auth đã push | Chạy migration trên bản tích hợp. Đăng ký, đăng nhập, tải lại, xem hồ sơ, đăng xuất chạy qua UI. Kiểm tra customer không vào API Admin và tài khoản khóa bị từ chối. |
| T01 · Kiểm tra lại catalog | UC23–UC25 | QA + Frontend | Catalog có trên dev | Danh mục, filter và chi tiết chạy với dữ liệu thật từ API. Kiểm tra SKU hết hàng, thông số và trạng thái danh sách rỗng. |
| T02 · Khung Admin, danh mục và thương hiệu | UC05–UC06 | Backend + Frontend | T00 | Có màn danh sách và form thêm/sửa/ẩn. Chặn vòng lặp danh mục. Khách chưa đăng nhập nhận 401, customer nhận 403, admin hợp lệ thao tác được. |
| T03 · Sản phẩm, ảnh, SKU và tồn | UC07–UC08 | Backend + Frontend | T02 | Admin tạo sản phẩm nháp, tải ảnh hợp lệ, thêm nhiều SKU. Từ chối SKU trùng, giá không hợp lệ và tồn âm. |
| T04 · Thông số và công bố | UC09–UC11 | Backend + Frontend | T03 | Chỉnh thông số đúng danh mục và giá trị xuất hiện ở chi tiết công khai. Khi công bố/ẩn, storefront phản ánh trạng thái theo điều kiện hiện có. |
| T05 · Địa chỉ của khách | UC17 | Backend + Frontend | T00 | Thêm/sửa/xóa và chọn địa chỉ. Người dùng A bị từ chối khi thao tác địa chỉ B. |
| T06 · Giỏ theo SKU | UC14–UC16 | Backend + Frontend | T00, T01 | Thêm cùng SKU chỉ có một dòng, SKU khác có dòng riêng. Đổi số lượng và xóa hoạt động, giỏ giữ được sau khi tải lại. Thao tác giỏ chưa làm giảm tồn. |
| T07 · Checkout COD | UC18 | Backend + Frontend + QA | T03, T05, T06 | Hiện tổng tiền, tạo đơn/payment/history và trừ tồn đúng một lần. Kiểm thử gửi trùng token, giá đổi, giành SKU cuối, rollback khi ghi đơn lỗi. Chốt vùng phục vụ và cách tính phí trước khi tích hợp. |
| T08 · Đơn của tôi và tra cứu | UC19–UC20 | Backend + Frontend | T07 | Chủ đơn xem được danh sách, chi tiết và trạng thái. Tài khoản khác bị từ chối ngay cả khi biết mã đơn. Header dẫn đến luồng thật. |
| T09 · Xử lý và hủy đơn | UC21–UC22, UC26 | Backend + Frontend + QA | T07, T08 | Admin xác nhận, giao và hoàn tất COD đúng thứ tự. Chủ đơn chỉ hủy khi `pending`. Hai yêu cầu hủy cùng lúc chỉ hoàn tồn một lần. |
| T10 · Banner và chính sách | UC27–UC28 | Frontend + Backend + Nội dung | T00 cho API quản trị | Admin quản lý banner theo vị trí và thời gian. Footer dẫn đến chính sách ShopHub đã được duyệt. |
| T11 · Dashboard | UC29 | Backend + Frontend + QA | T09 | Tổng doanh thu khớp dữ liệu đơn hoàn tất đã thu COD theo ngày, kiểm tra riêng các đơn đã hủy và ranh giới ngày giờ Việt Nam. |
| T12 · Yêu thích | UC12–UC13 | Backend + Frontend | T00, T01 | Thêm/bỏ không trùng, danh sách gắn với tài khoản, có cách xử lý sản phẩm đã ẩn. |
| T13 · Mở rộng vận hành | UC30–UC32 | Phân tích + Backend + Frontend | T09 và quy tắc được duyệt | Chia thành task riêng cho hậu mãi, thanh toán online và tra cứu ngoài tài khoản. Mỗi task có chính sách, dữ liệu và kiểm thử riêng. |

**Task bắt đầu:** T00 → T02. Sau khi auth tích hợp, có thể làm T05 và T06 song song với Admin Catalog. Mốc demo đầu tiên là Admin công bố sản phẩm → Customer đặt COD → Admin xác nhận đã giao và thu tiền → Customer xem đơn hoàn tất. Dashboard dùng chính đơn demo này để kiểm tra số liệu.

Mỗi task cần cập nhật trạng thái theo bằng chứng gồm PR/commit, kết quả kiểm thử và các giới hạn còn lại. Ưu tiên kiểm thử theo vai trò, quyền sở hữu, dữ liệu rỗng/lỗi và transaction trước khi đánh dấu hoàn thành.

## 7. Nguồn dự án

- [Mã nguồn catalog công khai và thông số, dev 71687af](https://github.com/TanPhuocBui/laravel-react-shophub/commit/71687af).
- [Mã nguồn đăng nhập và phân quyền, feature/cobalt-orbit-auth 33730ff](https://github.com/TanPhuocBui/laravel-react-shophub/commit/33730ff).
- [Quy tắc dự án trong AGENTS.md](https://github.com/TanPhuocBui/laravel-react-shophub/blob/71687af/AGENTS.md).
- [Thiết kế dữ liệu và workflow ShopHub](https://github.com/TanPhuocBui/laravel-react-shophub/blob/71687af/docs/report/shophub-database-design.md).
