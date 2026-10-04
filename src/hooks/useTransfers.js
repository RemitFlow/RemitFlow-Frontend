import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { listTransfers, createTransfer } from '../services/api.js';
import { ContractViolationError } from '../services/contracts/schema.js';
import { getUserErrorMessage, normalizeError } from '../services/errors.js';
import { DEMO_PUBLIC_KEY } from '../services/wallet.js';
import {
  DEFAULT_RESULT_CAP,
  applyTransferSearch,
  isVisibleToActor,
  normalizeTransferQuery,
  transferQueryScopeKey,
} from '../utils/transferSearch.js';

function isAbortError(err) {
  return (
    err?.name === 'AbortError' ||
    err?.code === 'ERR_CANCELED' ||
    err?.code === 'ECONNABORTED'
  );
}

/**
 * Hook for loading and creating transfers.
 *
 * List requests always carry an actor scope, honour AbortSignal cancellation,
 * and ignore stale responses so a slow reply for an old filter cannot
 * overwrite the current result set.
 *
 * @param {{
 *   actorId?: string,
 *   filters?: {search?: string, status?: string, range?: string},
 *   limit?: number,
 * }} [options]
 * @returns {{transfers: Array, loading: boolean, error: string|null,
 *   retryable: boolean, reload: Function|undefined, addTransfer: Function}}
 */
export function useTransfers(options = {}) {
  const actorId = options.actorId || DEMO_PUBLIC_KEY;
  const filters = options.filters || {};
  const limit = options.limit ?? DEFAULT_RESULT_CAP;

  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retryable, setRetryable] = useState(false);

  const requestGen = useRef(0);
  const abortRef = useRef(null);
  const activeScopeRef = useRef(null);

  const scopeKey = transferQueryScopeKey({
    actorId,
    search: filters.search,
    status: filters.status,
    range: filters.range,
    limit,
  });

  useLayoutEffect(() => {
    // A new committed lifecycle stays distinct even after A -> B -> A.
    activeScopeRef.current = { key: scopeKey };
    return () => {
      activeScopeRef.current = null;
      requestGen.current += 1;
      abortRef.current?.abort();
    };
  }, [scopeKey]);

  const reload = useCallback(async () => {
    const expectedScope = activeScopeRef.current;
    // A retained callback for an old query must not cancel the active one.
    if (!expectedScope || expectedScope.key !== scopeKey) return;
    const gen = ++requestGen.current;

    if (abortRef.current) {
      abortRef.current.abort();
    }
    const controller = new AbortController();
    abortRef.current = controller;
    const isCurrent = () =>
      activeScopeRef.current === expectedScope &&
      gen === requestGen.current &&
      !controller.signal.aborted;

    setLoading(true);
    setError(null);
    setRetryable(false);
    try {
      const data = await listTransfers({
        actorId,
        search: filters.search,
        status: filters.status,
        range: filters.range,
        limit,
        signal: controller.signal,
      });
      // Drop stale replies: a newer filter/request already superseded this one.
      if (!isCurrent()) {
        return;
      }
      setTransfers(data);
    } catch (err) {
      if (isAbortError(err) || !isCurrent()) {
        return;
      }
      if (err instanceof ContractViolationError) {
        // A schema change, not a flaky request. Retrying will not help, and
        // showing an empty list would imply the transfers no longer exist.
        console.error(err.message);
        setError(
          `Your transfers could not be displayed: the data did not match the expected format (${err.contract}). Nothing has been lost — please try again shortly.`,
        );
        setRetryable(false);
      } else {
        const normalized = normalizeError(err, { source: 'api' });
        setError(getUserErrorMessage(normalized));
        setRetryable(normalized.retryable);
      }
    } finally {
      if (isCurrent()) {
        setLoading(false);
      }
    }
  }, [actorId, filters.search, filters.status, filters.range, limit, scopeKey]);

  useEffect(() => {
    reload();
    return () => {
      if (abortRef.current) {
        abortRef.current.abort();
      }
    };
  }, [reload]);

  const addTransfer = useCallback(
    async (payload) => {
      const expectedScope = activeScopeRef.current;
      const isCurrent = () =>
        expectedScope &&
        expectedScope.key === scopeKey &&
        activeScopeRef.current === expectedScope;
      const created = await createTransfer({
        ...payload,
        actorId: payload?.actorId || actorId,
      });
      // Creation still succeeds for its caller when its old view has retired.
      if (!isCurrent()) return created;
      setTransfers((prev) => {
        if (!isCurrent()) return prev;
        const query = normalizeTransferQuery({
          actorId,
          search: filters.search,
          status: filters.status,
          range: filters.range,
          limit,
        });
        const visibility = { legacyActorId: DEMO_PUBLIC_KEY };
        // Another actor's colliding ID must not replace this actor's row.
        if (!isVisibleToActor(created, query.actorId, visibility)) return prev;
        // Match the list API's actor, date, status, sort and cap semantics.
        return applyTransferSearch(
          [created, ...prev.filter((row) => row.id !== created.id)],
          query,
          visibility,
        ).items;
      });
      return created;
    },
    [actorId, filters.search, filters.status, filters.range, limit, scopeKey],
  );

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
