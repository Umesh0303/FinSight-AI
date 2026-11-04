import React, { useState } from 'react';

export interface TransactionStatusItem {
  status: string;
  count: number;
  percentage: number;
  color?: string;
}

interface TransactionStatusDoughnutProps {
  title?: string;
  subtitle?: string;
  totalTransactions: number;
  data: TransactionStatusItem[];
  selectedStatus?: string | null;
  onSelectStatus?: (status: string) => void;
  className?: string;
}

const STATUS_COLORS: Record<string, string> = {
  Success: '#0d5941', // Emerald
  Failed: '#dc2626',  // Red
  Reversed: '#d97706' // Amber
};

export const TransactionStatusDoughnut: React.FC<TransactionStatusDoughnutProps> = ({
  title = 'Total Transactions by Status',
  subtitle = 'Ledger execution & settlement outcomes',
  totalTransactions,
  data,
  selectedStatus,
  onSelectStatus,
  className = ''
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const items = data.length > 0 ? data : [
    { status: 'Success', count: 210284, percentage: 96.54, color: '#0d5941' },
    { status: 'Failed', count: 5898, percentage: 2.71, color: '#dc2626' },
    { status: 'Reversed', count: 1636, percentage: 0.75, color: '#d97706' }
  ];

  const total = items.reduce((sum, s) => sum + s.count, 0) || 1;

  const radius = 60;
  const strokeWidth = 22;
  const circumference = 2 * Math.PI * radius;
  let accumulatedAngle = -90;

  const activeItem = hoveredIdx !== null
    ? items[hoveredIdx]
    : selectedStatus
    ? items.find(s => s.status === selectedStatus)
    : null;

  return (
    <div className={`bg-white border border-[#ece7dc] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="font-heading font-semibold text-sm sm:text-base text-[#0a261c]">
            {title}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {subtitle}
          </p>
        </div>

        {selectedStatus && selectedStatus !== 'ALL' && onSelectStatus && (
          <button
            onClick={() => onSelectStatus('ALL')}
            className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-0.5 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
          >
            Clear ({selectedStatus})
          </button>
        )}
      </div>

      {/* Donut & Legend Layout */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 my-auto min-w-0">
        {/* SVG Donut */}
        <div className="relative w-36 h-36 flex-shrink-0 mx-auto">
          <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90 transform">
            {items.map((seg, idx) => {
              const segColor = seg.color || STATUS_COLORS[seg.status] || '#64748b';
              const fraction = total > 0 ? seg.count / total : 0;
              const strokeDasharray = `${fraction * circumference} ${circumference}`;
              const strokeDashoffset = -(accumulatedAngle + 90) * (circumference / 360);
              accumulatedAngle += fraction * 360;

              const isSelected = selectedStatus === seg.status;
              const isHovered = hoveredIdx === idx;
              const isDimmed = selectedStatus && selectedStatus !== 'ALL' && !isSelected;

              return (
                <circle
                  key={seg.status}
                  cx="80"
                  cy="80"
                  r={radius}
                  fill="transparent"
                  stroke={segColor}
                  strokeWidth={isHovered || isSelected ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  opacity={isDimmed ? 0.35 : 1}
                  className="transition-all duration-150 cursor-pointer"
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  onClick={() => onSelectStatus && onSelectStatus(isSelected ? 'ALL' : seg.status)}
                />
              );
            })}
          </svg>

          {/* Center Callout */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-1">
            <span className="text-base sm:text-lg font-bold font-heading text-[#09261c] leading-tight font-mono">
              {activeItem ? activeItem.count.toLocaleString() : totalTransactions.toLocaleString()}
            </span>
            <span className="text-[10px] font-medium text-slate-500 truncate max-w-[80px]">
              {activeItem ? activeItem.status : 'Total Txns'}
            </span>
            {activeItem && (
              <span className="text-[9px] font-mono text-emerald-700 font-semibold">
                {activeItem.percentage}%
              </span>
            )}
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 w-full sm:w-auto min-w-0 space-y-1.5">
          {items.map((seg, idx) => {
            const segColor = seg.color || STATUS_COLORS[seg.status] || '#64748b';
            const isSelected = selectedStatus === seg.status;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectStatus && onSelectStatus(isSelected ? 'ALL' : seg.status)}
                className={`w-full flex items-center justify-between text-xs py-1.5 px-2 rounded-xl transition-all cursor-pointer text-left ${
                  isSelected
                    ? 'bg-emerald-50/90 text-emerald-950 font-semibold ring-1 ring-emerald-300'
                    : 'hover:bg-[#faf7f0] text-slate-700'
                }`}
                title={`${seg.status}: ${seg.count.toLocaleString()} transactions (${seg.percentage}%)`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: segColor }}
                  />
                  <span className="truncate text-xs font-medium text-slate-800">
                    {seg.status}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0 text-xs">
                  <span className="font-mono font-semibold text-slate-800 min-w-[48px] text-right">
                    {seg.count.toLocaleString()}
                  </span>
                  <span className="font-mono text-slate-400 min-w-[34px] text-right text-[11px]">
                    {seg.percentage}%
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
