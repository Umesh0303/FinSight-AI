import React, { useState } from 'react';

export interface CustomerSegmentItem {
  segment: string;
  count: number;
  percentage: number;
  color?: string;
}

interface CustomerSegmentDoughnutProps {
  title?: string;
  subtitle?: string;
  totalCustomers: number;
  segments: CustomerSegmentItem[];
  selectedSegment?: string | null;
  onSelectSegment?: (segment: string) => void;
  className?: string;
}

const SEGMENT_COLORS: Record<string, string> = {
  Mass: '#0b4b38',
  Affluent: '#10b981',
  Premium: '#b0882e',
  'High Value': '#b0882e'
};

export const CustomerSegmentDoughnut: React.FC<CustomerSegmentDoughnutProps> = ({
  title = 'Total Customers by Segment',
  subtitle = 'Cohort distribution across wealth tiers',
  totalCustomers,
  segments,
  selectedSegment,
  onSelectSegment,
  className = ''
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const items = segments.length > 0 ? segments : [
    { segment: 'Mass', count: 15200, percentage: 60.8, color: '#0b4b38' },
    { segment: 'Affluent', count: 6800, percentage: 27.2, color: '#10b981' },
    { segment: 'Premium', count: 3000, percentage: 12.0, color: '#b0882e' }
  ];

  const total = items.reduce((sum, s) => sum + s.count, 0) || 1;

  const radius = 60;
  const strokeWidth = 22;
  const circumference = 2 * Math.PI * radius;
  let accumulatedAngle = -90;

  const activeItem = hoveredIdx !== null
    ? items[hoveredIdx]
    : selectedSegment
    ? items.find(s => s.segment === selectedSegment)
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

        {selectedSegment && selectedSegment !== 'ALL' && onSelectSegment && (
          <button
            onClick={() => onSelectSegment('ALL')}
            className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-0.5 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
          >
            Clear ({selectedSegment})
          </button>
        )}
      </div>

      {/* Donut & Legend Layout */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 my-auto min-w-0">
        {/* SVG Donut */}
        <div className="relative w-36 h-36 flex-shrink-0 mx-auto">
          <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90 transform">
            {items.map((seg, idx) => {
              const segColor = seg.color || SEGMENT_COLORS[seg.segment] || '#0d5941';
              const fraction = total > 0 ? seg.count / total : 0;
              const strokeDasharray = `${fraction * circumference} ${circumference}`;
              const strokeDashoffset = -(accumulatedAngle + 90) * (circumference / 360);
              accumulatedAngle += fraction * 360;

              const isSelected = selectedSegment === seg.segment;
              const isHovered = hoveredIdx === idx;
              const isDimmed = selectedSegment && selectedSegment !== 'ALL' && !isSelected;

              return (
                <circle
                  key={seg.segment}
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
                  onClick={() => onSelectSegment && onSelectSegment(isSelected ? 'ALL' : seg.segment)}
                />
              );
            })}
          </svg>

          {/* Center Callout */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-1">
            <span className="text-base sm:text-lg font-bold font-heading text-[#09261c] leading-tight font-mono">
              {activeItem ? activeItem.count.toLocaleString() : totalCustomers.toLocaleString()}
            </span>
            <span className="text-[10px] font-medium text-slate-500 truncate max-w-[80px]">
              {activeItem ? activeItem.segment : 'Total Customers'}
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
            const segColor = seg.color || SEGMENT_COLORS[seg.segment] || '#0d5941';
            const isSelected = selectedSegment === seg.segment;

            return (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectSegment && onSelectSegment(isSelected ? 'ALL' : seg.segment)}
                className={`w-full flex items-center justify-between text-xs py-1.5 px-2 rounded-xl transition-all cursor-pointer text-left ${
                  isSelected
                    ? 'bg-emerald-50/90 text-emerald-950 font-semibold ring-1 ring-emerald-300'
                    : 'hover:bg-[#faf7f0] text-slate-700'
                }`}
                title={`${seg.segment}: ${seg.count.toLocaleString()} customers (${seg.percentage}%)`}
              >
                <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: segColor }}
                  />
                  <span className="truncate text-xs font-medium text-slate-800">
                    {seg.segment}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0 text-xs">
                  <span className="font-mono font-semibold text-slate-800 min-w-[42px] text-right">
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
