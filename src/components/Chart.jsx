import React, { useRef } from 'react';
import './Chart.css';
import Button from './Button.jsx';

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
  const chartRef = useRef(null);

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

  const maxValue = Math.max(...data.map(d => d.value), 1);

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
