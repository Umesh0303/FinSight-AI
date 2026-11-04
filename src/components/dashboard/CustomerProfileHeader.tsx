import React from 'react';
import { User, Loader2, ShieldCheck } from 'lucide-react';
import { DbCustomer } from '../../types/database';

interface CustomerProfileHeaderProps {
  customer: DbCustomer | null;
  isLoadingCustomer: boolean;
  className?: string;
}

export const CustomerProfileHeader: React.FC<CustomerProfileHeaderProps> = ({
  customer,
  isLoadingCustomer,
  className = ''
}) => {
  return (
    <div
      className={`bg-white border border-[#ece7dc] rounded-2xl p-5 shadow-[0_2px_8px_rgba(18,48,36,0.04)] mb-6 ${className}`}
    >
      <div className="overflow-x-auto min-w-0">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-6 h-6 rounded-md bg-[#ebf7f1] flex items-center justify-center text-[#0d5941] flex-shrink-0">
            <User className="w-3.5 h-3.5" />
          </div>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Customer Profile
          </h2>
          {customer?.customer_id && (
            <span className="text-[10px] font-mono text-slate-400">
              ({customer.customer_id})
            </span>
          )}
        </div>

        {isLoadingCustomer ? (
          <div className="py-4 flex items-center gap-2 text-xs text-slate-400">
            <Loader2 className="w-4 h-4 animate-spin text-[#0d5941]" />
            <span>Loading authorized customer profile...</span>
          </div>
        ) : !customer ? (
          <div className="py-4 text-xs text-slate-400">
            No customer profile records available.
          </div>
        ) : (
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#f0ece1] text-slate-400 font-medium text-[11px]">
                <th className="pb-2 pr-4 whitespace-nowrap font-medium">Name</th>
                <th className="pb-2 px-4 whitespace-nowrap font-medium">City</th>
                <th className="pb-2 px-4 whitespace-nowrap font-medium">Age Group</th>
                <th className="pb-2 px-4 whitespace-nowrap font-medium">Income Range</th>
                <th className="pb-2 px-4 whitespace-nowrap font-medium">Segment</th>
                <th className="pb-2 px-4 whitespace-nowrap font-medium">KYC Status</th>
                <th className="pb-2 pl-4 whitespace-nowrap font-medium">Customer Since</th>
              </tr>
            </thead>
            <tbody>
              <tr className="font-semibold text-slate-800">
                <td className="pt-2.5 pr-4 whitespace-nowrap text-[#093425] font-bold">
                  {customer.full_name}
                </td>
                <td className="pt-2.5 px-4 whitespace-nowrap font-normal text-slate-600">
                  {customer.city || '—'}
                </td>
                <td className="pt-2.5 px-4 whitespace-nowrap font-mono text-slate-700">
                  {customer.age_band || '—'}
                </td>
                <td className="pt-2.5 px-4 whitespace-nowrap font-mono text-slate-700">
                  ₹ {customer.income_band || '—'}
                </td>
                <td className="pt-2.5 px-4 whitespace-nowrap">
                  <span className="inline-block text-[10px] font-semibold text-[#0d5941] bg-[#ebf7f1] border border-[#a7f3d0] px-2 py-0.5 rounded">
                    {customer.segment || 'Standard'}
                  </span>
                </td>
                <td className="pt-2.5 px-4 whitespace-nowrap">
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    {customer.kyc_status || 'Verified'}
                  </span>
                </td>
                <td className="pt-2.5 pl-4 whitespace-nowrap font-mono text-slate-600 font-normal">
                  {customer.customer_since || '—'}
                </td>
              </tr>
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
