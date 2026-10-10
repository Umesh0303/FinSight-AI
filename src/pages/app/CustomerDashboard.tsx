import React from 'react';
import { Wallet, TrendingUp, ArrowDownRight, ArrowUpRight, Sparkles, ChevronRight } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { KpiCard } from '../../components/ui/KpiCard';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { formatINR } from '../../data/sampleData';
import { useApp } from '../../context/AppContext';
import { FinancialHealthScore } from '../../components/dashboard/FinancialHealthScore';
import { SpendingCategoryBars } from '../../components/charts/SpendingCategoryBars';

export const CustomerDashboard: React.FC = () => {
  const { transactions, navigate } = useApp();

  // Customer isolated data for Arjun Verma (CUST-1001)
  const myTransactions = transactions.filter(t => t.customer_id === 'CUST-1001');

  return (
    <AppLayout
      title="My Financial Overview"
      subtitle="Personal financial health, spending, savings, financial goals, and AI recommendations."
      icon={<Wallet className="w-5 h-5 text-[#0d5941]" />}
      breadcrumbLabel="My Financial Overview"
    >
      {/* Top Action Ribbon / Workspace Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6 pb-2 border-b border-[#ece6d9]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Workspace:
          </span>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#ebf5f0] text-[#0d5941] border border-[#aee3cb]">
            My Financial Overview · Private Wealth Tier (Arjun Verma)
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/app/transactions')}
          >
            View Transactions
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/app/assistant')}
          >
            Analyze Spending
          </Button>
          <Button
            variant="emerald"
            size="sm"
            leftIcon={<Sparkles className="w-3.5 h-3.5 text-[#f1cd6b]" />}
            onClick={() => navigate('/app/assistant')}
          >
            Ask FinSight AI
          </Button>
        </div>
      </div>

      {/* Row 1: KPI Cards Matching Mobile Showcase Values */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Portfolio Growth */}
        <KpiCard
          title="Portfolio Balance"
          value="₹ 12,45,230"
          change="12.5%"
          changeType="positive"
          comparisonPeriod="portfolio growth"
          icon={<Wallet className="w-5 h-5 text-[#b0882e]" />}
          iconBg="bg-[#fcf4e4]"
          sparklineColor="#10b981"
          sparklineData={[8, 10, 11, 13, 14, 16, 17, 18, 20]}
        />

        {/* Monthly Income */}
        <KpiCard
          title="Monthly Inflow"
          value="₹ 85,000"
          change="5.0%"
          changeType="positive"
          comparisonPeriod="salary & dividends"
          icon={<ArrowDownRight className="w-5 h-5 text-[#059669]" />}
          iconBg="bg-[#ecfdf5]"
          sparklineColor="#10b981"
          sparklineData={[70, 75, 80, 80, 85, 85, 85]}
        />

        {/* Monthly Expenses */}
        <KpiCard
          title="Monthly Outflow"
          value="₹ 32,400"
          change="4.1%"
          changeType="positive"
          comparisonPeriod="under budget target"
          icon={<ArrowUpRight className="w-5 h-5 text-[#b45309]" />}
          iconBg="bg-[#fffbeb]"
          sparklineColor="#10b981"
          sparklineData={[38, 35, 34, 33, 36, 32, 32.4]}
        />

        {/* Net Savings */}
        <KpiCard
          title="Net Monthly Savings"
          value="₹ 52,600"
          change="61.8%"
          changeType="positive"
          comparisonPeriod="savings rate"
          icon={<TrendingUp className="w-5 h-5 text-[#b0882e]" />}
          iconBg="bg-[#fcf4e4]"
          sparklineColor="#10b981"
          sparklineData={[32, 40, 44, 48, 50, 51, 52.6]}
        />
      </div>

      {/* Row 2: Customer Visual Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        {/* Left: Financial Health Score Component */}
        <div className="lg:col-span-5 flex flex-col">
          <FinancialHealthScore score={86} className="h-full" />
        </div>

        {/* Right: AI Customer Insights */}
        <div className="lg:col-span-7 bg-white border border-[#ece7dc] rounded-2xl p-6 shadow-xs flex flex-col justify-between">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-[#ebf7f1] text-[#0d5941] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-[#deb03e]" />
              </div>
              <h3 className="font-heading font-semibold text-base text-[#0a261c]">
                Personal AI Financial Insights
              </h3>
            </div>
            <button
              onClick={() => navigate('/app/assistant')}
              className="text-xs font-semibold text-[#0d5941] hover:underline"
            >
              Ask Details
            </button>
          </div>

          <div className="space-y-3">
            {[
              {
                title: 'High Savings Surplus Detected',
                desc: 'Your average monthly surplus is ₹52,600. Moving ₹35,000 to high-yield auto-sweep can yield +₹3,200 annually.',
                tag: 'Wealth Optimization'
              },
              {
                title: 'Dining & Travel Cashback Qualification',
                desc: 'You spent ₹57,600 on travel and lifestyle in October. You qualify for 5% partner cashback redemption.',
                tag: 'Reward Offer'
              },
              {
                title: 'Zero Risk Anomaly Flagged',
                desc: 'All 3 recent transactions across Bengaluru POS and Mobile UPI match your established personal profile.',
                tag: 'Security Verified'
              }
            ].map((insight, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-[#faf7f0] border border-[#f0ece1] text-xs hover:border-[#cfc6b5] transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900">{insight.title}</span>
                  <span className="text-[10px] font-semibold text-[#0d5941] bg-[#dcfce7] px-2 py-0.5 rounded">
                    {insight.tag}
                  </span>
                </div>
                <p className="text-slate-600 mt-1">{insight.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-3 border-t border-[#f2ede3] flex items-center justify-between">
            <span className="text-xs text-slate-500">Need personal advisory assistance?</span>
            <Button
              variant="emerald"
              size="sm"
              onClick={() => navigate('/app/assistant')}
              rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
            >
              Consult AI Advisor
            </Button>
          </div>
        </div>
      </div>

      {/* Row 3: Spending Breakdown & Personal Financial Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        <div className="lg:col-span-6">
          <SpendingCategoryBars />
        </div>
        <div className="lg:col-span-6 bg-white border border-[#ece7dc] rounded-2xl p-5 shadow-[0_2px_8px_rgba(18,48,36,0.04)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-heading font-semibold text-base text-[#0a261c]">
                  Personal Financial Goals
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Automated savings & wealth targets</p>
              </div>
              <span className="text-[10px] font-semibold text-[#0d5941] bg-[#ebf7f1] border border-[#a7f3d0] px-2.5 py-0.5 rounded-full">
                On Track
              </span>
            </div>

            <div className="space-y-4">
              {[
                { name: 'Emergency Liquidity Reserve', current: '₹ 5,00,000', target: '₹ 6,00,000', pct: 83, color: 'bg-[#0d5941]' },
                { name: 'Retirement Wealth Corpus', current: '₹ 14,20,000', target: '₹ 20,00,000', pct: 71, color: 'bg-[#10b981]' },
                { name: 'Annual Travel & Lifestyle Fund', current: '₹ 1,80,000', target: '₹ 2,00,000', pct: 90, color: 'bg-[#deb03e]' }
              ].map((goal, idx) => (
                <div key={idx} className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="font-semibold text-slate-800">{goal.name}</span>
                    <span className="font-mono text-slate-600 font-medium">
                      {goal.current} <span className="text-slate-400">/ {goal.target}</span> ({goal.pct}%)
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[#f0ede4] rounded-full overflow-hidden">
                    <div
                      className={`h-full ${goal.color} rounded-full transition-all duration-500`}
                      style={{ width: `${goal.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#f2ede3] flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Auto-sweep monthly allocation: <strong className="text-slate-800">₹ 35,000</strong>
            </span>
            <button
              onClick={() => navigate('/app/assistant')}
              className="font-semibold text-[#0d5941] hover:underline cursor-pointer"
            >
              Optimize Goals →
            </button>
          </div>
        </div>
      </div>

      {/* Row 4: My Recent Transactions (Strictly Filtered to Customer) */}
      <div className="bg-white border border-[#ece7dc] rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="font-heading font-semibold text-base text-[#0a261c]">
              My Recent Account Transactions
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">Isolated records for Arjun Verma</p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/app/transactions')}
          >
            View All Activity
          </Button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#ece7dc] text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                <th className="pb-3">Transaction ID</th>
                <th className="pb-3">Date</th>
                <th className="pb-3">Category</th>
                <th className="pb-3">Payment Method</th>
                <th className="pb-3">City / Device</th>
                <th className="pb-3">Amount</th>
                <th className="pb-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5f2ea]">
              {myTransactions.map((t) => (
                <tr key={t.transaction_id} className="hover:bg-[#faf8f3] transition-colors">
                  <td className="py-3 font-semibold text-[#093425] font-mono">{t.transaction_id}</td>
                  <td className="py-3 text-slate-600">{t.transaction_date}</td>
                  <td className="py-3 font-medium text-slate-800">{t.merchant_category}</td>
                  <td className="py-3 text-slate-600">{t.payment_method}</td>
                  <td className="py-3 text-slate-600">{t.city} ({t.device_type})</td>
                  <td className="py-3 font-semibold text-[#0a2b1f] font-mono">₹ {formatINR(t.transaction_amount)}</td>
                  <td className="py-3 text-right"><StatusBadge status={t.transaction_status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
};
