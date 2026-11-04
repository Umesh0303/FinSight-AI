import React, { useState } from 'react';
import { formatINR } from '../../data/sampleData';

export interface PaymentMethodItem {
  method: string;
  count: number;
  percentage: number;
  volumeInr?: number;
}

interface PaymentMethodLineChartProps {
  title?: string;
  subtitle?: string;
  data: PaymentMethodItem[];
  selectedMethod?: string | null;
  onSelectMethod?: (method: string) => void;
  className?: string;
}

export const PaymentMethodLineChart: React.FC<PaymentMethodLineChartProps> = ({
  title = 'Total Transactions by Payment Method',
  subtitle = 'Transaction volume distribution across payment rails',
  data,
  selectedMethod,
  onSelectMethod,
  className = ''
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Fallback if data is empty
  const items = data.length > 0 ? data : [
    { method: 'UPI', count: 81464, percentage: 37.4, volumeInr: 415610000 },
    { method: 'Debit Card', count: 42910, percentage: 19.7, volumeInr: 221320000 },
    { method: 'Net Banking', count: 32019, percentage: 14.7, volumeInr: 165140000 },
    { method: 'Credit Card', count: 30277, percentage: 13.9, volumeInr: 156130000 },
    { method: 'IMPS/NEFT', count: 22435, percentage: 10.3, volumeInr: 115720000 },
    { method: 'ATM', count: 8713, percentage: 4.0, volumeInr: 49670000 }
  ];

  const maxCount = Math.max(...items.map(d => d.count), 1);
  const totalCount = items.reduce((sum, d) => sum + d.count, 0) || 1;

  // Chart dimensions & coordinates
  const svgWidth = 560;
  const svgHeight = 200;
  const padLeft = 45;
  const padRight = 30;
  const padTop = 25;
  const padBottom = 45;

  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;

  const points = items.map((item, idx) => {
    const x = padLeft + (idx / Math.max(items.length - 1, 1)) * chartW;
    const y = padTop + chartH - (item.count / maxCount) * chartH;
    return { x, y, item, idx };
  });

  const linePath = points.reduce((path, pt, i) => {
    return i === 0 ? `M ${pt.x} ${pt.y}` : `${path} L ${pt.x} ${pt.y}`;
  }, '');

  const areaPath = points.length > 0
    ? `${linePath} L ${points[points.length - 1].x} ${padTop + chartH} L ${points[0].x} ${padTop + chartH} Z`
    : '';

  const activePoint = hoveredIdx !== null
    ? points[hoveredIdx]
    : selectedMethod
    ? points.find(p => p.item.method === selectedMethod)
    : null;

  return (
    <div className={`bg-white border border-[#ece7dc] rounded-2xl p-5 shadow-xs flex flex-col justify-between ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div>
          <h3 className="font-heading font-semibold text-base text-[#0a261c]">
            {title}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {subtitle} ({totalCount.toLocaleString()} txns)
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedMethod && selectedMethod !== 'ALL' && onSelectMethod && (
            <button
              onClick={() => onSelectMethod('ALL')}
              className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
            >
              Clear selection ({selectedMethod})
            </button>
          )}
          {activePoint && (
            <div className="text-right hidden sm:block">
              <span className="text-xs font-bold text-[#093425] font-mono block">
                {activePoint.item.count.toLocaleString()} txns ({activePoint.item.percentage}%)
              </span>
              {activePoint.item.volumeInr && (
                <span className="text-[10px] text-slate-400 font-mono">
                  ₹ {formatINR(activePoint.item.volumeInr)}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Responsive SVG Line Chart */}
      <div className="relative w-full h-[210px] my-auto">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-full overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id="paymentMethodGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0d5941" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#0d5941" stopOpacity="0.01" />
            </linearGradient>
          </defs>

          {/* Horizontal Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const y = padTop + chartH * (1 - pct);
            const val = Math.round(maxCount * pct);
            return (
              <g key={i}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={svgWidth - padRight}
                  y2={y}
                  stroke="#ece7dc"
                  strokeDasharray={i === 0 ? 'none' : '3 3'}
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 8}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[9px] fill-slate-400 font-mono"
                >
                  {val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val}
                </text>
              </g>
            );
          })}

          {/* Area fill */}
          {areaPath && (
            <path
              d={areaPath}
              fill="url(#paymentMethodGrad)"
            />
          )}

          {/* Line stroke */}
          {linePath && (
            <path
              d={linePath}
              fill="none"
              stroke="#0d5941"
              strokeWidth="2.75"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Data Points */}
          {points.map((pt) => {
            const isSelected = selectedMethod === pt.item.method;
            const isHovered = hoveredIdx === pt.idx;
            const isDimmed = selectedMethod && selectedMethod !== 'ALL' && !isSelected;

            return (
              <g
                key={pt.idx}
                className="cursor-pointer transition-transform"
                onClick={() => onSelectMethod && onSelectMethod(isSelected ? 'ALL' : pt.item.method)}
                onMouseEnter={() => setHoveredIdx(pt.idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Invisible hover target */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r="14"
                  fill="transparent"
                />

                {/* Outer halo */}
                {(isHovered || isSelected) && (
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r={isSelected ? 9 : 7}
                    fill="#10b981"
                    fillOpacity="0.25"
                  />
                )}

                {/* Center marker */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isSelected ? 5.5 : isHovered ? 4.5 : 3.5}
                  fill={isSelected ? '#042f22' : '#0d5941'}
                  stroke="#ffffff"
                  strokeWidth="2"
                  opacity={isDimmed ? 0.35 : 1}
                />

                {/* X-axis labels */}
                <text
                  x={pt.x}
                  y={svgHeight - 12}
                  textAnchor="middle"
                  className={`text-[10px] sm:text-[11px] font-medium transition-colors ${
                    isSelected
                      ? 'fill-[#042f22] font-bold'
                      : isHovered
                      ? 'fill-slate-900 font-semibold'
                      : 'fill-slate-600'
                  }`}
                >
                  {pt.item.method}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Summary Footer */}
      <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-[#ece7dc] mt-2 flex-wrap gap-2">
        <span className="text-[11px]">
          Click any payment rail to cross-filter transactions across all views.
        </span>
        <span className="font-mono text-[11px] font-semibold text-slate-700">
          Top Rail: <strong>{items[0]?.method || 'UPI'}</strong> ({items[0]?.percentage || 37.4}%)
        </span>
      </div>
    </div>
  );
};
