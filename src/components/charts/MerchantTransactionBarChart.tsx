import React, { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { formatINR } from '../../data/sampleData';

export interface MerchantItem {
  merchantId: string;
  merchantName: string;
  category: string;
  valueInr: number;
  count: number;
}

interface MerchantTransactionBarChartProps {
  title?: string;
  subtitle?: string;
  merchants: MerchantItem[];
  selectedMerchant?: string | null;
  onSelectMerchant?: (merchantName: string) => void;
  className?: string;
}

export const MerchantTransactionBarChart: React.FC<MerchantTransactionBarChartProps> = ({
  title = 'Total Transaction Value by Merchant',
  subtitle = 'Top commercial merchants sorted by ledger transaction volume',
  merchants,
  selectedMerchant,
  onSelectMerchant,
  className = ''
}) => {
  const [expanded, setExpanded] = useState<boolean>(false);

  // Fallback top merchants if empty
  const rawItems = merchants.length > 0 ? merchants : [
    { merchantId: 'MRC00112', merchantName: 'Housing.com Rent Pay', category: 'Rent', valueInr: 91850000, count: 2050 },
    { merchantId: 'MRC00115', merchantName: 'NestAway', category: 'Rent', valueInr: 88750000, count: 2780 },
    { merchantId: 'MRC00119', merchantName: 'NoBroker Rent', category: 'Rent', valueInr: 38100000, count: 1120 },
    { merchantId: 'MRC00122', merchantName: 'CRED RentPay', category: 'Rent', valueInr: 36250000, count: 1340 },
    { merchantId: 'MRC00201', merchantName: 'Kotak Mahindra Loan', category: 'EMI / Loan Payment', valueInr: 35260000, count: 1150 },
    { merchantId: 'MRC00042', merchantName: 'Sangeetha Mobiles - Connaught Place', category: 'Electronics', valueInr: 32941000, count: 980 },
    { merchantId: 'MRC00205', merchantName: 'Tata Capital', category: 'EMI / Loan Payment', valueInr: 32710000, count: 1230 },
    { merchantId: 'MRC00128', merchantName: 'Landlord Transfer', category: 'Rent', valueInr: 29100000, count: 1210 },
    { merchantId: 'MRC00210', merchantName: 'HDFC Bank Loan', category: 'EMI / Loan Payment', valueInr: 24110000, count: 1240 },
    { merchantId: 'MRC00088', merchantName: 'St Xaviers College - Connaught Place', category: 'Education', valueInr: 16730000, count: 620 },
    { merchantId: 'MRC00215', merchantName: 'ICICI Bank Loan', category: 'EMI / Loan Payment', valueInr: 15860000, count: 1310 },
    { merchantId: 'MRC00220', merchantName: 'SBI Home Loan', category: 'EMI / Loan Payment', valueInr: 13780000, count: 840 },
    { merchantId: 'MRC00240', merchantName: 'ICICI Prudential Life', category: 'Insurance', valueInr: 13500000, count: 710 },
    { merchantId: 'MRC00245', merchantName: 'Acko Insurance', category: 'Insurance', valueInr: 11900000, count: 820 },
    { merchantId: 'MRC00006', merchantName: 'Swiggy / Zomato Network', category: 'Food & Dining', valueInr: 10450000, count: 3240 }
  ];

  const sortedItems = [...rawItems].sort((a, b) => b.valueInr - a.valueInr);
  const displayItems = expanded ? sortedItems.slice(0, 15) : sortedItems.slice(0, 6);
  const maxValue = Math.max(...displayItems.map(d => d.valueInr), 1);

  return (
    <div className={`bg-white border border-[#ece7dc] rounded-2xl p-5 shadow-xs flex flex-col justify-between ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <div>
          <h3 className="font-heading font-semibold text-base text-[#0a261c]">
            {title}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            {subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {selectedMerchant && selectedMerchant !== 'ALL' && onSelectMerchant && (
            <button
              onClick={() => onSelectMerchant('ALL')}
              className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200 transition-colors cursor-pointer"
            >
              Clear merchant ({selectedMerchant})
            </button>
          )}

          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-900 bg-[#faf7f0] hover:bg-[#f0ebe0] px-2.5 py-1 rounded-lg border border-[#e5dfd2] transition-colors cursor-pointer"
          >
            <span>{expanded ? 'Top 6' : 'Top 15'}</span>
            {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Horizontal Bars */}
      <div className="space-y-2.5 my-auto max-h-[225px] overflow-y-auto pr-1">
        {displayItems.map((item) => {
          const isSelected = selectedMerchant === item.merchantName;
          const barWidth = Math.max(5, Math.round((item.valueInr / maxValue) * 100));

          return (
            <div
              key={item.merchantId || item.merchantName}
              onClick={() => onSelectMerchant && onSelectMerchant(isSelected ? 'ALL' : item.merchantName)}
              className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                isSelected
                  ? 'bg-emerald-50/90 ring-1 ring-emerald-300'
                  : 'hover:bg-[#faf7f0]'
              }`}
              title={`${item.merchantName} (${item.category}): ₹ ${formatINR(item.valueInr)} across ${item.count.toLocaleString()} transactions`}
            >
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                  <span className={`truncate text-xs ${isSelected ? 'font-bold text-[#093425]' : 'font-medium text-slate-800'}`}>
                    {item.merchantName}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono hidden sm:inline truncate max-w-[110px]">
                    {item.category}
                  </span>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  <span className="font-mono font-semibold text-slate-900 text-xs">
                    ₹ {item.valueInr >= 10000000 ? `${(item.valueInr / 10000000).toFixed(2)} Cr` : `${(item.valueInr / 100000).toFixed(1)} L`}
                  </span>
                  <span className="text-[10px] font-mono text-slate-400 min-w-[40px] text-right">
                    {item.count.toLocaleString()} txns
                  </span>
                </div>
              </div>

              {/* Bar track */}
              <div className="w-full h-2 bg-[#f0ece1] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-300 ${
                    isSelected ? 'bg-[#0d5941]' : 'bg-[#15803d] hover:bg-[#0d5941]'
                  }`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between text-xs text-slate-500 pt-3 border-t border-[#ece7dc] mt-2">
        <span className="text-[11px]">
          Click any merchant to filter transaction records and payment rails.
        </span>
        <span className="font-mono text-[11px] font-semibold text-slate-700">
          Showing <strong>{displayItems.length}</strong> merchants
        </span>
      </div>
    </div>
  );
};
