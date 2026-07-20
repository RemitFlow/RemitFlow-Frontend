import React, { useRef } from 'react';
import './Chart.css';
import Button from './Button.jsx';

export default function Chart({ data, title }) {
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
    <div className="chart-container">
      <h3 className="chart-title">{title}</h3>
      <svg ref={chartRef} className="chart-svg" viewBox="0 0 200 100">
        {data.map((d, i) => (
          <rect
            key={i}
            x={i * 35}
            y={100 - (d.value / maxValue) * 100}
            width={30}
            height={(d.value / maxValue) * 100}
            fill="#6366f1"
          />
        ))}
      </svg>
      <div className="download-button">
        <Button onClick={downloadChart}>Download SVG</Button>
      </div>
    </div>
  );
}
