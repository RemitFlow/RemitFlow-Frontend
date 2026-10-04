import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Chart from '../components/Chart.jsx';
import { formatMoney, parseDecimal } from '../utils/money.js';
import {
  TRANSFER_STATUSES,
  normalizeStatus,
} from '../services/contracts/transfer.js';
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
import { DATE_RANGE_PRESETS, isWithinDateRange } from '../utils/dateRange.js';
import {
  DEFAULT_PAGE_SIZE,
  encodeCursor,
  resolveTransferPage,
} from '../utils/transferSnapshot.js';
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

/**
 * Transfers page: lists all transfers with their status.
 * Filter state is synced to the URL query string.
 *
 * Pagination uses a frozen snapshot so concurrent inserts cannot duplicate or
 * omit rows while the user pages. Filter changes reset the snapshot; expired
 * cursors recover by rebuilding from the live filtered list.
 */
export default function Transfers() {
  const { transfers, loading, error, reload } = useTransfers();
  const { locale } = useApp();
  const isOnline = useOnlineStatus();
  const [searchParams, setSearchParams] = useSearchParams();

  // Becomes true while the browser is offline, then flips back to false the
  // moment connectivity returns so we can reconcile transfers against the
  // backend (a transfer may have completed while the response was lost).
  const [wasOffline, setWasOffline] = useState(false);
  const [syncingAfterReconnect, setSyncingAfterReconnect] = useState(false);

  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';
  const range = searchParams.get('range') || '';

  // Selection state
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [selectAllAcross, setSelectAllAcross] = useState(false);

  // Snapshot pagination state
  const [snapshot, setSnapshot] = useState(null);
  const [cursor, setCursor] = useState(null);
  const [snapshotNotice, setSnapshotNotice] = useState(null);
  // Reset cursor/selection when filters change; snapshot rebuilds below.
  useEffect(() => {
    setCursor(null);
    setSnapshot(null);
    setSelectedIds(new Set());
    setSelectAllAcross(false);
    setSnapshotNotice(null);
  }, [search, status, range]);

  // Normalise the query-string status so a legacy or provider spelling in a
  // shared/bookmarked URL (?status=settled) still selects the right rows.
  const canonicalStatus = normalizeStatus(status);

  // Track connectivity so that a reconnect triggers an automatic reload.
  useEffect(() => {
    if (isOnline && wasOffline && !loading) {
      setSyncingAfterReconnect(true);
      reload().finally(() => {
        setSyncingAfterReconnect(false);
      });
    }
    setWasOffline(!isOnline);
  }, [isOnline, wasOffline, loading, reload]);

  const filteredTransfers = useMemo(() => {
    return transfers.filter((t) => {
      if (status && normalizeStatus(t.status) !== canonicalStatus) return false;
      if (search && !t.recipient.toLowerCase().includes(search.toLowerCase()))
        return false;
      if (!isWithinDateRange(t.createdAt, range)) return false;
      return true;
    });
  }, [transfers, search, status, canonicalStatus, range]);

  const filterState = useMemo(
    () => ({ search, status: canonicalStatus || status, range }),
    [search, status, canonicalStatus, range],
  );

  // Resolve the current page against a frozen snapshot. Membership stays
  // deterministic even if `transfers` grows while the user is on page 2.
  const resolved = useMemo(() => {
    if (loading) {
      return {
        snapshot: null,
        page: {
          ok: true,
          items: [],
          page: 1,
          totalPages: 1,
          totalCount: 0,
          cursor: null,
          nextCursor: null,
          prevCursor: null,
          recovered: false,
        },
        recovered: false,
      };
    }
    return resolveTransferPage(filteredTransfers, {
      filters: filterState,
      liveTransfers: transfers,
      cursor,
      snapshot,
      pageSize: DEFAULT_PAGE_SIZE,
    });
  }, [filteredTransfers, filterState, transfers, cursor, snapshot, loading]);

  const pageTransfers = resolved.page.items;
  const totalPages = resolved.page.totalPages;
  // Empty and selection states follow the same frozen membership as the rows.
  const totalCount = resolved.page.totalCount;
  const page = resolved.page.page;

  // Persist a newly minted snapshot and surface recovery after an expired cursor.
  useEffect(() => {
    if (resolved.snapshot && resolved.snapshot.id !== snapshot?.id) {
      if (snapshot) {
        // Selection belongs to the previous frozen membership. Recovery must
        // not select newcomers or keep counting rows that have disappeared.
        setSelectedIds(new Set());
        setSelectAllAcross(false);
      }
      setSnapshot(resolved.snapshot);
    }
    if (resolved.recovered && cursor) {
      setCursor(null);
      setSnapshotNotice(
        'Transfer list was refreshed to keep paging consistent.',
      );
    }
  }, [resolved, snapshot, cursor]);

  const handlePageChange = useCallback(
    (nextPage) => {
      const active = resolved.snapshot;
      if (!active) return;
      const safePage = Math.min(Math.max(1, nextPage), totalPages);
      const priorRef =
        active.items[(safePage - 1) * active.pageSize - 1] ?? null;
      setCursor(
        encodeCursor({
          snapshotId: active.id,
          scope: active.scope,
          page: safePage,
          after: priorRef,
        }),
      );
      setSnapshotNotice(null);
    },
    [resolved.snapshot, totalPages],
  );

  // Selection state computations
  const allPageSelected =
    pageTransfers.length > 0 &&
    pageTransfers.every((t) => selectAllAcross || selectedIds.has(t.id));
  const somePageSelected = pageTransfers.some((t) =>
    selectAllAcross ? true : selectedIds.has(t.id),
  );
  const selectedCount = selectAllAcross ? totalCount : selectedIds.size;
  const hasMorePages = totalPages > 1;

  const handleSearchChange = useCallback(
    (e) => {
      const value = e.target.value;
      setSearchParams((prev) => {
        if (value) prev.set('search', value);
        else prev.delete('search');
        return prev;
      });
    },
    [setSearchParams],
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

  const hasActiveFilters = Boolean(search || status || range);

  // Selection handlers
  const handleToggleSelect = useCallback(
    (id) => {
      setSelectedIds((prev) => {
        // Across-page selection is implicit until the first deselection.
        const next = new Set(
          selectAllAcross ? resolved.snapshot.items.map((t) => t.id) : prev,
        );
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
      setSelectAllAcross(false);
    },
    [selectAllAcross, resolved.snapshot],
  );

  const handleTogglePage = useCallback(() => {
    if (allPageSelected) {
      setSelectedIds((prev) => {
        const next = new Set(
          selectAllAcross ? resolved.snapshot.items.map((t) => t.id) : prev,
        );
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
  }, [allPageSelected, pageTransfers, selectAllAcross, resolved.snapshot]);

  const handleSelectAllAcross = useCallback(() => {
    setSelectAllAcross(true);
    setSelectedIds(new Set());
  }, []);

  const handleClearSelection = useCallback(() => {
    setSelectedIds(new Set());
    setSelectAllAcross(false);
  }, []);

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

    if (totalCount === 0) {
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
              <Button onClick={() => setSearchParams({})}>Clear filters</Button>
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
          totalCount={totalCount}
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
        <Pagination
          page={page}
          totalPages={totalPages}
          onChange={handlePageChange}
        />
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

      {snapshotNotice && (
        <div
          className="transfers-snapshot-notice"
          role="status"
          aria-live="polite"
          data-testid="snapshot-recovery"
        >
          {snapshotNotice}
        </div>
      )}

      <div className="transfers-filters">
        <input
          type="search"
          className="transfers-filters-search"
          placeholder="Search by recipient…"
          value={search}
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
