import React, { useState, useMemo } from 'react';
import { ShieldAlert, FilterX } from 'lucide-react';

export interface FraudStatusItem {
  name: string;
  count: number;
  percentage: number;
  color: string;
}

interface FraudStatusDoughnutProps {
  data: FraudStatusItem[];
  title?: string;
  selectedStatus?: string | null;
  onSelectStatus?: (status: string | null) => void;
  className?: string;
}

export const FraudStatusDoughnut: React.FC<FraudStatusDoughnutProps> = ({
  data,
  title = 'Fraud Intelligence Status',
  selectedStatus,
  onSelectStatus,
  className = ''
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const totalAlerts = useMemo(() => {
    return data.reduce((acc, d) => acc + d.count, 0);
  }, [data]);

  // Selected item metrics
  const activeItem = useMemo(() => {
    if (!selectedStatus) return null;
    return data.find((d) => d.name === selectedStatus) || null;
  }, [data, selectedStatus]);

  const radius = 62;
  const strokeWidth = 22;
  const circumference = 2 * Math.PI * radius;

  let accumulatedAngle = -90;

  return (
    <div
      className={`bg-white border border-[#ece7dc] rounded-2xl p-5 shadow-[0_2px_8px_rgba(18,48,36,0.04)] flex flex-col justify-between overflow-hidden min-w-0 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-[#fef2f2] text-rose-700 flex items-center justify-center flex-shrink-0">
            <ShieldAlert className="w-4 h-4 text-rose-600" />
          </div>
          <div className="min-w-0 truncate">
            <h3 className="font-heading font-semibold text-sm text-[#0a261c] leading-tight truncate">
              {title}
            </h3>
            <span className="text-[11px] text-slate-500 font-mono truncate block">
              {totalAlerts.toLocaleString()} verified alerts
            </span>
          </div>
        </div>

        {selectedStatus && onSelectStatus && (
          <button
            type="button"
            onClick={() => onSelectStatus(null)}
            className="flex items-center gap-1 text-[10px] font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2 py-0.5 rounded cursor-pointer transition-colors flex-shrink-0"
          >
            <FilterX className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {data.length === 0 || totalAlerts === 0 ? (
        <div className="h-44 flex flex-col items-center justify-center text-slate-400 text-xs text-center py-6">
          No fraud status telemetry recorded.
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-5 my-auto min-w-0 py-2">
          {/* SVG Doughnut */}
          <div className="relative w-36 h-36 sm:w-40 sm:h-40 flex-shrink-0 mx-auto">
            <svg viewBox="0 0 170 170" className="w-full h-full -rotate-90 transform overflow-visible">
              {data.map((seg, idx) => {
                const fraction = totalAlerts > 0 ? seg.count / totalAlerts : 0;
                const strokeDasharray = `${fraction * circumference} ${circumference}`;
                const strokeDashoffset = -(accumulatedAngle + 90) * (circumference / 360);
                accumulatedAngle += fraction * 360;

                const isSelected = selectedStatus === seg.name;
                const isHovered = hoveredIdx === idx;
                const isAnySelected = Boolean(selectedStatus);
                const isDimmed = isAnySelected && !isSelected;

                return (
                  <circle
                    key={seg.name}
                    cx="85"
                    cy="85"
                    r={radius}
                    fill="transparent"
                    stroke={seg.color}
                    strokeWidth={isSelected || isHovered ? strokeWidth + 4 : strokeWidth}
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    opacity={isDimmed ? 0.3 : 1}
                    className="transition-all duration-200 cursor-pointer"
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    onClick={() => onSelectStatus && onSelectStatus(isSelected ? null : seg.name)}
                  />
                );
              })}
            </svg>

            {/* Center Callout */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-1">
              <span className="text-lg sm:text-xl font-bold font-heading text-[#093425] leading-tight font-mono truncate max-w-[100px]">
                {activeItem ? activeItem.count.toLocaleString() : totalAlerts.toLocaleString()}
              </span>
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5 truncate max-w-[105px]">
                {activeItem ? activeItem.name : 'Total Alerts'}
              </span>
            </div>
          </div>

          {/* Legend Items */}
          <div className="flex-1 space-y-2 w-full min-w-0 text-xs">
            {data.map((seg, idx) => {
              const isSelected = selectedStatus === seg.name;
              const isHovered = hoveredIdx === idx;

              return (
                <div
                  key={seg.name}
                  onClick={() => onSelectStatus && onSelectStatus(isSelected ? null : seg.name)}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  title={`${seg.name}: ${seg.count.toLocaleString()} (${seg.percentage}%)`}
                  className={`flex items-center justify-between p-2 rounded-xl transition-all cursor-pointer min-w-0 ${
                    isSelected
                      ? 'bg-rose-50/90 font-bold border border-rose-200 shadow-2xs'
                      : isHovered
                      ? 'bg-[#faf7f0]'
                      : 'hover:bg-[#faf7f0]/60'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate min-w-0 mr-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: seg.color }}
                    />
                    <span className="truncate text-slate-700">{seg.name}</span>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0 font-mono">
                    <span className="text-slate-500 min-w-[42px] text-right">
                      {seg.count.toLocaleString()}
                    </span>
                    <span className="font-semibold text-slate-800 min-w-[42px] text-right">
                      {seg.percentage}%
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer / Helper Note */}
      <div className="pt-2.5 border-t border-[#f4f0e6] flex items-center justify-between text-[11px] text-slate-400 min-w-0">
        <span className="truncate mr-2">Click slice or legend to cross-filter</span>
        {selectedStatus && (
          <span className="font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded text-[10px] flex-shrink-0">
            Filtered: {selectedStatus}
          </span>
        )}
      </div>
    </div>
  );
};
