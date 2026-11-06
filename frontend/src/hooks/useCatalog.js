import { useEffect, useState } from 'react';
import { getCatalog } from '../services/catalogService';

export default function useCatalog() {
  const [state, setState] = useState({ data: null, loading: true, error: '' });
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    let active = true;
    setState({ data: null, loading: true, error: '' });
    getCatalog().then((data) => {
      if (active) setState({ data, loading: false, error: '' });
    }).catch((error) => {
      if (active) setState({ data: null, loading: false, error: error.message });
    });
    return () => { active = false; };
  }, [attempt]);
  return { ...state, retry: () => setAttempt((value) => value + 1) };
}
