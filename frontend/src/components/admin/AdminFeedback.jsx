import { Link } from 'react-router-dom';
import Icon from '../Icon';

export function AdminFeedback({ loading, error, retry, children }) {
  if (loading) return <div className="admin-state admin-loading" role="status"><span className="admin-loading-dot" aria-hidden="true" /><p>Đang tải dữ liệu…</p></div>;
  if (error) return <div className="admin-state" role="alert">
    <Icon name="shield" /><h2>{error.status === 403 ? 'Không đủ quyền truy cập' : error.status === 401 ? 'Cần đăng nhập lại' : 'Chưa thể tải dữ liệu'}</h2>
    <p>{error.message}</p>
    {error.status === 401 ? <Link to="/login">Đăng nhập lại</Link> : retry && <button onClick={retry}>Thử lại</button>}
  </div>;
  return children;
}

export function AdminField({ name, label, errors, children, hint, ...props }) {
  const error = errors?.[name]?.[0];
  const shared = { id: `field-${name}`, name, ...props, 'aria-invalid': Boolean(error), 'aria-describedby': [hint ? `hint-${name}` : '', error ? `error-${name}` : ''].filter(Boolean).join(' ') || undefined };
  return <div className="admin-field">
    <label htmlFor={shared.id}>{label}</label>
    {children ? <select {...shared}>{children}</select> : <input {...shared} />}
    {hint && <p id={`hint-${name}`} className="admin-help">{hint}</p>}
    {error && <p id={`error-${name}`} className="admin-field-error">{error}</p>}
  </div>;
}
