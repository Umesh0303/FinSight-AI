import React, { useState } from 'react';
import { FileText, CheckCircle2, Clock, AlertCircle, Plus } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useApp } from '../../context/AppContext';

export const CasesPage: React.FC = () => {
  const { cases, resolveCase } = useApp();
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const filtered = cases.filter((c) => {
    if (filterStatus === 'ALL') return true;
    return c.status === filterStatus;
  });

  return (
    <AppLayout
      title="Customer Service Cases"
      subtitle="Escalations, dispute investigations, and customer inquiries with human-in-the-loop audit trail."
    >
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-1 p-1 bg-white border border-[#e5dfd2] rounded-xl text-xs">
          {(['ALL', 'Open', 'In Progress', 'Escalated', 'Resolved'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors ${
                filterStatus === st
                  ? 'bg-[#0b3829] text-white shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-black'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <Button variant="emerald" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />}>
          Create Support Case
        </Button>
      </div>

      <div className="bg-white border border-[#ece7dc] rounded-2xl p-5 shadow-xs">
        <div className="space-y-4">
          {filtered.map((c) => (
            <div
              key={c.case_id}
              className="p-4 rounded-xl border border-[#ece7dc] hover:border-[#cfc6b5] bg-[#fffdfa] transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
            >
              <div className="space-y-1.5 max-w-2xl">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-mono font-bold text-[#093425]">{c.case_id}</span>
                  <span className="text-slate-300">·</span>
                  <span className="font-semibold text-slate-800">{c.customer_name}</span>
                  <span className="text-slate-400">({c.customer_id})</span>
                  <StatusBadge status={c.case_type} />
                  <StatusBadge status={c.priority} />
                  <StatusBadge status={c.status} />
                </div>
                <p className="text-slate-700 leading-relaxed">{c.description}</p>
                {c.resolution && (
                  <div className="p-2.5 rounded-lg bg-[#ebf7f1] border border-[#aee3cb] text-[#0a4834] mt-2">
                    <strong>Resolution:</strong> {c.resolution}
                  </div>
                )}
                <div className="text-[11px] text-slate-400 pt-1">
                  Assigned to <strong className="text-slate-600">{c.assigned_to}</strong> · Opened {c.created_at}
                </div>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0 self-end md:self-center">
                {c.status !== 'Resolved' && (
                  <Button
                    variant="emerald"
                    size="sm"
                    onClick={() => resolveCase(c.case_id)}
                    leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                  >
                    Mark Resolved
                  </Button>
                )}
                <Button variant="primary" size="sm">
                  View Dossier
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppLayout>
  );
};
