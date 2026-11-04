import React, { useState, useMemo } from 'react';
import { TrendingUp } from 'lucide-react';
import { formatINR } from '../../data/sampleData';

export interface MonthlySpendPoint {
  monthKey: string; // e.g. "2025-12"
  label: string; // e.g. "Dec 2025"
  amount: number;
  count: number;
}

interface MonthlySpendTrendChartProps {
  data: MonthlySpendPoint[];
  title?: string;
  className?: string;
}

export const MonthlySpendTrendChart: React.FC<MonthlySpendTrendChartProps> = ({
  data,
  title = 'Monthly Spend Trend',
  className = ''
}) => {
  const [activeIdx, setActiveIdx] = useState<number | null>(null);
  const [rangeFilter, setRangeFilter] = useState<'all' | '6m' | '3m'>('all');

  const filteredData = useMemo(() => {
    if (!data || data.length === 0) return [];
    if (rangeFilter === '3m') return data.slice(-3);
    if (rangeFilter === '6m') return data.slice(-6);
    return data;
  }, [data, rangeFilter]);

  const maxAmount = useMemo(() => {
    if (filteredData.length === 0) return 10000;
    const maxVal = Math.max(...filteredData.map((d) => d.amount));
    return maxVal > 0 ? Math.ceil(maxVal * 1.15) : 10000;
  }, [filteredData]);

  // SVG dimensions
  const svgWidth = 480;
  const svgHeight = 220;
  const padLeft = 45;
  const padRight = 20;
  const padTop = 20;
  const padBottom = 35;
  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom;

  const points = useMemo(() => {
    if (filteredData.length === 0) return [];
    return filteredData.map((d, i) => {
      const x = padLeft + (i / Math.max(filteredData.length - 1, 1)) * plotWidth;
      const y = padTop + plotHeight - (d.amount / maxAmount) * plotHeight;
      return { x, y, ...d };
    });
  }, [filteredData, maxAmount, plotWidth, plotHeight]);

  const linePath = useMemo(() => {
    if (points.length === 0) return '';
    return points.reduce(
      (acc, pt, i) => (i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
      ''
    );
  }, [points]);

  const areaPath = useMemo(() => {
    if (points.length === 0) return '';
    const firstX = points[0].x;
    const lastX = points[points.length - 1].x;
    const bottomY = padTop + plotHeight;
    return `${linePath} L ${lastX} ${bottomY} L ${firstX} ${bottomY} Z`;
  }, [points, linePath, plotHeight]);

  const totalPeriodSpend = useMemo(() => {
    return filteredData.reduce((acc, d) => acc + d.amount, 0);
  }, [filteredData]);

  return (
    <div
      className={`bg-white border border-[#ece7dc] rounded-2xl p-5 shadow-[0_2px_8px_rgba(18,48,36,0.04)] flex flex-col justify-between ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#ebf7f1] text-[#0d5941] flex items-center justify-center flex-shrink-0">
            <TrendingUp className="w-4 h-4 text-[#0d5941]" />
          </div>
          <div>
            <h3 className="font-heading font-semibold text-sm text-[#0a261c] leading-tight">
              {title}
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">
              ₹ {formatINR(totalPeriodSpend)} in view
            </span>
          </div>
        </div>

        {/* Range Filter Buttons */}
        <div className="flex items-center gap-1 p-0.5 bg-[#faf8f3] border border-[#e5dfd2] rounded-lg text-[10px]">
          {(['all', '6m', '3m'] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRangeFilter(r)}
              className={`px-2 py-0.5 rounded font-medium transition-colors cursor-pointer ${
                rangeFilter === r
                  ? 'bg-[#0d5941] text-white font-semibold shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {r === 'all' ? 'All' : r.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Chart Canvas */}
      {filteredData.length === 0 ? (
        <div className="h-44 flex flex-col items-center justify-center text-slate-400 text-xs text-center py-6">
          No monthly spend data available.
        </div>
      ) : (
        <div className="relative w-full">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto overflow-visible">
            <defs>
              <linearGradient id="spendAreaGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#0d5941" stopOpacity="0.25" />
                <stop offset="100%" stopColor="#0d5941" stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Horizontal Grid lines */}
            {[0, 0.33, 0.66, 1].map((pct, idx) => {
              const y = padTop + plotHeight * (1 - pct);
              const labelVal = Math.round(maxAmount * pct);
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
                  <text
                    x={padLeft - 6}
                    y={y + 3}
                    textAnchor="end"
                    fontSize="9"
                    fill="#8c9a94"
                    fontFamily="system-ui"
                  >
                    {labelVal >= 1000 ? `${Math.round(labelVal / 1000)}k` : labelVal}
                  </text>
                </g>
              );
            })}

            {/* Gradient Area */}
            <path d={areaPath} fill="url(#spendAreaGrad)" />

            {/* Primary Trend Line */}
            <path
              d={linePath}
              fill="none"
              stroke="#0d5941"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Data Points */}
            {points.map((pt, i) => {
              const isHovered = activeIdx === i;
              return (
                <g
                  key={i}
                  className="cursor-pointer"
                  onMouseEnter={() => setActiveIdx(i)}
                  onMouseLeave={() => setActiveIdx(null)}
                >
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isHovered ? 6 : 4}
                    fill="#ffffff"
                    stroke="#0d5941"
                    strokeWidth={isHovered ? 3 : 2}
                    className="transition-all duration-150"
                  />
                </g>
              );
            })}

            {/* X-Axis Month Labels */}
            {points.map((pt, i) => (
              <text
                key={i}
                x={pt.x}
                y={svgHeight - 12}
                textAnchor="middle"
                fontSize="9"
                fill="#6e7f77"
                fontWeight={activeIdx === i ? '600' : '400'}
              >
                {pt.label}
              </text>
            ))}
          </svg>

          {/* Floating Tooltip */}
          {activeIdx !== null && points[activeIdx] && (
            <div className="absolute top-1 left-1/2 -translate-x-1/2 bg-[#06241a] text-white px-3 py-1.5 rounded-lg text-xs shadow-lg flex items-center gap-3 pointer-events-none border border-[#165a44] z-10">
              <span className="font-semibold text-[#f1cd6b]">{points[activeIdx].label}</span>
              <span>Spend: <strong className="text-white">₹ {formatINR(points[activeIdx].amount)}</strong></span>
              <span className="text-[10px] text-slate-300">({points[activeIdx].count} txns)</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
