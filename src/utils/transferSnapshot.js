/**
 * Snapshot pagination for transfer history.
 *
 * Offset paging duplicates or omits rows when new transfers arrive mid-scroll.
 * A snapshot freezes the filtered set at a point in time; cursors are scoped
 * to that snapshot and use (createdAt, id) as a stable tie-breaker. Filter
 * changes mint a new snapshot. Expired or out-of-scope cursors recover by
 * rebuilding from the live list.
 */

/** Default page size — matches the Transfers page. */
export const DEFAULT_PAGE_SIZE = 5;

/** Snapshots older than this are treated as expired on resume. */
export const SNAPSHOT_TTL_MS = 5 * 60_000;

/**
 * Stable newest-first ordering with id as the deterministic tie-breaker.
 * @param {object[]} transfers
 * @returns {object[]}
 */
export function stableSortTransfers(transfers) {
  // Parse once per row, not twice per comparison. Keep undefined entries and
  // sparse slots unwrapped so native sort retains their existing placement.
  return (transfers ?? [])
    .map((record) =>
      record === undefined
        ? undefined
        : {
            record,
            time: Date.parse(record?.createdAt ?? '') || 0,
            id: String(record?.id ?? ''),
          },
    )
    .sort((a, b) => b.time - a.time || b.id.localeCompare(a.id))
    .map((entry) => entry?.record);
}

/**
 * Canonical filter scope bound into every cursor.
 * @param {{search?: string, status?: string, range?: string}} filters
 */
export function filterScopeKey(filters = {}) {
  return JSON.stringify({
    search: String(filters.search ?? ''),
    status: String(filters.status ?? ''),
    range: String(filters.range ?? ''),
  });
}

/**
 * @param {object[]} transfers - already filtered live rows
 * @param {{filters?: object, now?: number|Date, pageSize?: number, snapshotId?: string}} [options]
 */
export function createTransferSnapshot(transfers, options = {}) {
  const nowMs =
    options.now instanceof Date
      ? options.now.getTime()
      : (options.now ?? Date.now());
  const pageSize = options.pageSize ?? DEFAULT_PAGE_SIZE;
  const scope = filterScopeKey(options.filters);
  const items = stableSortTransfers(transfers).map((t) => ({
    id: t.id,
    createdAt: t.createdAt,
    record: { ...t },
  }));

  return {
    id: options.snapshotId ?? mintSnapshotId(nowMs, scope, items.length),
    createdAt: new Date(nowMs).toISOString(),
    expiresAt: new Date(nowMs + SNAPSHOT_TTL_MS).toISOString(),
    scope,
    pageSize,
    items,
  };
}

// A snapshot is one in-memory generation, not just a time/filter/count tuple.
// Rapid replacements can share all three, so keep their cursors distinct even
// when the clock is fixed or moves backward. Explicit caller IDs stay unchanged.
let snapshotGeneration = 0;

function mintSnapshotId(nowMs, scope, count) {
  const seed = `${nowMs}:${scope}:${count}`;
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  snapshotGeneration += 1;
  return `snap_${(hash >>> 0).toString(16).padStart(8, '0')}_${snapshotGeneration.toString(36)}`;
}

/**
 * Opaque cursor: snapshot id + scope + last-seen key + page index.
 * @param {{snapshotId: string, scope: string, after?: {createdAt: string, id: string}|null, page: number}} parts
 */
export function encodeCursor(parts) {
  const payload = {
    s: parts.snapshotId,
    scope: parts.scope,
    page: parts.page,
    after: parts.after ? { t: parts.after.createdAt, i: parts.after.id } : null,
  };
  return `c_${toBase64Url(JSON.stringify(payload))}`;
}

/**
 * @param {string} cursor
 * @returns {{snapshotId: string, scope: string, page: number, after: {createdAt: string, id: string}|null}|null}
 */
export function decodeCursor(cursor) {
  if (!cursor || typeof cursor !== 'string' || !cursor.startsWith('c_')) {
    return null;
  }
  try {
    const raw = JSON.parse(fromBase64Url(cursor.slice(2)));
    if (!raw?.s || !Number.isSafeInteger(raw.page) || raw.page < 1) return null;
    return {
      snapshotId: raw.s,
      scope: raw.scope ?? '',
      page: raw.page,
      after: raw.after ? { createdAt: raw.after.t, id: raw.after.i } : null,
    };
  } catch {
    return null;
  }
}

function toBase64Url(value) {
  if (typeof btoa === 'function') {
    return btoa(unescape(encodeURIComponent(value)))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/g, '');
  }
  return Buffer.from(value, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function fromBase64Url(value) {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const pad =
    padded.length % 4 === 0 ? '' : '='.repeat(4 - (padded.length % 4));
  const b64 = padded + pad;
  if (typeof atob === 'function') {
    return decodeURIComponent(escape(atob(b64)));
  }
  return Buffer.from(b64, 'base64').toString('utf8');
}

/**
 * Is the cursor still valid for this snapshot and filter scope?
 * @param {object|null} decoded
 * @param {object} snapshot
 * @param {object} filters
 * @param {number|Date} [now]
 */
export function isCursorInScope(decoded, snapshot, filters, now = Date.now()) {
  if (!decoded || !snapshot) return false;
  if (decoded.snapshotId !== snapshot.id) return false;
  if (decoded.scope !== snapshot.scope) return false;
  if (decoded.scope !== filterScopeKey(filters)) return false;
  if (isSnapshotExpired(snapshot, now)) return false;
  const totalPages = Math.max(
    1,
    Math.ceil(snapshot.items.length / snapshot.pageSize),
  );
  if (decoded.page > totalPages) return false;
  const prior =
    snapshot.items[(decoded.page - 1) * snapshot.pageSize - 1] ?? null;
  if (!prior) return decoded.after === null;
  return (
    decoded.after?.id === prior.id &&
    decoded.after?.createdAt === prior.createdAt
  );
}

export function isSnapshotExpired(snapshot, now = Date.now()) {
  if (!snapshot?.expiresAt) return true;
  const expiry = Date.parse(snapshot.expiresAt);
  if (Number.isNaN(expiry)) return true;
  const current = now instanceof Date ? now.getTime() : now;
  return current >= expiry;
}

/**
 * Page a snapshot. Returns rows from the live transfer map so callers still
 * render full records, but membership is frozen to the snapshot.
 *
 * @param {object} snapshot
 * @param {object[]} liveTransfers - full transfer objects (id-keyed lookup)
 * @param {{cursor?: string|null, filters?: object, now?: number|Date}} [options]
 */
export function pageFromSnapshot(snapshot, liveTransfers, options = {}) {
  const filters = options.filters ?? {};
  const now = options.now ?? Date.now();
  const pageSize = snapshot?.pageSize ?? DEFAULT_PAGE_SIZE;

  const decoded = options.cursor ? decodeCursor(options.cursor) : null;
  const scoped = isCursorInScope(decoded, snapshot, filters, now);

  if (!snapshot || isSnapshotExpired(snapshot, now)) {
    return {
      ok: false,
      code: 'snapshot_expired',
      items: [],
      page: 1,
      totalPages: 1,
      totalCount: 0,
      cursor: null,
      nextCursor: null,
      prevCursor: null,
      recovered: true,
    };
  }

  if (options.cursor && !scoped) {
    return {
      ok: false,
      code: 'cursor_expired',
      items: [],
      page: 1,
      totalPages: Math.max(1, Math.ceil(snapshot.items.length / pageSize)),
      totalCount: snapshot.items.length,
      cursor: null,
      nextCursor: null,
      prevCursor: null,
      recovered: true,
    };
  }

  const page = scoped ? Math.max(1, decoded.page) : 1;
  const totalCount = snapshot.items.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize) || 1);
  const start = (page - 1) * pageSize;
  const slice = snapshot.items.slice(start, start + pageSize);
  // Only visible snapshot IDs need fresh fields. Walk arrays backward so the
  // first match is the last duplicate, as in Map(rows), and stop once every
  // visible ID is resolved. Missing IDs still require the complete scan.
  const pageIds = new Set(slice.map((ref) => ref.id));
  const byId = new Map();
  if (
    Array.isArray(liveTransfers) &&
    liveTransfers[Symbol.iterator] === Array.prototype[Symbol.iterator]
  ) {
    for (let i = liveTransfers.length - 1; i >= 0 && pageIds.size > 0; i -= 1) {
      const transfer = liveTransfers[i];
      if (pageIds.delete(transfer.id)) byId.set(transfer.id, transfer);
    }
  } else if (pageIds.size > 0) {
    // Keep the existing forward-only iterable contract and duplicate policy.
    for (const transfer of liveTransfers ?? []) {
      if (pageIds.has(transfer.id)) byId.set(transfer.id, transfer);
    }
  }
  // Keep a complete snapshot even if a row disappears or changes its active
  // filter after the snapshot was taken. Fresh fields win while it remains live.
  const items = slice.map((ref) => byId.get(ref.id) ?? ref.record);
  const priorRef = snapshot.items[start - 1] ?? null;
  const lastRef = slice[slice.length - 1] ?? null;
  const currentCursor = encodeCursor({
    snapshotId: snapshot.id,
    scope: snapshot.scope,
    page,
    after: priorRef,
  });
  const nextCursor =
    page < totalPages
      ? encodeCursor({
          snapshotId: snapshot.id,
          scope: snapshot.scope,
          page: page + 1,
          after: lastRef,
        })
      : null;
  const prevCursor =
    page > 1
      ? encodeCursor({
          snapshotId: snapshot.id,
          scope: snapshot.scope,
          page: page - 1,
          after: snapshot.items[(page - 2) * pageSize - 1] ?? null,
        })
      : null;

  return {
    ok: true,
    code: null,
    items,
    page,
    totalPages,
    totalCount,
    cursor: currentCursor,
    nextCursor,
    prevCursor,
    recovered: false,
  };
}

/**
 * Resolve a page, recovering from expired cursors by minting a fresh snapshot.
 * @param {object[]} filteredTransfers
 * @param {{
 *   filters: object,
 *   cursor?: string|null,
 *   snapshot?: object|null,
 *   pageSize?: number,
 *   now?: number|Date,
 *   liveTransfers?: object[],
 * }} state
 */
export function resolveTransferPage(filteredTransfers, state = {}) {
  const now = state.now ?? Date.now();
  const filters = state.filters ?? {};
  // Filters choose snapshot membership; the complete current list supplies
  // fresh fields even when a retained row no longer matches those filters.
  const liveTransfers = state.liveTransfers ?? filteredTransfers;
  let snapshot = state.snapshot ?? null;
  let recovered = false;

  // An empty snapshot created while the list was still loading must not freeze
  // out rows that arrive a moment later. Concurrent inserts into a non-empty
  // snapshot remain frozen (that is the whole point of snapshot paging).
  const needsNew =
    !snapshot ||
    isSnapshotExpired(snapshot, now) ||
    snapshot.scope !== filterScopeKey(filters) ||
    (snapshot.items.length === 0 && (filteredTransfers?.length ?? 0) > 0);

  if (needsNew) {
    snapshot = createTransferSnapshot(filteredTransfers, {
      filters,
      now,
      pageSize: state.pageSize ?? DEFAULT_PAGE_SIZE,
    });
    recovered = Boolean(state.snapshot) || Boolean(state.cursor);
  }

  const page = pageFromSnapshot(snapshot, liveTransfers, {
    cursor: needsNew ? null : state.cursor,
    filters,
    now,
  });

  if (!page.ok) {
    snapshot = createTransferSnapshot(filteredTransfers, {
      filters,
      now,
      pageSize: state.pageSize ?? DEFAULT_PAGE_SIZE,
    });
    const recoveredPage = pageFromSnapshot(snapshot, liveTransfers, {
      cursor: null,
      filters,
      now,
    });
    return {
      snapshot,
      page: { ...recoveredPage, recovered: true },
      recovered: true,
    };
  }

  return { snapshot, page: { ...page, recovered }, recovered };
}
