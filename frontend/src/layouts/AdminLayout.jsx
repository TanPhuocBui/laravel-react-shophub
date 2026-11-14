import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAccount } from '../contexts/useAccount';
import Icon from '../components/Icon';
import { trapDialogFocus } from '../components/admin/dialogFocus';
import { adminCatalogTitle, catalogReturnTo } from '../utils/adminCatalog';
import '../styles/admin.css';

function AdminNavigation({ close }) {
  return <>
    <Link className="admin-brand" to="/admin/categories" onClick={close}>Shop<span>Hub</span><small>QUẢN TRỊ CỬA HÀNG</small></Link>
    <div className="admin-nav-section"><p className="admin-nav-label">CATALOG</p>
      <nav aria-label="Quản trị catalog">
        <NavLink to="/admin/categories" onClick={close}><Icon name="grid" />Danh mục</NavLink>
        <NavLink to="/admin/brands" onClick={close}><Icon name="shield" />Thương hiệu</NavLink>
      </nav>
    </div>
    <div className="admin-sidebar-footer"><Link className="admin-store-link" to="/" onClick={close}><Icon name="home" />Xem cửa hàng<Icon name="arrow" /></Link></div>
  </>;
}

export default function AdminLayout() {
  const { user, checking, unavailable, retry } = useAccount();
  const location = useLocation();
  const main = useRef(null);
  const menu = useRef(null);
  const trigger = useRef(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const kind = location.pathname.includes('/brands') ? 'brands' : 'categories';
  const moduleTitle = adminCatalogTitle(kind);
  const isForm = /\/(create|\d+\/edit)$/.test(location.pathname);
  const pageTitle = isForm ? (location.pathname.endsWith('/create') ? 'Thêm ' : 'Sửa ') + moduleTitle.toLowerCase() : moduleTitle;
  useEffect(() => {
    if (!menuOpen) return;
    const element = menu.current;
    const opener = trigger.current;
    const previous = document.body.style.overflow;
    element.showModal();
    document.body.style.overflow = 'hidden';
    return () => { element.close(); document.body.style.overflow = previous; opener?.focus(); };
  }, [menuOpen]);
  useEffect(() => {
    document.title = pageTitle + ' | ShopHub Admin';
    main.current?.focus({ preventScroll: true });
  }, [location.pathname, pageTitle, user?.id]);
  if (checking) return <div className="admin-shell"><p className="admin-state" role="status">Đang kiểm tra quyền truy cập…</p></div>;
  if (unavailable) return <div className="admin-shell"><div className="admin-state" role="alert"><Icon name="shield" /><h1>Chưa thể kiểm tra phiên đăng nhập</h1><p>Kiểm tra kết nối rồi thử lại.</p><button onClick={retry}>Thử lại</button></div></div>;
  if (!user) return <div className="admin-shell"><div className="admin-state" role="alert"><Icon name="user" /><h1>Cần đăng nhập</h1><p>Đăng nhập bằng tài khoản quản trị để tiếp tục.</p><div className="admin-actions"><Link className="admin-primary" to="/login">Đăng nhập</Link><Link to="/">Về cửa hàng</Link></div></div></div>;
  if (user.role !== 'admin' || !user.is_active) return <div className="admin-shell"><div className="admin-state" role="alert"><Icon name="shield" /><h1>Không đủ quyền truy cập</h1><p>Khu vực này chỉ dành cho quản trị viên đang hoạt động.</p><Link to="/">Về cửa hàng</Link></div></div>;
  const initials = user.name.trim().split(/\s+/).slice(-2).map((part) => part[0]).join('').toUpperCase();
  return <div className="admin-shell">
    <a className="admin-skip" href="#admin-main">Đến nội dung chính</a>
    <aside className="admin-sidebar admin-desktop-sidebar"><AdminNavigation /></aside>
    <dialog ref={menu} className="admin-nav-dialog" aria-labelledby="admin-menu-title" onKeyDown={trapDialogFocus} onCancel={(event) => { event.preventDefault(); setMenuOpen(false); }} onClick={(event) => { if (event.target === event.currentTarget) setMenuOpen(false); }}>
      <div className="admin-sidebar"><div className="admin-mobile-nav-head"><span id="admin-menu-title">Điều hướng quản trị</span><button autoFocus type="button" aria-label="Đóng menu quản trị" onClick={() => setMenuOpen(false)}><Icon name="close" /></button></div><AdminNavigation close={() => setMenuOpen(false)} /></div>
    </dialog>
    <div className="admin-workspace">
      <header className="admin-topbar">
        <button ref={trigger} className="admin-menu-trigger" type="button" aria-label="Mở menu quản trị" aria-haspopup="dialog" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}><Icon name="menu" /></button>
        <nav className="admin-breadcrumb" aria-label="Đường dẫn quản trị"><span>Catalog</span><Icon name="chevron" />{isForm ? <><Link to={catalogReturnTo(kind, location.state)}>{moduleTitle}</Link><Icon name="chevron" /><span aria-current="page">{pageTitle}</span></> : <span aria-current="page">{moduleTitle}</span>}</nav>
        <Link className="admin-account" to="/account"><span className="admin-avatar" aria-hidden="true">{initials}</span><span><strong>{user.name}</strong><small>{user.role === 'admin' ? 'Quản trị viên' : user.role}</small></span></Link>
      </header>
      <main id="admin-main" ref={main} tabIndex={-1}><Outlet /></main>
    </div>
  </div>;
}
