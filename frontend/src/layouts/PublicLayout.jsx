import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Icon from '../components/Icon';
import StorefrontFooter from '../components/StorefrontFooter';
import HeaderUtilities from '../components/HeaderUtilities';
import useCatalog from '../hooks/useCatalog';
import { catalogSource } from '../services/catalogService';
import { categoryUrl } from '../utils/catalog';

function Header({ categories }) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [open, setOpen] = useState(false);
  const dialog = useRef(null);
  useEffect(() => {
    if (!open) return;
    const element = dialog.current;
    const previous = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = 'hidden';
    return () => { element.close(); document.body.style.overflow = previous; };
  }, [open]);
  function search(event) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const next = new URLSearchParams();
    if (form.get('q').trim()) next.set('q', form.get('q').trim());
    if (form.get('category')) next.set('category', form.get('category'));
    navigate(`/products${next.size ? `?${next}` : ''}`);
  }
  return (
    <>
      <div className="topbar"><div className="wrap">
        <div className="tb-left"><Icon name="shield" /><span>Công nghệ cho công việc · <strong>Tiện nghi cho cuộc sống</strong></span></div>
        <div className="tb-right"><Link className="tb-link" to="/products?sort=newest">Sản phẩm mới</Link><span className="tb-sep" /><Link className="tb-link" to="/products?promotion=1">Khuyến mãi</Link><span className="tb-sep" /><span className="tb-link">Tiếng Việt / VND</span></div>
      </div></div>
      <header className="site-header">
        <div className="wrap"><div className="header-main">
          <button className="hact nav-toggle" type="button" aria-label="Mở danh mục" aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen(true)}><Icon name="menu" /><span className="hact-txt">Danh mục</span></button>
          <Link className="brand" to="/" aria-label="ShopHub — Trang chủ"><span className="brand-mark"><Icon name="bag" /></span><span><span className="brand-word">Shop<b>Hub</b></span><span className="brand-sub">Công nghệ & Cuộc sống</span></span></Link>
          <form className="searchbar" role="search" onSubmit={search}>
            <label className="visually-hidden" htmlFor="header-category">Danh mục tìm kiếm</label>
            <select className="cat-select" id="header-category" name="category" defaultValue={params.get('category') || ''}><option value="">Tất cả danh mục</option>{categories.map((category) => <option key={category.slug} value={category.slug}>{category.name}</option>)}</select>
            <label className="visually-hidden" htmlFor="header-search">Tìm sản phẩm</label>
            <input id="header-search" name="q" type="search" placeholder="Tìm laptop, linh kiện, đồ gia dụng…" defaultValue={params.get('q') || ''} maxLength={200} />
            <button className="search-btn" type="submit" aria-label="Tìm kiếm"><Icon name="search" /></button>
          </form>
          <HeaderUtilities />
        </div></div>
        <nav className="deptnav" aria-label="Điều hướng chính"><div className="wrap">
          <NavLink to="/products" className="dept-all"><Icon name="grid" />Danh mục sản phẩm</NavLink>
          <NavLink to="/" end className="dept-link">Trang chủ</NavLink>
          {categories.map((category) => <Link key={category.slug} className={`dept-link ${params.get('category') === category.slug ? 'active' : ''}`} to={categoryUrl(category.slug)}>{category.name}</Link>)}
          <Link className="dept-link hot" to="/products?promotion=1"><Icon name="bolt" />Khuyến mãi</Link><span className="dept-spacer" />
        </div></nav>
      </header>
      <dialog ref={dialog} id="mobile-menu" className="mnav open mobile-menu" aria-labelledby="mobile-menu-title" onCancel={() => setOpen(false)} onClose={() => setOpen(false)} onClick={(event) => { if (event.target === event.currentTarget) setOpen(false); }}>
        <div className="mnav-head"><h2 id="mobile-menu-title">Danh mục ShopHub</h2><button autoFocus className="mnav-close" onClick={() => setOpen(false)} aria-label="Đóng danh mục"><Icon name="close" /></button></div>
        <nav className="mnav-body" aria-label="Danh mục trên điện thoại">
          <Link to="/" onClick={() => setOpen(false)}><Icon name="home" />Trang chủ</Link>
          <Link to="/products" onClick={() => setOpen(false)}><Icon name="grid" />Tất cả sản phẩm</Link>
          <div className="mnav-sep" />
          {categories.map((category) => <Link key={category.slug} to={categoryUrl(category.slug)} onClick={() => setOpen(false)}><Icon name={category.icon} />{category.name}</Link>)}
          <div className="mnav-sep" /><Link to="/products?promotion=1" onClick={() => setOpen(false)}><Icon name="bolt" />Khuyến mãi</Link>
        </nav>
      </dialog>
    </>
  );
}

export default function PublicLayout() {
  const catalog = useCatalog();
  const location = useLocation();
  const main = useRef(null);
  const [backTop, setBackTop] = useState(false);
  const categories = catalog.data?.categories || [];
  useEffect(() => {
    document.title = location.pathname.startsWith('/products') ? 'Sản phẩm | ShopHub' : 'ShopHub | Công nghệ & Cuộc sống';
    main.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: 'instant' });
  }, [location.pathname, location.search]);
  useEffect(() => {
    const scroll = () => setBackTop(window.scrollY > 600);
    window.addEventListener('scroll', scroll, { passive: true });
    return () => window.removeEventListener('scroll', scroll);
  }, []);
  return (
    <div className="storefront">
      <a className="skip-link" href="#main">Đến nội dung chính</a>
      <Header key={`${location.pathname}${location.search}`} categories={categories} />
      <div className="demo-notice"><div className="wrap"><span className="demo-dot" /><span>{catalogSource === 'demo' ? 'Bản xem trước · Sản phẩm, giá, tồn kho và thông số là dữ liệu demo. Chưa hỗ trợ đặt hàng.' : 'Catalog chưa được nối dữ liệu.'}</span></div></div>
      <main id="main" className="main-content" ref={main} tabIndex={-1}><Outlet context={catalog} /></main>
      <StorefrontFooter categories={categories} brands={catalog.data?.brands || []} />
      <button className={`back-top ${backTop ? 'show' : ''}`} onClick={() => window.scrollTo({ top: 0, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth' })} aria-label="Về đầu trang"><Icon name="arrow" /></button>
    </div>
  );
}
