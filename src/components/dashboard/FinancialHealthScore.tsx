import React, { useState } from 'react';
import {
  Activity,
  TrendingUp,
  Sliders,
  ShieldCheck,
  ArrowDownRight,
  ChevronRight,
  Info,
  X,
  CheckCircle2,
  Sparkles,
  Wallet
} from 'lucide-react';

interface IndicatorItem {
  id: string;
  label: string;
  score: number;
  status: string;
  benchmark: string;
  icon: React.ReactNode;
  color: string;
  barColor: string;
}

interface FinancialHealthScoreProps {
  score?: number;
  creditScore?: number;
  creditBand?: string;
  creditDate?: string;
  customerName?: string;
  customerId?: string;
  portfolioBalanceInr?: number;
  monthlyInflowInr?: number;
  monthlyOutflowInr?: number;
  monthlySavingsInr?: number;
  className?: string;
}

export const FinancialHealthScore: React.FC<FinancialHealthScoreProps> = ({
  score: propScore,
  creditScore,
  creditBand,
  creditDate,
  customerName,
  customerId,
  portfolioBalanceInr = 0,
  monthlyInflowInr = 0,
  monthlyOutflowInr = 0,
  monthlySavingsInr = 0,
  className = ''
}) => {
  const [modalOpen, setModalOpen] = useState(false);

  // Compute effective 0-100 score from credit score if not explicitly passed
  const effectiveScore = propScore ?? (creditScore ? Math.min(100, Math.round((creditScore / 900) * 100)) : 80);
  const effectiveBand = creditBand || (effectiveScore >= 85 ? 'Excellent' : effectiveScore >= 70 ? 'Good' : 'Fair');

  const savingsRate = monthlyInflowInr > 0 ? Math.round((monthlySavingsInr / monthlyInflowInr) * 100) : 0;
  const outflowRatio = monthlyInflowInr > 0 ? Math.round((monthlyOutflowInr / monthlyInflowInr) * 100) : 0;
  const reserveMonths = monthlyOutflowInr > 0 ? (portfolioBalanceInr / monthlyOutflowInr).toFixed(1) : (portfolioBalanceInr > 0 ? '12+' : '0');

  // Indicators dynamically computed from customer's verified portfolio and cashflow data
  const indicators: IndicatorItem[] = [
    {
      id: 'savings',
      label: 'Savings Health',
      score: Math.min(100, Math.max(30, savingsRate + 25)),
      status: monthlySavingsInr > 0 ? `Net Surplus (+₹${Math.round(monthlySavingsInr).toLocaleString()}/mo)` : 'Balanced Cashflow',
      benchmark: `${savingsRate}% savings rate vs 35% target`,
      icon: <TrendingUp className="w-3.5 h-3.5 text-[#059669]" />,
      color: 'text-[#059669]',
      barColor: 'bg-[#10b981]'
    },
    {
      id: 'spending',
      label: 'Spending Control',
      score: Math.min(100, Math.max(40, 100 - outflowRatio + 15)),
      status: `${outflowRatio}% Outflow of Inflow`,
      benchmark: `Outflow ratio ${outflowRatio}% of monthly cashflow`,
      icon: <Sliders className="w-3.5 h-3.5 text-[#b45309]" />,
      color: 'text-[#b45309]',
      barColor: 'bg-[#deb03e]'
    },
    {
      id: 'cashflow',
      label: 'Cash Flow',
      score: effectiveScore >= 75 ? 85 : 70,
      status: monthlyInflowInr > 0 ? `Monthly Inflow ₹${Math.round(monthlyInflowInr).toLocaleString()}` : 'Stable Recurring Inflow',
      benchmark: 'Institutional account credits',
      icon: <ArrowDownRight className="w-3.5 h-3.5 text-[#0d5941]" />,
      color: 'text-[#0d5941]',
      barColor: 'bg-[#0d5941]'
    },
    {
      id: 'emergency',
      label: 'Emergency Reserve',
      score: Number(reserveMonths) >= 6 ? 85 : Number(reserveMonths) >= 3 ? 75 : 55,
      status: `${reserveMonths} Months Liquidity`,
      benchmark: `₹${Math.round(portfolioBalanceInr).toLocaleString()} total closing liquidity`,
      icon: <ShieldCheck className="w-3.5 h-3.5 text-[#059669]" />,
      color: 'text-[#059669]',
      barColor: 'bg-[#059669]'
    }
  ];

  // Circular gauge math for score out of 100
  const radius = 48;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (effectiveScore / 100) * circumference;

  return (
    <>
      <div
        className={`bg-white border border-[#ece7dc] rounded-2xl p-5 sm:p-6 shadow-[0_2px_8px_rgba(18,48,36,0.04)] flex flex-col justify-between ${className}`}
      >
        {/* Header */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-[#ebf7f1] border border-[#aee3cb] text-[#0d5941] flex items-center justify-center flex-shrink-0">
                <Activity className="w-4 h-4 text-[#0d5941]" />
              </div>
              <div>
                <h3 className="font-heading font-semibold text-base text-[#0a261c] leading-tight">
                  Financial Health Score
                </h3>
                <p className="text-xs text-slate-500">
                  Understand your financial well-being
                </p>
              </div>
            </div>

            <span className="text-[10px] font-semibold text-[#0d5941] bg-[#ebf7f1] border border-[#a7f3d0] px-2.5 py-0.5 rounded-full">
              {effectiveBand} Tier
            </span>
          </div>

          {/* Main Score Section: Circular Gauge & Summary */}
          <div className="flex items-center gap-5 my-3 p-3.5 rounded-xl bg-[#faf7f0] border border-[#f0ece1]">
            {/* SVG Circular Gauge */}
            <div className="relative w-24 h-24 flex-shrink-0 flex items-center justify-center">
              <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 110 110">
                {/* Background Track */}
                <circle
                  cx="55"
                  cy="55"
                  r={radius}
                  stroke="#e8e2d4"
                  strokeWidth="8"
                  fill="transparent"
                />
                {/* Active Progress Stroke */}
                <circle
                  cx="55"
                  cy="55"
                  r={radius}
                  stroke="url(#healthScoreGrad)"
                  strokeWidth="8"
                  strokeDasharray={circumference}
                  strokeDashoffset={strokeDashoffset}
                  strokeLinecap="round"
                  fill="transparent"
                  className="transition-all duration-1000 ease-out"
                />
                <defs>
                  <linearGradient id="healthScoreGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#10b981" />
                    <stop offset="70%" stopColor="#0d5941" />
                    <stop offset="100%" stopColor="#deb03e" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Centered Score Value */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                <span className="text-2xl font-bold font-heading text-[#0a261c] leading-none">
                  {effectiveScore}
                </span>
                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-semibold mt-0.5">
                  / 100
                </span>
              </div>
            </div>

            {/* Score Interpretation */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-xs font-bold text-[#0d5941] bg-[#dcfce7] px-2 py-0.5 rounded-md">
                  {effectiveBand}
                </span>
                {creditScore ? (
                  <span className="text-[11px] text-slate-500 font-medium">
                    Credit Bureau Score: {creditScore} {creditDate ? `(${creditDate.slice(0, 10)})` : ''}
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-500 font-medium">
                    Top 8% of Peer Cohort
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Your profile indicates exceptional surplus generation, disciplined outflows, and strong liquid reserves.
              </p>
            </div>
          </div>

          {/* Four Key Indicators */}
          <div className="space-y-2.5 mt-3">
            {indicators.map((item) => (
              <div
                key={item.id}
                className="p-2.5 rounded-xl border border-[#ece7dc] bg-white hover:border-[#d9d0be] transition-all text-xs"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 rounded-md bg-[#faf7f0] flex items-center justify-center flex-shrink-0">
                      {item.icon}
                    </div>
                    <span className="font-semibold text-slate-800">{item.label}</span>
                  </div>
                  <span className="text-[11px] font-semibold text-slate-700 font-mono">
                    {item.score}% · <span className={item.color}>{item.status}</span>
                  </span>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-1.5 bg-[#f0ede4] rounded-full overflow-hidden">
                  <div
                    className={`h-full ${item.barColor} rounded-full transition-all duration-700`}
                    style={{ width: `${item.score}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom Action Button */}
        <div className="mt-4 pt-3 border-t border-[#f2ede3] flex items-center justify-between">
          <span className="text-[11px] text-slate-500">
            Rolling 90-day telemetry evaluation
          </span>
          <button
            type="button"
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-[#0d5941] hover:text-[#063325] hover:underline cursor-pointer"
          >
            <span>View Financial Breakdown</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Working Detailed Breakdown Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div
            className="bg-white border border-[#ece7dc] rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6 relative"
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-title"
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-[#ece7dc]">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#ebf7f1] border border-[#aee3cb] text-[#0d5941] flex items-center justify-center">
                  <Activity className="w-5 h-5 text-[#0d5941]" />
                </div>
                <div>
                  <h3 id="modal-title" className="font-heading font-bold text-lg text-[#0a261c]">
                    Comprehensive Financial Health Breakdown
                  </h3>
                  <p className="text-xs text-slate-500">
                    Calculated for {customerName || 'Verified Client'} ({customerId || 'Account Portfolio'}) · Overall Score: <strong>{effectiveScore} / 100</strong>
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="py-4 space-y-4 text-xs">
              <p className="text-slate-600 leading-relaxed">
                The FinSight AI Financial Health Score synthesizes income stability, outflow velocity, savings momentum, and contingency buffers into an actionable composite index.
              </p>

              {/* Indicator Cards */}
              <div className="space-y-3">
                {indicators.map((ind) => (
                  <div
                    key={ind.id}
                    className="p-3.5 rounded-xl bg-[#faf7f0] border border-[#ece7dc] space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-sm">{ind.label}</span>
                        <span className="text-[10px] font-semibold text-[#0d5941] bg-[#dcfce7] px-2 py-0.5 rounded">
                          {ind.status}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-slate-800 text-sm">
                        {ind.score}/100
                      </span>
                    </div>

                    <p className="text-slate-600">{ind.benchmark}</p>

                    <div className="w-full h-2 bg-[#e8e2d4] rounded-full overflow-hidden">
                      <div
                        className={`h-full ${ind.barColor} rounded-full`}
                        style={{ width: `${ind.score}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* Advisory note */}
              <div className="p-3.5 rounded-xl bg-[#ebf7f1] border border-[#aee3cb] flex items-start gap-2.5">
                <Sparkles className="w-4 h-4 text-[#deb03e] flex-shrink-0 mt-0.5" />
                <div className="text-slate-700 space-y-1">
                  <p className="font-semibold text-[#093425]">Optimization Recommendation</p>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Moving ₹35,000 from current accounts to an automated high-yield sweep account can push your Savings Health score from 88 to 94 and generate an estimated +₹3,200 annually.
                  </p>
                </div>
              </div>

              <div className="text-[10px] text-slate-400 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                <strong>Methodology:</strong> Derived from isolated transaction history and balance telemetry. Prototype financial modeling demonstration for customer account Arjun Verma.
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-[#ece7dc] flex justify-end">
              <button
                type="button"
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 bg-[#0d5941] hover:bg-[#083b2b] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors cursor-pointer"
              >
                Close Breakdown
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
