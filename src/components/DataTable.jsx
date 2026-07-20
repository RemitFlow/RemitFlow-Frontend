import { useColumnResize } from '../hooks/useColumnResize.js'
import './DataTable.css'

/**
 * A reusable data table with column resize handles and keyboard-accessible
 * column headers.
 *
 * @param {object} props
 * @param {Array<{key: string, label: string, width: number, minWidth?: number, render: (row: object) => React.ReactNode, align?: 'left'|'right'|'center'}>} props.columns
 *   Column definitions. Each column must have a `key`, `label`, `width` (initial pixel width),
 *   and a `render` function that returns the cell content for a given row.
 * @param {Array<object>} props.data
 *   Array of row data objects. Each row must include a unique `id` field.
 * @param {boolean} [props.loading]
 *   If true, shows skeleton loading placeholders.
 * @param {string|null} [props.error]
 *   If provided, shows an error message with a retry button.
 * @param {Function} [props.onRetry]
 *   Called when the retry button is clicked (requires `error` to be set).
 * @param {React.ReactNode} [props.emptyState]
 *   Content to show when `data` is empty and not loading/erroring.
 * @param {string} [props.id]
 *   Optional HTML id for the table wrapper.
 */
export default function DataTable({
  columns,
  data,
  loading,
  error,
  onRetry,
  emptyState,
  id
}) {
  const { widths, resizing, getResizeProps } = useColumnResize(columns)

  const gridTemplateColumns = columns
    .map((col) => `${widths[col.key]}px`)
    .join(' ')

  return (
    <div className="data-table" id={id} role="grid" aria-label="Data table">
      {/* Column headers */}
      <div
        className="data-table-header"
        style={{ gridTemplateColumns }}
        role="row"
      >
        {columns.map((col, idx) => (
          <div
            key={col.key}
            className={`data-table-header-cell data-table-align-${col.align || 'left'}`}
            role="columnheader"
            aria-label={col.label}
            style={{ width: widths[col.key] }}
          >
            <span className="data-table-header-label" aria-hidden="true">{col.label}</span>
            {idx < columns.length - 1 && (
              <div {...getResizeProps(col.key)} />
            )}
          </div>
        ))}
      </div>

      {/* Table body */}
      <div className="data-table-body">
        {loading &&
          Array.from({ length: 3 }, (_, i) => (
            <div
              key={`skeleton-${i}`}
              className="data-table-row data-table-row--skeleton"
              style={{ gridTemplateColumns }}
              aria-hidden="true"
            >
              {columns.map((col) => (
                <div
                  key={col.key}
                  className="data-table-cell"
                  style={{ width: widths[col.key] }}
                >
                  <div className="skeleton-block" />
                </div>
              ))}
            </div>
          ))}

        {!loading && error && (
          <div className="data-table-message">
            <p className="data-table-message-text">{error}</p>
            {onRetry && (
              <button
                type="button"
                className="data-table-retry-btn"
                onClick={onRetry}
              >
                Try again
              </button>
            )}
          </div>
        )}

        {!loading &&
          !error &&
          data.length === 0 &&
          emptyState && (
            <div className="data-table-message">{emptyState}</div>
          )}

        {!loading &&
          !error &&
          data.length > 0 &&
          data.map((row) => (
            <div
              key={row.id}
              className="data-table-row"
              style={{ gridTemplateColumns }}
              role="row"
            >
              {columns.map((col) => (
                <div
                  key={col.key}
                  className={`data-table-cell data-table-align-${col.align || 'left'}`}
                  style={{ width: widths[col.key] }}
                  role="cell"
                >
                  {col.render(row)}
                </div>
              ))}
            </div>
          ))}

        {/* Global resize overlay to capture mouse events beyond the header */}
        {resizing && <div className="data-table-resize-overlay" />}
      </div>
    </div>
  )
}

/**
 * Renders a compact cell suitable for use inside `DataTable`'s `render` prop.
 * Shows a muted label and a main value below it, matching the existing
 * TransferRow visual style.
 *
 * @param {object} props
 * @param {string} props.label - the muted label above the value
 * @param {React.ReactNode} props.children - the main cell content
 * @param {string} [props.title] - optional native title attribute for truncation
 * @param {string} [props.className] - optional additional CSS class for the cell wrapper
 */
export function DataTableCell({ label, children, title, className }) {
  return (
    <div className={`data-table-cell-content${className ? ' ' + className : ''}`} title={title}>
      <span className="data-table-cell-label">{label}</span>
      <span className="data-table-cell-value">{children}</span>
    </div>
  )
}
