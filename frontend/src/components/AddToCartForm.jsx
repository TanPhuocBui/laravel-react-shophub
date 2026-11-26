import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAccount } from '../contexts/useAccount';
import { isDemoCatalog } from '../services/catalogService';
import { addCartItem, cartError, getCartSummary } from '../services/customerCartService';
import { clearPendingCart, MAX_CART_QUANTITY, positiveInteger, readPendingCart, rememberPendingCart } from '../utils/cart';
import Icon from './Icon';
import '../styles/cart.css';

export default function AddToCartForm(props) {
  const account = useAccount();
  const [quantity, setQuantity] = useState(String(props.initialQuantity ?? 1));
  return <CartEditor key={`${account.user?.id || 'guest'}:${props.variant.id}`} {...props} account={account} quantity={quantity} setQuantity={setQuantity} />;
}

function CartEditor({ product, variant, quantity, setQuantity, selectionRequired, onLockChange, onStockChange, onReload, account }) {
  const { user, checking, unavailable, retry, invalidate, authIssue } = account;
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(() => isDemoCatalog ? null : readPendingCart(user?.id));
  const [message, setMessage] = useState('');
  const [notice, setNotice] = useState('');
  const [errors, setErrors] = useState({});
  const [unavailableSku, setUnavailableSku] = useState(false);
  const active = useRef(false);
  const writing = useRef(false);
  const controller = useRef(null);
  const input = useRef(null);
  const focusAfterRequest = useRef(null);
  const isCustomer = user?.role === 'customer' && user.is_active;
  const locked = busy || Boolean(pending);

  useEffect(() => {
    active.current = true;
    return () => { active.current = false; controller.current?.abort(); };
  }, []);
  useEffect(() => {
    onLockChange(locked);
    return () => onLockChange(false);
  }, [locked, onLockChange]);
  useEffect(() => {
    if (!busy && focusAfterRequest.current) {
      const target = focusAfterRequest.current === 'quantity' ? input.current
        : input.current?.closest('.pdp-info')?.querySelector('.opt-btn[aria-pressed="true"]');
      target?.focus();
      focusAfterRequest.current = null;
    }
  }, [busy, errors, message]);

  function loginContext(amount) {
    navigate('/login', { state: { cartReturn: { slug: product.slug, variantId: variant.id, quantity: amount } } });
  }

  function handleError(error) {
    const status = error.response?.status;
    if (status === 401 || status === 403) invalidate(status);
    setMessage(cartError(error));
    const fields = Object.fromEntries(Object.entries(error.response?.data?.errors || {}).map(([field, values]) => [field, values[0]]));
    setErrors(fields);
    if (fields.quantity || fields.product_variant_id) focusAfterRequest.current = fields.quantity ? 'quantity' : 'variant';
    if (status === 404 || error.response?.data?.code === 'INVALID_VARIANT_PRICE') setUnavailableSku(true);
    const context = error.response?.data?.context;
    if (status === 409 && error.response?.data?.code === 'INSUFFICIENT_STOCK' && context?.product_variant_id === variant.id) {
      if (Number.isSafeInteger(context.stock_quantity) && context.stock_quantity >= 0) onStockChange(variant.id, context.stock_quantity);
      setMessage(`Tồn hiện tại: ${context.stock_quantity}. Giỏ của bạn đang có ${context.cart_quantity} sản phẩm của phiên bản này. Hãy điều chỉnh số lượng cần thêm.`);
      focusAfterRequest.current = 'quantity';
    }
  }

  async function submit(event) {
    event.preventDefault();
    if (writing.current || pending || checking || unavailable || isDemoCatalog || selectionRequired || unavailableSku || variant.stock_quantity < 1) return;
    setMessage(''); setNotice(''); setErrors({});
    const amount = positiveInteger(quantity, MAX_CART_QUANTITY);
    if (!amount || amount > variant.stock_quantity) {
      setErrors({ quantity: `Nhập số nguyên từ 1 đến ${Math.min(variant.stock_quantity, MAX_CART_QUANTITY)}.` });
      input.current?.focus(); return;
    }
    if (!user) { loginContext(amount); return; }
    if (!isCustomer) return;
    // Ref is set before the first await, including the CSRF request.
    writing.current = true; setBusy(true);
    const operation = { attempt: crypto.randomUUID(), slug: product.slug, variantId: variant.id, quantity: amount, label: `${product.name.slice(0, 160)} — ${variant.name.slice(0, 80)}` };
    const abort = new AbortController(); controller.current = abort;
    try {
      const result = await addCartItem({ product_variant_id: variant.id, quantity: amount }, {
        signal: abort.signal,
        beforeSend: () => {
          if (!active.current || abort.signal.aborted) throw new Error('Thao tác đã dừng trước khi gửi.');
          rememberPendingCart(user.id, operation);
        },
      });
      clearPendingCart(user.id, operation.attempt);
      if (active.current) setNotice(`Đã thêm phiên bản ${variant.name}. Hiện có ${result.item.quantity} sản phẩm của phiên bản này trong giỏ.`);
    } catch (error) {
      if (error.writeOutcomeUnknown) {
        if (active.current) {
          setPending(operation);
          setMessage('Chưa rõ máy chủ đã lưu hay chưa. Hãy kiểm tra giỏ đã lưu trước khi thêm tiếp.');
        }
      } else {
        clearPendingCart(user.id, operation.attempt);
        if (active.current) handleError(error);
      }
    } finally {
      writing.current = false;
      if (active.current) setBusy(false);
    }
  }

  async function checkResult() {
    if (writing.current || !pending || !isCustomer || checking || unavailable) return;
    writing.current = true; setBusy(true); setMessage(''); setErrors({});
    const abort = new AbortController(); controller.current = abort;
    try {
      const result = await getCartSummary(pending.variantId, abort.signal);
      if (!active.current) return;
      clearPendingCart(user.id, pending.attempt);
      setNotice(`Đã kiểm tra phiên bản ${pending.label}: hiện có ${result.selected_item?.quantity || 0} sản phẩm trong giỏ. Bạn có thể đối chiếu rồi quyết định thêm tiếp.`);
      setPending(null);
    } catch (error) {
      if (active.current) handleError(error);
    } finally {
      writing.current = false;
      if (active.current) setBusy(false);
    }
  }

  const permission = !user && authIssue ? authIssue === 401
    ? 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để thêm vào giỏ.'
    : 'Tài khoản không đủ quyền sử dụng giỏ hoặc đã bị khóa. Vui lòng kiểm tra lại tài khoản.' : '';
  return <section className="cart-add" aria-label="Thêm sản phẩm vào giỏ hàng">
    {isDemoCatalog ? <p className="cart-help" role="status">Dữ liệu demo chỉ để xem giao diện. Tính năng thêm vào giỏ chưa khả dụng trong chế độ này.</p>
      : <>
        {permission && <p className="cart-feedback cart-error" role="alert">{permission}</p>}
        {checking && <p className="cart-help" role="status">Đang kiểm tra phiên đăng nhập…</p>}
        {unavailable && <div className="cart-feedback cart-error" role="alert">Chưa tải được thông tin tài khoản. <button type="button" onClick={retry}>Kiểm tra lại tài khoản</button></div>}
        {user && !isCustomer && <p className="cart-help" role="status">Giỏ hàng dành cho tài khoản khách hàng đang hoạt động.</p>}
        {pending && isCustomer && <div className="cart-reconcile" role="status">
          <p>Lần thêm phiên bản <strong>{pending.label}</strong> cần được đối chiếu. Số lượng yêu cầu: {pending.quantity}.</p>
          <button type="button" className="btn-bz btn-outline" data-testid="cart-check-result" disabled={busy || checking || unavailable} onClick={checkResult}>{busy ? 'Đang kiểm tra…' : 'Kiểm tra giỏ đã lưu'}</button>
        </div>}
        {message && <p className="cart-feedback cart-error" role="alert">{message}</p>}
        {notice && <p className="cart-feedback cart-success" role="status" data-testid="cart-success">{notice}</p>}
        <form onSubmit={submit} noValidate aria-busy={busy} aria-label="Thêm phiên bản đang chọn vào giỏ">
          <div className="cart-add-row">
            <div className="cart-quantity">
              <label htmlFor="cart-quantity">Số lượng cần thêm</label>
              <input ref={input} id="cart-quantity" name="quantity" type="number" min="1" max={Math.min(variant.stock_quantity || 1, MAX_CART_QUANTITY)} step="1" inputMode="numeric"
                value={quantity} onChange={(event) => { setQuantity(event.target.value); setErrors({}); }}
                disabled={locked || checking || unavailable || Boolean(user && !isCustomer)}
                aria-invalid={Boolean(errors.quantity)} aria-describedby={errors.quantity ? 'cart-quantity-error' : 'cart-quantity-help'} />
            </div>
            <button type="submit" className="btn-bz btn-gold cart-submit" data-testid="cart-add-submit"
              disabled={locked || checking || unavailable || Boolean(user && !isCustomer) || selectionRequired || unavailableSku || variant.stock_quantity < 1}>
              <Icon name="cart" />{busy ? 'Đang xử lý…' : variant.stock_quantity < 1 ? 'Tạm hết hàng' : !user ? 'Đăng nhập để thêm vào giỏ' : 'Thêm vào giỏ hàng'}
            </button>
          </div>
          {errors.quantity && <p id="cart-quantity-error" className="cart-field-error" role="alert">{errors.quantity}</p>}
          {errors.product_variant_id && <p className="cart-field-error" role="alert">{errors.product_variant_id}</p>}
          <p id="cart-quantity-help" className="cart-help">Thêm giỏ chưa giữ hàng hoặc khóa giá. Giá và tồn được kiểm tra lại khi đặt hàng.</p>
        </form>
        {unavailableSku && <button type="button" className="cart-reload" onClick={onReload} disabled={busy}>Tải lại sản phẩm</button>}
      </>}
  </section>;
}
