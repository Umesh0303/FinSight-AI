import React, { useState } from 'react';
import { PieChart } from 'lucide-react';
import { formatINR } from '../../data/sampleData';

export interface CategorySpendItem {
  category: string;
  amount: number;
  percentage: number;
  color?: string;
}

interface SpendByCategoryDoughnutProps {
  categories: CategorySpendItem[];
  totalSpend: number;
  title?: string;
  selectedCategory?: string | null;
  onSelectCategory?: (category: string | null) => void;
  className?: string;
}

const CATEGORY_PALETTE = [
  '#0d5941', // Emerald deep
  '#10b981', // Emerald light
  '#deb03e', // Gold/amber
  '#b45309', // Warm bronze
  '#0891b2', // Cyan
  '#6366f1', // Indigo
  '#8b5cf6', // Purple
  '#ec4899', // Pink
  '#64748b'  // Slate
];

export const SpendByCategoryDoughnut: React.FC<SpendByCategoryDoughnutProps> = ({
  categories,
  totalSpend,
  title = 'Spend by Category',
  selectedCategory,
  onSelectCategory,
  className = ''
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Assign consistent colors
  const styledCategories = categories.map((c, i) => ({
    ...c,
    color: c.color || CATEGORY_PALETTE[i % CATEGORY_PALETTE.length]
  }));

  const radius = 64;
  const strokeWidth = 24;
  const circumference = 2 * Math.PI * radius;

  let accumulatedAngle = -90; // Start at top

  return (
    <div
      className={`bg-white border border-[#ece7dc] rounded-2xl p-5 shadow-[0_2px_8px_rgba(18,48,36,0.04)] flex flex-col justify-between ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#ebf7f1] text-[#0d5941] flex items-center justify-center flex-shrink-0">
            <PieChart className="w-4 h-4 text-[#0d5941]" />
          </div>
          <div>
            <h3 className="font-heading font-semibold text-sm text-[#0a261c] leading-tight">
              {title}
            </h3>
            <span className="text-[11px] text-slate-500">
              {categories.length} categories recorded
            </span>
          </div>
        </div>

        {selectedCategory && (
          <button
            type="button"
            onClick={() => onSelectCategory && onSelectCategory(null)}
            className="text-[10px] font-semibold text-[#0d5941] bg-[#ebf7f1] hover:bg-[#d8f0e5] border border-[#a7f3d0] px-2 py-0.5 rounded cursor-pointer transition-colors"
          >
            Clear Filter
          </button>
        )}
      </div>

      {categories.length === 0 || totalSpend === 0 ? (
        <div className="h-44 flex flex-col items-center justify-center text-slate-400 text-xs text-center py-6">
          No category spend records available.
        </div>
      ) : (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-5 my-auto">
          {/* SVG Doughnut */}
          <div className="relative w-40 h-40 flex-shrink-0 mx-auto">
            <svg viewBox="0 0 170 170" className="w-full h-full -rotate-90 transform">
              {styledCategories.map((seg, idx) => {
                const fraction = totalSpend > 0 ? seg.amount / totalSpend : 0;
                const strokeDasharray = `${fraction * circumference} ${circumference}`;
                const strokeDashoffset = -(accumulatedAngle + 90) * (circumference / 360);
                accumulatedAngle += fraction * 360;

                const isHovered = hoveredIdx === idx;
                const isSelected = selectedCategory === seg.category;
                const isDimmed = selectedCategory && !isSelected;

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
                    className="transition-all duration-200 cursor-pointer"
                    onMouseEnter={() => setHoveredIdx(idx)}
                    onMouseLeave={() => setHoveredIdx(null)}
                    onClick={() => {
                      if (onSelectCategory) {
                        onSelectCategory(isSelected ? null : seg.category);
                      }
                    }}
                  />
                );
              })}
            </svg>

            {/* Center Label Displaying Total */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-2">
              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 leading-none">
                Total Spend
              </span>
              <span className="text-sm font-bold font-heading text-[#09261c] leading-tight mt-1 truncate max-w-full">
                ₹ {formatINR(totalSpend)}
              </span>
              {hoveredIdx !== null && styledCategories[hoveredIdx] && (
                <span className="text-[10px] font-medium text-[#0d5941] truncate max-w-full">
                  {styledCategories[hoveredIdx].category}
                </span>
              )}
            </div>
          </div>

          {/* Interactive Legend List */}
          <div className="flex flex-col gap-1.5 flex-1 min-w-[150px] max-h-44 overflow-y-auto pr-1">
            {styledCategories.map((seg, idx) => {
              const isHovered = hoveredIdx === idx;
              const isSelected = selectedCategory === seg.category;
              const isDimmed = selectedCategory && !isSelected;

              return (
                <div
                  key={idx}
                  onClick={() => {
                    if (onSelectCategory) {
                      onSelectCategory(isSelected ? null : seg.category);
                    }
                  }}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  className={`flex items-center justify-between text-xs py-1 px-1.5 rounded-lg cursor-pointer transition-colors ${
                    isSelected
                      ? 'bg-[#ebf7f1] text-[#093425] font-semibold'
                      : isHovered
                      ? 'bg-[#faf7f0]'
                      : 'hover:bg-[#faf8f4]'
                  } ${isDimmed ? 'opacity-40' : 'opacity-100'}`}
                >
                  <div className="flex items-center gap-1.5 truncate pr-1">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: seg.color }}
                    />
                    <span className="truncate text-slate-700 font-medium">
                      {seg.category}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 font-mono text-[11px]">
                    <span className="text-slate-400">{seg.percentage}%</span>
                    <span className="font-semibold text-[#092b1f]">
                      ₹ {formatINR(seg.amount)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
