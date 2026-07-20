import { useCallback, useEffect, useState } from 'react';
import { listTransfers, createTransfer } from '../services/api.js';

/**
 * Hook for loading and creating transfers.
 * @returns {{transfers: Array, loading: boolean, error: string|null,
 *   reload: Function, addTransfer: Function}}
 */
export function useTransfers() {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listTransfers();
      setTransfers(data);
    } catch (err) {
      setError('Could not load transfers. Please try again.');
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

  return { transfers, loading, error, reload, addTransfer };
}
