import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000',
  headers: {
    Accept: 'application/json',
  },
  withCredentials: true,
  withXSRFToken: true,
  timeout: 10000,
});

export default api;
