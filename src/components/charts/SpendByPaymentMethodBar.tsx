import React, { useState, useMemo } from 'react';
import { CreditCard } from 'lucide-react';
import { formatINR } from '../../data/sampleData';

export interface PaymentMethodSpendItem {
  method: string;
  amount: number;
  count: number;
  percentage: number;
}

interface SpendByPaymentMethodBarProps {
  data: PaymentMethodSpendItem[];
  title?: string;
  selectedMethod?: string | null;
  onSelectMethod?: (method: string | null) => void;
  className?: string;
}

export const SpendByPaymentMethodBar: React.FC<SpendByPaymentMethodBarProps> = ({
  data,
  title = 'Spend by Payment Method',
  selectedMethod,
  onSelectMethod,
  className = ''
}) => {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const maxAmount = useMemo(() => {
    if (!data || data.length === 0) return 10000;
    const maxVal = Math.max(...data.map((d) => d.amount));
    return maxVal > 0 ? Math.ceil(maxVal * 1.15) : 10000;
  }, [data]);

  const totalSpend = useMemo(() => {
    return (data || []).reduce((acc, d) => acc + d.amount, 0);
  }, [data]);

  // SVG parameters
  const svgWidth = 440;
  const svgHeight = 220;
  const padLeft = 45;
  const padRight = 15;
  const padTop = 20;
  const padBottom = 35;
  const plotWidth = svgWidth - padLeft - padRight;
  const plotHeight = svgHeight - padTop - padBottom;

  const numBars = data.length || 1;
  const slotWidth = plotWidth / numBars;
  const barWidth = Math.max(12, Math.min(36, slotWidth * 0.55));

  return (
    <div
      className={`bg-white border border-[#ece7dc] rounded-2xl p-5 shadow-[0_2px_8px_rgba(18,48,36,0.04)] flex flex-col justify-between ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#ebf7f1] text-[#0d5941] flex items-center justify-center flex-shrink-0">
            <CreditCard className="w-4 h-4 text-[#0d5941]" />
          </div>
          <div>
            <h3 className="font-heading font-semibold text-sm text-[#0a261c] leading-tight">
              {title}
            </h3>
            <span className="text-[11px] text-slate-500 font-mono">
              ₹ {formatINR(totalSpend)} total
            </span>
          </div>
        </div>

        {selectedMethod && (
          <button
            type="button"
            onClick={() => onSelectMethod && onSelectMethod(null)}
            className="text-[10px] font-semibold text-[#0d5941] bg-[#ebf7f1] hover:bg-[#d8f0e5] border border-[#a7f3d0] px-2 py-0.5 rounded cursor-pointer transition-colors"
          >
            Clear Filter
          </button>
        )}
      </div>

      {data.length === 0 || totalSpend === 0 ? (
        <div className="h-44 flex flex-col items-center justify-center text-slate-400 text-xs text-center py-6">
          No payment method records available.
        </div>
      ) : (
        <div className="relative w-full">
          <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto overflow-visible">
            {/* Horizontal Grid Lines */}
            {[0, 0.33, 0.66, 1].map((pct, idx) => {
              const y = padTop + plotHeight * (1 - pct);
              const labelVal = Math.round(maxAmount * pct);
              return (
                <g key={idx}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={svgWidth - padRight}
                    y2={y}
                    stroke="#f0ece1"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={padLeft - 6}
                    y={y + 3}
                    textAnchor="end"
                    fontSize="9"
                    fill="#8c9a94"
                    fontFamily="system-ui"
                  >
                    {labelVal >= 1000 ? `${Math.round(labelVal / 1000)}k` : labelVal}
                  </text>
                </g>
              );
            })}

            {/* Vertical Bars */}
            {data.map((item, idx) => {
              const barH = (item.amount / maxAmount) * plotHeight;
              const x = padLeft + idx * slotWidth + (slotWidth - barWidth) / 2;
              const y = padTop + plotHeight - barH;

              const isHovered = hoveredIdx === idx;
              const isSelected = selectedMethod === item.method;
              const isDimmed = selectedMethod && !isSelected;

              return (
                <g
                  key={item.method}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIdx(idx)}
                  onMouseLeave={() => setHoveredIdx(null)}
                  onClick={() => {
                    if (onSelectMethod) {
                      onSelectMethod(isSelected ? null : item.method);
                    }
                  }}
                >
                  <rect
                    x={x}
                    y={y}
                    width={barWidth}
                    height={Math.max(2, barH)}
                    rx="4"
                    fill={isSelected || isHovered ? '#093425' : '#0d5941'}
                    opacity={isDimmed ? 0.35 : 1}
                    className="transition-all duration-200"
                  />

                  {/* Value above bar */}
                  <text
                    x={x + barWidth / 2}
                    y={y - 5}
                    textAnchor="middle"
                    fontSize="9"
                    fontWeight="600"
                    fill="#0a261c"
                    fontFamily="monospace"
                  >
                    ₹{item.amount >= 1000 ? `${(item.amount / 1000).toFixed(0)}k` : item.amount}
                  </text>

                  {/* Method Label below X-axis */}
                  <text
                    x={x + barWidth / 2}
                    y={svgHeight - 12}
                    textAnchor="middle"
                    fontSize="9.5"
                    fill="#475569"
                    fontWeight={isSelected || isHovered ? '600' : '500'}
                  >
                    {item.method}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Interactive Tooltip */}
          {hoveredIdx !== null && data[hoveredIdx] && (
            <div className="absolute top-1 left-1/2 -translate-x-1/2 bg-[#06241a] text-white px-3 py-1.5 rounded-lg text-xs shadow-lg flex items-center gap-3 pointer-events-none border border-[#165a44] z-10">
              <span className="font-semibold text-[#f1cd6b]">{data[hoveredIdx].method}</span>
              <span>Amount: <strong className="text-white">₹ {formatINR(data[hoveredIdx].amount)}</strong></span>
              <span className="text-[10px] text-slate-300">
                ({data[hoveredIdx].percentage}% · {data[hoveredIdx].count} txns)
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
