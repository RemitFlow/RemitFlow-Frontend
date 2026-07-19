import { useCallback, useMemo } from 'react'
import { useLocalStorage } from './useLocalStorage.js'

/**
 * Build a visibility map where every provided column defaults to visible (true),
 * then overlay any (partial) stored map on top. Unknown keys in the stored map
 * are ignored so the shape always matches `columns`.
 * @param {string[]} columns - ordered list of column ids
 * @param {object|null|undefined} stored - previously persisted map columnId -> boolean
 * @returns {Record<string, boolean>}
 */
function mergeDefaults(columns, stored) {
  const merged = {}
  for (const id of columns) {
    const value = stored && typeof stored === 'object' ? stored[id] : undefined
    merged[id] = typeof value === 'boolean' ? value : true
  }
  return merged
}

/**
 * Persist per-column visibility preferences for a table.
 * Built on top of {@link useLocalStorage}; a partial or missing stored value
 * falls back to all-columns-visible.
 *
 * @param {string} storageKey - localStorage key to persist the visibility map
 * @param {string[]} columns - ordered list of column ids
 * @returns {{
 *   visibility: Record<string, boolean>,
 *   toggleColumn: (id: string) => void,
 *   setColumnVisible: (id: string, visible: boolean) => void,
 *   isVisible: (id: string) => boolean,
 *   reset: () => void,
 * }}
 */
export function useColumnVisibility(storageKey, columns) {
  const [stored, setStored] = useLocalStorage(storageKey, null)

  const visibility = useMemo(
    () => mergeDefaults(columns, stored),
    [columns, stored]
  )

  const setColumnVisible = useCallback(
    (id, visible) => {
      if (!columns.includes(id)) return
      setStored((prev) => ({
        ...mergeDefaults(columns, prev),
        [id]: !!visible,
      }))
    },
    [columns, setStored]
  )

  const toggleColumn = useCallback(
    (id) => {
      if (!columns.includes(id)) return
      setStored((prev) => {
        const current = mergeDefaults(columns, prev)
        return { ...current, [id]: !current[id] }
      })
    },
    [columns, setStored]
  )

  const reset = useCallback(() => {
    setStored(null)
    try {
      localStorage.removeItem(storageKey)
    } catch (err) {
      // storage may be unavailable; in-memory reset above still applies.
    }
  }, [setStored, storageKey])

  const isVisible = useCallback((id) => visibility[id] !== false, [visibility])

  return { visibility, toggleColumn, setColumnVisible, isVisible, reset }
}

export default useColumnVisibility
