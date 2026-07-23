import { useCallback, useRef, useState } from 'react'
import './Tabs.css'

const SWIPE_THRESHOLD = 50

export default function Tabs({
  tabs,
  activeIndex: controlledIndex,
  onChange,
  className = ''
}) {
  const isControlled = controlledIndex !== undefined
  const [internalIndex, setInternalIndex] = useState(0)
  const activeIndex = isControlled ? controlledIndex : internalIndex

  const containerRef = useRef(null)
  const swipeStartX = useRef(0)
  const swipeDeltaX = useRef(0)
  const [isSwiping, setIsSwiping] = useState(false)
  const [translateX, setTranslateX] = useState(0)

  const selectTab = useCallback((index) => {
    if (index < 0 || index >= tabs.length || index === activeIndex) return
    if (!isControlled) setInternalIndex(index)
    onChange?.(index)
  }, [tabs.length, activeIndex, isControlled, onChange])

  const handleTouchStart = (e) => {
    if (tabs.length <= 1) return
    const touch = e.touches?.[0]
    if (!touch) return
    swipeStartX.current = touch.clientX
    swipeDeltaX.current = 0
    setIsSwiping(true)
  }

  const handleTouchMove = (e) => {
    if (!isSwiping || tabs.length <= 1) return
    const touch = e.touches?.[0]
    if (!touch) return
    swipeDeltaX.current = touch.clientX - swipeStartX.current
    const bound = Math.min(Math.abs(swipeDeltaX.current), containerRef.current?.offsetWidth || 300)
    const sign = swipeDeltaX.current > 0 ? 1 : -1
    setTranslateX(sign * bound)
  }

  const handleTouchEnd = () => {
    if (!isSwiping) return
    setIsSwiping(false)
    const delta = swipeDeltaX.current

    if (delta < -SWIPE_THRESHOLD && activeIndex < tabs.length - 1) {
      selectTab(activeIndex + 1)
    } else if (delta > SWIPE_THRESHOLD && activeIndex > 0) {
      selectTab(activeIndex - 1)
    }

    swipeStartX.current = 0
    swipeDeltaX.current = 0
    setTranslateX(0)
  }

  return (
    <div
      ref={containerRef}
      className={`tabs ${className}`.trim()}
      data-testid="tabs-container"
    >
      <div
        className="tabs-header"
        role="tablist"
        aria-label="Content tabs"
      >
        {tabs.map((tab, index) => (
          <button
            key={index}
            role="tab"
            id={`tab-${index}`}
            aria-selected={index === activeIndex}
            aria-controls={`tabpanel-${index}`}
            tabIndex={index === activeIndex ? 0 : -1}
            className={`tabs-tab ${index === activeIndex ? 'is-active' : ''}`}
            onClick={() => selectTab(index)}
            data-testid={`tab-${index}`}
          >
            {tab.label}
          </button>
        ))}
        <div
          className="tabs-indicator"
          style={{
            width: `${100 / tabs.length}%`,
            transform: `translateX(${activeIndex * 100}%)`
          }}
        />
      </div>

      <div
        className={`tabs-panels ${isSwiping ? 'is-swiping' : ''}`}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        style={
          isSwiping
            ? {
                transform: `translateX(${translateX}px)`,
                transition: 'none'
              }
            : undefined
        }
      >
        {tabs.map((tab, index) => (
          <div
            key={index}
            role="tabpanel"
            id={`tabpanel-${index}`}
            aria-labelledby={`tab-${index}`}
            hidden={index !== activeIndex}
            className="tabs-panel"
            data-testid={`tabpanel-${index}`}
          >
            {tab.content}
          </div>
        ))}
      </div>
    </div>
  )
}