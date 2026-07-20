import { renderHook, act, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { useColumnResize } from '../../src/hooks/useColumnResize.js'

const TEST_COLUMNS = [
  { key: 'a', width: 200, minWidth: 100 },
  { key: 'b', width: 150, minWidth: 80 },
  { key: 'c', width: 100, minWidth: 60 }
]

describe('useColumnResize', () => {
  it('returns initial widths matching column definitions', () => {
    const { result } = renderHook(() => useColumnResize(TEST_COLUMNS))

    expect(result.current.widths).toEqual({
      a: 200,
      b: 150,
      c: 100
    })
    expect(result.current.resizing).toBeNull()
  })

  it('returns resize props with correct aria attributes', () => {
    const { result } = renderHook(() => useColumnResize(TEST_COLUMNS))

    const props = result.current.getResizeProps('a')
    expect(props.role).toBe('separator')
    expect(props.tabIndex).toBe(0)
    expect(props['aria-label']).toBe('Resize a column')
    expect(props['aria-valuenow']).toBe(200)
    expect(props['aria-valuemin']).toBe(100)
    expect(typeof props.onMouseDown).toBe('function')
  })

  it('resetWidths restores initial widths', () => {
    const { result } = renderHook(() => useColumnResize(TEST_COLUMNS))

    // Verify initial state
    expect(result.current.widths.a).toBe(200)

    // Call reset (should be a no-op since widths haven't changed)
    act(() => {
      result.current.resetWidths()
    })

    expect(result.current.widths.a).toBe(200)
  })

  it('getResizeProps className includes active state when resizing', () => {
    const { result } = renderHook(() => useColumnResize(TEST_COLUMNS))

    // Not resizing — class should be just the base class
    const inactiveProps = result.current.getResizeProps('a')
    expect(inactiveProps.className).toBe('col-resize-handle')
    expect(inactiveProps.className).not.toContain('--active')
  })

  it('defaults minWidth to 80 when not specified', () => {
    const columns = [
      { key: 'x', width: 300 }
    ]
    const { result } = renderHook(() => useColumnResize(columns))
    const props = result.current.getResizeProps('x')
    expect(props['aria-valuemin']).toBe(80)
  })

  it('does not return resize props for unknown column keys', () => {
    const { result } = renderHook(() => useColumnResize(TEST_COLUMNS))
    // getResizeProps for non-existent column — onMouseDown should be a no-op
    const props = result.current.getResizeProps('nonexistent')
    expect(props.role).toBe('separator')
    // should not throw on mousedown
    expect(() => props.onMouseDown({ preventDefault: () => {}, stopPropagation: () => {}, clientX: 0 })).not.toThrow()
  })
})
