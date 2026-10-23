import React, { useState, useEffect } from 'react';
import { Search, Briefcase, TrendingUp, MapPin, ChevronLeft, ChevronRight, Loader2, AlertCircle, RefreshCw } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { formatINR } from '../../data/sampleData';
import { useApp } from '../../context/AppContext';
import { DbCustomer } from '../../types/database';

export const CustomersPage: React.FC = () => {
  const {
    dbCustomers,
    dbCustomersTotal,
    dbCustomersPage,
    dbCustomersPages,
    isLoadingCustomers,
    customersError,
    fetchCustomers
  } = useApp();

  const [selectedSegment, setSelectedSegment] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<DbCustomer | null>(null);

  // Load live customers on mount or filter changes
  useEffect(() => {
    fetchCustomers({
      page: 1,
      limit: 15,
      segment: selectedSegment !== 'ALL' ? selectedSegment : undefined,
      search: search.trim() || undefined
    });
  }, [selectedSegment, fetchCustomers]);

  // Handle live search submission
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchCustomers({
      page: 1,
      limit: 15,
      segment: selectedSegment !== 'ALL' ? selectedSegment : undefined,
      search: search.trim() || undefined
    });
  };

  const handlePageChange = (newPage: number) => {
    if (newPage < 1 || newPage > dbCustomersPages) return;
    fetchCustomers({
      page: newPage,
      limit: 15,
      segment: selectedSegment !== 'ALL' ? selectedSegment : undefined,
      search: search.trim() || undefined
    });
  };

  // Set default selection when customers change
  useEffect(() => {
    if (dbCustomers.length > 0 && !selectedCustomer) {
      setSelectedCustomer(dbCustomers[0]);
    } else if (dbCustomers.length === 0) {
      setSelectedCustomer(null);
    }
  }, [dbCustomers, selectedCustomer]);

  return (
    <AppLayout
      title="Customer Intelligence"
      subtitle="Deep customer behavioral analytics, segment clustering, and creditworthiness profiles from live Supabase ledger."
    >
      {/* Top Filter Bar */}
      <div className="bg-white border border-[#ece7dc] rounded-2xl p-4 shadow-xs mb-6">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search customer by name, ID or city..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-[#faf7f0] border border-[#e5dfd2] rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0d5941]"
            />
          </div>

          {/* Segment Filter Buttons */}
          <div className="flex items-center gap-1 p-1 bg-[#faf7f0] border border-[#e5dfd2] rounded-xl text-xs flex-wrap">
            {(['ALL', 'Mass', 'Affluent', 'Premium'] as const).map((seg) => (
              <button
                key={seg}
                type="button"
                onClick={() => setSelectedSegment(seg)}
                className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  selectedSegment === seg
                    ? 'bg-[#0b3829] text-white shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-black'
                }`}
              >
                {seg}
              </button>
            ))}
          </div>
        </form>
      </div>

      {customersError && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{customersError}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchCustomers({ page: dbCustomersPage, limit: 15, segment: selectedSegment !== 'ALL' ? selectedSegment : undefined, search: search.trim() || undefined })}
          >
            Retry
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Customer List Table */}
        <div className="lg:col-span-8 bg-white border border-[#ece7dc] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading font-semibold text-base text-[#0a261c]">
                Directory ({dbCustomersTotal.toLocaleString()} Live Customers)
              </h3>
              <span className="text-xs text-slate-500">Page {dbCustomersPage} of {Math.max(1, dbCustomersPages)}</span>
            </div>

            {isLoadingCustomers ? (
              <div className="py-20 text-center text-xs text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0d5941]" />
                Querying live Supabase customers table...
              </div>
            ) : dbCustomers.length === 0 ? (
              <div className="py-20 text-center text-xs text-slate-500">
                No customer records match the current filter criteria.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#ece7dc] text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                      <th className="pb-3">Customer ID</th>
                      <th className="pb-3">Full Name</th>
                      <th className="pb-3">Segment</th>
                      <th className="pb-3">City</th>
                      <th className="pb-3">KYC Status</th>
                      <th className="pb-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f5f2ea]">
                    {dbCustomers.map((c) => (
                      <tr
                        key={c.customer_id}
                        onClick={() => setSelectedCustomer(c)}
                        className={`cursor-pointer transition-colors ${
                          selectedCustomer?.customer_id === c.customer_id
                            ? 'bg-[#f0f7f3]'
                            : 'hover:bg-[#faf8f3]'
                        }`}
                      >
                        <td className="py-3 font-semibold text-[#093425] font-mono">{c.customer_id}</td>
                        <td className="py-3 font-semibold text-slate-900">{c.full_name}</td>
                        <td className="py-3"><StatusBadge status={c.segment} /></td>
                        <td className="py-3 text-slate-600">{c.city || '—'}</td>
                        <td className="py-3">
                          <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                            {c.kyc_status}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded ${
                            c.is_active === 1 ? 'text-emerald-700 bg-emerald-50' : 'text-slate-500 bg-slate-100'
                          }`}>
                            {c.is_active === 1 ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Pagination Controls */}
          <div className="flex items-center justify-between pt-4 mt-4 border-t border-[#f5f2ea] text-xs">
            <span className="text-slate-500">
              Showing {dbCustomers.length > 0 ? (dbCustomersPage - 1) * 15 + 1 : 0} to {Math.min(dbCustomersPage * 15, dbCustomersTotal)} of {dbCustomersTotal.toLocaleString()} records
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(dbCustomersPage - 1)}
                disabled={dbCustomersPage <= 1 || isLoadingCustomers}
                leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(dbCustomersPage + 1)}
                disabled={dbCustomersPage >= dbCustomersPages || isLoadingCustomers}
                rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
              >
                Next
              </Button>
            </div>
          </div>
        </div>

        {/* Selected Customer Insight Drawer */}
        <div className="lg:col-span-4">
          {selectedCustomer ? (
            <div className="bg-white border border-[#ece7dc] rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#f0ece1]">
                <div>
                  <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold font-mono">
                    {selectedCustomer.customer_id}
                  </span>
                  <h3 className="font-heading font-bold text-lg text-[#092b1e]">
                    {selectedCustomer.full_name}
                  </h3>
                </div>
                <StatusBadge status={selectedCustomer.segment} />
              </div>

              <div className="space-y-2.5 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-3.5 h-3.5 text-[#0d5941]" />
                  <span>{selectedCustomer.occupation || 'Professional'} (Age {selectedCustomer.age_band})</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-3.5 h-3.5 text-[#0d5941]" />
                  <span>Income Band: {selectedCustomer.income_band || 'Standard'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-[#0d5941]" />
                  <span>{selectedCustomer.city}, {selectedCustomer.state} ({selectedCustomer.pincode})</span>
                </div>
              </div>

              {/* Financial Profile Card */}
              <div className="p-4 rounded-xl bg-[#faf7f0] border border-[#eee9dc] space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Tier Classification</span>
                  <span className="font-bold text-[#0a2f21] text-sm">
                    {selectedCustomer.segment}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">KYC Status</span>
                  <span className="font-bold text-emerald-800">
                    {selectedCustomer.kyc_status}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Ledger Status</span>
                  <span className="font-medium text-slate-700">
                    {selectedCustomer.is_active === 1 ? 'Active Account' : 'Dormant Account'}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Member Since</span>
                  <span className="font-medium text-slate-700">
                    {selectedCustomer.customer_since || 'N/A'}
                  </span>
                </div>
              </div>

              {/* AI Recommendations for this customer */}
              <div className="pt-2">
                <h4 className="text-xs font-semibold text-[#092b1e] uppercase tracking-wider mb-2">
                  Account Insights
                </h4>
                <div className="p-3 rounded-xl bg-[#ebf7f1] border border-[#aee3cb] text-xs">
                  <p className="font-semibold text-[#0a4834]">
                    {selectedCustomer.segment === 'Premium'
                      ? 'Private Wealth & Concierge Service'
                      : selectedCustomer.segment === 'Affluent'
                      ? 'Portfolio Yield Optimization & Auto-Sweep'
                      : 'Digital Financial Wellness & Core Savings'}
                  </p>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Grounded in live ledger record {selectedCustomer.customer_id}.
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-[#ece7dc] rounded-2xl p-8 text-center text-xs text-slate-400">
              Select a customer from the directory to inspect their verified profile.
            </div>
          )}
        </div>
      </div>
    </AppLayout>
  );
};
