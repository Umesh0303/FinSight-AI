import React from 'react';

export interface AlertRuleItem {
  rule: string;
  count: number;
  percentage: number;
}

interface AlertRulesHorizontalBarProps {
  title?: string;
  rules: AlertRuleItem[];
  selectedRule?: string | null;
  onSelectRule?: (rule: string) => void;
  className?: string;
}

export const AlertRulesHorizontalBar: React.FC<AlertRulesHorizontalBarProps> = ({
  title = 'Alert Type',
  rules,
  selectedRule,
  onSelectRule,
  className = ''
}) => {
  const maxCount = Math.max(...rules.map(r => r.count), 1);

  return (
    <div className={`bg-white border border-[#ece7dc] rounded-2xl p-4 sm:p-5 shadow-xs flex flex-col justify-between ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h3 className="font-heading font-semibold text-sm sm:text-base text-[#0a261c]">
            {title}
          </h3>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Triggered velocity & anomaly policy thresholds
          </p>
        </div>
        {selectedRule && onSelectRule && (
          <button
            onClick={() => onSelectRule(selectedRule)}
            className="text-[11px] font-medium text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 px-2 py-0.5 rounded-md transition-colors"
          >
            Clear selection
          </button>
        )}
      </div>

      {/* Horizontal Bars */}
      <div className="space-y-2.5 my-auto max-h-[220px] overflow-y-auto pr-1">
        {rules.map((item) => {
          const isSelected = selectedRule === item.rule;
          const barWidth = Math.max(4, Math.round((item.count / maxCount) * 100));

          return (
            <div
              key={item.rule}
              onClick={() => onSelectRule && onSelectRule(item.rule)}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-red-50/80 ring-1 ring-red-300'
                  : 'hover:bg-[#faf7f0]'
              }`}
              title={`${item.rule}: ${item.count.toLocaleString()} alerts (${item.percentage}%)`}
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <span className={`truncate mr-2 max-w-[150px] sm:max-w-[170px] ${isSelected ? 'font-bold text-[#b91c1c]' : 'font-medium text-slate-700'}`}>
                  {item.rule}
                </span>
                <div className="flex items-center gap-1.5 flex-shrink-0 text-[11px]">
                  <span className="font-mono font-semibold text-slate-800 min-w-[34px] text-right">
                    {item.count.toLocaleString()}
                  </span>
                  <span className="font-mono text-slate-400 text-[10px] min-w-[32px] text-right">
                    {item.percentage}%
                  </span>
                </div>
              </div>

              {/* Bar Track */}
              <div className="w-full h-2 bg-[#f0ece1] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isSelected ? 'bg-[#b91c1c]' : 'bg-[#e05d44] hover:bg-[#b91c1c]'
                  }`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
