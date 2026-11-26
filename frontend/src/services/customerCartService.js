import api from '../api/axios';
import writeWithCsrf from '../api/writeWithCsrf';

export async function addCartItem(fields, { signal, beforeSend }) {
  return writeWithCsrf(async () => {
    const response = await api.post('/api/customer/cart/items', fields, { signal });
    const result = response.data?.data;
    if (!result?.item || result.item.product_variant_id !== fields.product_variant_id || !Number.isSafeInteger(result.item.quantity)) {
      throw new Error('Chưa đọc được kết quả đã lưu.');
    }
    return result;
  }, { signal, beforeSend });
}

export async function getCartSummary(variantId, signal) {
  const response = await api.get('/api/customer/cart/summary', { params: { product_variant_id: variantId }, signal });
  const result = response.data?.data;
  if (!Number.isSafeInteger(result?.total_quantity) || !Number.isSafeInteger(result?.item_count)
    || (result.selected_item && (result.selected_item.product_variant_id !== variantId || !Number.isSafeInteger(result.selected_item.quantity)))) {
    throw new Error('Chưa đọc được trạng thái giỏ hàng. Vui lòng thử kiểm tra lại.');
  }
  return result;
}

export function cartError(error) {
  const status = error.response?.status;
  if (error.cartLocalError) return error.message;
  if (status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  if (status === 403) return 'Tài khoản không đủ quyền sử dụng giỏ hàng hoặc đã bị khóa.';
  if (status === 404) return 'Phiên bản này không còn được bán. Hãy tải lại sản phẩm và chọn lại.';
  if (status === 409) return error.response.data?.message || 'Thông tin giỏ hàng đã thay đổi. Vui lòng kiểm tra lại.';
  if (status === 419) return 'Phiên xác thực đã hết hạn. Bạn có thể nhấn thêm lại để làm mới xác thực.';
  if (status === 422) return 'Vui lòng kiểm tra thông tin bên dưới.';
  if (error.beforeWriteFailure) return 'Chưa lấy được xác thực để gửi thao tác. Vui lòng thử lại; yêu cầu thêm giỏ chưa được gửi.';
  return 'Chưa thể kết nối hoặc đọc kết quả từ ShopHub. Vui lòng thử lại.';
}
