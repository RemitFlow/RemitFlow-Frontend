import React, { useRef, useState } from 'react';
import './Chart.css';
import Button from './Button.jsx';

export default function Chart({ data, title, formatValue }) {
  const chartRef = useRef(null);
  const [hoveredIndex, setHoveredIndex] = useState(null);

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
  const barCount = data.length;

  return (
    <div className="chart-container">
      <h3 className="chart-title">{title}</h3>
      <div className="chart-wrapper">
        <svg ref={chartRef} className="chart-svg" viewBox="0 0 100 100">
          {data.map((d, i) => (
            <rect
              key={i}
              x={i * (100 / barCount)}
              y={100 - (d.value / maxValue) * 100}
              width={100 / barCount - 2}
              height={(d.value / maxValue) * 100}
              fill={hoveredIndex === i ? '#4f46e5' : '#6366f1'}
              className="chart-bar"
              onMouseEnter={() => setHoveredIndex(i)}
              onMouseLeave={() => setHoveredIndex(null)}
            />
          ))}
        </svg>
        {hoveredIndex !== null && (
          <div className="chart-tooltip" role="tooltip" style={{ left: `${(hoveredIndex + 0.5) * (100 / barCount)}%` }}>
            <div className="chart-tooltip-value">
              {formatValue ? formatValue(data[hoveredIndex]) : data[hoveredIndex].value}
            </div>
            {data[hoveredIndex].label && (
              <div className="chart-tooltip-label">{data[hoveredIndex].label}</div>
            )}
          </div>
        )}
      </div>
      <div className="download-button">
        <Button onClick={downloadChart}>Download SVG</Button>
      </div>
    </div>
  );
}
