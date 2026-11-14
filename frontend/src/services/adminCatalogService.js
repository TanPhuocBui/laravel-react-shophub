import api from '../api/axios';

const path = (kind) => `/api/admin/${kind}`;
export async function listAdminCatalog(kind, params, signal) {
  return (await api.get(path(kind), { params, signal })).data;
}
export async function getAdminCatalog(kind, id, signal) {
  return (await api.get(`${path(kind)}/${id}`, { signal })).data.data;
}
export async function getCategoryOptions(signal) {
  return (await api.get('/api/admin/categories/options', { signal })).data.data;
}
export async function saveAdminCatalog(kind, id, fields) {
  await api.get('/sanctum/csrf-cookie');
  const response = id
    ? await api.put(`${path(kind)}/${id}`, fields)
    : await api.post(path(kind), fields);
  return response.data.data;
}
export async function hideAdminCatalog(kind, id) {
  await api.get('/sanctum/csrf-cookie');
  return (await api.patch(`${path(kind)}/${id}/hide`)).data.data;
}

export function adminError(error) {
  const status = error.response?.status;
  if (status === 401) return 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
  if (status === 403) return 'Bạn không có quyền quản trị hoặc tài khoản đã bị khóa.';
  if (status === 404) return 'Không tìm thấy dữ liệu. Bản ghi có thể đã thay đổi.';
  if (status === 419) return 'Phiên xác thực đã hết hạn. Vui lòng thử gửi lại.';
  if (status === 422) return 'Vui lòng kiểm tra thông tin bên dưới.';
  return 'Không tải hoặc lưu được dữ liệu. Vui lòng thử lại.';
}
