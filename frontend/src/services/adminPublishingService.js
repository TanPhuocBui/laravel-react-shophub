import api from '../api/axios';
import writeWithCsrf from '../api/writeWithCsrf';

export async function loadPublishing(path, signal) {
  return (await api.get('/api/admin/' + path, { signal })).data.data;
}
export function changePublishing(path, body, method = 'put') {
  return writeWithCsrf(async () => (await api[method]('/api/admin/' + path, body)).data);
}
