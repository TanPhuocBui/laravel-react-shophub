import { Link } from 'react-router-dom';
import Icon from './Icon';
import ProductMedia from './ProductMedia';
import { formatPrice, getCardVariant, getDiscount } from '../utils/catalog';
import { isDemoCatalog } from '../services/catalogService';

export default function FlashDeals({ products }) {
  return (
    <section className="flash promotion-section" id="promotions" aria-label="Khuyến mãi">
      <div className="wrap"><div className="flash-panel">
        <div className="flash-top">
          <div className="flash-title"><span className="bolt"><Icon name="bolt" /></span><div><h2>Khuyến mãi</h2><span className="sub">Thêm lựa chọn tốt cho mỗi ngày</span></div></div>
          <Link className="see-all" to="/products?promotion=1" aria-label="Tất cả Khuyến mãi">Tất cả<Icon name="arrow" /></Link>
        </div>
        {products.length ? <div className="flash-grid">{products.map((product) => {
          const variant = getCardVariant(product);
          const discount = getDiscount(variant);
          const stock = product.variants.filter((item) => item.is_active).reduce((total, item) => total + item.stock_quantity, 0);
          return (
            <article className="flash-item" key={product.id}>
              <Link className="fi-frame" to={`/products/${product.slug}`} tabIndex={-1} aria-hidden="true"><ProductMedia product={product} />{discount > 0 && <span className="tag tag-red disc">−{discount}%</span>}</Link>
              <h3 className="fi-name"><Link to={`/products/${product.slug}`}>{product.name}</Link></h3>
              <div className="fi-price"><span className="now">{formatPrice(variant.sale_price)}</span>{discount > 0 && <s>{formatPrice(variant.list_price)}</s>}</div>
              <div className="fi-stock"><small>{stock ? <>Còn <b>{stock}</b> sản phẩm{isDemoCatalog ? ' trong dữ liệu demo' : ''}</> : 'Tạm hết hàng'}</small></div>
              <Link className="btn-bz btn-outline btn-sm btn-block" to={`/products/${product.slug}`}>Xem sản phẩm<Icon name="arrow" /></Link>
            </article>
          );
        })}</div> : <p className="empty-inline">Chưa có sản phẩm khuyến mãi.</p>}
      </div></div>
    </section>
  );
}
