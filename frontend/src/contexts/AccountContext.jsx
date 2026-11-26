import { useEffect, useRef, useState } from 'react';
import { AccountContext } from './useAccount';
import { getAccount, loginAccount, logoutAccount } from '../services/accountService';

export function AccountProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [authIssue, setAuthIssue] = useState(null);
  const generation = useRef(0);

  useEffect(() => {
    const controller = new AbortController();
    const current = generation.current;
    getAccount(controller.signal)
      .then((account) => {
        if (!controller.signal.aborted && current === generation.current) { setUser(account); setAuthIssue(null); }
      })
      .catch((error) => {
        const status = error.response?.status;
        if (!controller.signal.aborted && current === generation.current) {
          if (status === 401 || status === 403) { setUser(null); if (status === 403) setAuthIssue(403); }
          else setUnavailable(true);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted && current === generation.current) setChecking(false);
      });
    return () => controller.abort();
  }, [attempt]);

  function retry() {
    generation.current++;
    setChecking(true);
    setUnavailable(false);
    setAttempt((current) => current + 1);
  }

  async function login(fields) {
    const account = await loginAccount(fields);
    generation.current++;
    setUser(account);
    setChecking(false);
    setAuthIssue(null);
    setUnavailable(false);
  }

  async function logout() {
    await logoutAccount();
    generation.current++;
    setUser(null);
    setChecking(false);
    setUnavailable(false);
    setAuthIssue(null);
  }

  function invalidate(status) {
    generation.current++;
    setUser(null);
    setChecking(false);
    setUnavailable(false);
    setAuthIssue(status);
  }

  return (
    <AccountContext.Provider value={{ user, checking, unavailable, authIssue, retry, login, logout, invalidate }}>
      {children}
    </AccountContext.Provider>
  );
}
