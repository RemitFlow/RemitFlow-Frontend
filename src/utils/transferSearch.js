/**
 * Deterministic transfer search, filter, sort, and result capping.
 *
 * Client-side filter fan-out races and unbounded scans get slow as history
 * grows. These helpers define one canonical filter/sort/scope semantics used
 * by the list API and the Transfers page so stale responses, missing actor
 * scope, and uncapped result sets cannot silently corrupt the UI.
 */

import { normalizeStatus } from '../services/contracts/transfer.js';
import { getDateRangeDays } from './dateRange.js';

/** Debounce window for free-text search queries (ms). */
export const SEARCH_DEBOUNCE_MS = 300;

/** Default maximum rows a single list query may return. */
export const DEFAULT_RESULT_CAP = 100;

/** Hard ceiling — callers may request less, never more. */
export const MAX_RESULT_CAP = 500;

/**
 * @param {unknown} actorId
 * @returns {string}
 */
export function requireActorId(actorId) {
  if (typeof actorId !== 'string' || actorId.trim() === '') {
    throw new Error('actorId is required on every transfer list request');
  }
  return actorId.trim();
}

/**
 * Canonical filter bag bound into every request and stale-response check.
 * @param {{search?: string, status?: string, range?: string, actorId?: string, limit?: number}} input
 */
export function normalizeTransferQuery(input = {}) {
  const actorId = requireActorId(input.actorId);
  const search = String(input.search ?? '').trim();
  const statusRaw = String(input.status ?? '').trim();
  const status = statusRaw ? (normalizeStatus(statusRaw) ?? statusRaw) : '';
  const range = String(input.range ?? '').trim();
  const requested =
    Number.isFinite(input.limit) && input.limit > 0
      ? Math.floor(input.limit)
      : DEFAULT_RESULT_CAP;
  const limit = Math.min(Math.max(requested, 1), MAX_RESULT_CAP);

  return { actorId, search, status, range, limit };
}

/**
 * Stable string identity for a query — used to ignore stale responses.
 * @param {{search?: string, status?: string, range?: string, actorId?: string, limit?: number}} query
 */
export function transferQueryScopeKey(query) {
  const normalized = normalizeTransferQuery(query);
  return JSON.stringify(normalized);
}

/**
 * Whether a transfer belongs to the requesting actor.
 * Legacy rows without actorId are only visible to the supplied legacyActor
 * (the historical demo owner) so migration does not leak across wallets.
 *
 * @param {object} transfer
 * @param {string} actorId
 * @param {{legacyActorId?: string}} [options]
 */
export function isVisibleToActor(transfer, actorId, options = {}) {
  if (!actorId) return false;
  const owner = transfer?.actorId;
  if (typeof owner === 'string' && owner.length > 0) {
    return owner === actorId;
  }
  const legacy = options.legacyActorId;
  return Boolean(legacy) && actorId === legacy;
}

/**
 * Apply status / search / date-range predicates (actor scope is separate).
 * @param {object} transfer
 * @param {{search?: string, status?: string, range?: string}} filters
 * @param {Date} [now]
 */
export function matchesTransferFilters(
  transfer,
  filters = {},
  now = new Date(),
) {
  const matches = prepareTransferFilters(filters, now);
  return matches ? matches(transfer) : true;
}

/** Prepare only query-owned values; each invocation still reads fresh rows. */
function prepareTransferFilters(filters, now) {
  const status = filters.status
    ? (normalizeStatus(filters.status) ?? filters.status)
    : '';
  const search = String(filters.search ?? '')
    .trim()
    .toLowerCase();
  const days = getDateRangeDays(filters.range ?? '');
  // Keep Date's clipping/invalid-window semantics, including oversized presets.
  const cutoff = days
    ? new Date(now.getTime() - days * 86_400_000).getTime()
    : null;

  if (!status && !search && cutoff === null) return null;

  return (transfer) => {
    if (status && normalizeStatus(transfer.status) !== status) return false;
    if (
      search &&
      !String(transfer.recipient ?? '')
        .toLowerCase()
        .includes(search)
    ) {
      return false;
    }
    return cutoff === null || new Date(transfer.createdAt).getTime() >= cutoff;
  };
}

/**
 * Newest-first ordering with descending exact ID strings as the tie-breaker.
 * @param {object[]} transfers
 * @returns {object[]}
 */
export function stableSortTransfers(transfers) {
  return (transfers ?? []).slice().sort((a, b) => {
    const aTime = Date.parse(a?.createdAt ?? '') || 0;
    const bTime = Date.parse(b?.createdAt ?? '') || 0;
    if (bTime !== aTime) return bTime - aTime;
    // Locale collation can equate distinct IDs; compare their exact strings.
    const aId = String(a?.id ?? '');
    const bId = String(b?.id ?? '');
    return aId < bId ? 1 : aId > bId ? -1 : 0;
  });
}

function compareSearchEntries(a, b) {
  if (b.time !== a.time) return b.time - a.time;
  if (a.id !== b.id) return a.id < b.id ? 1 : -1;
  // Array.sort is stable: identical keys retain their original input order.
  return a.index - b.index;
}

/** Keep only the best `limit` rows, with the worst retained row at the root. */
function retainSearchEntry(heap, entry, limit) {
  if (heap.length < limit) {
    let child = heap.length;
    heap.push(entry);
    while (child > 0) {
      const parent = Math.floor((child - 1) / 2);
      if (compareSearchEntries(heap[parent], entry) >= 0) break;
      heap[child] = heap[parent];
      child = parent;
    }
    heap[child] = entry;
    return;
  }

  if (compareSearchEntries(entry, heap[0]) >= 0) return;
  let parent = 0;
  while (parent * 2 + 1 < heap.length) {
    let child = parent * 2 + 1;
    if (
      child + 1 < heap.length &&
      compareSearchEntries(heap[child + 1], heap[child]) > 0
    ) {
      child += 1;
    }
    if (compareSearchEntries(entry, heap[child]) >= 0) break;
    heap[parent] = heap[child];
    parent = child;
  }
  heap[parent] = entry;
}

/**
 * Filter by actor + predicates and select a stable, capped result.
 * Only the retained rows are sorted; each matching timestamp is parsed once.
 *
 * @param {object[]} transfers
 * @param {{search?: string, status?: string, range?: string, actorId: string, limit?: number}} query
 * @param {{now?: Date, legacyActorId?: string}} [options]
 * @returns {{items: object[], totalMatched: number, capped: boolean, scopeKey: string}}
 */
export function applyTransferSearch(transfers, query, options = {}) {
  const normalized = normalizeTransferQuery(query);
  const now = options.now ?? new Date();
  const matchesFilters = prepareTransferFilters(normalized, now);
  const selected = [];
  let totalMatched = 0;
  const visibility = { legacyActorId: options.legacyActorId };
  // forEach, like filter, skips sparse-array holes.
  (transfers ?? []).forEach((transfer, index) => {
    if (
      !isVisibleToActor(transfer, normalized.actorId, visibility) ||
      (matchesFilters && !matchesFilters(transfer))
    ) {
      return;
    }
    totalMatched += 1;
    retainSearchEntry(
      selected,
      {
        transfer,
        time: Date.parse(transfer?.createdAt ?? '') || 0,
        id: String(transfer?.id ?? ''),
        index,
      },
      normalized.limit,
    );
  });
  const items = selected
    .sort(compareSearchEntries)
    .map((entry) => entry.transfer);

  return {
    items,
    totalMatched,
    capped: totalMatched > normalized.limit,
    scopeKey: transferQueryScopeKey(normalized),
  };
}
