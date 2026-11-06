import { Link } from 'react-router-dom';
import ProductCard from './ProductCard';
import Icon from './Icon';

export default function ProductSection({ title, subtitle, products, to, promotion = false, id }) {
  return (
    <section className={`section product-section ${promotion ? 'promotion-section' : ''}`} id={id} aria-label={title}>
      <div className="wrap"><div className="section-surface">
        <div className="section-head">
          <div><span className="eyebrow">SHOPHUB / {promotion ? 'GIÁ TỐT MỖI NGÀY' : 'KHÁM PHÁ CÔNG NGHỆ'}</span><h2>{promotion && <Icon name="bolt" />}{title}</h2>{subtitle && <p className="sub">{subtitle}</p>}</div>
          <Link className="see-all" to={to} aria-label={`Tất cả ${title}`}>Tất cả <Icon name="arrow" /></Link>
        </div>
        {products.length ? <div className="pgrid product-grid">{products.map((product) => <ProductCard key={product.id} product={product} />)}</div> : <p className="empty-inline">Chưa có sản phẩm trong nhóm này.</p>}
      </div></div>
    </section>
  );
}
