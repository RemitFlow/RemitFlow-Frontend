import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Chart from '../components/Chart.jsx';
import { formatAmount } from '../utils/format.js';
import TransferRow from '../components/TransferRow.jsx';
import Skeleton from '../components/Skeleton.jsx';
import ErrorMessage from '../components/ErrorMessage.jsx';
import EmptyState from '../components/EmptyState.jsx';
import Button from '../components/Button.jsx';
import Pagination from '../components/Pagination.jsx';
import PullToRefresh from '../components/PullToRefresh.jsx';
import SelectionToolbar from '../components/SelectionToolbar.jsx';
import { useTransfers } from '../hooks/useTransfers.js';
import { useApp } from '../context/AppContext.jsx';
import { DATE_RANGE_PRESETS, isWithinDateRange } from '../utils/dateRange.js';
import './Transfers.css';

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'completed', label: 'Completed' },
  { value: 'failed', label: 'Failed' },
];

const PAGE_SIZE = 5;

/**
 * Transfers page: lists all transfers with their status.
 * Filter state is synced to the URL query string.
 */
export default function Transfers() {
  const { transfers, loading, error, reload } = useTransfers();
  const { locale } = useApp();
  const [searchParams, setSearchParams] = useSearchParams();

  const search = searchParams.get('search') || '';
  const status = searchParams.get('status') || '';
  const range = searchParams.get('range') || '';

  // Selection state
  const [selectedIds, setSelectedIds] = useState(() => new Set());
  const [selectAllAcross, setSelectAllAcross] = useState(false);

  // Pagination state
  const [page, setPage] = useState(1);

  // Reset page and selection when filters change
  useEffect(() => {
    setPage(1);
    setSelectedIds(new Set());
    setSelectAllAcross(false);
  }, [search, status, range]);

  const filteredTransfers = useMemo(() => {
    return transfers.filter((t) => {
      if (status && t.status !== status) return false;
      if (search && !t.recipient.toLowerCase().includes(search.toLowerCase()))
        return false;
      if (!isWithinDateRange(t.createdAt, range)) return false;
      return true;
    });
  }, [transfers, search, status, range]);

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
            data={filteredTransfers.slice(0, 5).map((t) => ({
              value: parseFloat(t.sendAmount),
              label: t.recipient,
              currency: t.from,
            }))}
            formatValue={(d) => formatAmount(d.value, d.currency)}
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
