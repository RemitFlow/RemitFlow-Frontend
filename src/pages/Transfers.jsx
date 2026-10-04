import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Link,
  useLocation,
  useNavigationType,
  useSearchParams,
} from 'react-router-dom';
import Chart from '../components/Chart.jsx';
import { formatMoney, parseDecimal } from '../utils/money.js';
import { TRANSFER_STATUSES } from '../services/contracts/transfer.js';
import TransferRow from '../components/TransferRow.jsx';
import { TRANSFER_STATUS_LABELS } from '../components/StatusBadge.jsx';
import Skeleton from '../components/Skeleton.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Button from '../components/Button.jsx';
import Pagination from '../components/Pagination.jsx';
import PullToRefresh from '../components/PullToRefresh.jsx';
import SelectionToolbar from '../components/SelectionToolbar.jsx';
import { useTransfers } from '../hooks/useTransfers.js';
import { useOnlineStatus } from '../hooks/useOnlineStatus.js';
import { useApp } from '../context/AppContext.jsx';
import { DATE_RANGE_PRESETS } from '../utils/dateRange.js';
import { DEMO_PUBLIC_KEY } from '../services/wallet.js';
import {
  DEFAULT_RESULT_CAP,
  SEARCH_DEBOUNCE_MS,
} from '../utils/transferSearch.js';
import './Transfers.css';

// Derived from the contract so a new lifecycle state cannot be filterable in
// the data but missing from the dropdown.
const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  ...TRANSFER_STATUSES.map((value) => ({
    value,
    label: TRANSFER_STATUS_LABELS[value],
  })),
];

const PAGE_SIZE = 5;

/**
 * Transfers page: lists all transfers with their status.
 * Filter state is synced to the URL query string. Free-text search is
 * debounced before it drives the actor-scoped list query so keystrokes do
 * not fan out requests; obsolete in-flight queries are aborted by the hook.
 */
export default function Transfers() {
  const { locale, wallet } = useApp();
  const actorId = wallet?.publicKey || DEMO_PUBLIC_KEY;
  const isOnline = useOnlineStatus();
  const [searchParams, setSearchParams] = useSearchParams();
  const location = useLocation();
  const navigationType = useNavigationType();

  // Becomes true while the browser is offline, then flips back to false the
  // moment connectivity returns so we can reconcile transfers against the
  // backend (a transfer may have completed while the response was lost).
  const [wasOffline, setWasOffline] = useState(false);
  const [syncingAfterReconnect, setSyncingAfterReconnect] = useState(false);

  const status = searchParams.get('status') || '';
  const range = searchParams.get('range') || '';
  const urlSearch = searchParams.get('search') || '';

  // Only a user edit may schedule a URL write. Navigation is authoritative.
  const [searchDraft, setSearchDraft] = useState(urlSearch);
  const pendingSearch = useRef(null);

  useLayoutEffect(() => {
    const pending = pendingSearch.current;
    // POP also retires a draft when history changes only status/range.
    // Local filter controls use PUSH and may preserve an unfinished edit.
    if (
      navigationType === 'POP' ||
      !pending ||
      pending.baseSearch !== urlSearch
    ) {
      pendingSearch.current = null;
      setSearchDraft(urlSearch);
    }
  }, [urlSearch, location.key, location.search, navigationType]);

  useEffect(() => {
    const pending = pendingSearch.current;
    if (
      !pending ||
      pending.value !== searchDraft ||
      pending.baseSearch !== urlSearch
    ) {
      return;
    }
    const timer = setTimeout(() => {
      if (pendingSearch.current !== pending) return;
      pendingSearch.current = null;
      setSearchParams(
        (prev) => {
          if ((prev.get('search') || '') !== pending.baseSearch) return prev;
          const next = new URLSearchParams(prev);
          if (pending.value) next.set('search', pending.value);
          else next.delete('search');
          return next;
        },
        { replace: true },
      );
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [searchDraft, urlSearch, setSearchParams]);

  const queryFilters = useMemo(
    () => ({
      search: urlSearch,
      status,
      range,
    }),
    [urlSearch, status, range],
  );

  const { transfers, loading, error, reload } = useTransfers({
    actorId,
    filters: queryFilters,
    limit: DEFAULT_RESULT_CAP,
  });

  // Selection state
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [selectAllAcross, setSelectAllAcross] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);

  // Reset page and selection when the actor or committed filters change.
  useEffect(() => {
    setPage(1);
    setSelectedIds(new Set());
    setSelectAllAcross(false);
  }, [actorId, urlSearch, status, range]);

  // Track connectivity so that a reconnect triggers an automatic reload.
  // The reload reconciles the true status of transfers that may have been
  // created or settled while the connection was down — without resubmitting
  // anything.
  useEffect(() => {
    if (isOnline && wasOffline && !loading && reload) {
      setSyncingAfterReconnect(true);
      Promise.resolve(reload()).finally(() => {
        setSyncingAfterReconnect(false);
      });
    }
    setWasOffline(!isOnline);
  }, [isOnline, wasOffline, loading, reload]);

  // API already applies actor scope, filters, stable sort, and the result cap.
  const filteredTransfers = transfers;

  // Paginated data
  const totalPages = Math.ceil(filteredTransfers.length / PAGE_SIZE) || 1;
  const pageTransfers = useMemo(() => {
    return filteredTransfers.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  }, [filteredTransfers, page]);

  // Selection state computations
  const allPageSelected =
    pageTransfers.length > 0 &&
    pageTransfers.every((t) => selectAllAcross || selectedIds.has(t.id));
  const somePageSelected = pageTransfers.some((t) =>
    selectAllAcross ? true : selectedIds.has(t.id),
  );
  const selectedCount = selectAllAcross
    ? filteredTransfers.length
    : selectedIds.size;
  const hasMorePages = totalPages > 1;

  const handleSearchChange = useCallback(
    (e) => {
      const value = e.target.value;
      pendingSearch.current =
        value === urlSearch ? null : { value, baseSearch: urlSearch };
      setSearchDraft(value);
    },
    [urlSearch],
  );

  const handleStatusChange = useCallback(
    (e) => {
      const value = e.target.value;
      setSearchParams((prev) => {
        if (value) prev.set('status', value);
        else prev.delete('status');
        return prev;
      });
    },
    [setSearchParams],
  );

  const handleRangeChange = useCallback(
    (e) => {
      const value = e.target.value;
      setSearchParams((prev) => {
        if (value) prev.set('range', value);
        else prev.delete('range');
        return prev;
      });
    },
    [setSearchParams],
  );

  const hasActiveFilters = Boolean(urlSearch || status || range);

  // Selection handlers
  const handleToggleSelect = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
    setSelectAllAcross(false);
  }, []);

  const handleTogglePage = useCallback(() => {
    if (allPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        pageTransfers.forEach((t) => next.delete(t.id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        pageTransfers.forEach((t) => next.add(t.id));
        return next;
      });
    }
    setSelectAllAcross(false);
  }, [allPageSelected, pageTransfers]);

  const handleSelectAllAcross = useCallback(() => {
    setSelectAllAcross(true);
    setSelectedIds(new Set());
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectAllAcross(false);
  }, []);

  const handleClearFilters = useCallback(() => {
    pendingSearch.current = null;
    setSearchDraft('');
    setSearchParams({});
  }, [setSearchParams]);

  const renderContent = () => {
    if (loading) {
      return (
        <div className="transfers-list">
          <Skeleton count={3} height="4.5rem" />
        </div>
      );
    }

    if (error) {
      return <ErrorMessage message={error} onRetry={reload} />;
    }

    if (filteredTransfers.length === 0) {
      return (
        <EmptyState
          icon={hasActiveFilters ? '🔍' : '💸'}
          title={
            hasActiveFilters ? 'No matching transfers' : 'No transfers yet'
          }
          message={
            hasActiveFilters
              ? 'Try adjusting your search or filters.'
              : 'Once you send money, your transfers will show up here.'
          }
          action={
            hasActiveFilters ? (
              <Button onClick={handleClearFilters}>Clear filters</Button>
            ) : (
              <Link to="/send">
                <Button>Send your first transfer</Button>
              </Link>
            )
          }
        />
      );
    }

    return (
      <>
        <SelectionToolbar
          pageCount={pageTransfers.length}
          selectedCount={selectedCount}
          totalCount={filteredTransfers.length}
          allPageSelected={allPageSelected}
          somePageSelected={somePageSelected}
          allAcrossSelected={selectAllAcross}
          hasMorePages={hasMorePages}
          onTogglePage={handleTogglePage}
          onSelectAllAcross={handleSelectAllAcross}
          onClear={handleClearSelection}
        />
        <div className="transfers-list">
          <Chart
            title="Recent Transfer Amounts"
            data={filteredTransfers.slice(0, 5).map((t) => {
              // Bar heights need a float; the label keeps the exact decimal.
              const parsed = parseDecimal(t.sendAmount);
              return {
                value: parsed.ok ? Number(parsed.value) : 0,
                amount: parsed.ok ? parsed.value : null,
                label: t.recipient,
                currency: t.from,
              };
            })}
            formatValue={(d) => formatMoney(d.amount, d.currency)}
          />
          {pageTransfers.map((t) => (
            <TransferRow
              key={t.id}
              transfer={t}
              locale={locale}
              selected={selectAllAcross || selectedIds.has(t.id)}
              onToggleSelect={() => handleToggleSelect(t.id)}
            />
          ))}
        </div>
        <Pagination page={page} totalPages={totalPages} onChange={setPage} />
      </>
    );
  };

  return (
    <div className="transfers">
      <div className="transfers-header">
        <h1 className="page-title">Your Transfers</h1>
        <Button to="/send">New Transfer</Button>
      </div>

      {syncingAfterReconnect && (
        <div className="transfers-sync-notice" role="status" aria-live="polite">
          ✓ Back online — refreshing your transfers to show the latest status.
        </div>
      )}

      <div className="transfers-filters">
        <input
          type="search"
          className="transfers-filters-search"
          placeholder="Search by recipient…"
          value={searchDraft}
          onChange={handleSearchChange}
          aria-label="Search transfers by recipient"
        />
        <select
          className="transfers-filters-status"
          value={status}
          onChange={handleStatusChange}
          aria-label="Filter by status"
        >
          {STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        <select
          className="transfers-filters-range"
          value={range}
          onChange={handleRangeChange}
          aria-label="Filter by date range"
        >
          {DATE_RANGE_PRESETS.map((opt) => (
            <option key={opt.value || 'all'} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <PullToRefresh onRefresh={reload} disabled={loading}>
        {renderContent()}
      </PullToRefresh>
    </div>
  );
}
