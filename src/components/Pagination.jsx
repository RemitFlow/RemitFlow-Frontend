import './Pagination.css'

/**
 * Simple previous/next pagination control.
 * @param {object} props
 * @param {number} props.page - current page (1-based)
 * @param {number} props.totalPages - total number of pages
 * @param {Function} props.onChange - called with the next page number
 */
export default function Pagination({ page, totalPages, onChange }) {
  if (totalPages <= 1) return null

  return (
    <nav className="pagination" aria-label="Pagination">
      <button
        type="button"
        className="pagination-btn"
        onClick={() => onChange(page - 1)}
        disabled={page <= 1}
      >
        Previous
      </button>
      <span className="pagination-status" aria-live="polite">
        Page {page} of {totalPages}
      </span>
      <button
        type="button"
        className="pagination-btn"
        onClick={() => onChange(page + 1)}
        disabled={page >= totalPages}
      >
        Next
      </button>
    </nav>
  )
}
