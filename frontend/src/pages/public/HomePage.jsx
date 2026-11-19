import { Link, useOutletContext } from 'react-router-dom';
import { useCallback } from 'react';
import useCatalog from '../../hooks/useCatalog';
import { getHomeProducts } from '../../services/catalogService';
import HeroCarousel from '../../components/HeroCarousel';
import ProductSection from '../../components/ProductSection';
import FlashDeals from '../../components/FlashDeals';
import CategoryRail from '../../components/CategoryRail';
import Icon from '../../components/Icon';
import { categoryUrl } from '../../utils/catalog';

function HomeProductStrip({ title, category, promotion = false }) {
  const loader = useCallback((options) => getHomeProducts({
    sort: 'newest', per_page: promotion ? 4 : 5,
    ...(promotion ? { promotion: 1 } : {}), ...(category ? { category } : {}),
  }, options), [category, promotion]);
  const strip = useCatalog(loader);
  if (!strip.data) return null;
  if (promotion) return <FlashDeals products={strip.data.products} />;
  return <ProductSection title={title} subtitle={category ? undefined : 'Thêm lựa chọn cho công việc và cuộc sống'} products={strip.data.products} to={category ? categoryUrl(category) : '/products?sort=newest'} />;
}

export default function HomePage() {
  const catalog = useOutletContext();
  const categories = (catalog.data?.categories || []).filter((category) => category.parent_id == null).slice(0, 3);
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
          <div className="spot-bg"><img src={category.image_url || `/images/catalog/${category.image || 'asus-vivobook.jpg'}`} alt="" loading="lazy" onError={(event) => { event.currentTarget.onerror = null; event.currentTarget.src = '/images/catalog/asus-vivobook.jpg'; }} /></div>
          <div className="spot-body"><span className={`tag ${index === 0 ? 'tag-gold' : index === 1 ? 'tag-teal' : 'tag-red'}`}>{category.caption}</span><h3>{category.name}</h3><p>Khám phá lựa chọn phù hợp với bạn.</p><Link className="spot-cta" to={categoryUrl(category.slug)}>Khám phá ngay<Icon name="arrow" /></Link></div>
        </article>)}
      </div></div></section>
      <CategoryRail categories={categories} />
      <HomeProductStrip title="Khuyến mãi" promotion />
      <HomeProductStrip title="Sản phẩm mới" />
      {categories.map((category) => <HomeProductStrip key={category.slug} title={category.name} category={category.slug} />)}
    </>
  );
}
