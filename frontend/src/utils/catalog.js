export const formatPrice = (value) => new Intl.NumberFormat('vi-VN', {
  style: 'currency', currency: 'VND', maximumFractionDigits: 0,
}).format(value);

export const normalizeSearch = (value) => value.normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').toLowerCase().trim();

// Cards and price filters use the cheapest active variant, including sold-out ones.
export function getCardVariant(product) {
  return product.variants.filter((variant) => variant.is_active)
    .reduce((cheapest, variant) => !cheapest || variant.sale_price < cheapest.sale_price ? variant : cheapest, null);
}

export const getDiscount = (variant) => variant
  ? Math.floor((variant.list_price - variant.sale_price) * 100 / variant.list_price) : 0;

export const categoryUrl = (slug) => `/products?category=${encodeURIComponent(slug)}`;

export function filterProducts(products, params) {
  const query = normalizeSearch(params.get('q') || '');
  const category = params.get('category');
  const brand = params.get('brand');
  const minText = params.get('min_price') || '';
  const maxText = params.get('max_price') || '';
  const min = /^\d+$/.test(minText) ? Number(minText) : 0;
  const max = /^\d+$/.test(maxText) ? Number(maxText) : Infinity;
  const result = products.filter((product) => {
    const variant = getCardVariant(product);
    return variant && (!query || normalizeSearch(`${product.name} ${product.brand.name} ${product.variants.map((item) => item.sku).join(' ')}`).includes(query))
      && (!category || product.category_slug === category)
      && (!brand || product.brand.slug === brand)
      && variant.sale_price >= min && variant.sale_price <= max
      && (!params.has('promotion') || product.variants.some((item) => item.is_active && item.sale_price < item.list_price))
      && (!params.has('in_stock') || product.variants.some((item) => item.is_active && item.stock_quantity > 0));
  });
  switch (params.get('sort')) {
    case 'price_asc': return result.sort((a, b) => getCardVariant(a).sale_price - getCardVariant(b).sale_price);
    case 'price_desc': return result.sort((a, b) => getCardVariant(b).sale_price - getCardVariant(a).sale_price);
    case 'name': return result.sort((a, b) => a.name.localeCompare(b.name, 'vi'));
    default: return result.sort((a, b) => b.created_at.localeCompare(a.created_at) || b.id - a.id);
  }
}
