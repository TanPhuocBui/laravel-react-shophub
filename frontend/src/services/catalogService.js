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
    if (error.code === 'ERR_CANCELED') throw error;
    const status = error.response?.status;
    const timeout = ['ECONNABORTED', 'ETIMEDOUT'].includes(error.code);
    const message = timeout ? 'Máy chủ phản hồi quá lâu. Vui lòng thử lại.'
      : status === 422 ? Object.values(error.response.data.errors || {}).flat().join(' ') || 'Bộ lọc chưa hợp lệ.'
      : status === 404 ? 'Không tìm thấy dữ liệu được yêu cầu.'
      : status >= 500 ? 'Máy chủ đang gặp sự cố. Vui lòng thử lại sau.'
      : status ? 'Không thể tải dữ liệu. Vui lòng thử lại.'
      : 'Không kết nối được máy chủ. Vui lòng kiểm tra kết nối và thử lại.';
    const failure = new Error(message);
    failure.status = status;
    failure.kind = timeout ? 'timeout' : status ? 'http' : 'network';
    throw failure;
  }
}

// Public metadata only: share GETs across subscribers/StrictMode and cache success
// for 30 seconds. A subscriber abort never cancels another subscriber's request.
const metadataCache = new Map();
function getMetadata(path, { signal, force = false } = {}) {
  if (signal?.aborted) return Promise.reject(new DOMException('Aborted', 'AbortError'));
  let entry = metadataCache.get(path);
  if (!entry?.pending && (force || !entry || entry.expires <= Date.now())) {
    entry = { pending: true };
    metadataCache.set(path, entry);
    entry.promise = request(path).then((payload) => {
      entry.pending = false;
      entry.expires = Date.now() + 30000;
      return payload;
    }).catch((error) => {
      metadataCache.delete(path);
      throw error;
    });
  }
  return new Promise((resolve, reject) => {
    const abort = () => reject(new DOMException('Aborted', 'AbortError'));
    if (signal?.aborted) { abort(); return; }
    signal?.addEventListener('abort', abort, { once: true });
    entry.promise.then(resolve, reject).finally(() => signal?.removeEventListener('abort', abort));
  });
}

// Only home strips are queued. Detail/search are never queued behind home strips.
const homeQueue = [];
let homeActive = 0;
function drainHomeQueue() {
  while (homeActive < 2 && homeQueue.length) {
    const job = homeQueue.shift();
    job.signal?.removeEventListener('abort', job.abort);
    if (job.signal?.aborted) { job.abort(); continue; }
    homeActive += 1;
    getProducts(job.parameters, job.options).then(job.resolve, job.reject).finally(() => {
      homeActive -= 1;
      drainHomeQueue();
    });
  }
}

export function getHomeProducts(parameters, options = {}) {
  return new Promise((resolve, reject) => {
    const job = { parameters, options, signal: options.signal, resolve, reject };
    job.abort = () => {
      const index = homeQueue.indexOf(job);
      if (index >= 0) homeQueue.splice(index, 1);
      reject(new DOMException('Aborted', 'AbortError'));
    };
    if (job.signal?.aborted) { job.abort(); return; }
    job.signal?.addEventListener('abort', job.abort, { once: true });
    homeQueue.push(job);
    drainHomeQueue();
  });
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
  const [categories, brands] = await Promise.allSettled([
    getMetadata('/api/public/categories', options), getMetadata('/api/public/brands', options),
  ]);
  if (options.signal?.aborted) throw new DOMException('Aborted', 'AbortError');
  return {
    categories: categories.status === 'fulfilled' ? categories.value.data.map(categoryView) : [],
    brands: brands.status === 'fulfilled' ? brands.value.data : [],
    errors: {
      categories: categories.status === 'rejected' ? categories.reason.message : '',
      brands: brands.status === 'rejected' ? brands.reason.message : '',
    },
  };
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

export async function getProductDetail(slug, options = {}) {
  let product;
  if (isDemoCatalog) {
    product = (await demoCatalog()).products.find((item) => item.slug === slug);
    if (!product) { const error = new Error('Không tìm thấy sản phẩm.'); error.status = 404; throw error; }
    product = { ...product, category: { slug: product.category_slug, name: (await demoCatalog()).categories.find((category) => category.slug === product.category_slug).name } };
  } else {
    product = productView((await request(`/api/public/products/${encodeURIComponent(slug)}`, options)).data);
  }
  return { product };
}
