import React, { useState } from 'react';
import { Search, Filter, Download, ArrowUpDown, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { formatINR } from '../../data/sampleData';
import { useApp } from '../../context/AppContext';

export const TransactionsPage: React.FC = () => {
  const { transactions, searchQuery, setSearchQuery } = useApp();
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  const filtered = transactions.filter((t) => {
    const matchesSearch =
      t.transaction_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.customer_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      t.merchant_category.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCat = selectedCategory === 'ALL' || t.merchant_category === selectedCategory;
    const matchesStat = selectedStatus === 'ALL' || t.transaction_status === selectedStatus;

    return matchesSearch && matchesCat && matchesStat;
  });

  return (
    <AppLayout
      title="Transaction Intelligence"
      subtitle="Analyze real-time transaction streams, velocity scores, and merchant classification."
    >
      {/* Filters and Search Bar */}
      <div className="bg-white border border-[#ece7dc] rounded-2xl p-4 shadow-xs mb-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by ID, customer name, merchant, or city..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#faf7f0] border border-[#e5dfd2] rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0d5941]"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Category Filter */}
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="px-3 py-2 bg-[#faf7f0] border border-[#e5dfd2] rounded-xl text-xs text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Categories</option>
              <option value="Shopping">Shopping</option>
              <option value="Food & Dining">Food & Dining</option>
              <option value="Travel">Travel</option>
              <option value="Utilities">Utilities</option>
              <option value="Entertainment">Entertainment</option>
              <option value="Financial Services">Financial Services</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 bg-[#faf7f0] border border-[#e5dfd2] rounded-xl text-xs text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="Completed">Completed</option>
              <option value="Pending">Pending</option>
              <option value="Flagged">Flagged</option>
              <option value="Declined">Declined</option>
            </select>

            <Button variant="primary" size="sm" leftIcon={<Download className="w-3.5 h-3.5" />}>
              Export CSV
            </Button>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white border border-[#ece7dc] rounded-2xl p-5 shadow-xs">
        <div className="flex items-center justify-between mb-4">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Showing {filtered.length} of {transactions.length} Transactions
          </p>
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Streaming Live Pipeline</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#ece7dc] text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                <th className="pb-3">Transaction ID</th>
                <th className="pb-3">Customer</th>
                <th className="pb-3">Date & Time</th>
                <th className="pb-3">Category</th>
                <th className="pb-3">Method / Device</th>
                <th className="pb-3">Location</th>
                <th className="pb-3">Amount</th>
                <th className="pb-3">Risk Score</th>
                <th className="pb-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5f2ea]">
              {filtered.map((t) => (
                <tr key={t.transaction_id} className="hover:bg-[#faf8f3] transition-colors">
                  <td className="py-3 font-semibold text-[#093425] font-mono">{t.transaction_id}</td>
                  <td className="py-3 font-medium text-slate-800">{t.customer_name}</td>
                  <td className="py-3 text-slate-500 font-mono text-[11px]">{t.transaction_date}</td>
                  <td className="py-3 text-slate-700">{t.merchant_category}</td>
                  <td className="py-3 text-slate-600">
                    {t.payment_method} · <span className="text-slate-400">{t.device_type}</span>
                  </td>
                  <td className="py-3 text-slate-600">{t.city}, {t.country}</td>
                  <td className="py-3 font-semibold text-[#0a2b1f] font-mono">₹ {formatINR(t.transaction_amount)}</td>
                  <td className="py-3">
                    <span
                      className={`font-mono font-bold text-xs ${
                        t.risk_score >= 80 ? 'text-red-600' : t.risk_score >= 50 ? 'text-amber-600' : 'text-emerald-600'
                      }`}
                    >
                      {t.risk_score}/100
                    </span>
                  </td>
                  <td className="py-3 text-right">
                    <StatusBadge status={t.transaction_status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </AppLayout>
  );
};
