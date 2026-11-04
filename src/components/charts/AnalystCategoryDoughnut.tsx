import React, { useState, useMemo } from 'react';
import { PieChart, FilterX } from 'lucide-react';

export interface AnalystCategoryItem {
  category: string;
  amount: number;
  percentage: number;
  transactionCount?: number;
  color: string;
}

interface AnalystCategoryDoughnutProps {
  data: AnalystCategoryItem[];
  totalVolumeInr: number;
  title?: string;
  selectedCategory?: string | null;
  onSelectCategory?: (category: string | null) => void;
  className?: string;
}

export const AnalystCategoryDoughnut: React.FC<AnalystCategoryDoughnutProps> = ({
  data,
  totalVolumeInr,
  title = 'Category Spending Distribution',
  selectedCategory,
  onSelectCategory,
  className = ''
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const totalCalculated = useMemo(() => {
    return data.reduce((acc, d) => acc + d.amount, 0) || totalVolumeInr || 1;
  }, [data, totalVolumeInr]);

  // Selected item metrics
  const activeItem = useMemo(() => {
    if (!selectedCategory) return null;
    return data.find((d) => d.category === selectedCategory) || null;
  }, [data, selectedCategory]);

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
          <div className="w-7 h-7 rounded-lg bg-[#ebf7f1] text-[#0d5941] flex items-center justify-center flex-shrink-0">
            <PieChart className="w-4 h-4 text-[#0d5941]" />
          </div>
          <div className="min-w-0 truncate">
            <h3 className="font-heading font-semibold text-sm text-[#0a261c] leading-tight truncate">
              {title}
            </h3>
            <span className="text-[11px] text-slate-500 font-mono truncate block">
              ₹ {(totalCalculated / 10000000).toFixed(2)} Cr settled volume
            </span>
          </div>
        </div>

        {selectedCategory && onSelectCategory && (
          <button
            type="button"
            onClick={() => onSelectCategory(null)}
            className="flex items-center gap-1 text-[10px] font-semibold text-[#0d5941] bg-[#ebf7f1] hover:bg-[#d8f0e5] border border-[#a7f3d0] px-2 py-0.5 rounded cursor-pointer transition-colors flex-shrink-0"
          >
            <FilterX className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {data.length === 0 || totalCalculated === 0 ? (
        <div className="h-44 flex flex-col items-center justify-center text-slate-400 text-xs text-center py-6">
          No category spending recorded.
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 my-auto min-w-0 py-2">
          {/* SVG Doughnut */}
          <div className="relative w-36 h-36 sm:w-40 sm:h-40 flex-shrink-0 mx-auto">
            <svg viewBox="0 0 170 170" className="w-full h-full -rotate-90 transform overflow-visible">
              {data.map((seg, idx) => {
                const fraction = totalCalculated > 0 ? seg.amount / totalCalculated : 0;
                const strokeDasharray = `${fraction * circumference} ${circumference}`;
                const strokeDashoffset = -(accumulatedAngle + 90) * (circumference / 360);
                accumulatedAngle += fraction * 360;

                const isSelected = selectedCategory === seg.category;
                const isHovered = hoveredIdx === idx;
                const isAnySelected = Boolean(selectedCategory);
                const isDimmed = isAnySelected && !isSelected;

                return (
                  <circle
                    key={seg.category}
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
                    onClick={() => onSelectCategory && onSelectCategory(isSelected ? null : seg.category)}
                  />
                );
              })}
            </svg>

            {/* Center Total Callout */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-1">
              <span className="text-base sm:text-lg font-bold font-heading text-[#093425] leading-tight font-mono truncate max-w-[100px]">
                {activeItem
                  ? `₹ ${(activeItem.amount / 10000000).toFixed(2)} Cr`
                  : `₹ ${(totalCalculated / 10000000).toFixed(2)} Cr`}
              </span>
              <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mt-0.5 truncate max-w-[105px]">
                {activeItem ? activeItem.category : 'Total Volume'}
              </span>
            </div>
          </div>

          {/* Legend Items */}
          <div className="flex-1 space-y-1.5 w-full min-w-0 text-xs">
            {data.map((seg, idx) => {
              const isSelected = selectedCategory === seg.category;
              const isHovered = hoveredIdx === idx;

              return (
                <div
                  key={seg.category}
                  onClick={() => onSelectCategory && onSelectCategory(isSelected ? null : seg.category)}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  title={`${seg.category}: ₹ ${(seg.amount / 10000000).toFixed(2)} Cr (${seg.percentage}%)`}
                  className={`flex items-center justify-between p-1.5 rounded-lg transition-all cursor-pointer min-w-0 ${
                    isSelected
                      ? 'bg-[#ebf7f1] font-bold border border-[#a7f3d0] shadow-2xs'
                      : isHovered
                      ? 'bg-[#faf7f0]'
                      : 'hover:bg-[#faf7f0]/60'
                  }`}
                >
                  <div className="flex items-center gap-2 truncate min-w-0 mr-1.5">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: seg.color }}
                    />
                    <span className="truncate text-slate-700 text-[11px] sm:text-xs">
                      {seg.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 font-mono text-[11px]">
                    <span className="text-slate-500 min-w-[54px] text-right">
                      ₹ {(seg.amount / 10000000).toFixed(2)}Cr
                    </span>
                    <span className="font-semibold text-slate-800 min-w-[36px] text-right">
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
        {selectedCategory && (
          <span className="font-semibold text-[#0d5941] bg-[#ebf7f1] px-2 py-0.5 rounded text-[10px] flex-shrink-0">
            Filtered: {selectedCategory}
          </span>
        )}
      </div>
    </div>
  );
};
