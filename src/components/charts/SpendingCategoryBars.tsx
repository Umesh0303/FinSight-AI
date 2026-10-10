import React from 'react';
import { ShoppingBag, Utensils, Plane, Lightbulb, Film, MoreHorizontal } from 'lucide-react';
import { SPENDING_CATEGORIES, formatINR } from '../../data/sampleData';

export const SpendingCategoryBars: React.FC = () => {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case 'ShoppingBag':
        return <ShoppingBag className="w-3.5 h-3.5 text-[#b0882e]" />;
      case 'Utensils':
        return <Utensils className="w-3.5 h-3.5 text-[#b0882e]" />;
      case 'Plane':
        return <Plane className="w-3.5 h-3.5 text-[#b0882e]" />;
      case 'Lightbulb':
        return <Lightbulb className="w-3.5 h-3.5 text-[#b0882e]" />;
      case 'Film':
        return <Film className="w-3.5 h-3.5 text-[#b0882e]" />;
      default:
        return <ShoppingBag className="w-3.5 h-3.5 text-[#b0882e]" />;
    }
  };

  return (
    <div className="bg-white border border-[#ece7dc] rounded-2xl p-5 shadow-[0_2px_8px_rgba(18,48,36,0.04)] flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-heading font-semibold text-base text-[#0a261c]">Top Spending Categories</h3>
        <button aria-label="Options" className="text-slate-400 hover:text-slate-600">
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Category Bars List */}
      <div className="space-y-3.5">
        {SPENDING_CATEGORIES.map((cat, idx) => (
          <div key={idx} className="flex items-center justify-between text-xs gap-3">
            {/* Category Icon & Name */}
            <div className="flex items-center gap-2.5 w-28 sm:w-32 flex-shrink-0">
              <div className="w-6 h-6 rounded-md bg-[#faf4e6] flex items-center justify-center flex-shrink-0">
                {getIcon(cat.iconName)}
              </div>
              <span className="font-medium text-slate-700 truncate">{cat.category}</span>
            </div>

            {/* Horizontal progress bar */}
            <div className="flex-1 max-w-[120px] sm:max-w-[160px] h-2.5 bg-[#f0ede4] rounded-full overflow-hidden">
              <div
                className="h-full bg-[#0b4b38] rounded-full transition-all duration-500"
                style={{ width: `${cat.percentage * 2.8}%` }}
              />
            </div>

            {/* Percentage */}
            <span className="font-medium text-slate-500 w-9 text-right flex-shrink-0">
              {cat.percentage}%
            </span>

            {/* INR Amount */}
            <span className="font-semibold text-[#092b1f] w-20 text-right flex-shrink-0 font-mono">
              ₹ {formatINR(cat.amount)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};
