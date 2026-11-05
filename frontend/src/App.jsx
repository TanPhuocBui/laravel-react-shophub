import { useEffect, useState } from 'react';
import api from './api/axios';

function App() {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;

    async function checkConnection() {
      try {
        const response = await api.get('/api/health');

        if (active) {
          setResult(response.data);
        }
      } catch (err) {
        if (active) {
          setError(
            err.response
              ? `Backend trả về lỗi HTTP ${err.response.status}.`
              : 'Không kết nối được backend. Kiểm tra Laravel và cấu hình CORS.'
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    checkConnection();

    return () => {
      active = false;
    };
  }, []);

  return (
    <main>
      <h1>ShopHub</h1>
      <p>Website thương mại điện tử — Laravel + React</p>

      {loading && <p>Đang kiểm tra kết nối...</p>}

      {error && <p role="alert">{error}</p>}

      {result && (
        <section>
          <h2>Kết nối thành công</h2>
          <p>{result.message}</p>
          <p>Ứng dụng: {result.app}</p>
          <p>Trạng thái: {result.status}</p>
        </section>
      )}
    </main>
  );
}

export default App;