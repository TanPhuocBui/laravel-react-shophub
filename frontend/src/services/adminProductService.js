import api from '../api/axios';

export async function listAdminProducts(params, signal) {
  return (await api.get('/api/admin/products', { params, signal })).data;
}
export async function getAdminProduct(id, signal) {
  return (await api.get('/api/admin/products/' + id, { signal })).data.data;
}
export async function getProductOptions(signal) {
  return (await api.get('/api/admin/products/options', { signal })).data.data;
}
export async function saveAdminProduct(id, fields, variants, images) {
  const data = new FormData();
  if (id) data.append('_method', 'PUT');
  for (const [key, value] of Object.entries(fields)) data.append(key, value ?? '');
  for (const [index, variant] of variants.entries()) {
    for (const field of ['id', 'sku', 'name', 'list_price', 'sale_price', 'stock_quantity', 'is_active']) {
      if (field === 'id' && !variant.id) continue;
      data.append('variants[' + index + '][' + field + ']', field === 'is_active' ? (variant[field] ? '1' : '0') : variant[field]);
    }
    const options = { ...variant.options };
    if (variant.color) options.color = variant.color;
    else delete options.color;
    if (!Object.keys(options).length) data.append('variants[' + index + '][options]', '');
    for (const [key, value] of Object.entries(options)) data.append('variants[' + index + '][options][' + key + ']', value ?? '');
  }
  if (!images.length) data.append('images', '');
  for (const [index, image] of images.entries()) {
    if (image.id) data.append('images[' + index + '][id]', image.id);
    if (image.file) data.append('images[' + index + '][file]', image.file);
    data.append('images[' + index + '][alt_text]', image.alt_text || '');
    data.append('images[' + index + '][sort_order]', index);
  }
  await api.get('/sanctum/csrf-cookie');
  return (await api.post('/api/admin/products' + (id ? '/' + id : ''), data)).data.data;
}
