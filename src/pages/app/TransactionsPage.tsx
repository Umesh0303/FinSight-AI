import React, { useState, useEffect } from 'react';
import { Search, Download, ChevronLeft, ChevronRight, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { formatINR } from '../../data/sampleData';
import { useApp } from '../../context/AppContext';

export const TransactionsPage: React.FC = () => {
  const {
    dbTransactions,
    dbTransactionsTotal,
    dbTransactionsPage,
    dbTransactionsPages,
    isLoadingTransactions,
    transactionsError,
    fetchTransactions,
    searchQuery,
    setSearchQuery
  } = useApp();

  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');

  useEffect(() => {
    fetchTransactions({
      page: 1,
      limit: 20,
      category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
      status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
      search: searchQuery.trim() || undefined
    });
  }, [selectedCategory, selectedStatus, fetchTransactions]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchTransactions({
      page: 1,
      limit: 20,
      category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
      status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
      search: searchQuery.trim() || undefined
    });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > dbTransactionsPages) return;
    fetchTransactions({
      page: newPage,
      limit: 20,
      category: selectedCategory !== 'ALL' ? selectedCategory : undefined,
      status: selectedStatus !== 'ALL' ? selectedStatus : undefined,
      search: searchQuery.trim() || undefined
    });
  };

  return (
    <AppLayout
      title="Transaction Intelligence"
      subtitle="Analyze real-time transaction streams, velocity scores, and merchant classification from live Supabase ledger."
    >
      {/* Filters and Search Bar */}
      <div className="bg-white border border-[#ece7dc] rounded-2xl p-4 shadow-xs mb-6">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
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
              className="px-3 py-2 bg-[#faf7f0] border border-[#e5dfd2] rounded-xl text-xs text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Categories</option>
              <option value="Cash Withdrawal">Cash Withdrawal</option>
              <option value="Grocery">Grocery</option>
              <option value="Shopping">Shopping</option>
              <option value="Food & Dining">Food & Dining</option>
              <option value="Travel">Travel</option>
              <option value="Utilities">Utilities</option>
              <option value="Healthcare">Healthcare</option>
            </select>

            {/* Status Filter */}
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-3 py-2 bg-[#faf7f0] border border-[#e5dfd2] rounded-xl text-xs text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Statuses</option>
              <option value="Success">Success (Settled)</option>
              <option value="Failed">Failed</option>
              <option value="Reversed">Reversed</option>
            </select>

            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoadingTransactions ? 'animate-spin' : ''}`} />}
              onClick={() => fetchTransactions({ page: dbTransactionsPage, limit: 20, category: selectedCategory !== 'ALL' ? selectedCategory : undefined, status: selectedStatus !== 'ALL' ? selectedStatus : undefined, search: searchQuery.trim() || undefined })}
            >
              Refresh
            </Button>
          </div>
        </form>
      </div>

      {transactionsError && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{transactionsError}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchTransactions({ page: dbTransactionsPage, limit: 20 })}
          >
            Retry
          </Button>
        </div>
      )}

      {/* Transactions Table */}
      <div className="bg-white border border-[#ece7dc] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Showing {dbTransactions.length > 0 ? (dbTransactionsPage - 1) * 20 + 1 : 0} to {Math.min(dbTransactionsPage * 20, dbTransactionsTotal)} of {dbTransactionsTotal.toLocaleString()} Transactions
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Live Supabase Stream (217,818 Ledger Records)</span>
            </div>
          </div>

          {isLoadingTransactions ? (
            <div className="py-20 text-center text-xs text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0d5941]" />
              Querying live Supabase transactions table...
            </div>
          ) : dbTransactions.length === 0 ? (
            <div className="py-20 text-center text-xs text-slate-500">
              No transactions match the selected filter criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-[#ece7dc] text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                    <th className="pb-3">Transaction ID</th>
                    <th className="pb-3">Customer ID</th>
                    <th className="pb-3">Date & Time</th>
                    <th className="pb-3">Category</th>
                    <th className="pb-3">Method / Device</th>
                    <th className="pb-3">Location</th>
                    <th className="pb-3">Type</th>
                    <th className="pb-3">Amount</th>
                    <th className="pb-3">Flagged</th>
                    <th className="pb-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f5f2ea]">
                  {dbTransactions.map((t) => {
                    const isCredit = t.txn_type === 'Credit';
                    return (
                      <tr key={t.transaction_id} className="hover:bg-[#faf8f3] transition-colors">
                        <td className="py-3 font-semibold text-[#093425] font-mono">{t.transaction_id}</td>
                        <td className="py-3 font-mono text-slate-700">{t.customer_id}</td>
                        <td className="py-3 text-slate-500 font-mono text-[11px]">
                          {t.txn_datetime ? t.txn_datetime.replace('T', ' ').slice(0, 16) : '—'}
                        </td>
                        <td className="py-3 text-slate-700">{t.category || 'General'}</td>
                        <td className="py-3 text-slate-600">
                          {t.payment_method} {t.device_type ? <span className="text-slate-400">· {t.device_type}</span> : ''}
                        </td>
                        <td className="py-3 text-slate-600">{t.city || 'Online'}</td>
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
                        <td className="py-3">
                          {t.is_flagged === 1 ? (
                            <span className="text-[10px] font-bold text-red-700 bg-red-100 px-2 py-0.5 rounded">
                              Flagged
                            </span>
                          ) : (
                            <span className="text-[10px] text-slate-400">Normal</span>
                          )}
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

        {/* Pagination Footer */}
        <div className="flex items-center justify-between pt-4 mt-4 border-t border-[#f5f2ea] text-xs">
          <span className="text-slate-500">
            Page {dbTransactionsPage} of {Math.max(1, dbTransactionsPages)} ({dbTransactionsTotal.toLocaleString()} total live transactions)
          </span>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(dbTransactionsPage - 1)}
              disabled={dbTransactionsPage <= 1 || isLoadingTransactions}
              leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handlePageChange(dbTransactionsPage + 1)}
              disabled={dbTransactionsPage >= dbTransactionsPages || isLoadingTransactions}
              rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
