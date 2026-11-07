import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Icon from './Icon';
import { useAccount } from '../contexts/useAccount';

export default function HeaderUtilities() {
  const { user, logout } = useAccount();
  const location = useLocation();
  const navigate = useNavigate();
  const [loggingOut, setLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState('');
  const accountItems = user
    ? [{ label: 'Thông tin tài khoản', to: '/account' }, { label: 'Tra cứu đơn hàng' }, { label: 'Đăng xuất', logout: true }]
    : [{ label: 'Đăng nhập', to: '/login' }, { label: 'Đăng ký', to: '/register' }, { label: 'Tra cứu đơn hàng' }];
  const [accountOpen, setAccountOpen] = useState(false);
  const [pendingFeature, setPendingFeature] = useState('');
  const account = useRef(null);
  const accountTrigger = useRef(null);
  const menuItems = useRef([]);
  const initialItem = useRef(0);
  const pendingDialog = useRef(null);
  const returnFocus = useRef(null);

  useEffect(() => {
    if (!accountOpen) return;
    menuItems.current[initialItem.current]?.focus();
    const outside = (event) => {
      if (!account.current?.contains(event.target)) setAccountOpen(false);
    };
    const escape = (event) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      setAccountOpen(false);
      accountTrigger.current?.focus();
    };
    document.addEventListener('pointerdown', outside);
    document.addEventListener('focusin', outside);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', outside);
      document.removeEventListener('focusin', outside);
      document.removeEventListener('keydown', escape);
    };
  }, [accountOpen]);

  useEffect(() => {
    if (!pendingFeature) return;
    const dialog = pendingDialog.current;
    const previousOverflow = document.body.style.overflow;
    dialog.showModal();
    document.body.style.overflow = 'hidden';
    return () => {
      dialog.close();
      document.body.style.overflow = previousOverflow;
      returnFocus.current?.focus();
    };
  }, [pendingFeature]);

  function showPending(name, origin) {
    returnFocus.current = origin;
    setAccountOpen(false);
    setPendingFeature(name);
  }

  async function signOut() {
    if (loggingOut) return;
    setLoggingOut(true);
    setLogoutError('');
    try {
      await logout();
      setAccountOpen(false);
      if (location.pathname === '/account') navigate('/', { replace: true });
      else accountTrigger.current?.focus();
    } catch {
      setLogoutError('Chưa thể đăng xuất. Vui lòng thử lại.');
    } finally {
      setLoggingOut(false);
    }
  }

  function triggerKey(event) {
    if (!['ArrowDown', 'ArrowUp'].includes(event.key)) return;
    event.preventDefault();
    initialItem.current = event.key === 'ArrowUp' ? accountItems.length - 1 : 0;
    if (accountOpen) menuItems.current[initialItem.current]?.focus();
    else setAccountOpen(true);
  }

  function menuKey(event, index) {
    let next;
    if (event.key === 'ArrowDown') next = (index + 1) % accountItems.length;
    if (event.key === 'ArrowUp') next = (index + accountItems.length - 1) % accountItems.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = accountItems.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    menuItems.current[next]?.focus();
  }

  return (
    <div className="header-actions header-utilities" aria-label="Tiện ích người dùng">
      <div className="account-dropdown" ref={account}>
        <button
          ref={accountTrigger} className="hact" type="button" aria-label="Tài khoản"
          aria-haspopup="menu" aria-expanded={accountOpen} aria-controls="account-menu"
          onClick={() => { initialItem.current = 0; setLogoutError(''); setAccountOpen(!accountOpen); }} onKeyDown={triggerKey}
        ><Icon name="user" /><span className="hact-txt">Tài khoản</span></button>
        {accountOpen && (
          <div className="account-menu" id="account-menu" role="menu" aria-label="Tài khoản">
            {user && <span className="account-menu-name" role="presentation">{user.name}</span>}
            {accountItems.map(({ label, to, logout: logoutItem }, index) => {
              const itemProps = {
                role: 'menuitem',
                tabIndex: -1,
                ref: (element) => { menuItems.current[index] = element; },
                onKeyDown: (event) => menuKey(event, index),
              };
              return to ? (
                <Link key={label} {...itemProps} to={to} onClick={() => setAccountOpen(false)}>{label}</Link>
              ) : (
                <button
                  key={label} {...itemProps} type="button"
                  aria-disabled={logoutItem && loggingOut ? true : undefined}
                  onClick={logoutItem ? signOut : () => showPending(label, accountTrigger.current)}
                >{logoutItem && loggingOut ? 'Đang đăng xuất…' : label}</button>
              );
            })}
            {logoutError && <span className="account-menu-error" role="alert">{logoutError}</span>}
          </div>
        )}
      </div>
      <button className="hact" type="button" aria-label="Yêu thích" onClick={(event) => showPending('Yêu thích', event.currentTarget)}><Icon name="heart" /><span className="hact-txt">Yêu thích</span></button>
      <button className="hact cart" type="button" aria-label="Giỏ hàng" onClick={(event) => showPending('Giỏ hàng', event.currentTarget)}><Icon name="cart" /><span className="hact-txt">Giỏ hàng</span></button>
      <dialog
        ref={pendingDialog} className="feature-pending" aria-labelledby="feature-pending-title" aria-describedby="feature-pending-description"
        onCancel={() => setPendingFeature('')} onClose={() => setPendingFeature('')}
        onClick={(event) => { if (event.target === event.currentTarget) setPendingFeature(''); }}
      >
        <div className="feature-pending-content">
          <span className="feature-pending-icon"><Icon name="grid" /></span>
          <h2 id="feature-pending-title">Tính năng đang được phát triển</h2>
          <p id="feature-pending-description">{pendingFeature} hiện chưa sẵn sàng. Bạn vẫn có thể tiếp tục khám phá sản phẩm tại ShopHub.</p>
          <button autoFocus className="btn-bz" type="button" onClick={() => setPendingFeature('')}>Tiếp tục xem sản phẩm</button>
        </div>
      </dialog>
    </div>
  );
}
