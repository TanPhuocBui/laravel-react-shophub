import { Link, useNavigate } from 'react-router-dom';
import Icon from './Icon';
import { categoryUrl } from '../utils/catalog';

export default function StorefrontFooter({ categories, brands }) {
  const navigate = useNavigate();
  function search(event) {
    event.preventDefault();
    const q = new FormData(event.currentTarget).get('q').trim();
    navigate(`/products${q ? `?q=${encodeURIComponent(q)}` : ''}`);
  }
  return (
    <footer aria-label="Thông tin ShopHub">
      <section className="brands" aria-label="Thương hiệu trong catalog demo"><div className="wrap"><div className="brands-row"><span className="eyebrow">Thương hiệu trong catalog</span>{brands.map((brand) => <Link key={brand.slug} className="brand-logo" to={`/products?brand=${encodeURIComponent(brand.slug)}`}>{brand.name}</Link>)}</div></div></section>
      <section className="benefits" aria-label="Trải nghiệm ShopHub"><div className="wrap"><div className="benefits-row">
        {[['laptop', 'Công nghệ cho bạn', 'Laptop cho học tập và công việc'], ['chip', 'Nâng cấp dễ dàng', 'Linh kiện và phụ kiện'], ['home', 'Nhà thêm tiện nghi', 'Thiết bị cho cuộc sống'], ['shield', 'Thông tin rõ ràng', 'Giá và thông số ngay trên catalog']].map(([icon, title, text]) => <div className="benefit" key={icon}><span className="bi"><Icon name={icon} /></span><div><h4>{title}</h4><p>{text}</p></div></div>)}
      </div></div></section>
      <section className="newsletter"><div className="wrap"><div className="nl-inner">
        <div><span className="eyebrow">CÔNG NGHỆ & CUỘC SỐNG</span><h2>Điều bạn cần,<br />khám phá tại ShopHub.</h2><p>Từ góc làm việc đến căn bếp — tìm sản phẩm phù hợp với bạn.</p></div>
        <div><form className="nl-form" role="search" aria-label="Tìm sản phẩm ở cuối trang" onSubmit={search}><label className="visually-hidden" htmlFor="footer-search">Tìm sản phẩm</label><div className="nl-field"><Icon name="search" /><input id="footer-search" name="q" type="search" placeholder="Bạn đang tìm gì?" maxLength={200} /></div><button className="btn-bz btn-gold" type="submit">Khám phá<Icon name="arrow" /></button></form><p className="nl-note">Bản catalog demo · Chưa hỗ trợ đặt hàng</p></div>
      </div></div></section>
      <div className="site-footer"><div className="wrap">
        <div className="footer-top">
          <div className="f-brand"><Link className="brand-word" to="/">Shop<b>Hub</b></Link><p>Công nghệ cho công việc.<br />Tiện nghi cho cuộc sống.<br />Khám phá những lựa chọn vừa ý, mỗi ngày.</p><ul className="f-contact"><li><Icon name="home" /><span>ShopHub · Website phục vụ đồ án</span></li><li><Icon name="grid" /><span>Ba nhóm hàng, một nơi khám phá</span></li></ul></div>
          <div><h5>Ngành hàng</h5><ul className="footer-links">{categories.map((category) => <li key={category.slug}><Link to={categoryUrl(category.slug)}>{category.name}</Link></li>)}<li><Link to="/products">Tất cả sản phẩm</Link></li></ul></div>
          <div><h5>Khám phá</h5><ul className="footer-links"><li><Link to="/products?promotion=1">Khuyến mãi</Link></li><li><Link to="/products?sort=newest">Sản phẩm mới</Link></li><li><Link to="/products?in_stock=1">Sản phẩm còn hàng</Link></li><li><Link to="/connection">Kiểm tra kết nối</Link></li></ul></div>
          <div><h5>Về ShopHub</h5><p>Giá, tồn kho và thông số là dữ liệu giả lập. Hình được đánh dấu ảnh tham khảo hoặc minh họa.</p><h5 className="footer-subheading">Nguồn hình ảnh</h5><a className="f-app" href="/images/catalog/ATTRIBUTION.html"><Icon name="shield" /><span><small>Ghi công & giấy phép</small><b>Ảnh tham khảo</b></span></a></div>
        </div>
        <div className="footer-bar"><p>© 2026 ShopHub · Phát triển từ Bazaar của <a className="uc" href="https://uicookies.com">uiCookies</a>.</p><span>Catalog demo · Chưa mở bán</span></div>
      </div></div>
    </footer>
  );
}
