import { useCallback, useRef, useState } from 'react';
import Loader from './Loader.jsx';
import './PullToRefresh.css';

/**
 * PullToRefresh wrapper component for mobile lists.
 * Supports touch gestures (touchstart, touchmove, touchend) and accessible manual refresh.
 *
 * @param {object} props
 * @param {Function} props.onRefresh - Async function called to reload data
 * @param {React.ReactNode} props.children - List content
 * @param {number} [props.pullThreshold=60] - Drag distance threshold in px
 * @param {boolean} [props.disabled=false] - Whether pull-to-refresh is disabled
 * @param {string} [props.className=''] - Additional CSS class name
 */
export default function PullToRefresh({
  onRefresh,
  children,
  pullThreshold = 60,
  disabled = false,
  className = '',
}) {
  const [pullDistance, setPullDistance] = useState(0);
  const [isPulling, setIsPulling] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const containerRef = useRef(null);
  const startYRef = useRef(0);

  const handleRefresh = useCallback(async () => {
    if (isRefreshing || !onRefresh) return;
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
      setPullDistance(0);
      setIsPulling(false);
    }
  }, [isRefreshing, onRefresh]);

  const handleTouchStart = (e) => {
    if (disabled || isRefreshing) return;
    const container = containerRef.current;
    const scrollTop = container ? container.scrollTop : window.scrollY;
    if (scrollTop <= 0 && e.touches && e.touches.length === 1) {
      startYRef.current = e.touches[0].clientY;
      setIsPulling(true);
    }
  };

  const handleTouchMove = (e) => {
    if (!isPulling || disabled || isRefreshing || !startYRef.current) return;
    const container = containerRef.current;
    const scrollTop = container ? container.scrollTop : window.scrollY;
    if (scrollTop > 0) return;

    const currentY = e.touches[0].clientY;
    const diff = currentY - startYRef.current;

    if (diff > 0) {
      // Resistance factor for pull motion
      const distance = Math.min(diff * 0.5, 120);
      setPullDistance(distance);
    } else {
      setPullDistance(0);
    }
  };

  const handleTouchEnd = () => {
    if (!isPulling) return;
    setIsPulling(false);
    startYRef.current = 0;

    if (pullDistance >= pullThreshold && !isRefreshing) {
      handleRefresh();
    } else {
      setPullDistance(0);
    }
  };

  const isTriggered = pullDistance >= pullThreshold;

  return (
    <div
      ref={containerRef}
      className={`ptr-container ${isPulling ? 'is-pulling' : ''} ${className}`.trim()}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      data-testid="pull-to-refresh-container"
    >
      <div
        className={`ptr-indicator ${isRefreshing ? 'is-refreshing' : ''} ${
          isTriggered ? 'is-triggered' : ''
        }`}
        style={{
          height: isRefreshing ? `${pullThreshold}px` : `${pullDistance}px`,
          opacity: isRefreshing || pullDistance > 0 ? 1 : 0,
        }}
        aria-live="polite"
        data-testid="ptr-indicator"
      >
        <div className="ptr-indicator-content">
          {isRefreshing ? (
            <>
              <Loader size="small" />
              <span className="ptr-text">Refreshing...</span>
            </>
          ) : isTriggered ? (
            <>
              <span className="ptr-icon">↑</span>
              <span className="ptr-text">Release to refresh</span>
            </>
          ) : (
            <>
              <span className="ptr-icon">↓</span>
              <span className="ptr-text">Pull down to refresh</span>
            </>
          )}
        </div>
      </div>

      <div
        className="ptr-content"
        style={{
          transform:
            pullDistance > 0 || isRefreshing
              ? `translateY(${isRefreshing ? pullThreshold : pullDistance}px)`
              : 'none',
          transition: isPulling ? 'none' : 'transform 0.2s ease-out',
        }}
      >
        {children}
      </div>

      {/* Manual refresh trigger for screen readers and accessibility */}
      <button
        type="button"
        className="ptr-manual-trigger"
        onClick={handleRefresh}
        disabled={isRefreshing}
        aria-label="Refresh list"
        data-testid="ptr-manual-button"
      >
        Refresh
      </button>
    </div>
  );
}
