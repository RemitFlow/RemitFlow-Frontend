import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

/**
 * Hook for managing column resize via drag-and-drop on resize handles.
 *
 * @param {Array<{key: string, width: number, minWidth?: number}>} columns
 *   The initial column definitions with their starting widths.
 * @returns {{
 *   widths: Record<string, number>,
 *   resizing: string | null,
 *   getResizeProps: (colKey: string) => {
 *     onMouseDown: (e: React.MouseEvent) => void,
 *     role: string,
 *     tabIndex: number,
 *     'aria-label': string,
 *     'aria-valuenow': number,
 *     'aria-valuemin': number,
 *     className: string
 *   },
 *   resetWidths: () => void
 * }}
 */
export function useColumnResize(columns) {
  const initialWidths = useMemo(
    () => Object.fromEntries(columns.map((c) => [c.key, c.width])),
    [columns]
  )
  const minWidths = useMemo(
    () => Object.fromEntries(columns.map((c) => [c.key, c.minWidth ?? 80])),
    [columns]
  )

  const [widths, setWidths] = useState(initialWidths)
  const [resizing, setResizing] = useState(null)

  // Keep a mutable ref to the active drag handlers so we can clean them up
  // if the component unmounts mid-drag.
  const dragHandlersRef = useRef(null)

  // Clean up any active drag listeners on unmount.
  useEffect(() => {
    return () => {
      if (dragHandlersRef.current) {
        const { onMouseMove, onMouseUp } = dragHandlersRef.current
        document.removeEventListener('mousemove', onMouseMove)
        document.removeEventListener('mouseup', onMouseUp)
        document.body.style.cursor = ''
        document.body.style.userSelect = ''
        dragHandlersRef.current = null
      }
    }
  }, [])

  const resetWidths = useCallback(() => {
    setWidths(initialWidths)
  }, [initialWidths])

  const getResizeProps = useCallback(
    (colKey) => {
      const onMouseDown = (e) => {
        e.preventDefault()
        e.stopPropagation()

        // Find the index of the column being resized
        const colIndex = columns.findIndex((c) => c.key === colKey)
        if (colIndex === -1) return

        const startX = e.clientX

        // Columns adjacent to the resize handle
        const leftCol = columns[colIndex]
        const rightCol = columns[colIndex + 1]

        if (!leftCol || !rightCol) return

        setResizing(colKey)

        const onMouseMove = (moveEvent) => {
          const delta = moveEvent.clientX - startX
          const leftMin = minWidths[leftCol.key]
          const rightMin = minWidths[rightCol.key]

          setWidths((prev) => ({
            ...prev,
            [leftCol.key]: Math.max(leftMin, prev[leftCol.key] + delta),
            [rightCol.key]: Math.max(rightMin, prev[rightCol.key] - delta)
          }))
        }

        const onMouseUp = () => {
          setResizing(null)
          document.removeEventListener('mousemove', onMouseMove)
          document.removeEventListener('mouseup', onMouseUp)
          document.body.style.cursor = ''
          document.body.style.userSelect = ''
          dragHandlersRef.current = null
        }

        document.body.style.cursor = 'col-resize'
        document.body.style.userSelect = 'none'
        document.addEventListener('mousemove', onMouseMove)
        document.addEventListener('mouseup', onMouseUp)

        dragHandlersRef.current = { onMouseMove, onMouseUp }
      }

      return {
        onMouseDown,
        role: 'separator',
        tabIndex: 0,
        'aria-label': `Resize ${colKey} column`,
        'aria-valuenow': widths[colKey],
        'aria-valuemin': minWidths[colKey],
        className: `col-resize-handle${resizing === colKey ? ' col-resize-handle--active' : ''}`
      }
    },
    [columns, widths, minWidths, resizing]
  )

  return { widths, resizing, getResizeProps, resetWidths }
}
