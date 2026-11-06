import { Link } from 'react-router-dom';

export default function NotFoundPage({ product = false }) {
  return <div className="state-panel"><span className="eyebrow">404 / SHOPHUB</span><h1>{product ? 'Không tìm thấy sản phẩm' : 'Trang này chưa có'}</h1><p>{product ? 'Sản phẩm không tồn tại hoặc chưa được công khai.' : 'Đường dẫn bạn vừa mở không có trong ShopHub.'}</p><Link className="btn-bz" to="/products">Khám phá sản phẩm</Link></div>;
}
