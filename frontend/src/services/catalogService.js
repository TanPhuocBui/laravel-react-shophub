// No catalog HTTP routes exist yet. Do not silently fall back from a failed API
// to fixtures. Replace this service with the shared Axios client once agreed.
export const catalogSource = import.meta.env.VITE_CATALOG_SOURCE || 'demo';

export async function getCatalog() {
  if (catalogSource !== 'demo') {
    throw new Error('Dữ liệu sản phẩm chưa sẵn sàng. Vui lòng thử lại sau.');
  }
  const { categories, brands, products } = await import('../data/demoCatalog');
  // This demo source contains the complete catalog, not a paginated subset.
  // Future API adapters must omit product_count unless they have an actual total.
  const countedCategories = categories.map((category) => ({
    ...category,
    product_count: products.filter((product) => product.category_slug === category.slug).length,
  }));
  return { categories: countedCategories, brands, products };
}
