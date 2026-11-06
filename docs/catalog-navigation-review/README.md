# Kiểm tra dải danh mục và header — 07/11/2026

Ảnh từ bản build qua Chrome headless: desktop 1440 × 1000, mobile 390 × 844.

| Vùng | Desktop | Mobile |
|---|---|---|
| Header ba tiện ích | [1440px](header-1440.png) | [390px](header-390.png) |
| Mua theo danh mục | [1440px](categories-1440.png) | [390px](categories-390.png) |
| Menu Tài khoản | [1440px](account-menu-1440.png) | [390px](account-menu-390.png) |
| Trạng thái chờ phát triển | [1440px](pending-feature-1440.png) | [390px](pending-feature-390.png) |

[Kết quả chức năng và hồi quy](browser-results.json).

Trong `frontend/`, chạy `npm run build` rồi
`node scripts/storefront-review.mjs --navigation` để kiểm tra lại. Script cần Chrome
theo đường dẫn Windows hiện có; tự đóng Vite preview và browser sau khi kiểm tra.
Ảnh hồi quy catalog cũng nằm trong thư mục này. Bộ ảnh Bazaar cũ được giữ nguyên
trong `docs/catalog-bazaar-review/`.
