import { useEffect, useState } from 'react';
import { checkConnection } from '../../services/connectionService';

export default function ConnectionPage() {
  const [outcome, setOutcome] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const loading = outcome?.attempt !== attempt;
  const result = loading ? null : outcome.result;
  const errorMessage = loading ? '' : outcome.error;

  useEffect(() => {
    const controller = new AbortController();
    checkConnection(controller.signal).then((data) => {
      if (!controller.signal.aborted) setOutcome({ attempt, result: data });
    }).catch((error) => {
      if (controller.signal.aborted) return;
      setOutcome({
        attempt,
        error: error.response
          ? `Backend trả về lỗi HTTP ${error.response.status}.`
          : 'Không kết nối được backend. Kiểm tra Laravel và cấu hình CORS.',
      });
    });
    return () => controller.abort();
  }, [attempt]);
  return (
    <section className="state-panel">
      <h1>Kết nối ShopHub</h1>
      {loading && <p role="status">Đang kiểm tra kết nối…</p>}
      {errorMessage && <p role="alert">{errorMessage}</p>}
      {result && <div role="status">
        <h2>Kết nối thành công</h2>
        <p>{result.message}</p>
        <p>Ứng dụng: {result.app} · Trạng thái: {result.status}</p>
      </div>}
      <button type="button" className="btn-bz" disabled={loading} onClick={() => setAttempt((value) => value + 1)}>
        Kiểm tra lại
      </button>
    </section>
  );
}
