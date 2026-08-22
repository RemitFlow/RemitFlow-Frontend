
import { useCallback, useEffect, useState } from 'react';
import { listTransfers, createTransfer } from '../services/api.js';
import { getUserErrorMessage, normalizeError } from '../services/errors.js';

/**
 * Hook for loading and creating transfers.
 * @returns {{transfers: Array, loading: boolean, error: string|null,
 *   retryable: boolean, reload: Function|undefined, addTransfer: Function}}
 */
export function useTransfers() {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryable, setRetryable] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    setRetryable(false);
    try {
      const data = await listTransfers();
      setTransfers(data);
    } catch (err) {
      const normalized = normalizeError(err, { source: 'api' });
      setError(getUserErrorMessage(normalized));
      setRetryable(normalized.retryable);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    reload();
  }, [reload]);

  const addTransfer = useCallback(async (payload) => {
    const created = await createTransfer(payload);
    setTransfers((prev) => [created, ...prev]);
    return created;
  }, []);

  // Existing consumers use reload for both pull-to-refresh and the error-state
  // retry action. Withhold it only while a non-retryable error is displayed.
  const safeReload = error && !retryable ? undefined : reload;

  return {
    transfers,
    loading,
    error,
    retryable,
    reload: safeReload,
    addTransfer,
  };
}
