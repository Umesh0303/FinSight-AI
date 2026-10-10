import React, { useState } from 'react';
import { MoreHorizontal } from 'lucide-react';

interface SegmentItem {
  name: string;
  percentage?: number;
  count?: number;
  color: string;
}

interface DonutChartProps {
  title: string;
  centerCount: string;
  centerLabel: string;
  segments: SegmentItem[];
  showLegendList?: boolean;
  theme?: 'light' | 'dark';
  className?: string;
}

export const DonutChart: React.FC<DonutChartProps> = ({
  title,
  centerCount,
  centerLabel,
  segments,
  showLegendList = true,
  theme = 'light',
  className = ''
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // Calculate arc angles
  const total = segments.reduce((acc, curr) => acc + (curr.percentage || curr.count || 0), 0);
  let accumulatedAngle = -90; // Start at 12 o'clock

  const radius = 68;
  const strokeWidth = 26;
  const circumference = 2 * Math.PI * radius;

  const isDark = theme === 'dark';

  return (
    <div
      className={`${
        isDark
          ? 'bg-[#052b1e]/90 border border-[#0d4f38] text-white shadow-xl'
          : 'bg-white border border-[#ece7dc] text-[#14261f] shadow-[0_2px_8px_rgba(18,48,36,0.04)]'
      } rounded-3xl p-6 flex flex-col justify-between ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className={`font-heading font-semibold text-base ${isDark ? 'text-white' : 'text-[#0a261c]'}`}>
          {title}
        </h3>
        <button aria-label="Options" className={isDark ? 'text-[#7caaa0] hover:text-white' : 'text-slate-400 hover:text-slate-600'}>
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      <div className="flex items-center justify-between flex-wrap sm:flex-nowrap gap-6 my-auto">
        {/* SVG Donut */}
        <div className="relative w-44 h-44 mx-auto flex-shrink-0">
          <svg viewBox="0 0 180 180" className="w-full h-full -rotate-90 transform">
            {segments.map((seg, idx) => {
              const val = seg.percentage || seg.count || 0;
              const fraction = total > 0 ? val / total : 0;
              const strokeDasharray = `${fraction * circumference} ${circumference}`;
              const strokeDashoffset = -(accumulatedAngle + 90) * (circumference / 360);
              accumulatedAngle += fraction * 360;

              const isHovered = hoveredIdx === idx;

              return (
                <circle
                  key={idx}
                  cx="90"
                  cy="90"
                  r={radius}
                  fill="transparent"
                  stroke={seg.color}
                  strokeWidth={isHovered ? strokeWidth + 4 : strokeWidth}
                  strokeDasharray={strokeDasharray}
                  strokeDashoffset={strokeDashoffset}
                  className="transition-all duration-200 cursor-pointer"
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                />
              );
            })}
          </svg>

          {/* Center Callout */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <span className={`text-xl font-bold font-heading leading-tight ${isDark ? 'text-white' : 'text-[#09261c]'}`}>
              {centerCount}
            </span>
            <span className={`text-[11px] font-medium mt-0.5 ${isDark ? 'text-[#8cb8a7]' : 'text-slate-500'}`}>
              {centerLabel}
            </span>
          </div>
        </div>

        {/* Legend List */}
        {showLegendList && (
          <div className="flex flex-col gap-2.5 flex-1 min-w-[130px]">
            {segments.map((seg, idx) => {
              const isHovered = hoveredIdx === idx;
              return (
                <div
                  key={idx}
                  className={`flex items-center justify-between text-xs py-1 px-1.5 rounded-lg cursor-pointer transition-colors ${
                    isDark
                      ? isHovered ? 'bg-[#093d2c]' : 'hover:bg-[#073325]'
                      : isHovered ? 'bg-[#f4f1e8]' : 'hover:bg-[#faf8f4]'
                  }`}
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: seg.color }}
                    />
                    <span className={isDark ? 'text-[#cbe4d9] font-medium' : 'text-slate-700 font-medium'}>
                      {seg.name}
                    </span>
                  </div>
                  <span className={`font-semibold ml-2 ${isDark ? 'text-[#e5b842]' : 'text-[#092b1f]'}`}>
                    {seg.percentage !== undefined ? `${seg.percentage}%` : seg.count?.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
