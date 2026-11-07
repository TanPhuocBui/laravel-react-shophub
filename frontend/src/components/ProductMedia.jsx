import { useState } from 'react';
import DeviceIllustration from './DeviceIllustration';

// A reference photo never claims to depict the exact fictional UI SKU.
const referencePhotos = {
  'laptop-asus-vivobook-15-demo': { src: '/images/catalog/asus-vivobook.jpg', label: 'ASUS Vivobook X556UQ — ảnh tham khảo dòng máy' },
};

export default function ProductMedia({ product, image = product.images[0], view = 'front', label, showCaption = true }) {
  const [failed, setFailed] = useState(false);
  if (product.source === 'api') {
    if (image?.url && !failed) return <img className="product-photo" src={image.url} alt={image.alt || product.name} onError={() => setFailed(true)} />;
    return <div className="product-placeholder"><svg className="device-illustration" viewBox="0 0 320 250" role="img" aria-label={label || 'Chưa có ảnh sản phẩm'}><rect x="65" y="48" width="190" height="140" rx="12" fill="none" stroke="#b7c1cd" strokeWidth="4" /><circle cx="120" cy="91" r="16" fill="#cbd5e1" /><path d="m70 174 65-50 38 27 31-21 48 44" fill="none" stroke="#b7c1cd" strokeWidth="4" /></svg>{showCaption && <span className="media-caption">Ảnh sản phẩm đang cập nhật</span>}</div>;
  }
  const photo = referencePhotos[product.slug];
  // The alternate gallery view stays an explicit placeholder, never a fake photo angle.
  if (photo && view === 'front' && !failed) {
    return <><img className="product-photo" src={photo.src} alt={photo.label} onError={() => setFailed(true)} />{showCaption && <span className="media-caption">Ảnh tham khảo dòng máy</span>}</>;
  }
  return <div className="product-placeholder"><DeviceIllustration kind={product.kind} accent={product.accent} view={view} label={label || `${product.name} — hình minh họa`} />{showCaption && <span className="media-caption">Ảnh SKU đang cập nhật · Hình minh họa</span>}</div>;
}
