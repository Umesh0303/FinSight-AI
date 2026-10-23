import React, { useState, useEffect } from 'react';
import { FileText, CheckCircle2, AlertCircle, Plus, Loader2, X, RefreshCw } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useApp } from '../../context/AppContext';

export const CasesPage: React.FC = () => {
  const {
    dbSupportCases,
    dbSupportCasesTotal,
    isLoadingSupportCases,
    supportCasesError,
    fetchSupportCases,
    createSupportCase,
    resolveDbSupportCase,
    currentUser
  } = useApp();

  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [newCustId, setNewCustId] = useState<string>(currentUser.customerId || '');
  const [newCategory, setNewCategory] = useState<string>('General Inquiries');
  const [newPriority, setNewPriority] = useState<string>('Medium');
  const [newChannel, setNewChannel] = useState<string>('Web Portal');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);

  useEffect(() => {
    fetchSupportCases({
      status: filterStatus !== 'ALL' ? filterStatus : undefined
    });
  }, [filterStatus, fetchSupportCases]);

  const handleCreateCase = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetCustId = newCustId.trim() || currentUser.customerId || '';
    if (!targetCustId) {
      setFeedbackMsg('Customer ID is required.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await createSupportCase({
        customer_id: targetCustId,
        issue_category: newCategory,
        priority: newPriority,
        channel: newChannel,
        status: 'Open'
      });
      if (res.success) {
        setFeedbackMsg(`Support case ${res.caseId || ''} created successfully in Supabase.`);
        setIsModalOpen(false);
        setTimeout(() => setFeedbackMsg(null), 4000);
      } else {
        setFeedbackMsg(res.error || 'Failed to create support case.');
      }
    } catch (err: any) {
      setFeedbackMsg(err?.message || 'Error creating case.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResolve = async (caseId: string) => {
    try {
      const res = await resolveDbSupportCase(caseId);
      if (res.success) {
        setFeedbackMsg(`Case ${caseId} marked as Resolved in Supabase.`);
        setTimeout(() => setFeedbackMsg(null), 4000);
      }
    } catch {}
  };

  return (
    <AppLayout
      title="Customer Service Cases"
      subtitle="Escalations, dispute investigations, and customer inquiries directly integrated with Supabase support_cases ledger."
    >
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div className="flex items-center gap-1 p-1 bg-white border border-[#e5dfd2] rounded-xl text-xs">
          {(['ALL', 'Open', 'In Progress', 'Escalated', 'Resolved'] as const).map((st) => (
            <button
              key={st}
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-lg font-medium transition-colors cursor-pointer ${
                filterStatus === st
                  ? 'bg-[#0b3829] text-white shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-black'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoadingSupportCases ? 'animate-spin' : ''}`} />}
            onClick={() => fetchSupportCases({ status: filterStatus !== 'ALL' ? filterStatus : undefined })}
          >
            Refresh
          </Button>
          <Button
            variant="emerald"
            size="sm"
            onClick={() => setIsModalOpen(true)}
            leftIcon={<Plus className="w-3.5 h-3.5" />}
          >
            Create Support Case
          </Button>
        </div>
      </div>

      {feedbackMsg && (
        <div className="mb-6 p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between">
          <span>{feedbackMsg}</span>
          <button onClick={() => setFeedbackMsg(null)} className="font-bold text-emerald-900 cursor-pointer">✕</button>
        </div>
      )}

      {supportCasesError && (
        <div className="mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 flex-shrink-0" />
            <span>{supportCasesError}</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchSupportCases()}>
            Retry
          </Button>
        </div>
      )}

      <div className="bg-white border border-[#ece7dc] rounded-2xl p-5 shadow-xs">
        {isLoadingSupportCases ? (
          <div className="py-20 text-center text-xs text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-[#0d5941]" />
            Querying live Supabase support_cases table...
          </div>
        ) : dbSupportCases.length === 0 ? (
          <div className="py-16 text-center text-xs text-slate-500">
            <FileText className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <h4 className="font-heading font-semibold text-base text-slate-800 mb-1">
              No Active Support Cases
            </h4>
            <p className="text-slate-500 max-w-md mx-auto leading-relaxed">
              The <code className="bg-slate-100 px-1.5 py-0.5 rounded font-mono text-slate-700">support_cases</code> table in Supabase currently contains 0 records for this filter. All inquiries and disputes are cleared.
            </p>
            <div className="mt-4">
              <Button variant="emerald" size="sm" onClick={() => setIsModalOpen(true)} leftIcon={<Plus className="w-3.5 h-3.5" />}>
                Create New Ticket
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {dbSupportCases.map((c) => (
              <div
                key={c.case_id}
                className="p-4 rounded-xl border border-[#ece7dc] hover:border-[#cfc6b5] bg-[#fffdfa] transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 text-xs"
              >
                <div className="space-y-1.5 max-w-2xl">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-mono font-bold text-[#093425]">{c.case_id}</span>
                    <span className="text-slate-300">·</span>
                    <span className="font-semibold text-slate-800">{c.customer_id}</span>
                    <StatusBadge status={c.issue_category} />
                    <StatusBadge status={c.priority} />
                    <StatusBadge status={c.status} />
                  </div>
                  <p className="text-slate-700 leading-relaxed">
                    Case regarding {c.issue_category} submitted via {c.channel}.
                  </p>
                  <div className="text-[11px] text-slate-400 pt-1">
                    Channel: <strong className="text-slate-600">{c.channel}</strong> · SLA: {c.sla_hours || 24}h · Logged {c.created_at ? c.created_at.slice(0, 10) : 'Today'}
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0 self-end md:self-center">
                  {c.status !== 'Resolved' && (
                    <Button
                      variant="emerald"
                      size="sm"
                      onClick={() => handleResolve(c.case_id)}
                      leftIcon={<CheckCircle2 className="w-3.5 h-3.5" />}
                    >
                      Mark Resolved
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal for creating a live support case in Supabase */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white border border-[#ece7dc] rounded-2xl max-w-md w-full shadow-2xl p-6 relative">
            <div className="flex items-center justify-between pb-4 border-b border-[#ece7dc] mb-4">
              <h3 className="font-heading font-bold text-base text-[#0a261c]">
                Create Support Case
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCase} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Customer ID</label>
                <input
                  type="text"
                  value={newCustId}
                  onChange={(e) => setNewCustId(e.target.value)}
                  placeholder="e.g. CUST-1001"
                  required
                  className="w-full px-3 py-2 bg-[#faf7f0] border border-[#e5dfd2] rounded-xl text-slate-800 font-mono focus:outline-none focus:ring-2 focus:ring-[#0d5941]"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Issue Category</label>
                <select
                  value={newCategory}
                  onChange={(e) => setNewCategory(e.target.value)}
                  className="w-full px-3 py-2 bg-[#faf7f0] border border-[#e5dfd2] rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0d5941] cursor-pointer"
                >
                  <option value="General Inquiries">General Inquiries</option>
                  <option value="Card Issues">Card Issues</option>
                  <option value="Dispute">Dispute / Chargeback</option>
                  <option value="KYC">KYC Re-verification</option>
                  <option value="Technical">Technical Support</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Priority</label>
                <select
                  value={newPriority}
                  onChange={(e) => setNewPriority(e.target.value)}
                  className="w-full px-3 py-2 bg-[#faf7f0] border border-[#e5dfd2] rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0d5941] cursor-pointer"
                >
                  <option value="Low">Low</option>
                  <option value="Medium">Medium</option>
                  <option value="High">High</option>
                  <option value="Critical">Critical</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Channel</label>
                <select
                  value={newChannel}
                  onChange={(e) => setNewChannel(e.target.value)}
                  className="w-full px-3 py-2 bg-[#faf7f0] border border-[#e5dfd2] rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0d5941] cursor-pointer"
                >
                  <option value="Web Portal">Web Portal</option>
                  <option value="Mobile App">Mobile App</option>
                  <option value="Phone Support">Phone Support</option>
                  <option value="Email">Email</option>
                </select>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="emerald" size="sm" disabled={isSubmitting}>
                  {isSubmitting ? 'Submitting...' : 'Write to Supabase'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppLayout>
  );
};
