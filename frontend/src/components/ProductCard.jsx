import { Link } from 'react-router-dom';
import ProductMedia from './ProductMedia';
import Icon from './Icon';
import { formatPrice, getCardVariant, getDiscount } from '../utils/catalog';

export default function ProductCard({ product }) {
  const variant = getCardVariant(product);
  if (!variant) return null;
  const discount = getDiscount(variant);
  const inStock = product.variants.some((item) => item.is_active && item.stock_quantity > 0);
  return (
    <article className="pcard">
      <Link className="pframe" to={`/products/${product.slug}`} tabIndex={-1} aria-hidden="true">
        <ProductMedia product={product} />
        <div className="pbadges">{discount > 0 && <span className="tag tag-red">−{discount}%</span>}</div>
      </Link>
      <div className="pbody">
        <span className="pcat">{product.brand.name}</span>
        <h3 className="pname"><Link to={`/products/${product.slug}`}>{product.name}</Link></h3>
        <p className="card-spec">{product.specs.slice(0, 2).map(([, value]) => value).join(' · ')}</p>
        <div className="pprice"><span className="now">{product.variants.filter((item) => item.is_active).length > 1 && <small>Từ </small>}{formatPrice(variant.sale_price)}</span>{discount > 0 && <s>{formatPrice(variant.list_price)}</s>}</div>
        <span className={`stock-label ${inStock ? '' : 'sold-out'}`}>{inStock ? '● Còn hàng' : '● Tạm hết hàng'}<span>{product.variants.filter((item) => item.is_active).length > 1 ? 'Nhiều màu' : 'Bản tiêu chuẩn'}</span></span>
        <Link className="btn-bz btn-outline btn-sm btn-block card-detail" to={`/products/${product.slug}`} aria-label={`Xem chi tiết ${product.name}`}>Xem chi tiết<Icon name="arrow" /></Link>
      </div>
    </article>
  );
}
