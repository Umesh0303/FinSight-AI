import React, { useState } from 'react';
import { MoreHorizontal } from 'lucide-react';
import { TRANSACTION_TREND_DATA } from '../../data/sampleData';

export const TransactionTrendChart: React.FC = () => {
  const [activeItem, setActiveItem] = useState<number | null>(null);

  const data = TRANSACTION_TREND_DATA;
  const maxCount = 2000;
  const maxAmount = 4; // in Lakhs

  // SVG viewport
  const svgWidth = 640;
  const svgHeight = 220;
  const padLeft = 40;
  const padRight = 45;
  const padBottom = 30;
  const padTop = 15;
  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom;

  const barWidth = 14;

  // Calculate coordinates for line chart
  const linePoints = data.map((d, i) => {
    const x = padLeft + (i / (data.length - 1)) * plotWidth;
    const y = padTop + plotHeight - (d.amountLakh / maxAmount) * plotHeight;
    return { x, y, ...d };
  });

  const linePathString = linePoints.reduce(
    (acc, pt, i) => (i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
    ''
  );

  return (
    <div className="bg-white border border-[#ece7dc] rounded-2xl p-5 shadow-[0_2px_8px_rgba(18,48,36,0.04)] flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h3 className="font-heading font-semibold text-base text-[#0a261c]">Transaction Trend</h3>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0d5941]" />
            <span className="text-slate-600 font-medium">Transaction Count</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#e2b947]" />
            <span className="text-slate-600 font-medium">Transaction Amount</span>
          </div>
          <button aria-label="Chart options" className="text-slate-400 hover:text-slate-600 ml-1">
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Interactive Chart Container */}
      <div className="relative w-full overflow-x-auto">
        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto min-w-[500px]">
          {/* Horizontal Grid Lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
            const y = padTop + plotHeight * (1 - pct);
            const countLabel = Math.round(maxCount * pct);
            const amountLabel = pct === 0 ? '₹ 0' : `₹ ${Math.round(maxAmount * pct)}L`;
            return (
              <g key={idx}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={svgWidth - padRight}
                  y2={y}
                  stroke="#f0ece1"
                  strokeDasharray="3 3"
                />
                {/* Left Y Axis (Count) */}
                <text
                  x={padLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  fontSize="10"
                  fill="#8c9a94"
                  fontFamily="system-ui"
                >
                  {countLabel.toLocaleString()}
                </text>
                {/* Right Y Axis (Amount Lakhs) */}
                <text
                  x={svgWidth - padRight + 8}
                  y={y + 4}
                  textAnchor="start"
                  fontSize="10"
                  fill="#8c9a94"
                  fontFamily="system-ui"
                >
                  {amountLabel}
                </text>
              </g>
            );
          })}

          {/* Bar Chart (Transaction Count in Emerald Green) */}
          {data.map((d, i) => {
            const x = padLeft + (i / (data.length - 1)) * plotWidth - barWidth / 2;
            const barH = (d.count / maxCount) * plotHeight;
            const y = padTop + plotHeight - barH;
            const isHovered = activeItem === i;

            return (
              <g
                key={i}
                className="cursor-pointer transition-opacity"
                onMouseEnter={() => setActiveItem(i)}
                onMouseLeave={() => setActiveItem(null)}
              >
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barH}
                  rx="3"
                  fill={isHovered ? '#127354' : '#0b4a36'}
                  className="transition-all duration-150"
                />
              </g>
            );
          })}

          {/* Line Chart (Transaction Amount in Golden Amber) */}
          <path
            d={linePathString}
            fill="none"
            stroke="#deb03e"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Line Chart Points */}
          {linePoints.map((pt, i) => {
            const isHovered = activeItem === i;
            return (
              <circle
                key={i}
                cx={pt.x}
                cy={pt.y}
                r={isHovered ? 5 : 3.5}
                fill="#ffffff"
                stroke="#d4a329"
                strokeWidth={isHovered ? 3 : 2}
                className="cursor-pointer transition-all duration-150"
                onMouseEnter={() => setActiveItem(i)}
                onMouseLeave={() => setActiveItem(null)}
              />
            );
          })}

          {/* X Axis Date Labels */}
          {['Oct 1', 'Oct 5', 'Oct 10', 'Oct 15', 'Oct 20', 'Oct 25', 'Oct 31'].map((label) => {
            const index = data.findIndex(d => d.date === label);
            if (index === -1) return null;
            const x = padLeft + (index / (data.length - 1)) * plotWidth;
            return (
              <text
                key={label}
                x={x}
                y={svgHeight - 10}
                textAnchor="middle"
                fontSize="10"
                fill="#6e7f77"
                fontWeight="500"
              >
                {label}
              </text>
            );
          })}
        </svg>

        {/* Hover detail pill if active */}
        {activeItem !== null && (
          <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-[#06241a] text-white px-3 py-1.5 rounded-lg text-xs shadow-lg flex items-center gap-3 pointer-events-none border border-[#165a44]">
            <span className="font-semibold text-[#f1cd6b]">{data[activeItem].date}</span>
            <span>Count: <strong className="text-white">{data[activeItem].count}</strong></span>
            <span>Volume: <strong className="text-[#a4f0d3]">₹{data[activeItem].amountLakh} Lakh</strong></span>
          </div>
        )}
      </div>
    </div>
  );
};
