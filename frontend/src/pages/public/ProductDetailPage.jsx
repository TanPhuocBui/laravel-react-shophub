import { useRef, useState } from 'react';
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
              {discount > 0 && <span className="tag tag-red gm-badge">−{discount}% · Giá demo</span>}
              <ProductMedia key={`${product.slug}-${imageIndex}`} product={product} view={image.view} label={image.alt} />
            </div>
            <div className="gallery-thumbs" role="group" aria-label="Bộ ảnh sản phẩm">
              {product.images.map((item, index) => (
                <button key={item.id} type="button" aria-label={`Xem hình ${index + 1}`} aria-current={index === imageIndex ? 'true' : 'false'} aria-pressed={index === imageIndex} onClick={() => setImageIndex(index)}>
                  <ProductMedia product={product} view={item.view} label={item.alt} showCaption={false} />
                </button>
              ))}
            </div>
            <p className="gallery-caption">{imageIndex + 1} / {product.images.length} · Ảnh tham khảo dòng máy hoặc hình minh họa; chưa có ảnh đúng SKU demo.</p>
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
              <p className="pdp-installment">Giá VND trong dữ liệu demo · Phiên bản <b>{variant.name}</b></p>
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
              <div className="pa"><Icon name="shield" /><span><b>Bảo hành minh họa</b>{product.warranty_months} tháng (dữ liệu demo)</span></div>
              <div className="pa"><Icon name="check" /><span><b>Giá theo phiên bản</b>SKU và giá cập nhật khi chọn</span></div>
              <div className="pa"><Icon name="chip" /><span><b>Thông số rõ ràng</b>Cấu hình dùng để minh họa UI</span></div>
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
            <h2>Thông số kỹ thuật</h2><p>Thông số dưới đây là dữ liệu giả lập phục vụ giao diện.</p>
            <table className="spec-table"><tbody>{product.specs.map(([label, value]) => <tr key={label}><th scope="row">{label}</th><td>{value}</td></tr>)}<tr><th scope="row">Bảo hành</th><td>{product.warranty_months} tháng (demo)</td></tr></tbody></table>
          </div>
          <div className={`tab-panel ${tab === 'warranty' ? 'active' : ''}`} id="panel-warranty" role="tabpanel" aria-labelledby="tab-warranty" hidden={tab !== 'warranty'} tabIndex={0}>
            <h2>Bảo hành & lưu ý</h2><p>Bảo hành minh họa: <strong>{product.warranty_months} tháng</strong>. Đây chưa phải chính sách bán hàng thực tế.</p><p>Giá, tồn kho và cấu hình dùng để kiểm tra giao diện. Ảnh tham khảo có thể khác model, màu và cấu hình của SKU demo; ảnh còn thiếu được ghi rõ trên khung hình.</p><p>ShopHub hiện phục vụ duyệt catalog; chưa tiếp nhận đơn hàng, thanh toán hay yêu cầu bảo hành.</p>
          </div>
          <div className={`tab-panel ${tab === 'reviews' ? 'active' : ''}`} id="panel-reviews" role="tabpanel" aria-labelledby="tab-reviews" hidden={tab !== 'reviews'} tabIndex={0}>
            <h2>Đánh giá sản phẩm</h2><p>Catalog demo chưa cung cấp dữ liệu đánh giá. Điểm số và nhận xét mẫu của Bazaar không được dùng làm đánh giá thực tế cho sản phẩm này.</p>
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
  if (!catalog.data) return <CatalogStatus {...catalog} />;
  const product = catalog.data.products.find((item) => item.slug === slug);
  if (!product) return <NotFoundPage product />;
  const category = catalog.data.categories.find((item) => item.slug === product.category_slug);
  return <DetailContent key={product.slug} product={product} category={category} related={catalog.data.products.filter((item) => item.category_slug === product.category_slug && item.id !== product.id).slice(0, 5)} />;
}
