import { Link, useOutletContext } from 'react-router-dom';
import CatalogStatus from '../../components/CatalogStatus';
import HeroCarousel from '../../components/HeroCarousel';
import ProductSection from '../../components/ProductSection';
import FlashDeals from '../../components/FlashDeals';
import CategoryRail from '../../components/CategoryRail';
import Icon from '../../components/Icon';
import { categoryUrl, filterProducts, getCardVariant, getDiscount } from '../../utils/catalog';

export default function HomePage() {
  const catalog = useOutletContext();
  if (!catalog.data) return <CatalogStatus {...catalog} />;
  const { products, categories } = catalog.data;
  const promotions = products.filter((product) => getDiscount(getCardVariant(product)) > 0)
    .sort((a, b) => getDiscount(getCardVariant(b)) - getDiscount(getCardVariant(a))).slice(0, 4);
  const newest = filterProducts(products, new URLSearchParams()).slice(0, 5);
  return (
    <>
      <h1 className="visually-hidden">ShopHub — Công nghệ cho công việc, tiện nghi cho cuộc sống</h1>
      <section className="hero" aria-label="Banner và ưu đãi nổi bật"><div className="wrap"><div className="hero-grid">
        <HeroCarousel />
        <div className="promo-stack">
          <article className="promo-card"><div className="promo-bg"><img src="/images/catalog/lenovo-ideapad.jpg" alt="" /></div><div><span className="tag tag-gold">Chọn cho công việc</span><h3>Chiếc laptop.<br />Ý tưởng lớn.</h3><p>Khám phá máy tính cho học tập, sáng tạo và làm việc mỗi ngày.</p></div><Link className="promo-link" to={categoryUrl('laptop')}>Tìm laptop của bạn<Icon name="arrow" /></Link></article>
          <article className="promo-card alt"><div className="promo-bg"><img src="/images/catalog/philips-kettle.jpg" alt="" /></div><div><span className="tag tag-red">Cho tổ ấm</span><h3>Tiện nghi nhỏ.<br />Niềm vui mỗi ngày.</h3><p>Những trợ thủ thiết thực giúp cuộc sống thêm nhẹ nhàng.</p></div><Link className="promo-link" to={categoryUrl('thiet-bi-gia-dung')}>Khám phá gia dụng<Icon name="arrow" /></Link></article>
        </div>
      </div></div></section>
      <section className="spotlight" aria-label="Khám phá ba nhóm sản phẩm"><div className="wrap"><div className="spot-grid">
        {categories.map((category, index) => <article className={`spot spot-${index}`} key={category.slug}>
          <div className="spot-bg"><img src={`/images/catalog/${['asus-vivobook.jpg', 'keyboard.jpg', 'philips-kettle.jpg'][index]}`} alt="" loading="lazy" /></div>
          <div className="spot-body"><span className={`tag ${index === 0 ? 'tag-gold' : index === 1 ? 'tag-teal' : 'tag-red'}`}>{category.caption}</span><h3>{category.name}</h3><p>Khám phá lựa chọn phù hợp với bạn.</p><Link className="spot-cta" to={categoryUrl(category.slug)}>Khám phá ngay<Icon name="arrow" /></Link></div>
        </article>)}
      </div></div></section>
      <CategoryRail categories={categories} />
      <FlashDeals products={promotions} />
      <ProductSection title="Sản phẩm mới" subtitle="Thêm lựa chọn cho công việc và cuộc sống" products={newest} to="/products?sort=newest" />
      {categories.map((category) => <ProductSection key={category.slug} title={category.name} products={products.filter((product) => product.category_slug === category.slug).slice(0, 5)} to={categoryUrl(category.slug)} />)}
    </>
  );
}
