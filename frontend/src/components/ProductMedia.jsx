import { useState } from 'react';
import DeviceIllustration from './DeviceIllustration';

// A reference photo never claims to depict the exact fictional UI SKU.
export const referencePhotos = {
  'laptop-asus-vivobook-15-demo': { src: '/images/catalog/asus-vivobook.jpg', label: 'ASUS Vivobook X556UQ — ảnh tham khảo dòng máy' },
};

export default function ProductMedia({ product, view = 'front', label, showCaption = true }) {
  const [failed, setFailed] = useState(false);
  const photo = referencePhotos[product.slug];
  // The alternate gallery view stays an explicit placeholder, never a fake photo angle.
  if (photo && view === 'front' && !failed) {
    return <><img className="product-photo" src={photo.src} alt={photo.label} onError={() => setFailed(true)} />{showCaption && <span className="media-caption">Ảnh tham khảo dòng máy</span>}</>;
  }
  return <div className="product-placeholder"><DeviceIllustration kind={product.kind} accent={product.accent} view={view} label={label || `${product.name} — hình minh họa`} />{showCaption && <span className="media-caption">Ảnh SKU đang cập nhật · Hình minh họa</span>}</div>;
}
