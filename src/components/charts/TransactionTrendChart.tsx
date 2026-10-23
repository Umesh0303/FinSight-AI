import React, { useState } from 'react';
import { MoreHorizontal, Loader2 } from 'lucide-react';

export interface TrendItem {
  date: string;
  count: number;
  amountLakh: number;
  volumeInr?: number;
}

interface TransactionTrendChartProps {
  data?: TrendItem[];
  title?: string;
  selectedRange?: string;
  onRangeChange?: (range: string) => void;
  isLoading?: boolean;
}

export const TransactionTrendChart: React.FC<TransactionTrendChartProps> = ({
  data,
  title = 'Transaction Trend',
  selectedRange = 'all',
  onRangeChange,
  isLoading = false
}) => {
  const [activeItem, setActiveItem] = useState<number | null>(null);

  const chartData = data || [];

  // Dynamically calculate scale maxima based on actual data
  const rawMaxCount = Math.max(...(chartData.length > 0 ? chartData.map((d) => d.count) : [100]));
  const rawMaxAmount = Math.max(...(chartData.length > 0 ? chartData.map((d) => d.amountLakh) : [1]));
  const maxCount = Math.ceil(rawMaxCount * 1.15);
  const maxAmount = Math.ceil(rawMaxAmount * 1.15);

  // SVG viewport
  const svgWidth = 640;
  const svgHeight = 220;
  const padLeft = 45;
  const padRight = 55;
  const padBottom = 30;
  const padTop = 15;
  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom;

  const barWidth = Math.max(6, Math.min(20, Math.floor(plotWidth / (chartData.length * 1.8))));

  // Calculate coordinates for line chart
  const linePoints = chartData.map((d, i) => {
    const x = padLeft + (i / Math.max(chartData.length - 1, 1)) * plotWidth;
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
        <div>
          <h3 className="font-heading font-semibold text-base text-[#0a261c]">{title}</h3>
          <p className="text-[11px] text-slate-500 mt-0.5">
            Real time-series aggregation from Supabase transactions table ({chartData.reduce((acc, c) => acc + c.count, 0).toLocaleString()} txns in view)
          </p>
        </div>

        <div className="flex items-center gap-3 text-xs flex-wrap">
          {onRangeChange && (
            <div className="flex items-center gap-1 p-0.5 bg-[#faf7f0] border border-[#e5dfd2] rounded-lg text-[11px]">
              {[
                { id: 'all', label: '12 Months' },
                { id: 'h1', label: 'H1 (Oct-Mar)' },
                { id: 'h2', label: 'H2 (Apr-Sep)' }
              ].map((r) => (
                <button
                  key={r.id}
                  onClick={() => onRangeChange(r.id)}
                  className={`px-2 py-0.5 rounded-md font-medium transition-colors cursor-pointer ${
                    selectedRange === r.id
                      ? 'bg-[#0d4a36] text-white font-semibold'
                      : 'text-slate-600 hover:text-black'
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          )}

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#0d5941]" />
              <span className="text-slate-600 font-medium">Txn Count</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#deb03e]" />
              <span className="text-slate-600 font-medium">Volume (Lakhs)</span>
            </div>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="h-56 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin text-[#0d5941] mb-2" />
          <span className="text-xs">Aggregating time-series data from Supabase...</span>
        </div>
      ) : chartData.length === 0 ? (
        <div className="h-56 flex flex-col items-center justify-center text-slate-400">
          <span className="text-xs">No transaction trend records available for the selected range.</span>
        </div>
      ) : (
        /* Interactive Chart Container */
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
                    {countLabel >= 1000 ? `${(countLabel / 1000).toFixed(0)}k` : countLabel}
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
            {chartData.map((d, i) => {
              const x = padLeft + (i / Math.max(chartData.length - 1, 1)) * plotWidth - barWidth / 2;
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

            {/* Dynamic X Axis Date Labels */}
            {chartData.map((d, index) => {
              const x = padLeft + (index / Math.max(chartData.length - 1, 1)) * plotWidth;
              return (
                <text
                  key={d.date}
                  x={x}
                  y={svgHeight - 10}
                  textAnchor="middle"
                  fontSize="10"
                  fill="#6e7f77"
                  fontWeight="500"
                >
                  {d.date}
                </text>
              );
            })}
          </svg>

          {/* Hover detail pill if active */}
          {activeItem !== null && chartData[activeItem] && (
            <div className="absolute top-2 left-1/2 -translate-x-1/2 bg-[#06241a] text-white px-3 py-1.5 rounded-lg text-xs shadow-lg flex items-center gap-3 pointer-events-none border border-[#165a44]">
              <span className="font-semibold text-[#f1cd6b]">{chartData[activeItem].date}</span>
              <span>Count: <strong className="text-white">{chartData[activeItem].count.toLocaleString()}</strong></span>
              <span>Volume: <strong className="text-[#a4f0d3]">₹ {chartData[activeItem].amountLakh.toLocaleString()} Lakh</strong></span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
