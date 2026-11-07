import api from '../api/axios';
import { filterProducts } from '../utils/catalog';

export const catalogSource = import.meta.env.VITE_CATALOG_SOURCE || 'api';
export const isDemoCatalog = catalogSource === 'demo';
const presentation = {
  laptop: { icon: 'laptop', caption: 'Làm việc hay, giải trí đỉnh', image: 'asus-vivobook.jpg' },
  'linh-kien-phu-kien': { icon: 'chip', caption: 'Nâng cấp góc làm việc', image: 'keyboard.jpg' },
  'thiet-bi-gia-dung': { icon: 'home', caption: 'Thêm tiện nghi, thêm thảnh thơi', image: 'philips-kettle.jpg' },
};

function categoryView(category) {
  return { icon: 'grid', caption: 'Khám phá cùng ShopHub', ...presentation[category.slug], ...category };
}

function productView(product) {
  const colors = { 'Đen': '#374151', 'Bạc': '#bec6d0', 'Trắng': '#f5f5f5', 'Xám': '#8a919b' };
  return {
    ...product,
    source: 'api',
    category_slug: product.category.slug,
    specs: (product.specifications || []).map((item) => [item.name, item.value]),
    images: product.images.length ? product.images : [{ id: 'placeholder', url: null, alt: product.name }],
    variants: product.variants.map((variant) => ({
      ...variant, is_active: true, color: colors[variant.options?.color || variant.name] || '#64748b',
    })),
  };
}

async function request(path, options = {}) {
  if (catalogSource !== 'api') throw new Error('Nguồn catalog chưa được cấu hình đúng.');
  try {
    return (await api.get(path, options)).data;
  } catch (error) {
    if (options.signal?.aborted) throw error;
    const message = error.response?.status === 422
      ? Object.values(error.response.data.errors || {}).flat().join(' ')
      : error.response ? 'Không thể tải dữ liệu sản phẩm. Vui lòng thử lại.' : 'Không kết nối được máy chủ. Vui lòng thử lại.';
    const failure = new Error(message);
    failure.status = error.response?.status;
    throw failure;
  }
}

async function demoCatalog() {
  const data = await import('../data/demoCatalog');
  return { ...data, products: data.products.map((product) => ({ ...product, source: 'demo' })) };
}

export async function getCatalog(options = {}) {
  if (isDemoCatalog) {
    const { categories, brands, products } = await demoCatalog();
    return { categories: categories.map((category) => categoryView({ ...category, parent_id: null, product_count: products.filter((product) => product.category_slug === category.slug).length })), brands };
  }
  const [categories, brands] = await Promise.all([
    request('/api/public/categories', options), request('/api/public/brands', options),
  ]);
  return { categories: categories.data.map(categoryView), brands: brands.data };
}

export async function getProducts(parameters = {}, options = {}) {
  const params = parameters instanceof URLSearchParams ? Object.fromEntries(parameters) : parameters;
  if (isDemoCatalog) {
    const { products } = await demoCatalog();
    const filtered = filterProducts(products, new URLSearchParams(params));
    const perPage = Math.min(48, Math.max(1, Number(params.per_page) || 8));
    const page = Math.max(1, Number.parseInt(params.page, 10) || 1);
    const start = (page - 1) * perPage;
    const visible = filtered.slice(start, start + perPage);
    return { products: visible, meta: { total: filtered.length, current_page: page, last_page: Math.max(1, Math.ceil(filtered.length / perPage)), per_page: perPage, from: visible.length ? start + 1 : null, to: visible.length ? start + visible.length : null } };
  }
  const payload = await request('/api/public/products', { ...options, params });
  return { products: payload.data.map(productView), meta: payload.meta, links: payload.links };
}

export async function getHomeCatalog(categories, options = {}) {
  const roots = categories.filter((category) => category.parent_id == null).slice(0, 3);
  const [promotions, newest, ...sections] = await Promise.all([
    getProducts({ promotion: 1, sort: 'newest', per_page: 4 }, options),
    getProducts({ sort: 'newest', per_page: 5 }, options),
    ...roots.map((category) => getProducts({ category: category.slug, sort: 'newest', per_page: 5 }, options)),
  ]);
  return { promotions: promotions.products, newest: newest.products, total: newest.meta.total, sections: roots.map((category, index) => ({ category, products: sections[index].products })) };
}

export async function getProductDetail(slug, options = {}) {
  let product;
  if (isDemoCatalog) {
    product = (await demoCatalog()).products.find((item) => item.slug === slug);
    if (!product) { const error = new Error('Không tìm thấy sản phẩm.'); error.status = 404; throw error; }
    product = { ...product, category: { slug: product.category_slug, name: (await demoCatalog()).categories.find((category) => category.slug === product.category_slug).name } };
  } else {
    product = productView((await request(`/api/public/products/${encodeURIComponent(slug)}`, options)).data);
  }
  const related = await getProducts({ category: product.category_slug, per_page: 6 }, options);
  return { product, related: related.products.filter((item) => item.id !== product.id).slice(0, 5) };
}
