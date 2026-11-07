import { useCallback, useRef, useState } from 'react';
import useCatalog from '../../hooks/useCatalog';
import { getProductDetail, isDemoCatalog } from '../../services/catalogService';
import { Link, useOutletContext, useParams } from 'react-router-dom';
import CatalogStatus from '../../components/CatalogStatus';
import ProductMedia from '../../components/ProductMedia';
import ProductSection from '../../components/ProductSection';
import Icon from '../../components/Icon';
import NotFoundPage from './NotFoundPage';
import { categoryUrl, formatPrice, getDiscount } from '../../utils/catalog';

const tabs = [['description', 'Mô tả sản phẩm'], ['specs', 'Thông số kỹ thuật'], ['warranty', 'Bảo hành & lưu ý'], ['reviews', 'Đánh giá']];

function DetailContent({ product, category, related }) {
  const variants = product.variants.filter((item) => item.is_active);
  const [sku, setSku] = useState(variants[0]?.sku);
  const [imageIndex, setImageIndex] = useState(0);
  const [tab, setTab] = useState('description');
  const tabRefs = useRef([]);
  const variant = variants.find((item) => item.sku === sku) || variants[0];
  const image = product.images[imageIndex];
  if (!variant) return <NotFoundPage product />;
  const discount = getDiscount(variant);
  const warrantyLabel = product.warranty_months == null ? 'Chưa có thông tin' : `${product.warranty_months} tháng`;
  function tabKey(event, index) {
    let next;
    if (event.key === 'ArrowRight') next = (index + 1) % tabs.length;
    if (event.key === 'ArrowLeft') next = (index + tabs.length - 1) % tabs.length;
    if (event.key === 'Home') next = 0;
    if (event.key === 'End') next = tabs.length - 1;
    if (next === undefined) return;
    event.preventDefault();
    setTab(tabs[next][0]);
    tabRefs.current[next]?.focus();
  }
  function showSpecs() {
    setTab('specs');
    document.getElementById('product-tabs').scrollIntoView({ behavior: 'instant', block: 'start' });
    tabRefs.current[1]?.focus({ preventScroll: true });
  }
  return (
    <>
      <div className="wrap detail-page">
        <nav className="breadcrumb-bz" aria-label="Đường dẫn">
          <Link to="/">Trang chủ</Link><Icon name="chevron" /><Link to={categoryUrl(category.slug)}>{category.name}</Link><Icon name="chevron" /><span className="cur" aria-current="page">{product.brand.name} / Chi tiết sản phẩm</span>
        </nav>
        <section className="pdp-grid" aria-label="Chi tiết sản phẩm">
          <div className="pdp-gallery">
            <div className="gallery-main">
              {discount > 0 && <span className="tag tag-red gm-badge">−{discount}%{isDemoCatalog ? ' · Giá demo' : ''}</span>}
              <ProductMedia key={`${product.slug}-${imageIndex}`} product={product} image={image} view={image.view} label={image.alt} />
            </div>
            <div className="gallery-thumbs" role="group" aria-label="Bộ ảnh sản phẩm">
              {product.images.map((item, index) => (
                <button key={item.id} type="button" aria-label={`Xem hình ${index + 1}`} aria-current={index === imageIndex ? 'true' : 'false'} aria-pressed={index === imageIndex} onClick={() => setImageIndex(index)}>
                  <ProductMedia product={product} image={item} view={item.view} label={item.alt} showCaption={false} />
                </button>
              ))}
            </div>
            <p className="gallery-caption">{imageIndex + 1} / {product.images.length} · {isDemoCatalog ? 'Ảnh tham khảo dòng máy hoặc hình minh họa.' : 'Ảnh sản phẩm; sử dụng placeholder khi ảnh chưa có hoặc không tải được.'}</p>
          </div>
          <div className="pdp-info">
            <span className="pdp-cat">{category.name} · {product.brand.name}</span>
            <h1>{product.name}</h1>
            <div className="variant-summary" aria-live="polite" aria-atomic="true">
              <div className="pdp-meta">
                <span className="sku">SKU: <strong>{variant.sku}</strong></span>
                <span className={`instock stock-label ${variant.stock_quantity > 0 ? '' : 'sold-out'}`}><Icon name={variant.stock_quantity > 0 ? 'check' : 'close'} />{variant.stock_quantity > 0 ? `Còn hàng (${variant.stock_quantity})` : 'Tạm hết hàng'}</span>
              </div>
              <div className="pdp-price"><span className="now">{formatPrice(variant.sale_price)}</span>{discount > 0 && <><s>{formatPrice(variant.list_price)}</s><span className="tag tag-red save">Tiết kiệm {formatPrice(variant.list_price - variant.sale_price)}</span></>}</div>
              <p className="pdp-installment">Giá VND{isDemoCatalog ? ' trong dữ liệu demo' : ''} · Phiên bản <b>{variant.name}</b></p>
            </div>
            <p className="pdp-lead">{product.short_description}</p>
            {variants.length > 1 && (
              <fieldset className="variant-group"><legend className="vg-label">Màu sắc: <span>{variant.name}</span></legend><div className="swatches">
                {variants.map((item) => <button key={item.sku} type="button" className="swatch" style={{ backgroundColor: item.color }} aria-label={`Màu ${item.name}${item.stock_quantity ? '' : ', hết hàng'}`} aria-pressed={item.sku === sku} onClick={() => setSku(item.sku)} />)}
              </div></fieldset>
            )}
            <fieldset className="variant-group">
              <legend className="vg-label">Chọn phiên bản: <span>{variant.name}</span></legend>
              <div className="opt-btns">{variants.map((item) => <button key={item.sku} className="opt-btn" type="button" aria-pressed={item.sku === sku} onClick={() => setSku(item.sku)}>{item.name}{item.stock_quantity === 0 && <small> — Hết hàng</small>}</button>)}</div>
            </fieldset>
            <div className="buy-row">
              <Link className="btn-bz" to={categoryUrl(category.slug)}><Icon name="grid" />Xem cùng danh mục</Link>
              <button type="button" className="btn-bz btn-gold" onClick={showSpecs}>Xem thông số<Icon name="arrow" /></button>
            </div>
            <p className="browse-note">Bản xem trước catalog. Chức năng đặt hàng chưa được triển khai.</p>
            <div className="pdp-assure">
              <div className="pa"><Icon name="shield" /><span><b>Bảo hành</b>{warrantyLabel}</span></div>
              <div className="pa"><Icon name="check" /><span><b>Giá theo phiên bản</b>SKU và giá cập nhật khi chọn</span></div>
              <div className="pa"><Icon name="chip" /><span><b>Thông số sản phẩm</b>{product.specs.length ? 'Xem chi tiết trong tab thông số' : 'Đang cập nhật'}</span></div>
              <div className="pa"><Icon name="home" /><span><b>Khám phá tự do</b>Chưa mở bán và thanh toán</span></div>
            </div>
          </div>
        </section>
        <section className="pdp-tabs" id="product-tabs" aria-label="Thông tin chi tiết sản phẩm">
          <div className="tab-nav" role="tablist" aria-label="Nội dung sản phẩm">
            {tabs.map(([id, name], index) => <button key={id} ref={(element) => { tabRefs.current[index] = element; }} id={`tab-${id}`} type="button" role="tab" aria-controls={`panel-${id}`} aria-selected={tab === id} tabIndex={tab === id ? 0 : -1} onClick={() => setTab(id)} onKeyDown={(event) => tabKey(event, index)}>{name}</button>)}
          </div>
          <div className={`tab-panel ${tab === 'description' ? 'active' : ''}`} id="panel-description" role="tabpanel" aria-labelledby="tab-description" hidden={tab !== 'description'} tabIndex={0}>
            <h2>Thiết bị cho công việc và cuộc sống</h2><p>{product.description}</p>
            <ul className="feat-list">{product.specs.slice(0, 4).map(([label, value]) => <li key={label}><Icon name="check" /><span><strong>{label}:</strong> {value}</span></li>)}</ul>
          </div>
          <div className={`tab-panel ${tab === 'specs' ? 'active' : ''}`} id="panel-specs" role="tabpanel" aria-labelledby="tab-specs" hidden={tab !== 'specs'} tabIndex={0}>
            <h2>Thông số kỹ thuật</h2>
            {product.specs.length ? <table className="spec-table"><tbody>{product.specs.map(([label, value]) => <tr key={label}><th scope="row">{label}</th><td>{value}</td></tr>)}</tbody></table> : <p role="status">Thông số kỹ thuật đang được cập nhật.</p>}
          </div>
          <div className={`tab-panel ${tab === 'warranty' ? 'active' : ''}`} id="panel-warranty" role="tabpanel" aria-labelledby="tab-warranty" hidden={tab !== 'warranty'} tabIndex={0}>
            <h2>Bảo hành & lưu ý</h2><p>Thời hạn bảo hành: <strong>{warrantyLabel}</strong>.</p>{isDemoCatalog && <p>Giá, tồn kho và cấu hình của bản demo dùng để kiểm tra giao diện.</p>}<p>ShopHub hiện phục vụ duyệt catalog; chưa tiếp nhận đơn hàng, thanh toán hay yêu cầu bảo hành.</p>
          </div>
          <div className={`tab-panel ${tab === 'reviews' ? 'active' : ''}`} id="panel-reviews" role="tabpanel" aria-labelledby="tab-reviews" hidden={tab !== 'reviews'} tabIndex={0}>
            <h2>Đánh giá sản phẩm</h2><p>Chưa có dữ liệu đánh giá sản phẩm.</p>
          </div>
        </section>
      </div>
      <ProductSection title="Cùng danh mục" products={related} to={categoryUrl(category.slug)} />
    </>
  );
}

export default function ProductDetailPage() {
  const { slug } = useParams();
  const catalog = useOutletContext();
  const loader = useCallback((options) => getProductDetail(slug, options), [slug]);
  const detail = useCatalog(catalog.data ? loader : null);
  if (!catalog.data) return <CatalogStatus {...catalog} />;
  if (detail.status === 404) return <NotFoundPage product />;
  if (!detail.data) return <CatalogStatus {...detail} />;
  const { product, related } = detail.data;
  return <DetailContent key={product.slug} product={product} category={product.category} related={related} />;
}
