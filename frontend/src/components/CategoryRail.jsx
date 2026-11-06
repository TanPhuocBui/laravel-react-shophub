import { Link } from 'react-router-dom';
import Icon from './Icon';
import { categoryUrl } from '../utils/catalog';

export default function CategoryRail({ categories }) {
  if (!categories.length) return null;
  return (
    <section className="catrail category-rail" aria-labelledby="category-rail-title">
      <div className="wrap">
        <div className="section-head">
          <div><span className="eyebrow">KHÁM PHÁ SHOPHUB</span><h2 id="category-rail-title">Mua theo danh mục</h2></div>
          <Link className="see-all" to="/products">Tất cả danh mục<Icon name="arrow" /></Link>
        </div>
        <div className="catrail-track">
          {categories.map((category) => (
            <Link key={category.slug} className="cat-tile" to={categoryUrl(category.slug)}>
              <span className="cat-ic"><Icon name={category.icon || 'grid'} /></span>
              <span className="cat-name">{category.name}</span>
              {Number.isSafeInteger(category.product_count) && category.product_count >= 0 && (
                <span className="cat-count">{category.product_count} sản phẩm</span>
              )}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
