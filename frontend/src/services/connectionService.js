import api from '../api/axios';

export async function checkConnection(signal) {
  const response = await api.get('/api/health', { signal });
  return response.data;
}
