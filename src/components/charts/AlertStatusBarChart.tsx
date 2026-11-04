import React from 'react';

export interface AlertStatusCount {
  status: string;
  count: number;
  percentage: number;
  color: string;
}

interface AlertStatusBarChartProps {
  title?: string;
  statusData: AlertStatusCount[];
  selectedStatus?: string | null;
  onSelectStatus?: (status: string) => void;
  className?: string;
}

export const AlertStatusBarChart: React.FC<AlertStatusBarChartProps> = ({
  title = 'Alert Status',
  statusData,
  selectedStatus,
  onSelectStatus,
  className = ''
}) => {
  const maxCount = Math.max(...statusData.map(s => s.count), 1);

  return (
    <div className={`bg-white border border-[#ece7dc] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-heading font-semibold text-sm sm:text-base text-[#0a261c]">
            {title}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Operational triage and resolution state
          </p>
        </div>
        {selectedStatus && selectedStatus !== 'ALL' && onSelectStatus && (
          <button
            onClick={() => onSelectStatus('ALL')}
            className="text-[11px] font-medium text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-md transition-colors"
          >
            Clear selection
          </button>
        )}
      </div>

      {/* Vertical Column Chart Layout */}
      <div className="my-auto pt-3 pb-1">
        <div className="grid grid-cols-4 gap-2 sm:gap-3 items-end h-[160px] border-b border-[#ece7dc] px-1">
          {statusData.map((item) => {
            const isSelected = selectedStatus === item.status;
            const barHeight = Math.max(12, Math.round((item.count / maxCount) * 125));

            return (
              <div
                key={item.status}
                onClick={() => onSelectStatus && onSelectStatus(isSelected ? 'ALL' : item.status)}
                className={`flex flex-col items-center justify-end h-full group cursor-pointer p-1 rounded-t-lg transition-colors ${
                  isSelected ? 'bg-slate-100/60' : 'hover:bg-[#faf7f0]/80'
                }`}
                title={`${item.status}: ${item.count.toLocaleString()} alerts (${item.percentage}%)`}
              >
                {/* Count Display on Top of Bar */}
                <span className={`text-[11px] font-mono mb-1 transition-transform group-hover:-translate-y-0.5 ${
                  isSelected ? 'font-bold text-[#093425]' : 'font-medium text-slate-700'
                }`}>
                  {item.count.toLocaleString()}
                </span>

                {/* Vertical Bar */}
                <div
                  className="w-full max-w-[42px] rounded-t-md transition-all duration-300 relative"
                  style={{
                    height: `${barHeight}px`,
                    backgroundColor: item.color,
                    opacity: selectedStatus && selectedStatus !== 'ALL' && !isSelected ? 0.35 : 1
                  }}
                >
                  {isSelected && (
                    <div className="absolute inset-0 ring-2 ring-emerald-500 rounded-t-md" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* X-Axis Labels */}
        <div className="grid grid-cols-4 gap-2 sm:gap-3 px-1 mt-2 text-center">
          {statusData.map((item) => {
            const isSelected = selectedStatus === item.status;
            return (
              <div
                key={item.status}
                onClick={() => onSelectStatus && onSelectStatus(isSelected ? 'ALL' : item.status)}
                className="cursor-pointer"
                title={item.status}
              >
                <span className={`block text-[10px] sm:text-[11px] leading-tight truncate ${
                  isSelected ? 'font-bold text-[#093425]' : 'text-slate-600'
                }`}>
                  {item.status}
                </span>
                <span className="block text-[9px] font-mono text-slate-400 mt-0.5">
                  {item.percentage}%
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
