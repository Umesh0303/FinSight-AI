import React, { useMemo, useEffect, useState, useCallback } from 'react';
import {
  Wallet,
  CreditCard,
  Building2,
  RefreshCw,
  AlertCircle,
  Sparkles,
  ShieldCheck,
  ChevronRight,
  TrendingDown,
  Receipt,
  Scale,
  Award,
  FilterX,
  Filter,
  Calendar,
  X
} from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { KpiCard } from '../../components/ui/KpiCard';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { formatINR } from '../../data/sampleData';
import { useApp } from '../../context/AppContext';
import { DbTransaction } from '../../types/database';
import { CustomerProfileHeader } from '../../components/dashboard/CustomerProfileHeader';
import { MonthlySpendTrendChart, MonthlySpendPoint } from '../../components/charts/MonthlySpendTrendChart';
import { SpendByCategoryDoughnut, CategorySpendItem } from '../../components/charts/SpendByCategoryDoughnut';
import { SpendByPaymentMethodBar, PaymentMethodSpendItem } from '../../components/charts/SpendByPaymentMethodBar';
import { FinancialHealthScore } from '../../components/dashboard/FinancialHealthScore';

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

  // Trusted customer ID derived strictly from authenticated session context
  const customerId = currentUser?.customerId || '';

  // Cross-filtering states for interactive charts & controls
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [selectedTxnType, setSelectedTxnType] = useState<string>('ALL'); // 'ALL' | 'Debit' | 'Credit'
  const [dateRange, setDateRange] = useState<string>('ALL'); // 'ALL' | '30d' | '90d' | '180d'
  const [selectedAccountId, setSelectedAccountId] = useState<string | null>(null);

  // Automatically load the authenticated customer's own financial dossier
  useEffect(() => {
    if (customerId) {
      fetchCustomerDossier(customerId);
    }
  }, [customerId, fetchCustomerDossier]);

  // Customer identity
  const customerProfile = customerDossier?.customer || null;
  const displayName = customerProfile?.full_name || currentUser.name || 'Personal Client';
  const displayCustomerId = customerProfile?.customer_id || customerId;
  const segment = customerProfile?.segment || 'Client Account';
  const city = customerProfile?.city || 'India';
  const kycStatus = customerProfile?.kyc_status || 'Verified';

  // All transactions from dossier
  const rawTransactions: DbTransaction[] = customerDossier?.recentTransactions || [];

  // Maximum timestamp in customer ledger for relative date windowing
  const maxTxnTimestamp = useMemo(() => {
    if (rawTransactions.length === 0) return Date.now();
    let max = 0;
    for (const t of rawTransactions) {
      if (t.txn_datetime) {
        const tm = new Date(t.txn_datetime).getTime();
        if (tm > max) max = tm;
      }
    }
    return max || Date.now();
  }, [rawTransactions]);

  // Base filtered customer transactions (respecting account, dateRange, and txnType)
  const scopedTransactions = useMemo(() => {
    let cutoff = 0;
    if (dateRange === '30d') cutoff = maxTxnTimestamp - (30 * 24 * 60 * 60 * 1000);
    else if (dateRange === '90d') cutoff = maxTxnTimestamp - (90 * 24 * 60 * 60 * 1000);
    else if (dateRange === '180d') cutoff = maxTxnTimestamp - (180 * 24 * 60 * 60 * 1000);

    return rawTransactions.filter((t) => {
      if (selectedAccountId && t.account_id && t.account_id !== selectedAccountId) return false;
      if (selectedTxnType !== 'ALL' && t.txn_type !== selectedTxnType) return false;
      if (cutoff > 0 && t.txn_datetime) {
        const tm = new Date(t.txn_datetime).getTime();
        if (tm < cutoff) return false;
      }
      return true;
    });
  }, [rawTransactions, selectedAccountId, selectedTxnType, dateRange, maxTxnTimestamp]);

  // Debits within scoped transactions
  const scopedDebits = useMemo(() => {
    return scopedTransactions.filter((t) => t.txn_type === 'Debit');
  }, [scopedTransactions]);

  // Baseline total spend across all customer debits (unfiltered by category/payment method)
  const baselineTotalSpend = useMemo(() => {
    return scopedDebits.reduce((acc, t) => acc + (Number(t.amount_inr) || 0), 0);
  }, [scopedDebits]);

  // Fully cross-filtered debits based on active chart selections (category & payment method)
  const activeFilteredDebits = useMemo(() => {
    return scopedDebits.filter((t) => {
      if (selectedCategory && t.category !== selectedCategory) return false;
      if (selectedPaymentMethod && t.payment_method !== selectedPaymentMethod) return false;
      return true;
    });
  }, [scopedDebits, selectedCategory, selectedPaymentMethod]);

  // 3. Five KPI Cards Calculations
  const totalSpend = useMemo(() => {
    return activeFilteredDebits.reduce((acc, t) => acc + (Number(t.amount_inr) || 0), 0);
  }, [activeFilteredDebits]);

  const debitTxCount = activeFilteredDebits.length;

  const avgTxAmount = useMemo(() => {
    if (debitTxCount === 0) return 0;
    return Math.round(totalSpend / debitTxCount);
  }, [totalSpend, debitTxCount]);

  const latestBalance = useMemo(() => {
    if (selectedAccountId && customerDossier?.balanceSnapshots) {
      const match = customerDossier.balanceSnapshots.find((b) => b.account_id === selectedAccountId);
      if (match?.closing_balance_inr !== undefined) {
        return Number(match.closing_balance_inr) || 0;
      }
    }
    if (customerDossier?.portfolioBalanceInr !== undefined) {
      return customerDossier.portfolioBalanceInr;
    }
    if (customerDossier?.balanceSnapshots && customerDossier.balanceSnapshots.length > 0) {
      return Number(customerDossier.balanceSnapshots[0].closing_balance_inr) || 0;
    }
    return 0;
  }, [customerDossier, selectedAccountId]);

  const latestCreditScore = customerDossier?.latestCreditScore ?? 760;
  const creditScoreBand = customerDossier?.creditScoreBand ?? 'Prime';

  // 4. Monthly Spend Trend data (derived from activeFilteredDebits)
  const monthlySpendData: MonthlySpendPoint[] = useMemo(() => {
    const monthMap = new Map<string, { total: number; count: number }>();
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const sortedDebits = [...activeFilteredDebits].sort((a, b) => {
      const da = a.txn_datetime ? new Date(a.txn_datetime).getTime() : 0;
      const db = b.txn_datetime ? new Date(b.txn_datetime).getTime() : 0;
      return da - db;
    });

    sortedDebits.forEach((t) => {
      if (!t.txn_datetime) return;
      const d = new Date(t.txn_datetime);
      if (isNaN(d.getTime())) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const prev = monthMap.get(key) || { total: 0, count: 0 };
      monthMap.set(key, {
        total: prev.total + (Number(t.amount_inr) || 0),
        count: prev.count + 1
      });
    });

    const points: MonthlySpendPoint[] = [];
    const sortedKeys = Array.from(monthMap.keys()).sort();

    sortedKeys.forEach((k) => {
      const [yearStr, monthStr] = k.split('-');
      const mIdx = parseInt(monthStr, 10) - 1;
      const shortYear = yearStr.slice(2);
      const label = `${monthNames[mIdx]} '${shortYear}`;
      const entry = monthMap.get(k)!;
      points.push({
        monthKey: k,
        label,
        amount: entry.total,
        count: entry.count
      });
    });

    if (points.length === 0) {
      return [
        { monthKey: '2024-05', label: "May '24", amount: 24500, count: 8 },
        { monthKey: '2024-06', label: "Jun '24", amount: 31200, count: 11 },
        { monthKey: '2024-07', label: "Jul '24", amount: 28400, count: 9 },
        { monthKey: '2024-08', label: "Aug '24", amount: 36700, count: 14 },
        { monthKey: '2024-09', label: "Sep '24", amount: 29800, count: 10 },
        { monthKey: '2024-10', label: "Oct '24", amount: 42100, count: 15 }
      ];
    }

    return points;
  }, [activeFilteredDebits]);

  // 5. Spend by Category data (compatible with selected payment method)
  const categorySpendData: CategorySpendItem[] = useMemo(() => {
    const catMap = new Map<string, number>();
    const debitsForCategories = scopedDebits.filter(t => !selectedPaymentMethod || t.payment_method === selectedPaymentMethod);

    debitsForCategories.forEach((t) => {
      const cat = t.category || 'Other';
      const amt = Number(t.amount_inr) || 0;
      catMap.set(cat, (catMap.get(cat) || 0) + amt);
    });

    const colors = [
      '#0d5941', // Emerald
      '#f1cd6b', // Gold
      '#10b981', // Light emerald
      '#2563eb', // Blue
      '#f97316', // Orange
      '#8b5cf6', // Violet
      '#06b6d4', // Cyan
      '#ec4899', // Pink
      '#64748b'  // Slate
    ];

    const sorted = Array.from(catMap.entries()).sort((a, b) => b[1] - a[1]);
    const grandTotal = Array.from(catMap.values()).reduce((sum, v) => sum + v, 0) || 1;

    return sorted.map(([category, amount], idx) => ({
      category,
      amount,
      percentage: Math.round((amount / grandTotal) * 1000) / 10,
      color: colors[idx % colors.length]
    }));
  }, [scopedDebits, selectedPaymentMethod]);

  // 6. Spend by Payment Method data (compatible with selected category)
  const paymentMethodData: PaymentMethodSpendItem[] = useMemo(() => {
    const pmMap = new Map<string, { total: number; count: number }>();
    const debitsForPayment = scopedDebits.filter(t => !selectedCategory || t.category === selectedCategory);

    debitsForPayment.forEach((t) => {
      const method = t.payment_method || 'Other';
      const amt = Number(t.amount_inr) || 0;
      const prev = pmMap.get(method) || { total: 0, count: 0 };
      pmMap.set(method, {
        total: prev.total + amt,
        count: prev.count + 1
      });
    });

    const colors: Record<string, string> = {
      'UPI': '#0d5941',
      'Credit Card': '#f1cd6b',
      'Debit Card': '#10b981',
      'Net Banking': '#2563eb',
      'Cash': '#f97316',
      'Wallet': '#8b5cf6'
    };

    const sorted = Array.from(pmMap.entries()).sort((a, b) => b[1].total - a[1].total);
    const grandTotal = Array.from(pmMap.values()).reduce((sum, d) => sum + d.total, 0) || 1;

    return sorted.map(([method, data]) => ({
      method,
      amount: data.total,
      percentage: Math.round((data.total / grandTotal) * 1000) / 10,
      count: data.count,
      color: colors[method] || '#64748b'
    }));
  }, [scopedDebits, selectedCategory]);

  // Dynamic monthly financial figures reflecting active filters
  const dynamicOutflowInr = useMemo(() => {
    const baseOutflow = customerDossier?.monthlyOutflowInr ?? 48200;
    if (!selectedCategory && !selectedPaymentMethod && dateRange === 'ALL' && selectedTxnType === 'ALL' && !selectedAccountId) {
      return baseOutflow;
    }
    const ratio = baselineTotalSpend > 0 ? (totalSpend / baselineTotalSpend) : 1;
    return Math.round(baseOutflow * ratio);
  }, [customerDossier?.monthlyOutflowInr, totalSpend, baselineTotalSpend, selectedCategory, selectedPaymentMethod, dateRange, selectedTxnType, selectedAccountId]);

  const dynamicSavingsInr = useMemo(() => {
    const inflow = customerDossier?.monthlyInflowInr ?? 125000;
    return Math.max(0, inflow - dynamicOutflowInr);
  }, [customerDossier?.monthlyInflowInr, dynamicOutflowInr]);

  const handleResetAllFilters = () => {
    setSelectedCategory(null);
    setSelectedPaymentMethod(null);
    setSelectedTxnType('ALL');
    setDateRange('ALL');
    setSelectedAccountId(null);
  };

  const activeFilters = useMemo(() => {
    const list: { key: string; label: string; value: string; onClear: () => void }[] = [];
    if (selectedCategory) {
      list.push({ key: 'category', label: 'Category', value: selectedCategory, onClear: () => setSelectedCategory(null) });
    }
    if (selectedPaymentMethod) {
      list.push({ key: 'paymentMethod', label: 'Payment Rail', value: selectedPaymentMethod, onClear: () => setSelectedPaymentMethod(null) });
    }
    if (selectedTxnType !== 'ALL') {
      list.push({ key: 'txnType', label: 'Type', value: selectedTxnType, onClear: () => setSelectedTxnType('ALL') });
    }
    if (dateRange !== 'ALL') {
      const labels: Record<string, string> = { '30d': 'Last 30 Days', '90d': 'Last 90 Days', '180d': 'Last 180 Days' };
      list.push({ key: 'dateRange', label: 'Date', value: labels[dateRange] || dateRange, onClear: () => setDateRange('ALL') });
    }
    if (selectedAccountId) {
      list.push({ key: 'account', label: 'Account', value: selectedAccountId, onClear: () => setSelectedAccountId(null) });
    }
    return list;
  }, [selectedCategory, selectedPaymentMethod, selectedTxnType, dateRange, selectedAccountId]);

  // Derived display transactions strictly respecting all active customer filters
  const displayTransactions = useMemo(() => {
    return scopedTransactions.filter((t) => {
      if (selectedCategory && t.category !== selectedCategory) return false;
      if (selectedPaymentMethod && t.payment_method !== selectedPaymentMethod) return false;
      return true;
    });
  }, [scopedTransactions, selectedCategory, selectedPaymentMethod]);

  const latestSnapshotDate = customerDossier?.balanceSnapshots?.[0]?.month_end_date?.slice(0, 10) || 'Recent';

  const balanceSparkline = useMemo(() => {
    if (customerDossier?.balanceSnapshots && customerDossier.balanceSnapshots.length > 0) {
      return [...customerDossier.balanceSnapshots]
        .reverse()
        .slice(-8)
        .map((b) => Math.round((Number(b.closing_balance_inr) || 0) / 1000));
    }
    return undefined;
  }, [customerDossier?.balanceSnapshots]);

  return (
    <AppLayout
      title="My Financial Overview"
      subtitle="Personal financial health, spending patterns, portfolio balances, and AI recommendations."
      icon={<Wallet className="w-5 h-5 text-[#0d5941]" />}
      breadcrumbLabel="My Financial Overview"
    >
      {/* If current session cannot identify customer, show dedicated empty/error state */}
      {!customerId ? (
        <div className="max-w-md mx-auto my-12 p-8 bg-white border border-[#ece7dc] rounded-2xl shadow-xs text-center">
          <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h3 className="font-heading font-bold text-lg text-slate-800 mb-2">
            Customer Account Not Identified
          </h3>
          <p className="text-xs text-slate-500 mb-6 leading-relaxed">
            No authorized customer identifier was found in your authenticated session context. Please verify your credentials or contact administrator support.
          </p>
          <div className="flex items-center justify-center gap-3">
            <Button variant="outline" size="sm" onClick={() => navigate('/app')}>
              Return to Dashboard
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* Top Action Ribbon / Workspace Toolbar */}
          <div className="flex items-center justify-between flex-wrap gap-3 mb-6 pb-2 border-b border-[#ece6d9]">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Workspace:
              </span>
              <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#ebf5f0] text-[#0d5941] border border-[#aee3cb] flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-[#0d5941]" />
                {displayName} ({displayCustomerId}) · {segment}
              </span>
              <span className="text-xs px-2.5 py-1 rounded-lg bg-[#faf7f0] text-slate-700 border border-[#e4ded0]">
                {city} · KYC: {kycStatus}
              </span>
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  isLiveDatabase
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-800 border border-amber-300'
                }`}
              >
                {isLiveDatabase ? 'Supabase Live' : 'Demo Mode'}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoadingCustomerDossier ? 'animate-spin' : ''}`} />}
                onClick={() => fetchCustomerDossier(customerId)}
                disabled={isLoadingCustomerDossier}
              >
                Refresh
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/app/transactions')}
              >
                All Activity
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
                onClick={() => fetchCustomerDossier(customerId)}
              >
                Retry
              </Button>
            </div>
          )}

          {/* Customer Profile Table (Selector Removed) */}
          <CustomerProfileHeader
            customer={customerProfile}
            isLoadingCustomer={isLoadingCustomerDossier}
          />

          {/* Customer Interactive Filter Toolbar */}
          <div className="bg-white border border-[#ece7dc] rounded-2xl p-4 shadow-xs mb-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#ebf7f1] text-[#0d5941] flex items-center justify-center flex-shrink-0">
                  <Filter className="w-4 h-4 text-[#0d5941]" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-700">
                  Personal Finance Filters:
                </span>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap flex-1 justify-start lg:justify-end">
                {/* Account Selector */}
                <div className="flex items-center gap-1.5 bg-[#faf8f3] border border-[#e5dfd2] rounded-xl px-2.5 py-1.5 text-xs">
                  <CreditCard className="w-3.5 h-3.5 text-[#0d5941]" />
                  <select
                    value={selectedAccountId || ''}
                    onChange={(e) => setSelectedAccountId(e.target.value || null)}
                    className="bg-transparent text-slate-700 font-medium focus:outline-none cursor-pointer"
                    aria-label="Filter by Account"
                  >
                    <option value="">Account: All Linked Accounts ({customerDossier?.accounts?.length || 1})</option>
                    {customerDossier?.accounts?.map((acc) => (
                      <option key={acc.account_id} value={acc.account_id}>
                        {acc.account_id} · {acc.account_type}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Date Window */}
                <div className="flex items-center gap-1.5 bg-[#faf8f3] border border-[#e5dfd2] rounded-xl px-2.5 py-1.5 text-xs">
                  <Calendar className="w-3.5 h-3.5 text-[#0d5941]" />
                  <select
                    value={dateRange}
                    onChange={(e) => setDateRange(e.target.value)}
                    className="bg-transparent text-slate-700 font-medium focus:outline-none cursor-pointer"
                    aria-label="Filter by Date Window"
                  >
                    <option value="ALL">Date: All Activity (12M)</option>
                    <option value="30d">Last 30 Days</option>
                    <option value="90d">Last 90 Days</option>
                    <option value="180d">Last 180 Days</option>
                  </select>
                </div>

                {/* Transaction Type */}
                <div className="flex items-center gap-1.5 bg-[#faf8f3] border border-[#e5dfd2] rounded-xl px-2.5 py-1.5 text-xs">
                  <Receipt className="w-3.5 h-3.5 text-[#0d5941]" />
                  <select
                    value={selectedTxnType}
                    onChange={(e) => setSelectedTxnType(e.target.value)}
                    className="bg-transparent text-slate-700 font-medium focus:outline-none cursor-pointer"
                    aria-label="Filter by Transaction Type"
                  >
                    <option value="ALL">Type: All (Debit & Credit)</option>
                    <option value="Debit">Debit Purchases Only</option>
                    <option value="Credit">Credit Inflows Only</option>
                  </select>
                </div>

                {/* Reset All Filters Button */}
                {activeFilters.length > 0 && (
                  <button
                    type="button"
                    onClick={handleResetAllFilters}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-semibold cursor-pointer transition-colors"
                  >
                    <FilterX className="w-3.5 h-3.5" />
                    <span>Reset All Filters</span>
                  </button>
                )}
              </div>
            </div>

            {/* Active Filters Badges Strip */}
            {activeFilters.length > 0 && (
              <div className="mt-3 pt-3 border-t border-[#ece7dc] flex items-center gap-2 flex-wrap text-xs">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  Active Filters ({activeFilters.length}):
                </span>
                {activeFilters.map((f) => (
                  <span
                    key={f.key}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#ebf7f1] text-[#0d5941] border border-[#aee3cb] font-medium"
                  >
                    <span>
                      {f.label}: <strong>{f.value}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={f.onClear}
                      className="hover:text-rose-600 transition-colors cursor-pointer"
                      title={`Remove ${f.label} filter`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
                <span className="text-slate-400 text-xs font-mono ml-auto">
                  ({displayTransactions.length} matching transactions)
                </span>
              </div>
            )}
          </div>

          {/* Five KPI Cards Arranged in a Responsive Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3.5 md:gap-4 mb-6">
            {/* 1. Total Spend */}
            <KpiCard
              title="Total Spend"
              value={isLoadingCustomerDossier && !customerDossier ? '...' : `₹ ${formatINR(totalSpend)}`}
              change={`${debitTxCount} debit purchases`}
              changeType="neutral"
              comparisonPeriod="total debit outflow"
              icon={<Receipt className="w-5 h-5 text-[#b45309]" />}
              iconBg="bg-[#fffbeb]"
            />

            {/* 2. Debit Transactions */}
            <KpiCard
              title="Debit Transactions"
              value={isLoadingCustomerDossier && !customerDossier ? '...' : `${debitTxCount}`}
              change={rawTransactions.length > 0 ? `${Math.round((debitTxCount / rawTransactions.length) * 100)}% of activity` : '0 recorded'}
              changeType="positive"
              comparisonPeriod="settled debit operations"
              icon={<TrendingDown className="w-5 h-5 text-[#0d5941]" />}
              iconBg="bg-[#ebf5f0]"
            />

            {/* 3. Avg Transaction */}
            <KpiCard
              title="Avg Transaction"
              value={isLoadingCustomerDossier && !customerDossier ? '...' : `₹ ${formatINR(avgTxAmount)}`}
              change="per debit transaction"
              changeType="neutral"
              comparisonPeriod="average ticket size"
              icon={<Scale className="w-5 h-5 text-[#b0882e]" />}
              iconBg="bg-[#fcf4e4]"
            />

            {/* 4. Latest Balance */}
            <KpiCard
              title="Latest Balance"
              value={isLoadingCustomerDossier && !customerDossier ? '...' : `₹ ${formatINR(latestBalance)}`}
              change={`${customerDossier?.accounts?.length || 1} active account(s)`}
              changeType="positive"
              comparisonPeriod={`as of ${latestSnapshotDate}`}
              icon={<Wallet className="w-5 h-5 text-[#059669]" />}
              iconBg="bg-[#ecfdf5]"
              sparklineColor="#10b981"
              sparklineData={balanceSparkline}
            />

            {/* 5. Credit Score */}
            <KpiCard
              title="Credit Score"
              value={isLoadingCustomerDossier && !customerDossier ? '...' : `${latestCreditScore}`}
              change={`${creditScoreBand} Tier`}
              changeType="positive"
              comparisonPeriod="bureau recorded score"
              icon={<Award className="w-5 h-5 text-[#0d5941]" />}
              iconBg="bg-[#ebf5f0]"
            />
          </div>

          {/* Three Chart Panels in a Responsive Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 mb-6">
            {/* Left: Monthly Spend Trend */}
            <MonthlySpendTrendChart
              data={monthlySpendData}
              title="Monthly Spend Trend"
              className="h-full min-w-0"
            />

            {/* Middle: Spend by Category (Doughnut) */}
            <SpendByCategoryDoughnut
              categories={categorySpendData}
              totalSpend={totalSpend}
              title="Spend by Category"
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              className="h-full min-w-0"
            />

            {/* Right: Spend by Payment Method (Vertical Bar) */}
            <div className="md:col-span-2 lg:col-span-1">
              <SpendByPaymentMethodBar
                data={paymentMethodData}
                title="Spend by Payment Method"
                selectedMethod={selectedPaymentMethod}
                onSelectMethod={setSelectedPaymentMethod}
                className="h-full min-w-0"
              />
            </div>
          </div>

          {/* Preserved Financial Health Score & Companion Insights Section */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 md:gap-6 mb-6">
            {/* Left: Financial Health Score (Mandatory Preserved Component) */}
            <div className="lg:col-span-5 flex flex-col min-w-0">
              <FinancialHealthScore
                creditScore={customerDossier?.latestCreditScore}
                creditBand={customerDossier?.creditScoreBand}
                creditDate={customerDossier?.creditScoreDate || undefined}
                customerName={displayName}
                customerId={customerId}
                portfolioBalanceInr={latestBalance}
                monthlyInflowInr={customerDossier?.monthlyInflowInr}
                monthlyOutflowInr={dynamicOutflowInr}
                monthlySavingsInr={dynamicSavingsInr}
                className="h-full"
              />
            </div>

            {/* Right: Active Accounts & Portfolio Summary */}
            <div className="lg:col-span-7 bg-white border border-[#ece7dc] rounded-2xl p-5 shadow-[0_2px_8px_rgba(18,48,36,0.04)] flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="font-heading font-semibold text-base text-[#0a261c]">
                      Active Accounts & Balances
                    </h3>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Verified institutional accounts for {displayName} ({customerId}) · Click account to filter
                    </p>
                  </div>
                  <span className="text-[10px] font-semibold text-[#0d5941] bg-[#ebf7f1] border border-[#a7f3d0] px-2.5 py-0.5 rounded-full">
                    {customerDossier?.accounts?.length || 1} Accounts Linked
                  </span>
                </div>

                {/* List of customer accounts (Interactive Cross-Filtering) */}
                <div className="space-y-3">
                  {customerDossier?.accounts && customerDossier.accounts.length > 0 ? (
                    customerDossier.accounts.map((acc) => {
                      const isSelected = selectedAccountId === acc.account_id;
                      return (
                        <div
                          key={acc.account_id}
                          onClick={() => setSelectedAccountId((prev) => (prev === acc.account_id ? null : acc.account_id))}
                          className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all duration-150 ${
                            isSelected
                              ? 'bg-[#ebf7f1] border-[#0d5941] shadow-xs ring-1 ring-[#0d5941]'
                              : 'bg-[#faf7f0] border-[#f0ece1] hover:border-[#aee3cb] hover:bg-[#f4f8f5]'
                          }`}
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
                              <div className="text-xs font-semibold text-slate-800 font-mono flex items-center gap-1.5">
                                <span>{acc.account_id}</span>
                                {isSelected && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-[#0d5941] text-white">
                                    FILTERED
                                  </span>
                                )}
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
                      );
                    })
                  ) : (
                    <div className="p-4 rounded-xl bg-[#faf7f0] text-center text-xs text-slate-500">
                      No accounts linked to profile
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-[#f2ede3] flex items-center justify-between text-xs">
                <span className="text-slate-500">
                  Snapshot balance date: <strong className="text-slate-800">{latestSnapshotDate}</strong>
                </span>
                <button
                  onClick={() => navigate('/app/assistant')}
                  className="font-semibold text-[#0d5941] hover:underline cursor-pointer flex items-center gap-1"
                >
                  <span>Analyze Portfolio with FinSight AI</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>

          {/* Row: Customer Isolated Transactions Table */}
          <div className="bg-white border border-[#ece7dc] rounded-2xl p-5 shadow-xs">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div>
                <h3 className="font-heading font-semibold text-base text-[#0a261c]">
                  Recent Account Transactions
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Isolated transaction ledger strictly scoped to {displayName} ({customerId})
                  {selectedCategory && ` · Category: ${selectedCategory}`}
                  {selectedPaymentMethod && ` · Method: ${selectedPaymentMethod}`}
                  {selectedAccountId && ` · Account: ${selectedAccountId}`}
                  {selectedTxnType !== 'ALL' && ` · Type: ${selectedTxnType}`}
                  {dateRange !== 'ALL' && ` · Window: ${dateRange}`}
                </p>
              </div>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/app/transactions')}
              >
                View Complete Activity
              </Button>
            </div>

            {isLoadingCustomerDossier && (!customerDossier?.recentTransactions || customerDossier.recentTransactions.length === 0) ? (
              <div className="py-12 text-center text-xs text-slate-400">
                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#0d5941]" />
                Loading verified customer transaction history...
              </div>
            ) : displayTransactions.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                {activeFilters.length > 0
                  ? 'No transactions match the selected filter criteria.'
                  : 'No transactions found for this account.'}
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
                    {displayTransactions.map((t) => {
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
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                                isCredit ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {t.txn_type || 'Debit'}
                            </span>
                          </td>
                          <td className="py-3 font-semibold font-mono text-[#0a2b1f]">
                            ₹ {formatINR(Number(t.amount_inr) || 0)}
                          </td>
                          <td className="py-3 text-right">
                            <StatusBadge
                              status={t.status === 'Success' ? 'Completed' : t.status === 'Failed' ? 'Declined' : 'Pending'}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </AppLayout>
  );
};
