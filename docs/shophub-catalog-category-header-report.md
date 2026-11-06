# ShopHub — Dải danh mục và tiện ích header

Ngày: 07/11/2026. Nhánh: `dev`. Giữ các thay đổi chưa commit hiện có.

## Phạm vi đã hoàn thành

Đã đọc `AGENTS.md`, kiểm tra Git, `HomePage.jsx`, `PublicLayout.jsx`, router, service/hook/fixture catalog và khối **Shop by category** trong Bazaar trước khi sửa.

- Chèn **Mua theo danh mục** ngay sau ba banner phụ, trước Khuyến mãi. Dùng các class/CSS Bazaar sẵn có: `catrail`, `section-head`, `catrail-track`, `cat-tile`, `cat-ic`, `cat-name`, `cat-count`; bổ sung focus đỏ ShopHub tương ứng hover.
- Ba thẻ gọn 220px ở desktop; mobile cuộn ngang trong rail, không làm tràn trang.
- Danh mục lấy từ `catalogService`. Vì nguồn demo chứa đủ 15 sản phẩm, service tính `product_count` từ toàn bộ nguồn: **5 sản phẩm/danh mục**. Đây là tổng trong fixture demo, không phải tổng database hay số SKU/tồn kho. UI bỏ số lượng nếu tổng không phải số nguyên hợp lệ.
- Header có Tài khoản/user, Yêu thích/heart, Giỏ hàng/cart; thêm glyph vào `Icon.jsx` hiện có. Cả ba vẫn truy cập được trực tiếp trên header mobile; search giữ nguyên hàng rộng riêng.
- Tài khoản mở menu đúng ba mục: Đăng nhập, Đăng ký, Tra cứu đơn hàng. Có focus khi mở, mũi tên/Home/End/Enter, Escape trả focus, đóng khi click ngoài hoặc chọn mục.
- Mục chưa có chức năng mở native dialog với thông báo **“Tính năng đang được phát triển”**; đóng bằng nút/Escape và trả focus về tiện ích vừa dùng. Không tạo route giả hoặc điều hướng tới 404.

## Trạng thái liên kết

Router thực tế có `/`, `/products`, `/products/:slug`, `/connection` và fallback 404. Chưa có các trang auth, tra cứu đơn, wishlist/cart hoặc trạng thái số lượng thực tế.

| Mục | Kết quả khi bấm |
|---|---|
| Laptop | `/products?category=laptop`, 5 sản phẩm demo |
| Linh kiện và phụ kiện | `/products?category=linh-kien-phu-kien`, 5 sản phẩm demo |
| Thiết bị gia dụng | `/products?category=thiet-bi-gia-dung`, 5 sản phẩm demo |
| Tất cả danh mục | `/products`, đủ catalog 15 sản phẩm demo |
| Tài khoản | Mở menu ba mục bằng chuột/bàn phím |
| Đăng nhập | Chờ triển khai; thông báo phát triển |
| Đăng ký | Chờ triển khai; thông báo phát triển |
| Tra cứu đơn hàng | Chờ triển khai; thông báo phát triển |
| Yêu thích | Chờ triển khai; thông báo phát triển; không badge giả |
| Giỏ hàng | Chờ triển khai; thông báo phát triển; không badge giả |

Chưa triển khai nghiệp vụ auth, yêu thích, giỏ hàng hoặc đơn hàng trong đợt này. Khi có trang thật, thay action chờ bằng route được xác minh và lấy badge từ state module tương ứng.

## File tạo/sửa

- `frontend/src/components/CategoryRail.jsx`: dải danh mục.
- `frontend/src/components/HeaderUtilities.jsx`: menu và thông báo chờ.
- `frontend/src/components/Icon.jsx`: user/heart/cart SVG.
- `frontend/src/pages/public/HomePage.jsx`: vị trí chèn rail.
- `frontend/src/layouts/PublicLayout.jsx`: gắn ba tiện ích.
- `frontend/src/services/catalogService.js`: tổng sản phẩm từ nguồn demo đầy đủ.
- `frontend/src/App.css`: card/focus, popup, dialog và responsive; bỏ rule cũ ẩn tiện ích cuối ở màn hình hẹp.
- `frontend/scripts/review-navigation.mjs`, `storefront-review.mjs`: thêm mode QA `--navigation`; ghi kết quả riêng, giữ bộ ảnh Bazaar trước/sau cũ.
- `docs/catalog-navigation-review/`, báo cáo này: ảnh và kết quả kiểm tra.

Router, fixture, CSS Bazaar gốc, backend/database và package/lockfile không thay đổi trong đợt này.

## Kiểm tra thực tế

- `npm run build`: thành công, Vite 8.3.6, 106 modules. Chạy ngoài sandbox Windows theo quyền đã cho.
- `git diff --check`: không có lỗi whitespace.
- `node scripts/storefront-review.mjs --navigation`: thành công với Chrome headless/Vite preview.
- Desktop **1440px** và mobile **390px**: kiểm tra vị trí rail, ba tên/tổng, bấm thực tế cả ba thẻ và liên kết tổng; đủ ba tiện ích, không badge giả, không tràn ngang. Mobile có cuộn bên trong rail; ô search rộng trên 300px, input trên 220px.
- Kiểm tra menu đúng ba mục, điều hướng focus bằng phím, Enter chọn, Escape trả focus và click ngoài đóng; thử cả ba mục Tài khoản, Yêu thích và Giỏ hàng. Tất cả thông báo chờ hiển thị đúng tên và giữ nguyên URL.
- Hồi quy: carousel trước/sau/dots, links Tất cả, tìm kiếm/header/Back, bộ lọc, sắp xếp, phân trang, empty/404, mở chi tiết, thumbnail, biến thể, tabs và menu mobile đều đạt; thêm kiểm tra tràn ngang ba trang ở 320px. Không ghi nhận uncaught exception hoặc HTTP asset lỗi.

[Ảnh desktop/mobile](catalog-navigation-review/README.md) · [Kết quả JSON](catalog-navigation-review/browser-results.json). Đã tự mở ảnh rail, header, menu và dialog để rà bố cục. Đây là viewport giả lập trên Chrome, chưa thử thiết bị vật lý/Safari/Firefox. Không kiểm thử API/database trong đợt chỉnh giao diện này.

## Bàn giao

Chạy `npm run dev -- --host localhost --port 5173 --strictPort` trong `frontend/`, mở trang chủ, cuộn xuống ba banner rồi thử rail và ba tiện ích header.

Chưa commit/push. Commit gợi ý: `feat(frontend): add category rail and header utility navigation`.

Bước tiếp theo đề xuất: khi triển khai auth, nối Đăng nhập/Đăng ký vào trang thật; chưa thực hiện ngoài phạm vi hiện tại.
