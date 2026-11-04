import React, { useState, useMemo } from 'react';
import { MapPin, FilterX } from 'lucide-react';

export interface CityTransactionItem {
  city: string;
  count: number;
  percentage: number;
}

interface CityTransactionsLineChartProps {
  data: CityTransactionItem[];
  title?: string;
  selectedCity?: string | null;
  onSelectCity?: (city: string | null) => void;
  className?: string;
}

export const CityTransactionsLineChart: React.FC<CityTransactionsLineChartProps> = ({
  data,
  title = 'Total Transactions by City',
  selectedCity,
  onSelectCity,
  className = ''
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const totalCount = useMemo(() => {
    return data.reduce((acc, d) => acc + d.count, 0);
  }, [data]);

  const maxVal = useMemo(() => {
    if (!data || data.length === 0) return 1000;
    const max = Math.max(...data.map((d) => d.count));
    return Math.ceil(max * 1.15);
  }, [data]);

  // SVG coordinate calculations with safe margins
  const svgWidth = 540;
  const svgHeight = 225;
  const padLeft = 48;
  const padRight = 32;
  const padTop = 28;
  const padBottom = 40;
  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom;

  const points = useMemo(() => {
    if (!data || data.length === 0) return [];
    return data.map((d, i) => {
      const x = padLeft + (i / Math.max(data.length - 1, 1)) * plotWidth;
      const y = padTop + plotHeight - (d.count / (maxVal || 1)) * plotHeight;
      return { x, y, ...d, index: i };
    });
  }, [data, maxVal, plotWidth, plotHeight, padLeft, padTop]);

  const pathD = useMemo(() => {
    if (points.length === 0) return '';
    return points.reduce(
      (acc, pt, i) => (i === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
      ''
    );
  }, [points]);

  // Area under line
  const areaD = useMemo(() => {
    if (points.length === 0) return '';
    const first = points[0];
    const last = points[points.length - 1];
    const baseline = padTop + plotHeight;
    return `${pathD} L ${last.x} ${baseline} L ${first.x} ${baseline} Z`;
  }, [pathD, points, padTop, plotHeight]);

  return (
    <div
      className={`bg-white border border-[#ece7dc] rounded-2xl p-5 shadow-[0_2px_8px_rgba(18,48,36,0.04)] flex flex-col justify-between overflow-hidden min-w-0 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-[#ebf7f1] text-[#0d5941] flex items-center justify-center flex-shrink-0">
            <MapPin className="w-4 h-4 text-[#0d5941]" />
          </div>
          <div className="min-w-0 truncate">
            <h3 className="font-heading font-semibold text-sm text-[#0a261c] leading-tight truncate">
              {title}
            </h3>
            <span className="text-[11px] text-slate-500 font-mono truncate block">
              {totalCount.toLocaleString()} verified operations
            </span>
          </div>
        </div>

        {selectedCity && onSelectCity && (
          <button
            type="button"
            onClick={() => onSelectCity(null)}
            className="flex items-center gap-1 text-[10px] font-semibold text-[#0d5941] bg-[#ebf7f1] hover:bg-[#d8f0e5] border border-[#a7f3d0] px-2 py-0.5 rounded cursor-pointer transition-colors flex-shrink-0"
          >
            <FilterX className="w-3 h-3" />
            <span>Reset</span>
          </button>
        )}
      </div>

      {/* SVG Line Chart */}
      <div className="relative w-full overflow-hidden my-auto py-1">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="w-full h-auto overflow-visible select-none"
        >
          <defs>
            <linearGradient id="cityGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#0d5941" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#0d5941" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const y = padTop + plotHeight * (1 - pct);
            const val = Math.round(maxVal * pct);
            return (
              <g key={i}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={padLeft + plotWidth}
                  y2={y}
                  stroke="#f0ebe0"
                  strokeDasharray="3 3"
                />
                <text
                  x={padLeft - 6}
                  y={y + 3}
                  textAnchor="end"
                  className="text-[9px] fill-slate-400 font-mono font-medium"
                >
                  {val >= 1000 ? `${Math.round(val / 1000)}k` : val}
                </text>
              </g>
            );
          })}

          {/* Gradient area */}
          {areaD && <path d={areaD} fill="url(#cityGradient)" />}

          {/* Line */}
          {pathD && (
            <path
              d={pathD}
              fill="none"
              stroke="#0d5941"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Data Points / Markers */}
          {points.map((pt) => {
            const isSelected = selectedCity === pt.city;
            const isHovered = hoveredIdx === pt.index;

            return (
              <g
                key={pt.city}
                className="cursor-pointer transition-transform"
                onClick={() => onSelectCity && onSelectCity(isSelected ? null : pt.city)}
                onMouseEnter={() => setHoveredIdx(pt.index)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                {/* Glow ring when selected */}
                {isSelected && (
                  <circle
                    cx={pt.x}
                    cy={pt.y}
                    r="10"
                    fill="#10b981"
                    fillOpacity="0.3"
                    className="animate-pulse"
                  />
                )}

                {/* Marker circle */}
                <circle
                  cx={pt.x}
                  cy={pt.y}
                  r={isHovered || isSelected ? 6 : 4.5}
                  fill={isSelected ? '#093425' : isHovered ? '#10b981' : '#ffffff'}
                  stroke={isSelected ? '#10b981' : '#0d5941'}
                  strokeWidth={isSelected ? 3 : 2}
                  className="transition-all duration-150 shadow-xs"
                />

                {/* X-axis label */}
                <text
                  x={pt.x}
                  y={padTop + plotHeight + 17}
                  textAnchor="middle"
                  className={`text-[9.5px] transition-colors ${
                    isSelected
                      ? 'fill-[#093425] font-bold underline'
                      : isHovered
                      ? 'fill-[#0d5941] font-semibold'
                      : 'fill-slate-500 font-medium'
                  }`}
                >
                  {pt.city}
                </text>

                {/* Value on top of marker or when hovered/selected */}
                <text
                  x={pt.x}
                  y={pt.y - 9}
                  textAnchor="middle"
                  className={`text-[9px] font-mono transition-opacity ${
                    isHovered || isSelected ? 'opacity-100 font-bold fill-[#093425]' : 'opacity-0'
                  }`}
                >
                  {pt.count.toLocaleString()}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Footer / Helper Note */}
      <div className="pt-2 border-t border-[#f4f0e6] flex items-center justify-between text-[11px] text-slate-400 min-w-0">
        <span className="truncate mr-2">Click node to cross-filter dashboard by city</span>
        {selectedCity && (
          <span className="font-semibold text-[#0d5941] bg-[#ebf7f1] px-2 py-0.5 rounded text-[10px] flex-shrink-0">
            Filtered: {selectedCity}
          </span>
        )}
      </div>
    </div>
  );
};
