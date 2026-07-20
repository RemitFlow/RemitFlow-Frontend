import { useCallback, useMemo, useState } from 'react'

/**
 * Manages a set of selected ids independent of pagination, so a selection can
 * span multiple pages. Selection is tracked by id, which is what makes a
 * "select all across pages" affordance possible: paging back and forth never
 * loses what was picked.
 *
 * @returns {{
 *   selectedIds: Set<string>,
 *   selectedCount: number,
 *   isSelected: (id: string) => boolean,
 *   toggle: (id: string) => void,
 *   selectMany: (ids: string[]) => void,
 *   deselectMany: (ids: string[]) => void,
 *   replaceAll: (ids: string[]) => void,
 *   clear: () => void
 * }}
 */
export function useSelection() {
  const [selectedIds, setSelectedIds] = useState(() => new Set())

  const isSelected = useCallback((id) => selectedIds.has(id), [selectedIds])

  const toggle = useCallback((id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }, [])

  const selectMany = useCallback((ids) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => next.add(id))
      return next
    })
  }, [])

  const deselectMany = useCallback((ids) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      ids.forEach((id) => next.delete(id))
      return next
    })
  }, [])

  const replaceAll = useCallback((ids) => {
    setSelectedIds(new Set(ids))
  }, [])

  const clear = useCallback(() => setSelectedIds(new Set()), [])

  const selectedCount = selectedIds.size

  return useMemo(
    () => ({
      selectedIds,
      selectedCount,
      isSelected,
      toggle,
      selectMany,
      deselectMany,
      replaceAll,
      clear
    }),
    [selectedIds, selectedCount, isSelected, toggle, selectMany, deselectMany, replaceAll, clear]
  )
}
