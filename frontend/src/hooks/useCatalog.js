import { useCallback, useContext, useEffect, useId, useState } from 'react';
import { getCatalog } from '../services/catalogService';
import { CatalogLoadContext } from '../contexts/CatalogLoadContext';

// Pass a stable loader (useCallback) to load metadata, a page, home strips or a slug.
export default function useCatalog(loader = getCatalog, { keepData = false, ignoreNotFound = false } = {}) {
  const [state, setState] = useState({ loader: null, attempt: -1, data: null, loading: true, error: '', status: null });
  const [attempt, setAttempt] = useState(0);
  const id = useId();
  const { report, remove } = useContext(CatalogLoadContext) || {};
  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  useEffect(() => {
    if (!loader) return;
    const controller = new AbortController();
    loader({ signal: controller.signal, force: attempt > 0 }).then((data) => {
      if (!controller.signal.aborted) setState({ loader, attempt, data, loading: false, error: '', status: null });
    }).catch((error) => {
      if (!controller.signal.aborted) setState({ loader, attempt, data: null, loading: false, error: error.message, status: error.status });
    });
    return () => controller.abort();
  }, [loader, attempt]);
  const current = state.loader === loader && state.attempt === attempt ? state : { data: keepData && state.loader === loader ? state.data : null, loading: true, error: '', status: null };
  const loading = !!loader && current.loading;
  const error = ignoreNotFound && current.status === 404 ? '' : current.error;
  useEffect(() => {
    report?.(id, { loading, error, retry });
  }, [report, id, loading, error, retry]);
  useEffect(() => () => remove?.(id), [remove, id]);
  return { ...current, retry };
}
