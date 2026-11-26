import api from '../api/axios';
import writeWithCsrf from '../api/writeWithCsrf';

const path = '/api/customer/addresses';
export async function listAddresses(page = 1, signal) {
  return (await api.get(path, { params: { page }, signal })).data;
}
export function writeAddress(action, record, fields) {
  switch (action) {
    case 'create':
      return writeWithCsrf(async () => (await api.post(path, fields)).data.data);
    case 'update':
      return writeWithCsrf(async () => (await api.put(`${path}/${record.id}`, fields)).data.data);
    case 'default':
      return writeWithCsrf(async () => (await api.patch(`${path}/${record.id}/default`)).data.data);
    case 'delete':
      return writeWithCsrf(async () => { await api.delete(`${path}/${record.id}`); return null; });
    default:
      throw new Error('Thao tác địa chỉ không hợp lệ.');
  }
}
export function addressError(error) {
  const status = error.response?.status;
  if (status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  if (status === 403) return 'Sổ địa chỉ chỉ dành cho khách hàng đang hoạt động. Tài khoản có thể đã bị khóa.';
  if (status === 404) return 'Địa chỉ không còn tồn tại trong tài khoản của bạn. Hãy tải lại danh sách.';
  if (status === 419) return 'Phiên xác thực đã hết hạn. Vui lòng thử lại thao tác.';
  if (status === 422) return 'Vui lòng kiểm tra thông tin bên dưới.';
  return 'Chưa thể kết nối với ShopHub. Vui lòng thử lại.';
}
