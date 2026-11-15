import api from '../api/axios';

export async function loadPublishing(path, signal) {
  return (await api.get('/api/admin/' + path, { signal })).data.data;
}
export async function changePublishing(path, body, method = 'put') {
  await api.get('/sanctum/csrf-cookie');
  try {
    return (await api[method]('/api/admin/' + path, body)).data;
  } catch (error) {
    // The server may already have committed a timed-out/disconnected request.
    // A CSRF bootstrap failure above happens before the write is attempted.
    error.writeOutcomeUnknown = !error.response || error.response.status >= 500;
    throw error;
  }
}
