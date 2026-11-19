export const MAX_CART_QUANTITY = 4294967295;

export function positiveInteger(value, max = Number.MAX_SAFE_INTEGER) {
  if (typeof value !== 'number' && typeof value !== 'string') return null;
  if (!/^[1-9][0-9]*$/.test(String(value))) return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number <= max ? number : null;
}

export function cartReturnPath(value) {
  if (!value || typeof value.slug !== 'string' || value.slug.length > 255 || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value.slug)) return null;
  const variant = positiveInteger(value.variantId);
  const quantity = positiveInteger(value.quantity, MAX_CART_QUANTITY);
  if (!variant || !quantity) return null;
  return `/products/${value.slug}?variant=${variant}&quantity=${quantity}`;
}

const pendingKey = (userId) => `shophub:cart-pending:v1:${import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000'}:${userId}`;

export function readPendingCart(userId) {
  if (!positiveInteger(userId)) return null;
  try {
    const value = JSON.parse(sessionStorage.getItem(pendingKey(userId)));
    if (!value || typeof value.attempt !== 'string' || !/^[a-f0-9-]{36}$/.test(value.attempt)
      || !cartReturnPath(value) || typeof value.label !== 'string' || value.label.length > 250) return null;
    return value;
  } catch { return null; }
}

export function rememberPendingCart(userId, value) {
  try { sessionStorage.setItem(pendingKey(userId), JSON.stringify(value)); }
  catch {
    const error = new Error('Chưa thể lưu trạng thái thao tác trong trình duyệt. Vui lòng kiểm tra cài đặt lưu trữ rồi thử lại.');
    error.cartLocalError = true;
    throw error;
  }
}

export function clearPendingCart(userId, attempt) {
  try {
    if (readPendingCart(userId)?.attempt === attempt) sessionStorage.removeItem(pendingKey(userId));
  } catch { /* Keep the marker if browser storage becomes unavailable. */ }
}
