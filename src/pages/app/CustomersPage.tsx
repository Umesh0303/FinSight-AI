import React, { useState } from 'react';
import { Search, UserCheck, Shield, Award, Phone, Mail, MapPin } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { SAMPLE_CUSTOMERS, formatINR } from '../../data/sampleData';
import { Customer } from '../../types';

export const CustomersPage: React.FC = () => {
  const [selectedSegment, setSelectedSegment] = useState<string>('ALL');
  const [search, setSearch] = useState<string>('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(SAMPLE_CUSTOMERS[0]);

  const filtered = SAMPLE_CUSTOMERS.filter((c) => {
    const matchesSegment = selectedSegment === 'ALL' || c.customer_segment === selectedSegment;
    const matchesSearch =
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.location.toLowerCase().includes(search.toLowerCase()) ||
      c.customer_id.toLowerCase().includes(search.toLowerCase());
    return matchesSegment && matchesSearch;
  });

  return (
    <AppLayout
      title="Customer Intelligence"
      subtitle="Deep customer behavioral analytics, segment clustering, and creditworthiness profiles."
    >
      {/* Top Filter Bar */}
      <div className="bg-white border border-[#ece7dc] rounded-2xl p-4 shadow-xs mb-6">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
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
            {(['ALL', 'High Value', 'Potential', 'Regular', 'At Risk', 'New'] as const).map((seg) => (
              <button
                key={seg}
                onClick={() => setSelectedSegment(seg)}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  selectedSegment === seg
                    ? 'bg-[#0b3829] text-white shadow-2xs font-semibold'
                    : 'text-slate-600 hover:text-black'
                }`}
              >
                {seg}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Customer List Table */}
        <div className="lg:col-span-8 bg-white border border-[#ece7dc] rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-base text-[#0a261c]">
              Directory ({filtered.length} Customers)
            </h3>
            <span className="text-xs text-slate-500">Click a customer to view profile</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#ece7dc] text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="pb-3">Customer ID</th>
                  <th className="pb-3">Name</th>
                  <th className="pb-3">Segment</th>
                  <th className="pb-3">Credit Score</th>
                  <th className="pb-3">Account Balance</th>
                  <th className="pb-3">Location</th>
                  <th className="pb-3 text-right">Age</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f5f2ea]">
                {filtered.map((c) => (
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
                    <td className="py-3 font-semibold text-slate-900">{c.name}</td>
                    <td className="py-3"><StatusBadge status={c.customer_segment} /></td>
                    <td className="py-3 font-mono font-semibold text-slate-700">{c.credit_score}</td>
                    <td className="py-3 font-semibold text-[#0a2b1f] font-mono">₹ {formatINR(c.account_balance)}</td>
                    <td className="py-3 text-slate-600">{c.location}</td>
                    <td className="py-3 text-right text-slate-500">{c.account_age_months} mo</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                    {selectedCustomer.name}
                  </h3>
                </div>
                <StatusBadge status={selectedCustomer.customer_segment} />
              </div>

              <div className="space-y-2.5 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-[#0d5941]" />
                  <span>{selectedCustomer.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-[#0d5941]" />
                  <span>{selectedCustomer.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-[#0d5941]" />
                  <span>{selectedCustomer.location}</span>
                </div>
              </div>

              {/* Financial Profile Card */}
              <div className="p-4 rounded-xl bg-[#faf7f0] border border-[#eee9dc] space-y-3">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Account Balance</span>
                  <span className="font-bold text-[#0a2f21] text-sm font-mono">
                    ₹ {formatINR(selectedCustomer.account_balance)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Credit Score</span>
                  <span className="font-bold text-slate-800">
                    {selectedCustomer.credit_score} / 850
                  </span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-500">Tenure</span>
                  <span className="font-medium text-slate-700">
                    {selectedCustomer.account_age_months} months
                  </span>
                </div>
              </div>

              {/* AI Recommendations for this customer */}
              <div className="pt-2">
                <h4 className="text-xs font-semibold text-[#092b1e] uppercase tracking-wider mb-2">
                  Recommended Action
                </h4>
                <div className="p-3 rounded-xl bg-[#ebf7f1] border border-[#aee3cb] text-xs">
                  <p className="font-semibold text-[#0a4834]">
                    {selectedCustomer.customer_segment === 'High Value'
                      ? 'Proactive Wealth Advisory Call'
                      : selectedCustomer.customer_segment === 'At Risk'
                      ? 'Retention Outreach & Credit Counseling'
                      : 'Cross-Sell Premium Cash-Back Card'}
                  </p>
                  <p className="text-[11px] text-slate-600 mt-1">
                    Automated recommendation ready based on deposit consistency.
                  </p>
                </div>
              </div>

              <Button variant="emerald" size="sm" className="w-full">
                Trigger Customer Engagement
              </Button>
            </div>
          ) : null}
        </div>
      </div>
    </AppLayout>
  );
};
