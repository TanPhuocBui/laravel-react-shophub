import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL || 'http://localhost:8000',
  headers: {
    Accept: 'application/json',
  },
  withCredentials: true,
  // Safe reads do not need a CSRF header. Sending it cross-origin forces a
  // preflight for every new catalog URL and queues more work on artisan serve.
  withXSRFToken: (config) => !['get', 'head', 'options'].includes(config.method?.toLowerCase() || 'get'),
  timeout: 10000,
});

export default api;
