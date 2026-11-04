import React, { useState } from 'react';

export interface FraudTypeSegment {
  name: string;
  count: number;
  percentage: number;
  color: string;
}

interface AlertsBasedOnFraudDoughnutProps {
  title?: string;
  totalAlerts: number;
  segments: FraudTypeSegment[];
  selectedCategory?: string | null;
  onSelectCategory?: (category: string) => void;
  className?: string;
}

const FRAUD_PALETTE: string[] = [
  '#dc2626', // Red (Card Not Present)
  '#ea580c', // Orange (Phishing)
  '#d97706', // Amber (UPI Collect)
  '#7c3aed', // Purple (Card Cloning)
  '#2563eb', // Blue (Identity Theft)
  '#0d9488', // Teal (Account Takeover)
  '#ec4899', // Pink (SIM Swap)
  '#84cc16', // Lime (Card Skimming)
  '#10b981', // Emerald (Not Fraud / False Positive)
  '#64748b'  // Slate
];

export const AlertsBasedOnFraudDoughnut: React.FC<AlertsBasedOnFraudDoughnutProps> = ({
  title = 'Alerts Based on Fraud',
  totalAlerts,
  segments,
  selectedCategory,
  onSelectCategory,
  className = ''
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Fallback if empty
  const activeSegments: FraudTypeSegment[] = segments.length > 0
    ? segments.map((s, idx) => ({
        ...s,
        color: s.color || FRAUD_PALETTE[idx % FRAUD_PALETTE.length]
      }))
    : [{ name: 'No Alerts', count: 0, percentage: 100, color: '#e2e8f0' }];

  const total = activeSegments.reduce((sum, s) => sum + s.count, 0) || 1;

  const radius = 62;
  const strokeWidth = 22;
  const circumference = 2 * Math.PI * radius;
  let accumulatedAngle = -90;

  const activeItem = hoveredIdx !== null
    ? activeSegments[hoveredIdx]
    : selectedCategory
    ? activeSegments.find(s => s.name === selectedCategory)
    : null;

  return (
    <div className={`bg-white border border-[#ece7dc] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-heading font-semibold text-sm sm:text-base text-[#0a261c]">
            {title}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Distribution across verified anomaly categories
          </p>
        </div>
        {selectedCategory && onSelectCategory && (
          <button
            onClick={() => onSelectCategory(selectedCategory)}
            className="text-[11px] font-medium text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-md transition-colors"
          >
            Clear selection
          </button>
        )}
      </div>

      {/* Body: Responsive Donut & Compact Legend */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 my-auto min-w-0">
        {/* SVG Donut */}
        <div className="relative w-36 h-36 sm:w-40 sm:h-40 flex-shrink-0 mx-auto">
          <svg viewBox="0 0 170 170" className="w-full h-full -rotate-90 transform">
            {activeSegments.map((seg, idx) => {
              const fraction = total > 0 ? seg.count / total : 0;
              const strokeDasharray = `${fraction * circumference} ${circumference}`;
              const strokeDashoffset = -(accumulatedAngle + 90) * (circumference / 360);
              accumulatedAngle += fraction * 360;

              const isSelected = selectedCategory === seg.name;
              const isHovered = hoveredIdx === idx;
              const isDimmed = (selectedCategory && !isSelected) || (hoveredIdx !== null && !isHovered);

              return (
                <circle
                  key={idx}
                  cx="85"
                  cy="85"
                  r={radius}
                  fill="transparent"
                  stroke={seg.color}
                  strokeWidth={isHovered || isSelected ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  opacity={isDimmed ? 0.35 : 1}
                  className="transition-all duration-150 cursor-pointer"
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  onClick={() => onSelectCategory && onSelectCategory(seg.name)}
                />
              );
            })}
          </svg>

          {/* Center Callout */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-2">
            <span className="text-base sm:text-lg font-bold font-heading text-[#09261c] leading-tight font-mono">
              {activeItem ? activeItem.count.toLocaleString() : totalAlerts.toLocaleString()}
            </span>
            <span className="text-[10px] font-medium text-slate-500 truncate max-w-[85px] leading-snug">
              {activeItem ? activeItem.name : 'Total Alerts'}
            </span>
            {activeItem && (
              <span className="text-[9px] font-mono text-emerald-700 font-semibold">
                {activeItem.percentage}%
              </span>
            )}
          </div>
        </div>

        {/* Legend List */}
        <div className="flex-1 w-full sm:w-auto min-w-0 max-h-[190px] overflow-y-auto pr-1 space-y-1">
          {activeSegments.slice(0, 8).map((seg, idx) => {
            const isSelected = selectedCategory === seg.name;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => onSelectCategory && onSelectCategory(seg.name)}
                className={`w-full flex items-center justify-between text-xs py-1 px-1.5 rounded-lg transition-colors text-left ${
                  isSelected
                    ? 'bg-emerald-50/90 text-emerald-950 font-semibold ring-1 ring-emerald-300'
                    : 'hover:bg-[#faf7f0] text-slate-700'
                }`}
                title={`${seg.name}: ${seg.count.toLocaleString()} alerts (${seg.percentage}%)`}
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1 mr-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: seg.color }}
                  />
                  <span className="truncate text-[11px] text-slate-700">
                    {seg.name}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0 text-[11px]">
                  <span className="font-mono text-slate-800 min-w-[32px] text-right">
                    {seg.count.toLocaleString()}
                  </span>
                  <span className="font-mono text-slate-400 min-w-[34px] text-right text-[10px]">
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
