import { useCallback } from 'react';
import useCatalog from '../hooks/useCatalog';
import { getProducts } from '../services/catalogService';
import { categoryUrl } from '../utils/catalog';
import ProductSection from './ProductSection';

export default function RelatedProducts({ product }) {
  const loader = useCallback((options) => getProducts({ category: product.category_slug, per_page: 6 }, options), [product.category_slug]);
  const request = useCatalog(loader);
  if (!request.data) return null;
  return <ProductSection title="Cùng danh mục" products={request.data.products.filter((item) => item.id !== product.id).slice(0, 5)} to={categoryUrl(product.category_slug)} />;
}
