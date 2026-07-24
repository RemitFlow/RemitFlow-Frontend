import React, { useRef, useState, useMemo } from 'react';
import './Chart.css';
import Button from './Button.jsx';
import EmptyState from './EmptyState.jsx';

export default function Chart({
  data,
  title,
  emptyStateIcon = '📊',
  emptyStateTitle = 'No chart data',
  emptyStateMessage = 'Add some data to visualize.'
}) {
const SHIMMER_BARS = [
  { height: 45 },
  { height: 70 },
  { height: 30 },
  { height: 85 },
  { height: 55 },
  { height: 40 },
  { height: 65 },
  { height: 50 }
];

/**
 * Bar chart component with loading shimmer support.
 * @param {object} props
 * @param {Array<{value: number}>} props.data
 * @param {string} props.title
 * @param {boolean} [props.loading] - show shimmer placeholder when true
 */
export default function Chart({ data, title, loading = false }) {
const DEFAULT_COLORS = ['#6366f1', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function Chart({ data, series, title, formatValue }) {
  const chartRef = useRef(null);
  const [hoveredBar, setHoveredBar] = useState(null);
  const [hiddenSeries, setHiddenSeries] = useState(new Set());

  const isMultiSeries = Array.isArray(series) && series.length > 0;

  const normalized = useMemo(() => {
    if (isMultiSeries) {
      const allSeries = series.map((s, i) => ({
        name: s.name,
        color: s.color || DEFAULT_COLORS[i % DEFAULT_COLORS.length],
        data: s.data,
      }));
      const barCount = Math.max(...allSeries.map(s => s.data.length), 0);
      const visibleSeries = allSeries.filter(s => !hiddenSeries.has(s.name));
      const maxValue = Math.max(...visibleSeries.flatMap(s => s.data.map(d => d.value)), 1);
      return { allSeries, barCount, maxValue };
    }
    return {
      allSeries: [{ name: null, color: '#6366f1', data }],
      barCount: data.length,
      maxValue: Math.max(...data.map(d => d.value), 1),
    };
  }, [data, series, hiddenSeries, isMultiSeries]);

  const { allSeries, barCount, maxValue } = normalized;
  const numSeries = allSeries.length;
  const groupWidth = barCount > 0 ? 100 / barCount : 100;
  const barWidth = isMultiSeries && barCount > 0
    ? (groupWidth - 2) / numSeries
    : groupWidth - 2;

  const getBarHeight = (v) => (v / maxValue) * 100;
  const getBarY = (v) => 100 - getBarHeight(v);

  const toggleSeries = (name) => {
    setHiddenSeries(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  };

  const downloadChart = () => {
    const svg = chartRef.current;
    const serializer = new XMLSerializer();
    const source = serializer.serializeToString(svg);
    const blob = new Blob([source], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${title.toLowerCase().replace(/\s+/g, '-')}.svg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  if (!data || data.length === 0) {
    return (
      <div className="chart-container">
        <EmptyState
          icon={emptyStateIcon}
          title={emptyStateTitle}
          message={emptyStateMessage}
        />
      </div>
    );
  }

  const maxValue = Math.max(...data.map(d => d.value), 1);
  const barCount = data.length;
  const renderBars = () => {
    if (isMultiSeries) {
      return Array.from({ length: barCount }).map((_, i) =>
        allSeries.map((s, si) => {
          const dp = s.data[i];
          if (!dp) return null;
          const isHidden = hiddenSeries.has(s.name);
          return (
            <rect
              key={`${s.name}-${i}`}
              x={i * groupWidth + barWidth * si}
              y={getBarY(dp.value)}
              width={barWidth}
              height={getBarHeight(dp.value)}
              fill={isHidden ? '#e5e7eb' : s.color}
              className="chart-bar"
              opacity={isHidden ? 0.3 : 1}
              onMouseEnter={() => setHoveredBar({ seriesIndex: si, itemIndex: i })}
              onMouseLeave={() => setHoveredBar(null)}
            />
          );
        })
      );
    }

    if (!data) return null;
    return data.map((d, i) => {
      const isHighlighted = hoveredBar?.itemIndex === i;
      return (
        <rect
          key={i}
          x={i * (100 / barCount)}
          y={getBarY(d.value)}
          width={barWidth}
          height={getBarHeight(d.value)}
          fill={isHighlighted ? '#4f46e5' : '#6366f1'}
          className="chart-bar"
          onMouseEnter={() => setHoveredBar({ seriesIndex: 0, itemIndex: i })}
          onMouseLeave={() => setHoveredBar(null)}
        />
      );
    });
  };

  const renderTooltip = () => {
    if (!hoveredBar) return null;
    const { seriesIndex, itemIndex } = hoveredBar;

    if (isMultiSeries) {
      const s = allSeries[seriesIndex];
      const dp = s?.data[itemIndex];
      if (!dp) return null;
      return (
        <div
          className="chart-tooltip"
          role="tooltip"
          style={{ left: `${(itemIndex + 0.5) * groupWidth}%` }}
        >
          <div className="chart-tooltip-value">
            {s.name}: {formatValue ? formatValue(dp, s.name) : dp.value}
          </div>
          {dp.label && <div className="chart-tooltip-label">{dp.label}</div>}
        </div>
      );
    }

    const dp = data[itemIndex];
    return (
      <div
        className="chart-tooltip"
        role="tooltip"
        style={{ left: `${(itemIndex + 0.5) * (100 / barCount)}%` }}
      >
        <div className="chart-tooltip-value">
          {formatValue ? formatValue(dp) : dp.value}
        </div>
        {dp.label && <div className="chart-tooltip-label">{dp.label}</div>}
      </div>
    );
  };

  return (
    <div className="chart-container" aria-busy={loading}>
      <h3 className="chart-title">{title}</h3>
      {loading ? (
        <div className="chart-shimmer" aria-hidden="true">
          {SHIMMER_BARS.map((bar, i) => (
            <div
              key={i}
              className="chart-shimmer-bar"
              style={{ height: `${bar.height}%` }}
            />
          ))}
        </div>
      ) : (
        <svg ref={chartRef} className="chart-svg" viewBox="0 0 100 100">
          {data.map((d, i) => (
            <rect
              key={i}
              x={i * (100 / data.length)}
              y={100 - (d.value / maxValue) * 100}
              width={100 / data.length - 2}
              height={(d.value / maxValue) * 100}
              fill="#6366f1"
            />
          ))}
        </svg>
        {hoveredIndex !== null && (
          <div
            className="chart-tooltip"
            role="tooltip"
            style={{ left: `${(hoveredIndex + 0.5) * (100 / barCount)}%` }}
          >
            <div className="chart-tooltip-value">
              {formatValue
                ? formatValue(data[hoveredIndex])
                : data[hoveredIndex].value}
            </div>
            {data[hoveredIndex].label && (
              <div className="chart-tooltip-label">
                {data[hoveredIndex].label}
              </div>
            )}
          </div>
        )}
      </div>
          {renderBars()}
        </svg>
        {renderTooltip()}
      </div>
      {isMultiSeries && (
        <div className="chart-legend" role="group" aria-label="chart series legend">
          {series.map((s) => {
            const isHidden = hiddenSeries.has(s.name);
            return (
              <button
                key={s.name}
                type="button"
                className={`chart-legend-item${isHidden ? ' chart-legend-item--dimmed' : ''}`}
                onClick={() => toggleSeries(s.name)}
                aria-pressed={!isHidden}
              >
                <span className="chart-legend-swatch" style={{ backgroundColor: s.color || DEFAULT_COLORS[series.indexOf(s) % DEFAULT_COLORS.length] }} />
                <span className="chart-legend-label">{s.name}</span>
              </button>
            );
          })}
        </div>
      )}
      <div className="download-button">
        {loading ? (
          <span className="chart-shimmer-btn skeleton-row" style={{ height: '2.5rem', width: '8rem' }} />
        ) : (
          <Button onClick={downloadChart}>Download SVG</Button>
        )}
      </div>
    </div>
  );
}
