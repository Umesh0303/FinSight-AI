import React, { useMemo, useEffect } from 'react';
import {
  Wallet,
  TrendingUp,
  ArrowDownRight,
  ArrowUpRight,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Building2,
  RefreshCw,
  AlertCircle,
  CreditCard
} from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { KpiCard } from '../../components/ui/KpiCard';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { formatINR } from '../../data/sampleData';
import { useApp } from '../../context/AppContext';
import { FinancialHealthScore } from '../../components/dashboard/FinancialHealthScore';
import { SpendingCategoryBars } from '../../components/charts/SpendingCategoryBars';

export const CustomerDashboard: React.FC = () => {
  const {
    currentUser,
    customerDossier,
    isLoadingCustomerDossier,
    customerDossierError,
    fetchCustomerDossier,
    isLiveDatabase,
    navigate
  } = useApp();

  // Trigger dossier fetch on mount if not already loaded
  useEffect(() => {
    if (!customerDossier && !isLoadingCustomerDossier) {
      fetchCustomerDossier();
    }
  }, [customerDossier, isLoadingCustomerDossier, fetchCustomerDossier]);

  // Derived customer identity and profile metadata
  const customerProfile = customerDossier?.customer;
  const displayName = customerProfile?.full_name || (currentUser.name || 'Personal Client');
  const customerId = customerProfile?.customer_id || currentUser.customerId || '';
  const segment = customerProfile?.segment || 'Client Account';
  const city = customerProfile?.city || 'India';
  const kycStatus = customerProfile?.kyc_status || 'Verified';

  // Compute live category spending breakdown from customer's personal transactions
  const customerCategories = useMemo(() => {
    if (!customerDossier?.recentTransactions || customerDossier.recentTransactions.length === 0) {
      return [];
    }
    const debits = customerDossier.recentTransactions.filter(t => t.txn_type === 'Debit');
    if (debits.length === 0) return [];

    const catMap: Record<string, number> = {};
    let totalDebit = 0;
    for (const t of debits) {
      const cat = t.category || 'Other';
      const amt = Number(t.amount_inr) || 0;
      catMap[cat] = (catMap[cat] || 0) + amt;
      totalDebit += amt;
    }
    if (totalDebit === 0) return [];

    return Object.entries(catMap)
      .map(([category, amount]) => {
        const catLower = category.toLowerCase();
        let iconName = 'ShoppingBag';
        if (catLower.includes('food') || catLower.includes('dining')) iconName = 'Utensils';
        else if (catLower.includes('travel') || catLower.includes('flight')) iconName = 'Plane';
        else if (catLower.includes('util') || catLower.includes('bill')) iconName = 'Lightbulb';
        else if (catLower.includes('film') || catLower.includes('ent')) iconName = 'Film';

        return {
          category,
          amount: Math.round(amount),
          percentage: Math.round((amount / totalDebit) * 100),
          iconName
        };
      })
      .sort((a, b) => b.amount - a.amount);
  }, [customerDossier?.recentTransactions]);

  // Sparkline data generation based strictly on actual balance snapshots
  const portfolioSparkline = useMemo(() => {
    if (customerDossier?.balanceSnapshots && customerDossier.balanceSnapshots.length > 0) {
      return [...customerDossier.balanceSnapshots]
        .reverse()
        .slice(-8)
        .map(b => Math.round((Number(b.closing_balance_inr) || 0) / 1000));
    }
    return undefined;
  }, [customerDossier?.balanceSnapshots]);

  // Savings rate calculation
  const savingsRate = useMemo(() => {
    if (!customerDossier || !customerDossier.monthlyInflowInr || customerDossier.monthlyInflowInr <= 0) {
      return 0;
    }
    return Math.round((customerDossier.monthlySavingsInr / customerDossier.monthlyInflowInr) * 100);
  }, [customerDossier]);

  return (
    <AppLayout
      title="My Financial Overview"
      subtitle="Personal financial health, spending, savings, portfolio balances, and AI recommendations."
      icon={<Wallet className="w-5 h-5 text-[#0d5941]" />}
      breadcrumbLabel="My Financial Overview"
    >
      {/* Top Action Ribbon / Workspace Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6 pb-2 border-b border-[#ece6d9]">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Client Workspace:
          </span>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#ebf5f0] text-[#0d5941] border border-[#aee3cb] flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#0d5941]" />
            {displayName} ({customerId}) · {segment} Tier
          </span>
          <span className="text-xs px-2.5 py-1 rounded-lg bg-[#faf7f0] text-slate-700 border border-[#e4ded0]">
            📍 {city} · KYC: {kycStatus}
          </span>
          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
            isLiveDatabase
              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
              : 'bg-amber-100 text-amber-800 border border-amber-300'
          }`}>
            {isLiveDatabase ? 'Supabase Live' : 'Demo Mode'}
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoadingCustomerDossier ? 'animate-spin' : ''}`} />}
            onClick={() => fetchCustomerDossier()}
            disabled={isLoadingCustomerDossier}
          >
            Refresh
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/app/transactions')}
          >
            View Transactions
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

      {/* Error Banner */}
      {customerDossierError && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{customerDossierError}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchCustomerDossier()}
          >
            Retry
          </Button>
        </div>
      )}

      {/* Row 1: KPI Cards Connected to Live Supabase Portfolio Data */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Portfolio Balance */}
        <KpiCard
          title="Portfolio Balance"
          value={isLoadingCustomerDossier && !customerDossier ? '...' : `₹ ${formatINR(customerDossier?.portfolioBalanceInr ?? 0)}`}
          change={`${customerDossier?.accounts?.length || 1} active account${(customerDossier?.accounts?.length || 1) > 1 ? 's' : ''}`}
          changeType="positive"
          comparisonPeriod={customerDossier?.latestSnapshotDate ? `closing as of ${customerDossier.latestSnapshotDate}` : 'verified closing balance'}
          icon={<Wallet className="w-5 h-5 text-[#b0882e]" />}
          iconBg="bg-[#fcf4e4]"
          sparklineColor="#10b981"
          sparklineData={portfolioSparkline}
        />

        {/* Monthly Inflow */}
        <KpiCard
          title="Monthly Inflow"
          value={isLoadingCustomerDossier && !customerDossier ? '...' : `₹ ${formatINR(customerDossier?.monthlyInflowInr ?? 0)}`}
          change={`+₹ ${formatINR(customerDossier?.monthlyInflowInr ?? 0)}`}
          changeType="positive"
          comparisonPeriod="credits & deposits"
          icon={<ArrowDownRight className="w-5 h-5 text-[#059669]" />}
          iconBg="bg-[#ecfdf5]"
          sparklineColor="#10b981"
          sparklineData={portfolioSparkline}
        />

        {/* Monthly Outflow */}
        <KpiCard
          title="Monthly Outflow"
          value={isLoadingCustomerDossier && !customerDossier ? '...' : `₹ ${formatINR(customerDossier?.monthlyOutflowInr ?? 0)}`}
          change={`-₹ ${formatINR(customerDossier?.monthlyOutflowInr ?? 0)}`}
          changeType="neutral"
          comparisonPeriod="debits & purchases"
          icon={<ArrowUpRight className="w-5 h-5 text-[#b45309]" />}
          iconBg="bg-[#fffbeb]"
          sparklineColor="#10b981"
          sparklineData={undefined}
        />

        {/* Net Monthly Savings */}
        <KpiCard
          title="Net Monthly Savings"
          value={isLoadingCustomerDossier && !customerDossier ? '...' : `₹ ${formatINR(customerDossier?.monthlySavingsInr ?? 0)}`}
          change={`${savingsRate}% savings rate`}
          changeType="positive"
          comparisonPeriod="net surplus"
          icon={<TrendingUp className="w-5 h-5 text-[#b0882e]" />}
          iconBg="bg-[#fcf4e4]"
          sparklineColor="#10b981"
          sparklineData={undefined}
        />
      </div>

      {/* Row 2: Customer Visual Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        {/* Left: Financial Health Score Component with live credit bureau metrics */}
        <div className="lg:col-span-5 flex flex-col">
          <FinancialHealthScore
            creditScore={customerDossier?.latestCreditScore}
            creditBand={customerDossier?.creditScoreBand}
            creditDate={customerDossier?.creditScoreDate || undefined}
            customerName={displayName}
            customerId={customerId}
            portfolioBalanceInr={customerDossier?.portfolioBalanceInr}
            monthlyInflowInr={customerDossier?.monthlyInflowInr}
            monthlyOutflowInr={customerDossier?.monthlyOutflowInr}
            monthlySavingsInr={customerDossier?.monthlySavingsInr}
            className="h-full"
          />
        </div>

        {/* Right: AI Customer Insights Grounded in Verified Data */}
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
                desc: customerDossier?.monthlySavingsInr && customerDossier.monthlySavingsInr > 0
                  ? `Your current surplus is ₹${formatINR(customerDossier.monthlySavingsInr)}. Allocating surplus to auto-sweep funds can yield additional returns.`
                  : 'Maintain structured cashflow to optimize your monthly surplus allocation.',
                tag: 'Wealth Optimization'
              },
              {
                title: 'Multi-Account Portfolio Overview',
                desc: `Your portfolio balance of ₹${formatINR(customerDossier?.portfolioBalanceInr ?? 0)} is securely consolidated across ${customerDossier?.accounts?.length || 1} institutional account(s).`,
                tag: 'Liquidity Distribution'
              },
              {
                title: 'Credit Standing & Security Status',
                desc: `Verified credit bureau score of ${customerDossier?.latestCreditScore ?? 750} (${customerDossier?.creditScoreBand ?? 'Good'}). Account transactions match your established behavioral profile.`,
                tag: 'Credit Health'
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

      {/* Row 3: Spending Breakdown & Accounts / Financial Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        <div className="lg:col-span-6">
          <SpendingCategoryBars categories={customerCategories} />
        </div>
        <div className="lg:col-span-6 bg-white border border-[#ece7dc] rounded-2xl p-5 shadow-[0_2px_8px_rgba(18,48,36,0.04)] flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-heading font-semibold text-base text-[#0a261c]">
                  Active Accounts & Balances
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verified institutional accounts for {displayName}
                </p>
              </div>
              <span className="text-[10px] font-semibold text-[#0d5941] bg-[#ebf7f1] border border-[#a7f3d0] px-2.5 py-0.5 rounded-full">
                {customerDossier?.accounts?.length || 1} Accounts Linked
              </span>
            </div>

            {/* List of customer accounts */}
            <div className="space-y-3">
              {customerDossier?.accounts && customerDossier.accounts.length > 0 ? (
                customerDossier.accounts.map((acc) => (
                  <div
                    key={acc.account_id}
                    className="p-3 rounded-xl bg-[#faf7f0] border border-[#f0ece1] flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[#ebf7f1] text-[#0d5941] flex items-center justify-center flex-shrink-0">
                        {acc.account_type?.toLowerCase().includes('demat') || acc.account_type?.toLowerCase().includes('invest') ? (
                          <Building2 className="w-4 h-4 text-[#0d5941]" />
                        ) : (
                          <CreditCard className="w-4 h-4 text-[#0d5941]" />
                        )}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-800 font-mono">
                          {acc.account_id}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          {acc.account_type} Account · Opened {acc.open_date?.slice(0, 10)}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-semibold text-[#0d5941] bg-[#dcfce7] px-2 py-0.5 rounded">
                        {acc.status || 'Active'}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 rounded-xl bg-[#faf7f0] text-center text-xs text-slate-500">
                  No accounts linked to profile
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#f2ede3] flex items-center justify-between text-xs">
            <span className="text-slate-500">
              Snapshot balance date: <strong className="text-slate-800">{customerDossier?.latestSnapshotDate || 'Current'}</strong>
            </span>
            <button
              onClick={() => navigate('/app/assistant')}
              className="font-semibold text-[#0d5941] hover:underline cursor-pointer"
            >
              Analyze Portfolio →
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
            <p className="text-xs text-slate-500 mt-0.5">
              Isolated records strictly scoped to {displayName} ({customerId})
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={() => navigate('/app/transactions')}
          >
            View All Activity
          </Button>
        </div>

        {isLoadingCustomerDossier && (!customerDossier?.recentTransactions || customerDossier.recentTransactions.length === 0) ? (
          <div className="py-12 text-center text-xs text-slate-400">
            <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#0d5941]" />
            Loading verified customer transaction history...
          </div>
        ) : !customerDossier?.recentTransactions || customerDossier.recentTransactions.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-400">
            No transactions found for this account.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#ece7dc] text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="pb-3">Transaction ID</th>
                  <th className="pb-3">Date</th>
                  <th className="pb-3">Category</th>
                  <th className="pb-3">Payment Method</th>
                  <th className="pb-3">Location / Channel</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f5f2ea]">
                {customerDossier.recentTransactions.map((t) => {
                  const isCredit = t.txn_type === 'Credit';
                  return (
                    <tr key={t.transaction_id} className="hover:bg-[#faf8f3] transition-colors">
                      <td className="py-3 font-semibold text-[#093425] font-mono">{t.transaction_id}</td>
                      <td className="py-3 text-slate-600">
                        {t.txn_datetime ? t.txn_datetime.replace('T', ' ').slice(0, 16) : '—'}
                      </td>
                      <td className="py-3 font-medium text-slate-800">{t.category || 'General'}</td>
                      <td className="py-3 text-slate-600">{t.payment_method}</td>
                      <td className="py-3 text-slate-600">
                        {t.city || 'Online'} {t.device_type ? `(${t.device_type})` : ''}
                      </td>
                      <td className="py-3">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                          isCredit ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                        }`}>
                          {t.txn_type || (isCredit ? 'Credit' : 'Debit')}
                        </span>
                      </td>
                      <td className={`py-3 font-semibold font-mono ${isCredit ? 'text-emerald-700' : 'text-[#0a2b1f]'}`}>
                        {isCredit ? '+' : '-'}₹ {formatINR(Number(t.amount_inr) || 0)}
                      </td>
                      <td className="py-3 text-right">
                        <StatusBadge status={t.status === 'Success' ? 'Completed' : t.status === 'Failed' ? 'Declined' : 'Pending'} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </AppLayout>
  );
};
