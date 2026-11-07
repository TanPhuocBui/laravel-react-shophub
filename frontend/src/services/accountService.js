import api from '../api/axios';

export async function getAccount(signal) {
  const response = await api.get('/api/user', { signal });
  return response.data;
}

export async function registerAccount(fields) {
  await api.get('/sanctum/csrf-cookie');
  await api.post('/register', fields);
}

export async function loginAccount(fields) {
  await api.get('/sanctum/csrf-cookie');
  const response = await api.post('/login', fields);
  return response.data;
}

export async function logoutAccount() {
  await api.get('/sanctum/csrf-cookie');
  await api.post('/logout');
}
