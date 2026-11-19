import { useState } from 'react';
import { Link, Navigate, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import Icon from '../../components/Icon';
import AccountField from '../../components/account/AccountField';
import CustomerAddressBook from '../customer/CustomerAddressBook';
import { useAccount } from '../../contexts/useAccount';
import { registerAccount } from '../../services/accountService';
import { cartReturnPath } from '../../utils/cart';
import '../../styles/account-orbit.css';

function AccountLayout({ children, wide = false }) {
  return (
    <section className="account-orbit">
      <div className={'orbit-grid wrap' + (wide ? ' orbit-grid-wide' : '')}>
        <div className="orbit-story" aria-hidden="true">
          <svg viewBox="0 0 550 480" className="orbit-graphic" focusable="false">
            <defs>
              <radialGradient id="orbit-glow" cx=".45" cy=".4" r=".65">
                <stop stopColor="#263b68" />
                <stop offset="1" stopColor="#101a30" />
              </radialGradient>
            </defs>
            <circle cx="265" cy="246" r="176" fill="url(#orbit-glow)" />
            <g fill="none" stroke="#b9caff" strokeOpacity=".34">
              <circle cx="265" cy="246" r="190" strokeDasharray="2 7" />
              <ellipse cx="265" cy="246" rx="244" ry="114" transform="rotate(22 265 246)" />
              <ellipse cx="265" cy="246" rx="232" ry="130" transform="rotate(-22 265 246)" />
              <ellipse cx="265" cy="246" rx="160" ry="225" transform="rotate(22 265 246)" />
            </g>
            <circle cx="171" cy="76" r="4" fill="#ffce67" />
            <circle cx="476" cy="178" r="6" fill="#ffce67" />
            <circle cx="69" cy="308" r="3" fill="#a9bded" />
            <circle cx="346" cy="405" r="4" fill="#ffce67" />
          </svg>
          <div className="orbit-story-copy">
            <span className="orbit-kicker"><Icon name="bag" /> SHOP<span>HUB</span> / TÀI KHOẢN</span>
            <p className="orbit-headline">Công nghệ hay.<br />Mua sắm dễ.</p>
            <p className="orbit-caption">Laptop, linh kiện và đồ gia dụng<br />cho công việc và cuộc sống.</p>
          </div>
        </div>
        <div className="orbit-card">{children}</div>
      </div>
    </section>
  );
}

export function AccountAuthPage({ register = false }) {
  const { user, checking, login } = useAccount();
  const navigate = useNavigate();
  const location = useLocation();
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState('');
  const returnPath = cartReturnPath(location.state?.cartReturn);
  const returnState = returnPath ? { cartReturn: location.state.cartReturn } : undefined;

  if (user) return <Navigate replace to={returnPath || '/account'} />;

  async function submit(event) {
    event.preventDefault();
    if (busy || checking) return;
    const fields = Object.fromEntries(new FormData(event.currentTarget));
    setErrors({});
    setMessage('');

    if (register && fields.password !== fields.password_confirmation) {
      setErrors({ password_confirmation: 'Mật khẩu xác nhận không khớp.' });
      return;
    }

    setBusy(true);
    try {
      if (register) {
        await registerAccount(fields);
        navigate('/login', { replace: true, state: { ...returnState, registered: true, email: fields.email.trim() } });
      } else {
        await login(fields);
        navigate(returnPath || '/account', { replace: true });
      }
    } catch (error) {
      const { status, data } = error.response ?? {};
      if (status === 422 && data?.errors) {
        setErrors(Object.fromEntries(Object.entries(data.errors).map(([field, messages]) => [field, messages[0]])));
        setMessage('Vui lòng kiểm tra thông tin bên dưới.');
      } else if (status === 429) {
        setMessage('Bạn đã thử quá nhiều lần. Vui lòng thử lại sau.');
      } else if (status === 419) {
        setMessage('Phiên xác thực đã hết hạn. Vui lòng gửi lại biểu mẫu.');
      } else {
        setMessage('Chưa thể kết nối với ShopHub. Vui lòng thử lại.');
      }
    } finally {
      setBusy(false);
    }
  }

  const title = register ? 'Tạo tài khoản' : 'Chào mừng bạn trở lại';

  return (
    <AccountLayout>
      <span className="orbit-card-kicker">TÀI KHOẢN SHOPHUB</span>
      <h1>{title}</h1>
      <p className="orbit-intro">{register ? 'Tạo tài khoản để bắt đầu mua sắm tại ShopHub.' : 'Đăng nhập để tiếp tục mua sắm tại ShopHub.'}</p>
      {!register && location.state?.registered && (
        <p className="orbit-notice" role="status">Đăng ký thành công. Bạn có thể đăng nhập ngay.</p>
      )}
      <form className="orbit-form" onSubmit={submit} aria-busy={busy}>
        {message && <p className="orbit-notice orbit-error" role="alert">{message}</p>}
        {register && <AccountField name="name" label="Họ và tên" autoComplete="name" maxLength={255} error={errors.name} />}
        <AccountField
          name="email" label="Email" type="email" autoComplete="email" maxLength={255}
          defaultValue={register ? undefined : location.state?.email} error={errors.email}
        />
        <AccountField
          name="password" label="Mật khẩu" type="password" togglePassword
          autoComplete={register ? 'new-password' : 'current-password'}
          minLength={register ? 8 : undefined} maxLength={72} error={errors.password}
        />
        {register && (
          <AccountField
            name="password_confirmation" label="Xác nhận mật khẩu" type="password" togglePassword
            autoComplete="new-password" maxLength={72} error={errors.password_confirmation}
          />
        )}
        <button className="orbit-submit" type="submit" disabled={busy || checking}>
          {busy || checking ? 'Đang xử lý…' : register ? 'Đăng ký' : 'Đăng nhập'}
          <Icon name="arrow" />
        </button>
      </form>
      <p className="orbit-switch">
        {register ? 'Bạn đã có tài khoản?' : 'Bạn chưa có tài khoản?'}{' '}
        <Link to={register ? '/login' : '/register'} state={returnState}>{register ? 'Đăng nhập' : 'Đăng ký'}</Link>
      </p>
    </AccountLayout>
  );
}

export function AccountProfilePage() {
  const [params, setParams] = useSearchParams();
  const { user, checking, unavailable, retry } = useAccount();

  const addresses = user?.role === 'customer' && params.get('view') === 'addresses';
  if (!checking && !unavailable && !user) return <Navigate replace to="/login" />;

  return (
    <AccountLayout wide={addresses}>
      <span className="orbit-card-kicker">TÀI KHOẢN SHOPHUB</span>
      <h1>Thông tin tài khoản</h1>
      {checking && <p className="orbit-intro" role="status">Đang kiểm tra phiên đăng nhập…</p>}
      {unavailable && (
        <>
          <p className="orbit-intro" role="alert">Chưa thể tải thông tin tài khoản.</p>
          <button className="orbit-submit" type="button" onClick={retry}>Thử lại</button>
        </>
      )}
      {user && !checking && !unavailable && (
        <>
          {user.role === 'customer' && <nav className="account-tabs" aria-label="Tài khoản"><button aria-current={!addresses ? 'page' : undefined} onClick={() => setParams({})}>Thông tin tài khoản</button><button aria-current={addresses ? 'page' : undefined} onClick={() => setParams({ view: 'addresses' })}>Địa chỉ giao hàng</button></nav>}
          {addresses ? <CustomerAddressBook key={user.id} /> : <><dl className="orbit-profile">
            <div><dt>Họ và tên</dt><dd>{user.name}</dd></div>
            <div><dt>Email</dt><dd>{user.email}</dd></div>
            <div><dt>Vai trò</dt><dd>{user.role === 'admin' ? 'Quản trị viên' : 'Khách hàng'}</dd></div>
          </dl>
          <Link className="orbit-submit" to="/products">Tiếp tục mua sắm <Icon name="arrow" /></Link></>}
        </>
      )}
    </AccountLayout>
  );
}
