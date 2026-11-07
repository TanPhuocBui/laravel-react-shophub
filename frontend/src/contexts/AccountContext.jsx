import { useEffect, useState } from 'react';
import { AccountContext } from './useAccount';
import { getAccount, loginAccount, logoutAccount } from '../services/accountService';

export function AccountProvider({ children }) {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    getAccount(controller.signal)
      .then(setUser)
      .catch((error) => {
        const status = error.response?.status;
        if (!controller.signal.aborted && status !== 401 && status !== 403) {
          setUnavailable(true);
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) setChecking(false);
      });
    return () => controller.abort();
  }, [attempt]);

  function retry() {
    setChecking(true);
    setUnavailable(false);
    setAttempt((current) => current + 1);
  }

  async function login(fields) {
    const account = await loginAccount(fields);
    setUser(account);
    setUnavailable(false);
  }

  async function logout() {
    await logoutAccount();
    setUser(null);
  }

  return (
    <AccountContext.Provider value={{ user, checking, unavailable, retry, login, logout }}>
      {children}
    </AccountContext.Provider>
  );
}
