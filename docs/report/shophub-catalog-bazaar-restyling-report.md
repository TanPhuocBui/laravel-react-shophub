# ShopHub — Dựng lại giao diện theo Bazaar

Ngày: 06/11/2026. Nhánh: `dev`. Phạm vi: giao diện catalog React, không thay backend/database.

## Hiện trạng và nguồn đối chiếu

- Đã đọc `AGENTS.md`, README, thiết kế database, báo cáo tích hợp trước và source liên quan. Giữ các thay đổi chưa commit hiện có; không reset/checkout file từ Git HEAD.
- Working tree ban đầu đã có frontend catalog của đợt trước, cùng thư mục Bazaar và ảnh tham khảo chưa được Git theo dõi. Không sửa `.gitignore`, `.gitattributes`, backend hoặc dependency/lockfile.
- Đã mở cả `docs/bazaar_template/index.html` và `product.html` trong Chrome, chụp cùng viewport 1440px với ShopHub trước sửa rồi mở các screenshot để đối chiếu.
- Ảnh VNAShop thực tế nằm ở **`docs/imgs/vnashop.vn_.png`**, không phải trực tiếp dưới `docs/`. Đã mở và dùng để đối chiếu màu đỏ, nền hồng khuyến mãi, ba banner phụ và thứ tự dải sản phẩm.
- Bazaar vẫn thiếu hai file Bootstrap vendor. React 19.3.1, Router 7.18.5, Axios 1.21.0 và Vite 8.3.6 giữ nguyên. Các layout Bazaar dùng Grid/Flex và CSS riêng; bản nguồn đã render được khi thiếu Bootstrap nên không thêm dependency Bootstrap hoặc nạp JS Bootstrap.

## Những phần bám lại Bazaar

| Thành phần | Triển khai |
|---|---|
| CSS | Tái dùng toàn bộ stylesheet gốc trong `src/styles/bazaar.scoped.css`; prefix selector bằng `.storefront`. Giữ CSS gốc trong thư mục tham khảo nguyên vẹn. `App.css` chỉ chứa điều chỉnh ShopHub và phần danh sách chưa có trong Bazaar. |
| Typography | Big Shoulders Display cho signage/heading, IBM Plex Sans cho nội dung, IBM Plex Mono cho nhãn/giá/SKU. Phục vụ 12 file font local, có subset tiếng Việt và SIL OFL; nạp stylesheet một lần trong `index.html`. |
| Header | Utility bar 40px, header search-forward, logo/mark, khu vực action và thanh ngành hàng. Giữ cấu trúc/class `topbar`, `header-main`, `brand`, `searchbar`, `header-actions`, `deptnav`. |
| Hero | `hero-grid` tỉ lệ 1.62fr / 1fr, gap 16px; carousel bên trái, hai `promo-card` bên phải. Giữ lớp media/overlay/body, tag vàng, CTA, arrows và dots; tương tác bằng React. |
| Banner phụ | Dùng `spot-grid`, `spot-bg`, `spot-body`, tag, heading và CTA của Bazaar; ba banner được đặt ngay sau hero. |
| Khuyến mãi | Chuyển cấu trúc `flash-panel`, `flash-top`, `flash-title`, `flash-grid`, `flash-item`, `fi-frame`, `fi-price`, `fi-stock` sang React; bốn card desktop, hai cột mobile. |
| Dải sản phẩm | `section-head`, `pgrid`, `pcard`, `pframe`, `pbody`, `pcat`, `pname`, `pprice`, CTA; grid 5 cột desktop, ảnh vuông, gap 16px, border/radius/shadow/hover theo template. |
| Chi tiết | `pdp-grid` tỉ lệ 1.05fr / 1fr; gallery vuông và thumbnail, giá/SKU/trạng thái, swatches và option buttons, vùng hành động và `pdp-assure` bốn ô. |
| Tabs | `pdp-tabs`, `tab-nav`, `tab-panel`, `feat-list`, `spec-table`; tab Mô tả, Thông số, Bảo hành và Đánh giá. Roving focus với mũi tên/Home/End, liên kết aria đầy đủ. |
| Footer | Khôi phục dải thương hiệu, benefits, khối CTA nền thương hiệu và mega footer bốn cột. Có credit Bazaar/uiCookies, nguồn ảnh và nút về đầu trang. |

## Điều chỉnh chủ động theo ShopHub và VNAShop

- Nhận diện đỏ ShopHub thay teal; giữ ink/canvas xanh xám và vàng nhấn của hệ thống Bazaar. Logo ShopHub, nội dung tiếng Việt, giá VND.
- Thứ tự trang chủ: **hero chính kèm ưu đãi phụ → ba banner phụ → Khuyến mãi → Sản phẩm mới → Laptop → Linh kiện và phụ kiện → Thiết bị gia dụng → footer**. Category rail/spotlight và thương hiệu của Bazaar được bố trí lại để đáp ứng thứ tự này.
- Khuyến mãi nền hồng nhạt, tag giảm đỏ, giá đỏ; dải ngành hàng nằm trong nền trắng. Vùng ảnh lớn theo tỉ lệ gốc; ảnh chụp dùng `object-fit: contain`, không cắt mất sản phẩm.
- Banner có overlay đậm để chữ đọc được trên ảnh; chiều cao điều chỉnh theo nội dung tiếng Việt. Mobile giữ hai ô ưu đãi cạnh nhau, ba banner xếp dọc và card hai cột.
- `/products` giữ form/query string/tìm/lọc/sắp/phân trang cũ; dùng card mới. Bộ lọc mở mặc định ở desktop, thu gọn khi vào trang trên mobile, mở lại bằng summary.
- Các nút account/cart/wishlist, quantity/Buy now, trả góp, newsletter email và điểm/review giả của Bazaar không biến thành chức năng bán hàng giả: header dùng action catalog/ưu đãi; vùng hành động chi tiết dùng CTA cùng danh mục/thông số; khối newsletter dùng tìm sản phẩm. Tab Đánh giá chỉ báo chưa có dữ liệu, không tạo review backend.
- Không thêm countdown hoặc số đã bán không có nguồn trong `catalogService`. Giá, stock, bảo hành vẫn là fixture và được ghi rõ.

## Ảnh và giấy phép

Đã xem các ảnh được dùng trước khi đưa lên UI. Nhiều file Bazaar không đúng tên/nội dung; không tiếp tục dùng chúng làm ảnh SKU. Bốn ảnh tham khảo mới được tải nguyên bản từ Wikimedia Commons, lưu local; source/author/license/use được ghi trong [trang ghi công](../frontend/public/images/catalog/ATTRIBUTION.html) và được liên kết ở footer.

| File | Nguồn / giấy phép | Sử dụng |
|---|---|---|
| `asus-vivobook.jpg` | [ASUS Vivobook X556UQ](https://commons.wikimedia.org/wiki/File:ASUS_Vivobook_X556UQ.jpg), Denys Nyk., CC BY-SA 4.0 | Hero/banner laptop và ảnh tham khảo dòng máy trên Vivobook 15; không nhận là ảnh đúng SKU |
| `lenovo-ideapad.jpg` | [Lenovo IdeaPad 320](https://commons.wikimedia.org/wiki/File:Lenovo_IdeaPad_320.jpg), Dienthoaiquangcao59, CC BY-SA 4.0 | Banner laptop; không gán cho Slim 3/ThinkBook |
| `philips-kettle.jpg` | [Electric kettle phillips white](https://commons.wikimedia.org/wiki/File:Electric_kettle_phillips_white.JPG), Rafa, public domain | Hero/banner gia dụng; không gán cho SKU bình đun khác cấu hình |
| `keyboard.jpg` | [Standard white computer keyboard](https://commons.wikimedia.org/wiki/File:Standard_white_computer_keyboard.jpg), Public Domain Images, public domain | Hero/banner phụ kiện; không gán cho SKU K87 |

**Còn thiếu ảnh chính xác cho toàn bộ 19 SKU của 15 sản phẩm demo.** Vivobook 15 có một ảnh tham khảo dòng máy được ghi nhãn; 14 card sản phẩm còn lại và góc ảnh bổ sung sử dụng SVG placeholder ghi “Ảnh SKU đang cập nhật · Hình minh họa”. Không giả tạo bộ ảnh chụp nhiều góc.

| Nhóm | Các sản phẩm cần bổ sung ảnh SKU |
|---|---|
| Laptop | ASUS Vivobook 15 Đen/Bạc; Lenovo Slim 3; ASUS Vivobook 14; Lenovo ThinkBook 14; ASUS TUF |
| Linh kiện và phụ kiện | SSD NV2; bàn phím K87 Kem/Đen; chuột M1 Xám/Trắng; View 24; RAM Fury |
| Gia dụng | Robot Clean Trắng/Đen; bình đun Philips; máy xay Philips; đèn Light; nồi chiên Philips |

Ảnh demo và font được phục vụ local; không phụ thuộc CDN lúc duyệt ShopHub. File ảnh Bazaar từ đợt trước được giữ để bảo toàn thay đổi hiện có, nhưng các banner mới không tham chiếu chúng.

## Kiểm tra thực tế và ảnh so sánh

- `npm run build` trong `frontend/`: thành công với Vite 8.3.6. Chạy ngoài sandbox theo quyền đã cho để tránh lỗi spawn Windows của môi trường.
- `git diff --check`: không có lỗi whitespace.
- `node scripts/storefront-review.mjs`: Chrome headless + Vite preview của bản build; desktop viewport 1440 × 1000, mobile 390 × 844 và thêm kiểm tra tràn ngang ở 320px.
- Xác nhận font display/body local tải được; selector `.pcard` đặt thử ngoài `.storefront` không nhận border CSS storefront.
- Trang chủ: 2 promo cards, 3 banner, 4 flash cards và 20 card ở các dải; carousel trước/sau/dots; tất cả liên kết danh mục/khuyến mãi/mới nhất đúng query.
- Header search và nút Back; tìm không dấu `chuot`; tổ hợp Laptop/ASUS/15–17 triệu; báo lỗi khoảng giá; sắp tăng giá; lọc còn hàng ra 14 sản phẩm; phân trang 8/7; empty/reset và 404 đều đạt.
- Mở chi tiết từ card, đổi thumbnail; Đen: `UI-ASUS-V15-BLACK`, 15.990.000 ₫, còn 8; Bạc: `UI-ASUS-V15-SILVER`, 16.290.000 ₫, hết hàng; đổi lại đúng. Tabs Mô tả/Thông số/Bảo hành/Đánh giá và focus bàn phím hoạt động.
- Mobile: cả ba route không tràn ngang; native dialog giữ focus, Escape đóng, chọn danh mục điều hướng và trả body scroll. Không ghi nhận uncaught exception hoặc HTTP asset lỗi trong lượt QA catalog.
- Đã tự mở ảnh Bazaar gốc, trước, sau, cả desktop/mobile, để so header, hero, promo, tỉ lệ ảnh, mật độ card và PDP. Sau lượt đầu đã chỉnh lại độ đọc của tên flash card, vùng filter mobile và ảnh chi tiết mặc định cho so sánh.

[Mở bộ ảnh so sánh có bảng trước/sau](catalog-bazaar-review/README.md). Các ảnh chính:

| Trang | Bazaar gốc | ShopHub trước | ShopHub sau |
|---|---|---|---|
| Trang chủ | [1440px](catalog-bazaar-review/bazaar-home-1440-top.png) | [1440px](catalog-bazaar-review/shophub-before-home-1440-top.png) | [1440px](catalog-bazaar-review/shophub-after-home-1440-top.png) |
| Chi tiết | [1440px](catalog-bazaar-review/bazaar-detail-1440-top.png) | [1440px](catalog-bazaar-review/shophub-before-detail-1440-top.png) | [1440px](catalog-bazaar-review/shophub-after-detail-1440-top.png) |
| Mobile sau | [Trang chủ 390px](catalog-bazaar-review/shophub-after-home-390-top.png) | [Danh sách 390px](catalog-bazaar-review/shophub-after-products-390-top.png) | [Chi tiết 390px](catalog-bazaar-review/shophub-after-detail-390-top.png) |

Ảnh `-full.png` tương ứng nằm cùng thư mục. Desktop full-page rộng 1425px vì không gồm scrollbar, cùng viewport 1440px cho cả ba bản. [JSON kết quả](catalog-bazaar-review/browser-results.json) được lưu cùng ảnh. Baseline trước được chụp từ working tree trước chỉnh sửa và có guard chống ghi đè.

Giới hạn: không tuyên bố khớp pixel do nhận diện, nội dung, loại ảnh và thứ tự khối được đổi có chủ đích. Chưa thử trên thiết bị thật hoặc Safari/Firefox; chưa kiểm tra API catalog/database vì không thay phần đó. Loading/error tiếp tục dùng hook/service cũ; không giả báo đã kiểm thử API backend.

## File tạo/sửa trong đợt này

| File/nhóm | Nội dung |
|---|---|
| `frontend/src/styles/bazaar.scoped.css` | CSS gốc được giới hạn selector |
| `frontend/src/index.css`, `App.css`, `App.jsx` | Shell tối thiểu, override ShopHub và thứ tự import CSS |
| `frontend/src/layouts/PublicLayout.jsx` | Header nhiều tầng, menu mobile, root scope và back-to-top |
| `frontend/src/components/HeroCarousel.jsx`, `ProductCard.jsx`, `ProductSection.jsx` | Markup và class theo template |
| `frontend/src/components/FlashDeals.jsx`, `ProductMedia.jsx`, `StorefrontFooter.jsx` | Flash cards, ảnh/placeholder, mega footer |
| `frontend/src/pages/public/HomePage.jsx`, `ProductDetailPage.jsx`, `ProductsPage.jsx` | Thứ tự khối, PDP/tabs và đồng bộ danh sách |
| `frontend/index.html`, `public/fonts/bazaar/` | Font local và giấy phép |
| `frontend/public/images/catalog/` | 4 ảnh, README và trang ghi công |
| `frontend/scripts/prepare-bazaar-css.mjs`, `storefront-review.mjs` | Tạo CSS scope, kiểm tra/chụp ảnh có thể chạy lại |
| `README.md`, báo cáo tích hợp cũ | Liên kết đến kết quả đợt mới; giữ lịch sử cũ |
| `docs/catalog-bazaar-review/`, báo cáo này | PNG trước/sau, kết quả QA, tài liệu bàn giao |

`catalogService`, fixture, hook tải dữ liệu, logic filter/price, Axios, routes React và endpoint backend giữ nguyên hành vi. Các file trước đó còn uncommitted vẫn được giữ; báo cáo này chỉ liệt kê phần đợt chỉnh giao diện.

## Bàn giao

Trong `frontend/`, chạy `npm run dev -- --host localhost --port 5173 --strictPort`. Mở `/`, `/products`, `/products/laptop-asus-vivobook-15-demo`; kiểm tra tabs, ảnh, biến thể, links và menu mobile. QA lại bản build: `npm run build` rồi `node scripts/storefront-review.mjs` (cần Chrome tại đường dẫn Windows trong script).

Chưa commit/push. Commit gợi ý: `feat(frontend): restore Bazaar storefront layouts and product tabs`.

Bước tiếp theo đề xuất: bổ sung bộ ảnh đúng SKU đã được duyệt sử dụng theo danh sách thiếu ở trên; chưa tự triển khai API hoặc module bán hàng.
