// UI fixtures only: independent of the Laravel seeder/database. All specs, prices
// and stock are fictional. Hardware configurations are separate products.
export const categories = [
  { slug: 'laptop', name: 'Laptop', icon: 'laptop', caption: 'Làm việc hay, giải trí đỉnh', image: 'p-laptop.jpg' },
  { slug: 'linh-kien-phu-kien', name: 'Linh kiện và phụ kiện', icon: 'chip', caption: 'Nâng cấp góc làm việc', image: 'p-keyboard.jpg' },
  { slug: 'thiet-bi-gia-dung', name: 'Thiết bị gia dụng', icon: 'home', caption: 'Thêm tiện nghi, thêm thảnh thơi', image: 'hero-home.jpg' },
];

const brand = (name) => ({ name, slug: name.toLowerCase() });
const variant = (sku, name, sale_price, list_price, stock_quantity, color = '#374151') => ({
  sku, name, sale_price, list_price, stock_quantity, color, is_active: true,
});
const laptopSpecs = [
  ['Bộ xử lý', 'Intel Core i5 (cấu hình demo)'], ['RAM', '16 GB'],
  ['Ổ cứng', 'SSD 512 GB'], ['Màn hình', '15.6 inch, Full HD'], ['Hệ điều hành', 'Windows 11'],
];

const fixtures = [
  { slug: 'laptop-asus-vivobook-15-demo', name: 'Laptop ASUS Vivobook 15 · Core i5 / 16GB / 512GB', category_slug: 'laptop', brand: brand('ASUS'), kind: 'laptop', accent: '#6689c3', specs: laptopSpecs,
    variants: [variant('UI-ASUS-V15-BLACK', 'Đen', 15990000, 18490000, 8), variant('UI-ASUS-V15-SILVER', 'Bạc', 16290000, 18490000, 0, '#bec6d0')] },
  { slug: 'laptop-lenovo-ideapad-slim-3-demo', name: 'Laptop Lenovo IdeaPad Slim 3 · Core i5 / 16GB / 512GB', category_slug: 'laptop', brand: brand('Lenovo'), kind: 'laptop', accent: '#829998', specs: laptopSpecs,
    variants: [variant('UI-LENOVO-S3-GREY', 'Xám', 13990000, 15990000, 12, '#8a919b')] },
  { slug: 'laptop-asus-vivobook-14-demo', name: 'Laptop ASUS Vivobook 14 · Core i3 / 8GB / 256GB', category_slug: 'laptop', brand: brand('ASUS'), kind: 'laptop', accent: '#b09cc6', specs: [['Bộ xử lý', 'Intel Core i3 (demo)'], ['RAM', '8 GB'], ['Ổ cứng', 'SSD 256 GB'], ['Màn hình', '14 inch, Full HD']],
    variants: [variant('UI-ASUS-V14-SILVER', 'Bạc', 10490000, 10490000, 6, '#bec6d0')] },
  { slug: 'laptop-lenovo-thinkbook-14-demo', name: 'Laptop Lenovo ThinkBook 14 · Core i5 / 16GB / 512GB', category_slug: 'laptop', brand: brand('Lenovo'), kind: 'laptop', accent: '#ba8d77', specs: [...laptopSpecs.slice(0, 3), ['Màn hình', '14 inch, Full HD']],
    variants: [variant('UI-LENOVO-T14-GREY', 'Xám', 17490000, 19990000, 4, '#8a919b')] },
  { slug: 'laptop-asus-tuf-gaming-demo', name: 'Laptop ASUS TUF Gaming · Core i7 / 16GB / 1TB', category_slug: 'laptop', brand: brand('ASUS'), kind: 'laptop', accent: '#d77960', specs: [['Bộ xử lý', 'Intel Core i7 (demo)'], ['RAM', '16 GB'], ['Ổ cứng', 'SSD 1 TB'], ['Màn hình', '15.6 inch, 144 Hz']],
    variants: [variant('UI-ASUS-TUF-BLACK', 'Đen', 24990000, 27990000, 3)] },
  { slug: 'ssd-kingston-nv2-1tb-demo', name: 'Ổ cứng SSD Kingston NV2 1TB · NVMe PCIe', category_slug: 'linh-kien-phu-kien', brand: brand('Kingston'), kind: 'ssd', accent: '#477b81', specs: [['Dung lượng', '1 TB'], ['Chuẩn kết nối', 'NVMe PCIe (demo)'], ['Kích thước', 'M.2 2280']],
    variants: [variant('UI-KINGSTON-NV2-1TB', 'Mặc định', 1490000, 1890000, 20)] },
  { slug: 'ban-phim-co-shophub-k87-demo', name: 'Bàn phím cơ ShopHub K87 · Kết nối USB', category_slug: 'linh-kien-phu-kien', brand: brand('ShopHub'), kind: 'keyboard', accent: '#baac99', specs: [['Số phím', '87 phím'], ['Kết nối', 'USB có dây'], ['Switch', 'Linear (demo)']],
    variants: [variant('UI-SH-K87-CREAM', 'Kem', 790000, 990000, 15, '#e7dcc7'), variant('UI-SH-K87-BLACK', 'Đen', 850000, 990000, 9)] },
  { slug: 'chuot-khong-day-shophub-m1-demo', name: 'Chuột không dây ShopHub M1 · Silent click', category_slug: 'linh-kien-phu-kien', brand: brand('ShopHub'), kind: 'mouse', accent: '#b8c2cf', specs: [['Kết nối', 'Wireless 2.4 GHz'], ['Độ phân giải', '1.600 DPI (demo)'], ['Nguồn điện', 'Pin AA']],
    variants: [variant('UI-SH-M1-GREY', 'Xám', 290000, 390000, 25, '#8a919b'), variant('UI-SH-M1-WHITE', 'Trắng', 320000, 390000, 0, '#e5e7eb')] },
  { slug: 'man-hinh-shophub-view-24-demo', name: 'Màn hình ShopHub View 24 · IPS Full HD', category_slug: 'linh-kien-phu-kien', brand: brand('ShopHub'), kind: 'monitor', accent: '#789baf', specs: [['Kích thước', '24 inch'], ['Độ phân giải', '1.920 × 1.080'], ['Tấm nền', 'IPS (demo)']],
    variants: [variant('UI-SH-VIEW24', 'Mặc định', 2790000, 3290000, 7)] },
  { slug: 'ram-kingston-fury-16gb-demo', name: 'RAM Kingston Fury 16GB · DDR4 3200MHz', category_slug: 'linh-kien-phu-kien', brand: brand('Kingston'), kind: 'ram', accent: '#414d59', specs: [['Dung lượng', '16 GB'], ['Loại RAM', 'DDR4'], ['Bus', '3.200 MHz (demo)']],
    variants: [variant('UI-KINGSTON-FURY16', 'Mặc định', 890000, 890000, 0)] },
  { slug: 'robot-hut-bui-shophub-clean-demo', name: 'Robot hút bụi ShopHub Clean · Làm sạch tự động', category_slug: 'thiet-bi-gia-dung', brand: brand('ShopHub'), kind: 'vacuum', accent: '#ddd7cb', specs: [['Lực hút', '2.000 Pa (demo)'], ['Dung tích hộp bụi', '400 ml'], ['Thời gian hoạt động', '90 phút (demo)']],
    variants: [variant('UI-SH-CLEAN-WHITE', 'Trắng', 3290000, 4290000, 5, '#f0eee7'), variant('UI-SH-CLEAN-BLACK', 'Đen', 3490000, 4290000, 0)] },
  { slug: 'binh-dun-philips-17l-demo', name: 'Bình đun siêu tốc Philips · Dung tích 1.7L', category_slug: 'thiet-bi-gia-dung', brand: brand('Philips'), kind: 'kettle', accent: '#b9c7cc', specs: [['Dung tích', '1.7 lít'], ['Công suất', '1.800 W (demo)'], ['Chất liệu', 'Thép không gỉ']],
    variants: [variant('UI-PHILIPS-KETTLE', 'Mặc định', 590000, 790000, 18)] },
  { slug: 'may-xay-philips-15l-demo', name: 'Máy xay sinh tố Philips · Cối xay 1.5L', category_slug: 'thiet-bi-gia-dung', brand: brand('Philips'), kind: 'blender', accent: '#b5c6bf', specs: [['Dung tích', '1.5 lít'], ['Công suất', '500 W (demo)'], ['Chế độ', '2 tốc độ và nhồi']],
    variants: [variant('UI-PHILIPS-BLENDER', 'Mặc định', 990000, 1290000, 11)] },
  { slug: 'den-ban-shophub-light-demo', name: 'Đèn bàn ShopHub Light · Ánh sáng 3 chế độ', category_slug: 'thiet-bi-gia-dung', brand: brand('ShopHub'), kind: 'lamp', accent: '#c3ad8a', specs: [['Nguồn sáng', 'LED (demo)'], ['Chế độ', '3 nhiệt độ màu'], ['Nguồn điện', 'USB-C']],
    variants: [variant('UI-SH-LIGHT-SAND', 'Be', 390000, 490000, 14, '#d9c8a8')] },
  { slug: 'noi-chien-philips-4l-demo', name: 'Nồi chiên không dầu Philips · Dung tích 4L', category_slug: 'thiet-bi-gia-dung', brand: brand('Philips'), kind: 'airfryer', accent: '#465660', specs: [['Dung tích', '4 lít'], ['Công suất', '1.400 W (demo)'], ['Điều khiển', 'Nút xoay cơ']],
    variants: [variant('UI-PHILIPS-AIR4', 'Đen', 1890000, 2490000, 6)] },
];

export const products = fixtures.map((product, index) => ({
  ...product, id: index + 1, status: 'active', deleted_at: null,
  created_at: `2026-11-${String(1 + index % 5).padStart(2, '0')}T08:00:00Z`,
  short_description: 'Thiết kế tiện dụng cho nhu cầu hằng ngày. Sản phẩm, cấu hình, giá và tồn kho giả lập để trải nghiệm giao diện ShopHub.',
  description: 'Đây là dữ liệu minh họa giao diện, không phải thông tin chào bán thực tế. Hình ảnh sản phẩm là minh họa. Thông số dùng để kiểm tra cách trình bày và không thay thế thông tin từ nhà sản xuất.',
  warranty_months: 12,
  images: [{ id: 1, view: 'front', alt: `${product.name} — hình minh họa phía trước` }, { id: 2, view: 'angle', alt: `${product.name} — hình minh họa góc nghiêng` }],
}));

export const brands = [...new Map(products.map((product) => [product.brand.slug, product.brand])).values()];
