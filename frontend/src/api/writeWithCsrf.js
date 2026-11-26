import api from './axios';

export default async function writeWithCsrf(write, { signal, beforeSend } = {}) {
  try {
    await api.get('/sanctum/csrf-cookie', { signal });
  } catch (error) {
    error.beforeWriteFailure = true;
    throw error;
  }

  signal?.throwIfAborted();
  // Caller can persist a reconciliation marker before starting the write.
  beforeSend?.();

  try {
    return await write();
  } catch (error) {
    if (!error.response || error.response.status >= 500) {
      error.writeOutcomeUnknown = true;
    }
    throw error;
  }
}
