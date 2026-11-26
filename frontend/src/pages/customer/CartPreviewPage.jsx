import { useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Icon from '../../components/Icon';
import { products } from '../../data/demoCatalog';
import { formatPrice } from '../../utils/catalog';
import '../../styles/cart-preview.css';

const demoItems = [
  { sku: 'UI-ASUS-V15-BLACK', photo: 'asus-vivobook.jpg', quantity: 1 },
  { sku: 'UI-SH-K87-CREAM', photo: 'keyboard.jpg', quantity: 2 },
  { sku: 'UI-PHILIPS-KETTLE', photo: 'philips-kettle.jpg', quantity: 1 },
].map(({ sku, photo, quantity }) => {
  const product = products.find(({ variants }) => variants.some((variant) => variant.sku === sku));
  const variant = product.variants.find((entry) => entry.sku === sku);
  return { ...variant, variantName: variant.name, productName: product.name, slug: product.slug, photo, quantity };
});

const previews = {
  normal: 'Giỏ có sản phẩm',
  empty: 'Giỏ trống',
  loading: 'Đang tải',
  error: 'Lỗi tải',
  soldout: 'SKU hết hàng',
  overstock: 'Số lượng vượt tồn',
};

function getItems(preview) {
  if (preview === 'empty') return [];
  return demoItems.map((item, index) => {
    if (index !== 1) return item;
    if (preview === 'soldout') return { ...item, stock_quantity: 0 };
    if (preview === 'overstock') return { ...item, quantity: 3, stock_quantity: 1 };
    return item;
  });
}

function ContinueShopping() {
  return <Link to="/products" className="btn-bz cart-preview-continue">Tiếp tục mua sắm<Icon name="arrow" /></Link>;
}

function CartLine({ item, onQuantityChange, onRemove }) {
  const soldOut = item.stock_quantity === 0;
  const beyondStock = item.quantity > item.stock_quantity;
  const issue = soldOut ? 'Đã hết hàng' : beyondStock ? `Chỉ còn ${item.stock_quantity} sản phẩm. Vui lòng giảm số lượng.` : '';
  const issueId = `preview-stock-${item.sku}`;
  return (
    <li className="cart-preview-line" data-cart-line>
      <div className="cart-preview-product">
        <span className="cart-preview-photo">
          <img src={`/images/catalog/${item.photo}`} width="76" height="76" alt="" />
        </span>
        <div className="cart-preview-details">
          <Link className="cart-preview-name" to={`/products/${item.slug}`}>{item.productName}</Link>
          <span className="cart-preview-variant">{item.variantName} <span aria-hidden="true">·</span> {item.sku}</span>
          <button className="cart-preview-remove" type="button" aria-label={`Xóa ${item.productName} · ${item.variantName}`} onClick={onRemove}>Xóa</button>
        </div>
      </div>
      <div className="cart-preview-value cart-preview-unit"><span>Đơn giá</span><strong>{formatPrice(item.sale_price)}</strong></div>
      <div className="cart-preview-value cart-preview-quantity">
        <span>Số lượng</span>
        <div className="cart-preview-stepper" role="group" aria-label={`Số lượng ${item.productName} · ${item.variantName}`} aria-describedby={issue ? issueId : undefined}>
          <button type="button" aria-label="Giảm số lượng" disabled={soldOut || item.quantity <= 1} onClick={() => onQuantityChange(item.quantity - 1)}>−</button>
          <output aria-label="Số lượng hiện tại">{item.quantity}</output>
          <button type="button" aria-label="Tăng số lượng" disabled={beyondStock || item.quantity >= item.stock_quantity} onClick={() => onQuantityChange(item.quantity + 1)}>+</button>
        </div>
      </div>
      <div className="cart-preview-value cart-preview-line-total"><span>Thành tiền</span><strong>{formatPrice(item.sale_price * item.quantity)}</strong></div>
      {issue && <p id={issueId} className="cart-preview-stock" role="status">{issue}</p>}
    </li>
  );
}

function CartSummary({ items }) {
  const { quantity, subtotal } = items.reduce((summary, item) => ({
    quantity: summary.quantity + item.quantity,
    subtotal: summary.subtotal + item.quantity * item.sale_price,
  }), { quantity: 0, subtotal: 0 });
  return (
    <aside className="cart-preview-summary" aria-labelledby="cart-preview-summary">
      <h2 id="cart-preview-summary">Tóm tắt giỏ hàng</h2>
      <dl>
        <div><dt>Số lượng</dt><dd>{quantity} sản phẩm</dd></div>
        <div className="cart-preview-subtotal"><dt>Tạm tính</dt><dd>{formatPrice(subtotal)}</dd></div>
      </dl>
      <p>Chưa bao gồm phí giao hàng.</p>
      <ContinueShopping />
    </aside>
  );
}

function CartPreview({ initialPreview }) {
  const [preview, setPreview] = useState(initialPreview);
  const [items, setItems] = useState(() => getItems(initialPreview));
  const heading = useRef(null);

  function showPreview(nextPreview) {
    setPreview(nextPreview);
    setItems(getItems(nextPreview));
  }

  function removeItem(sku, event) {
    const row = event.currentTarget.closest('[data-cart-line]');
    const neighbor = row.nextElementSibling || row.previousElementSibling;
    (neighbor?.querySelector('.cart-preview-name') ?? heading.current)?.focus();
    setItems((current) => current.filter((item) => item.sku !== sku));
  }

  return (
    <section className="wrap cart-preview" aria-labelledby="cart-preview-heading">
      <nav className="cart-preview-crumb" aria-label="Đường dẫn trang">
        <Link to="/">Trang chủ</Link><Icon name="chevron" /><span aria-current="page">Giỏ hàng</span>
      </nav>
      <div className="cart-preview-heading">
        <h1 id="cart-preview-heading" tabIndex={-1} ref={heading}>Giỏ hàng</h1>
        <div className="cart-preview-switch">
          <label htmlFor="cart-preview-state">Xem trước · Dữ liệu mẫu</label>
          <select id="cart-preview-state" value={preview} onChange={(event) => showPreview(event.target.value)}>
            {Object.entries(previews).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
      </div>
      {preview === 'loading' ? (
        <div className="cart-preview-panel cart-preview-state" role="status">
          <span className="cart-preview-spinner" aria-hidden="true" />
          <h2>Đang tải giỏ hàng…</h2>
        </div>
      ) : preview === 'error' ? (
        <div className="cart-preview-panel cart-preview-state">
          <div role="alert"><h2>Chưa thể tải giỏ hàng</h2><p>Vui lòng kiểm tra kết nối và thử lại.</p></div>
          <button type="button" className="btn-bz" onClick={() => { heading.current?.focus(); showPreview('normal'); }}>Thử lại</button>
        </div>
      ) : items.length > 0 ? (
        <div className="cart-preview-grid">
          <section className="cart-preview-panel" aria-label="Sản phẩm trong giỏ">
            <div className="cart-preview-columns" aria-hidden="true"><span>Sản phẩm</span><span>Đơn giá</span><span>Số lượng</span><span>Thành tiền</span></div>
            <ul>{items.map((item) => (
              <CartLine key={item.sku} item={item}
                onQuantityChange={(quantity) => setItems((current) => current.map((entry) => entry.sku === item.sku ? { ...entry, quantity } : entry))}
                onRemove={(event) => removeItem(item.sku, event)} />
            ))}</ul>
          </section>
          <CartSummary items={items} />
        </div>
      ) : (
        <div className="cart-preview-panel cart-preview-state">
          <span className="cart-preview-empty-icon"><Icon name="cart" /></span>
          <h2>Giỏ hàng đang trống</h2>
          <p>Khám phá sản phẩm và thêm món bạn muốn mua vào giỏ.</p>
          <ContinueShopping />
        </div>
      )}
    </section>
  );
}

export default function CartPreviewPage() {
  const [params] = useSearchParams();
  const preview = params.get('state');
  const initialPreview = Object.hasOwn(previews, preview) ? preview : 'normal';
  return <CartPreview key={initialPreview} initialPreview={initialPreview} />;
}
