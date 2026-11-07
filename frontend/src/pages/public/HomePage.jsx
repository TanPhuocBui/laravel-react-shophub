import { Link, useOutletContext } from 'react-router-dom';
import { useCallback } from 'react';
import useCatalog from '../../hooks/useCatalog';
import { getHomeCatalog } from '../../services/catalogService';
import CatalogStatus from '../../components/CatalogStatus';
import HeroCarousel from '../../components/HeroCarousel';
import ProductSection from '../../components/ProductSection';
import FlashDeals from '../../components/FlashDeals';
import CategoryRail from '../../components/CategoryRail';
import Icon from '../../components/Icon';
import { categoryUrl } from '../../utils/catalog';

export default function HomePage() {
  const catalog = useOutletContext();
  const loader = useCallback((options) => getHomeCatalog(catalog.data.categories, options), [catalog.data]);
  const home = useCatalog(catalog.data ? loader : null);
  if (!catalog.data) return <CatalogStatus {...catalog} />;
  if (!home.data) return <CatalogStatus {...home} />;
  const { promotions, newest, sections, total } = home.data;
  const categories = sections.map((section) => section.category);
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
      {total === 0 && <div className="wrap"><div className="state-panel" role="status"><h2>Catalog chưa có sản phẩm công khai</h2><p>Vui lòng quay lại sau khi sản phẩm được cập nhật.</p></div></div>}
      <FlashDeals products={promotions} />
      <ProductSection title="Sản phẩm mới" subtitle="Thêm lựa chọn cho công việc và cuộc sống" products={newest} to="/products?sort=newest" />
      {sections.map(({ category, products }) => <ProductSection key={category.slug} title={category.name} products={products} to={categoryUrl(category.slug)} />)}
    </>
  );
}
