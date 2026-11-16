import { useCallback } from 'react';
import useCatalog from '../hooks/useCatalog';
import { getProducts } from '../services/catalogService';
import { categoryUrl } from '../utils/catalog';
import ProductSection from './ProductSection';

export default function RelatedProducts({ product }) {
  const loader = useCallback((options) => getProducts({ category: product.category_slug, per_page: 6 }, options), [product.category_slug]);
  const request = useCatalog(loader);
  if (request.loading) return <div className="wrap"><p className="state-panel" role="status">Đang tải sản phẩm cùng danh mục…</p></div>;
  if (request.error) return <section className="wrap" aria-label="Sản phẩm cùng danh mục"><div className="state-panel"><h2>Chưa tải được sản phẩm cùng danh mục</h2><p role="alert">{request.error}</p><button className="btn-bz" onClick={request.retry}>Thử lại sản phẩm cùng danh mục</button></div></section>;
  return <ProductSection title="Cùng danh mục" products={request.data.products.filter((item) => item.id !== product.id).slice(0, 5)} to={categoryUrl(product.category_slug)} />;
}
