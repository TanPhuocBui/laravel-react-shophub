# ShopHub — Tích hợp giao diện Bazaar

Ngày: 06/11/2026. Nhánh làm việc: `dev`. Phạm vi: frontend duyệt catalog.

> Đây là báo cáo của đợt tích hợp đầu. Đợt dựng lại đầy đủ khung Bazaar sau đó được ghi riêng tại [báo cáo chỉnh giao diện](shophub-catalog-bazaar-restyling-report.md), kèm [ảnh trước/sau](catalog-bazaar-review/README.md). Các giới hạn ảnh và đường dẫn VNAShop bên dưới mô tả thời điểm đợt đầu.

## Hiện trạng đã xác minh

- Đã đọc `AGENTS.md`, `README.md`, thiết kế database, báo cáo catalog/seeder và mã nguồn liên quan. Không có `ARCHITECTURE.md` trong repository.
- Git ban đầu chỉ có `docs/bazaar_template/` chưa được theo dõi. Giữ nguyên thư mục tham khảo này và các file `.gitignore`, `.gitattributes`.
- Bazaar nằm trực tiếp trong `docs/bazaar_template/`, có `index.html`, `product.html`, `css/style.css`, `js/main.js`, `img/` và `README.txt`. Không cần đi thêm một cấp thư mục.
- Không tìm thấy `vnashop.vn_.png` kể cả trong file bị ignore. Bố cục được xây theo mô tả người dùng, không tuyên bố khớp pixel với ảnh chưa có.
- Frontend trước đó chỉ có màn hình health check; không có mã Phyo Htet Arkar cần gỡ. React Router đã là dependency nhưng chưa được gắn vào app.
- Lockfile: React/React DOM 19.3.1, React Router DOM 7.18.5, Axios 1.21.0, Vite 8.3.6. Backend lockfile: Laravel 12.71.0, Sanctum 4.3.3.
- Bootstrap chưa được cài. Bazaar tham chiếu `css/vendor/bootstrap.min.css` và `js/vendor/bootstrap.bundle.min.js` nhưng bản tham khảo không chứa các file đó. Các phần cần dùng hoạt động bằng CSS riêng và React, nên không thêm Bootstrap, dependency hoặc thay lockfile.
- `php artisan route:list --path=api --except-vendor` thực sự chỉ trả hai route: `GET|HEAD api/health`, `GET|HEAD api/user`. Chưa có API catalog để nối.

## Kết quả giao diện

- Chuyển cấu trúc search header, deal carousel, banner danh mục, product card, gallery, lựa chọn biến thể và bảng thông số từ Bazaar sang component JSX; dùng nhận diện ShopHub màu đỏ và nội dung tiếng Việt.
- `/`: banner lớn có ba slide điều khiển bằng React; ba banner nhỏ; Khuyến mãi; Sản phẩm mới; ba dải Laptop, Linh kiện và phụ kiện, Thiết bị gia dụng. Mỗi dải có liên kết **Tất cả** đúng bộ lọc.
- `/products`: tìm theo tên/thương hiệu/SKU, hỗ trợ từ khóa tiếng Việt không dấu; lọc danh mục, thương hiệu, giá, còn hàng, khuyến mãi; sắp xếp mới nhất/giá/tên; phân trang 8 sản phẩm. Bộ lọc lưu trên query string, dùng được nút Back và mở URL trực tiếp.
- `/products/:slug`: hai hình minh họa có thumbnail, SKU, giá bằng `Intl.NumberFormat('vi-VN')`, giá niêm yết/giảm giá, biến thể và tồn kho. Chọn biến thể hết hàng vẫn xem được thông tin. SKU, giá và trạng thái cập nhật cùng lựa chọn.
- Có loading, lỗi và thử lại, danh sách rỗng, slug/route không tồn tại. Native dialog cho menu mobile giữ focus, đóng bằng Escape, đóng khi điều hướng và hoàn lại cuộn trang. Carousel dừng khi hover/focus, có nút tạm dừng và tôn trọng reduced motion.
- Giữ health check qua Axios cũ tại `/connection`; không đổi contract `/api/health`.

## Dữ liệu và điểm nối API sau

- `src/data/demoCatalog.js` có 15 sản phẩm, 5 sản phẩm mỗi danh mục, tách khỏi Laravel seeder và database. Mọi cấu hình, giá, tồn, ngày tạo và bảo hành là fixture giả lập, được ghi rõ trên toàn giao diện.
- `src/services/catalogService.js` là nơi chọn nguồn dữ liệu; `src/hooks/useCatalog.js` quản lý loading/error/retry. Demo được import riêng; không có hành vi gọi API thất bại rồi âm thầm thay bằng fixture.
- `VITE_CATALOG_SOURCE=demo` hoặc không khai báo biến sẽ bật bản demo, kể cả build production để review. Giá trị khác hiển thị lỗi dữ liệu chưa sẵn sàng; chưa có adapter API. Khi triển khai bán hàng thật cần thay service và nguồn dữ liệu này.
- Card ghi **Từ** nếu có nhiều biến thể; dùng giá thấp nhất của biến thể active, kể cả biến thể hết hàng. Lọc/sắp giá dùng cùng quy tắc. Trạng thái trên card là còn hàng nếu có bất kỳ biến thể active còn hàng; trang chi tiết dùng trạng thái của biến thể đang chọn.
- `category`, `brand`, `q`, `min_price`, `max_price`, `in_stock=1`, `promotion=1`, `sort`, `page` là query UI demo, **chưa phải contract API backend**.
- Task nối API sau cần thống nhất endpoint, response, URL ảnh, biến thể active, điều kiện public, cách tính giá card, thông số, tìm/lọc/sắp xếp và pagination phía server. Dùng lại `src/api/axios.js`, giữ origin trong `VITE_BACKEND_URL`.
- Không tạo/sửa API, migration, model, seeder hoặc dữ liệu database. Không thêm auth, giỏ hàng, checkout, wishlist hay review.

## File tạo/sửa để review

| Nhóm file | Nội dung |
|---|---|
| `frontend/src/App.jsx`, `src/main.jsx` | BrowserRouter, các route catalog/connection/404 |
| `frontend/src/layouts/PublicLayout.jsx` | Header, tìm kiếm, menu mobile, thông báo demo, footer |
| `frontend/src/pages/public/HomePage.jsx` | Trang chủ và liên kết các dải sản phẩm |
| `frontend/src/pages/public/ProductsPage.jsx` | Form tìm/lọc/sắp, trạng thái rỗng và phân trang |
| `frontend/src/pages/public/ProductDetailPage.jsx` | Gallery, lựa chọn biến thể, giá/tồn/SKU, thông số, cùng danh mục |
| `frontend/src/pages/public/ConnectionPage.jsx`, `NotFoundPage.jsx` | Health check và trạng thái 404 |
| `frontend/src/components/HeroCarousel.jsx`, `ProductCard.jsx`, `ProductSection.jsx` | Các thành phần từ template chuyển sang React |
| `frontend/src/components/CatalogStatus.jsx`, `Icon.jsx`, `DeviceIllustration.jsx` | Trạng thái dữ liệu, icon SVG và hình minh họa sản phẩm |
| `frontend/src/data/demoCatalog.js`, `services/catalogService.js`, `hooks/useCatalog.js`, `utils/catalog.js` | Fixture, nguồn dữ liệu, lifecycle và xử lý catalog demo |
| `frontend/src/index.css`, `src/App.css` | CSS Bazaar được điều chỉnh theo ShopHub, responsive và accessibility |
| `frontend/index.html`, `.env.example`, `public/shophub.svg` | Metadata tiếng Việt, nguồn demo và favicon ShopHub |
| `frontend/public/images/bazaar/` | Ba ảnh banner dùng lại, kèm README nguồn ảnh |
| `README.md`, báo cáo này | Hướng dẫn local, phạm vi demo, kết quả kiểm tra |

Ảnh Bazaar đã được xem thực tế: `hero-electronics.jpg` là ảnh sự kiện, nhiều ảnh khác không khớp tên file. Chỉ dùng `p-laptop.jpg`, `p-keyboard.jpg`, `hero-home.jpg` làm banner theo chủ đề, sao chép nguyên bản và giữ attribution có sẵn. Sản phẩm dùng SVG minh họa viết bằng JSX; không giả nhận ảnh của mẫu sản phẩm cụ thể. Footer giữ credit Bazaar/uiCookies. Không tải font, JavaScript hoặc ảnh qua CDN.

## Kiểm tra thực tế

| Lệnh / thao tác | Kết quả |
|---|---|
| `php artisan route:list --path=api --except-vendor` trong `backend/` | Chỉ có health và user, chưa có catalog API |
| `npm run build` trong `frontend/` | Thành công với Vite 8.3.6; lần đầu sandbox Windows chặn `spawn EPERM`, chạy ngoài sandbox sau khi được cho phép |
| `git diff --check` | Không có lỗi whitespace |
| Chrome headless, Vite preview của bản build, desktop 1440px | Render đủ bố cục và 25 card ở trang chủ; ba ảnh banner local tải được; không tràn ngang |
| Carousel | Nút trước/sau và chấm chọn slide đổi đúng nội dung |
| Header tìm kiếm + browser Back | Từ khóa và danh mục đi vào URL; Back quay lại trang trước |
| Các liên kết **Tất cả** | Ba danh mục trả đúng slug và 5 sản phẩm/danh mục; khuyến mãi và mới nhất có query riêng |
| Điều hướng card → chi tiết | Mở đúng sản phẩm; thumbnail đổi hình được chọn |
| Đổi biến thể ASUS Vivobook 15 | Đen: `UI-ASUS-V15-BLACK`, 15.990.000 ₫, còn 8; Bạc: `UI-ASUS-V15-SILVER`, 16.290.000 ₫, hết hàng; đổi lại đúng |
| Bộ lọc | Tìm `chuot` ra Chuột; tổ hợp Laptop/ASUS/15–17 triệu ra Vivobook 15; báo lỗi khi giá tối thiểu vượt tối đa |
| Sắp xếp, còn hàng, phân trang | Giá tăng dần đúng; còn hàng có 14 sản phẩm; toàn bộ catalog phân trang 8/7 |
| Empty và 404 | Từ khóa không khớp có trạng thái rỗng và nút reset; slug/route lạ có thông báo 404 |
| Mobile 390px và 320px | Cả ba route không tràn ngang; menu focus đúng, Escape đóng, chọn danh mục điều hướng và khôi phục body scroll |
| Runtime và assets trong lượt duyệt catalog | Không có uncaught exception hoặc HTTP asset lỗi |

Kiểm tra trình duyệt dùng Chrome headless + Chrome DevTools Protocol qua script QA tạm ở `frontend/node_modules/.cache/shophub/browser-check.mjs`, không thêm dependency hoặc test suite vào repository. Script tự mở Vite preview/Chrome và đóng các tiến trình do nó tạo. JSON kết quả và screenshot desktop/mobile ở cùng thư mục cache, được Git ignore. Đã xem screenshot để rà bố cục.

Giới hạn: đây là viewport giả lập trên Chrome desktop, chưa kiểm tra thiết bị vật lý/Safari/Firefox. Không kiểm tra catalog với database thật vì API chưa có; không kiểm thử lại health check thành công với Laravel đang chạy trong lượt browser QA. Build không thay thế các kiểm tra trình duyệt nêu trên. Không chạy migration/seed hoặc test backend ngoài phạm vi. Khi host SPA về sau cần cấu hình fallback về `index.html` cho route React.

## Kiểm tra local và bàn giao

Trong `frontend/`, chạy `npm run dev -- --host localhost --port 5173 --strictPort`, mở `http://localhost:5173`.

1. Trang chủ: thử carousel và **Tất cả** ở từng dải sản phẩm.
2. Danh sách: nhập từ khóa, chọn danh mục/thương hiệu/giá, bấm **Áp dụng bộ lọc**, thử sắp xếp và phân trang.
3. Mở `/products/laptop-asus-vivobook-15-demo`, đổi Đen/Bạc và thumbnail; xem thông số.
4. Thu nhỏ viewport, mở menu, thử Escape và chọn danh mục.
5. Nếu cần health check, chạy Laravel theo README rồi mở `/connection`.

Chưa commit/push. Thư mục Bazaar tham khảo vẫn ở trạng thái untracked như ban đầu; không phải dependency runtime. Review danh sách file trong GitHub Desktop trước khi chọn commit.

Commit gợi ý: `feat(frontend): integrate Bazaar catalog UI for ShopHub`.

Bước tiếp theo đề xuất: triển khai và chốt contract API public catalog, rồi nối service hiện tại bằng Axios; chưa thực hiện trong đợt này.
