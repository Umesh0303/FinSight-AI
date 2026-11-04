import React from 'react';

export interface AccountTypeItem {
  type: string;
  count: number;
  percentage: number;
}

interface AccountTypeBarChartProps {
  title?: string;
  subtitle?: string;
  data: AccountTypeItem[];
  selectedType?: string | null;
  onSelectType?: (type: string) => void;
  className?: string;
}

export const AccountTypeBarChart: React.FC<AccountTypeBarChartProps> = ({
  title = 'Total Accounts by Account Type',
  subtitle = 'Banking account portfolio distribution',
  data,
  selectedType,
  onSelectType,
  className = ''
}) => {
  const items = data.length > 0 ? data : [
    { type: 'Savings', count: 19553, percentage: 65.4 },
    { type: 'Current', count: 5202, percentage: 17.4 },
    { type: 'Salary', count: 5143, percentage: 17.2 }
  ];

  const maxCount = Math.max(...items.map(d => d.count), 1);
  const totalCount = items.reduce((sum, d) => sum + d.count, 0) || 1;

  const colors: Record<string, string> = {
    Savings: '#0b4b38',
    Current: '#b0882e',
    Salary: '#3b82f6'
  };

  return (
    <div className={`bg-white border border-[#ece7dc] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <div>
          <h3 className="font-heading font-semibold text-sm sm:text-base text-[#0a261c]">
            {title}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {subtitle} ({totalCount.toLocaleString()} total)
          </p>
        </div>

        {selectedType && selectedType !== 'ALL' && onSelectType && (
          <button
            onClick={() => onSelectType('ALL')}
            className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-0.5 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
          >
            Clear ({selectedType})
          </button>
        )}
      </div>

      {/* Vertical Column Chart */}
      <div className="my-auto pt-3 pb-1">
        <div className="grid grid-cols-3 gap-3 items-end h-[160px] border-b border-[#ece7dc] px-2">
          {items.map((item) => {
            const isSelected = selectedType === item.type;
            const barHeight = Math.max(16, Math.round((item.count / maxCount) * 125));
            const barColor = colors[item.type] || '#0d5941';

            return (
              <div
                key={item.type}
                onClick={() => onSelectType && onSelectType(isSelected ? 'ALL' : item.type)}
                className={`flex flex-col items-center justify-end h-full group cursor-pointer p-1 rounded-t-xl transition-colors ${
                  isSelected ? 'bg-slate-100/70' : 'hover:bg-[#faf7f0]'
                }`}
                title={`${item.type}: ${item.count.toLocaleString()} accounts (${item.percentage}%)`}
              >
                {/* Count Display on Top of Bar */}
                <span className={`text-[11px] font-mono mb-1 transition-transform group-hover:-translate-y-0.5 ${
                  isSelected ? 'font-bold text-[#093425]' : 'font-medium text-slate-700'
                }`}>
                  {item.count.toLocaleString()}
                </span>

                {/* Vertical Bar */}
                <div
                  className="w-full max-w-[48px] rounded-t-lg transition-all duration-300 relative shadow-2xs"
                  style={{
                    height: `${barHeight}px`,
                    backgroundColor: barColor,
                    opacity: selectedType && selectedType !== 'ALL' && !isSelected ? 0.35 : 1
                  }}
                >
                  {isSelected && (
                    <div className="absolute inset-0 ring-2 ring-emerald-600 rounded-t-lg" />
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* X-Axis Labels */}
        <div className="grid grid-cols-3 gap-3 px-2 mt-2 text-center">
          {items.map((item) => {
            const isSelected = selectedType === item.type;
            return (
              <div
                key={item.type}
                onClick={() => onSelectType && onSelectType(isSelected ? 'ALL' : item.type)}
                className="cursor-pointer"
                title={item.type}
              >
                <span className={`block text-xs truncate ${
                  isSelected ? 'font-bold text-[#093425]' : 'font-medium text-slate-700'
                }`}>
                  {item.type}
                </span>
                <span className="block text-[10px] font-mono text-slate-400 mt-0.5">
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
