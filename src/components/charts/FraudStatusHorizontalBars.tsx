import React from 'react';
import { BarChart3, FilterX } from 'lucide-react';
import { FraudStatusItem } from './FraudStatusDoughnut';

interface FraudStatusHorizontalBarsProps {
  data: FraudStatusItem[];
  title?: string;
  selectedStatus?: string | null;
  onSelectStatus?: (status: string | null) => void;
  className?: string;
}

export const FraudStatusHorizontalBars: React.FC<FraudStatusHorizontalBarsProps> = ({
  data,
  title = 'Fraud Intelligence Breakdown',
  selectedStatus,
  onSelectStatus,
  className = ''
}) => {
  const maxCount = Math.max(...(data.length > 0 ? data.map((d) => d.count) : [1000]));
  const totalCount = data.reduce((acc, d) => acc + d.count, 0);

  return (
    <div
      className={`bg-white border border-[#ece7dc] rounded-2xl p-5 shadow-[0_2px_8px_rgba(18,48,36,0.04)] flex flex-col justify-between overflow-hidden min-w-0 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3 min-w-0">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-lg bg-[#ebf7f1] text-[#0d5941] flex items-center justify-center flex-shrink-0">
            <BarChart3 className="w-4 h-4 text-[#0d5941]" />
          </div>
          <div className="min-w-0 truncate">
            <h3 className="font-heading font-semibold text-sm text-[#0a261c] leading-tight truncate">
              {title}
            </h3>
            <span className="text-[11px] text-slate-500 font-mono truncate block">
              {totalCount.toLocaleString()} total alerts
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

      {/* Horizontal Bars */}
      <div className="space-y-3 my-auto min-w-0 py-1">
        {data.map((item) => {
          const isSelected = selectedStatus === item.name;
          const isAnySelected = Boolean(selectedStatus);
          const isDimmed = isAnySelected && !isSelected;
          const barWidthPercent = maxCount > 0 ? (item.count / maxCount) * 100 : 0;

          return (
            <div
              key={item.name}
              onClick={() => onSelectStatus && onSelectStatus(isSelected ? null : item.name)}
              title={`${item.name}: ${item.count.toLocaleString()} (${item.percentage}%)`}
              className={`p-2.5 rounded-xl transition-all cursor-pointer min-w-0 ${
                isSelected
                  ? 'bg-rose-50/90 border border-rose-200 shadow-2xs'
                  : 'hover:bg-[#faf7f0]'
              } ${isDimmed ? 'opacity-35' : 'opacity-100'}`}
            >
              <div className="flex items-center justify-between text-xs mb-1.5 min-w-0">
                <div className="flex items-center gap-2 min-w-0 mr-2 truncate">
                  <span
                    className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span
                    className={`truncate text-slate-800 ${
                      isSelected ? 'font-bold text-[#093425]' : 'font-medium'
                    }`}
                  >
                    {item.name}
                  </span>
                </div>
                <div className="flex items-center gap-2.5 text-xs font-mono flex-shrink-0">
                  <span className="text-slate-500 min-w-[38px] text-right">
                    {item.count.toLocaleString()}
                  </span>
                  <span className="font-bold text-slate-800 min-w-[38px] text-right">
                    {item.percentage}%
                  </span>
                </div>
              </div>

              {/* Progress track */}
              <div className="h-2 w-full bg-[#f0ece1] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    width: `${Math.max(4, barWidthPercent)}%`,
                    backgroundColor: item.color
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer / Helper Note */}
      <div className="pt-2.5 border-t border-[#f4f0e6] flex items-center justify-between text-[11px] text-slate-400 min-w-0">
        <span className="truncate mr-2">Click bar to cross-filter fraud status</span>
        {selectedStatus && (
          <span className="font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded text-[10px] flex-shrink-0">
            Filtered: {selectedStatus}
          </span>
        )}
      </div>
    </div>
  );
};
