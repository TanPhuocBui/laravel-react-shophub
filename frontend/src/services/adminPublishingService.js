import api from '../api/axios';

export async function loadPublishing(path, signal) {
  return (await api.get('/api/admin/' + path, { signal })).data.data;
}
export async function changePublishing(path, body, method = 'put') {
  await api.get('/sanctum/csrf-cookie');
  return (await api[method]('/api/admin/' + path, body)).data;
}
