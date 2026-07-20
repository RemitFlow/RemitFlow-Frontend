import { useEffect } from 'react'

const BASE_TITLE = 'RemitFlow'

/**
 * Sets the document title for the current page.
 * Appends the page title to the base "RemitFlow" brand name.
 * Restores the base title when the component unmounts.
 *
 * @param {string} [title] - the page-specific title to append
 */
export function useDocumentTitle(title) {
  useEffect(() => {
    const fullTitle = title ? `${BASE_TITLE} — ${title}` : BASE_TITLE
    document.title = fullTitle

    return () => {
      document.title = BASE_TITLE
    }
  }, [title])
}
