import { useEffect, useRef } from 'react';
import './SelectionToolbar.css';

/**
 * Toolbar shown above a paginated list. Holds the "select all on this page"
 * checkbox and the select-all-across-pages affordance: once every row on the
 * current page is selected and more rows exist on other pages, it offers to
 * extend the selection to the whole data set (and, once everything is
 * selected, to clear it again).
 *
 * @param {object} props
 * @param {number} props.pageCount - rows on the current page
 * @param {number} props.selectedCount - rows selected across all pages
 * @param {number} props.totalCount - rows across all pages
 * @param {boolean} props.allPageSelected - every row on this page is selected
 * @param {boolean} props.somePageSelected - at least one row on this page is selected
 * @param {boolean} props.allAcrossSelected - every row across all pages is selected
 * @param {boolean} props.hasMorePages - rows exist beyond the current page
 * @param {Function} props.onTogglePage - toggle selection of the current page
 * @param {Function} props.onSelectAllAcross - select every row across all pages
 * @param {Function} props.onClear - clear the entire selection
 * @param {string} [props.itemLabel] - noun for a single row (default "transfer")
 */
export default function SelectionToolbar({
  pageCount,
  selectedCount,
  totalCount,
  allPageSelected,
  somePageSelected,
  allAcrossSelected,
  hasMorePages,
  onTogglePage,
  onSelectAllAcross,
  onClear,
  itemLabel = 'transfer',
}) {
  const checkboxRef = useRef(null);

  // The header checkbox shows an indeterminate state when only some of the
  // current page is selected. That can only be set imperatively on the DOM node.
  useEffect(() => {
    if (checkboxRef.current) {
      checkboxRef.current.indeterminate = somePageSelected && !allPageSelected;
    }
  }, [somePageSelected, allPageSelected]);

  const plural = (n) => `${n} ${itemLabel}${n === 1 ? '' : 's'}`;

  return (
    <div className="selection-toolbar">
      <label className="selection-checkbox">
        <input
          ref={checkboxRef}
          type="checkbox"
          checked={allPageSelected}
          onChange={onTogglePage}
          aria-label={`Select all ${itemLabel}s on this page`}
        />
        <span className="selection-count">
          {selectedCount > 0
            ? `${plural(selectedCount)} selected`
            : 'Select all'}
        </span>
      </label>

      {allPageSelected && !allAcrossSelected && hasMorePages && (
        <div className="selection-affordance" role="status">
          <span>All {plural(pageCount)} on this page are selected.</span>
          <button
            type="button"
            className="selection-link"
            onClick={onSelectAllAcross}
          >
            Select all {plural(totalCount)}
          </button>
        </div>
      )}

      {allAcrossSelected && hasMorePages && (
        <div className="selection-affordance" role="status">
          <span>All {plural(totalCount)} are selected.</span>
          <button type="button" className="selection-link" onClick={onClear}>
            Clear selection
          </button>
        </div>
      )}
    </div>
  );
}
