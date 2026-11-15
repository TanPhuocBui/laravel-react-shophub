export const adminCatalogTitle = (kind) => ({ categories: 'Danh mục', brands: 'Thương hiệu', products: 'Sản phẩm' })[kind] || 'Catalog';

export function suggestCatalogSlug(name) {
  return name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[đĐ]/g, 'd')
    .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 180).replace(/-+$/g, '');
}

export function catalogReturnTo(kind, state) {
  const base = `/admin/${kind}`;
  const candidate = state?.returnTo;
  return typeof candidate === 'string' && (candidate === base || candidate.startsWith(base + '?')) ? candidate : base;
}

export function categoryParentLabel(record, options) {
  if (record.parent_id == null) return 'Danh mục gốc';
  return options.find((item) => item.id === record.parent_id)?.name || `Danh mục #${record.parent_id}`;
}
