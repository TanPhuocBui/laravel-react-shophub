import { useEffect, useState } from 'react';
import api from '../../api/axios';

export default function ConnectionPage() {
  const [state, setState] = useState({ loading: true, result: null, error: '' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setState({ loading: true, result: null, error: '' });
    api.get('/api/health', { signal: controller.signal }).then(({ data }) => {
      setState({ loading: false, result: data, error: '' });
    }).catch((error) => {
      if (controller.signal.aborted) return;
      setState({ loading: false, result: null, error: error.response ? `Backend trả về lỗi HTTP ${error.response.status}.` : 'Không kết nối được backend. Kiểm tra Laravel và cấu hình CORS.' });
    });
    return () => controller.abort();
  }, [attempt]);
  return <section className="state-panel"><h1>Kết nối ShopHub</h1>{state.loading && <p role="status">Đang kiểm tra kết nối…</p>}{state.error && <p role="alert">{state.error}</p>}{state.result && <div role="status"><h2>Kết nối thành công</h2><p>{state.result.message}</p><p>Ứng dụng: {state.result.app} · Trạng thái: {state.result.status}</p></div>}<button className="btn-bz" disabled={state.loading} onClick={() => setAttempt((value) => value + 1)}>Kiểm tra lại</button></section>;
}
