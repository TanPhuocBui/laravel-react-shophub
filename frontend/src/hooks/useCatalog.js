import { useEffect, useState } from 'react';
import { getCatalog } from '../services/catalogService';

// Pass a stable loader (useCallback) to load metadata, a page, home strips or a slug.
export default function useCatalog(loader = getCatalog) {
  const [state, setState] = useState({ loader: null, attempt: -1, data: null, loading: true, error: '', status: null });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!loader) return;
    const controller = new AbortController();
    loader({ signal: controller.signal }).then((data) => {
      if (!controller.signal.aborted) setState({ loader, attempt, data, loading: false, error: '', status: null });
    }).catch((error) => {
      if (!controller.signal.aborted) setState({ loader, attempt, data: null, loading: false, error: error.message, status: error.status });
    });
    return () => controller.abort();
  }, [loader, attempt]);
  const current = state.loader === loader && state.attempt === attempt ? state : { data: null, loading: true, error: '', status: null };
  return { ...current, retry: () => setAttempt((value) => value + 1) };
}
