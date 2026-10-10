import React, { useState } from 'react';
import { ShieldAlert, AlertTriangle, CheckCircle, Ban, Search, Filter, Eye, FileText, CheckCircle2 } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { KpiCard } from '../../components/ui/KpiCard';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { DonutChart } from '../../components/charts/DonutChart';
import { FRAUD_RISK_DISTRIBUTION, formatINR } from '../../data/sampleData';
import { useApp } from '../../context/AppContext';

export const RiskDashboard: React.FC = () => {
  const { riskAlerts, dismissAlert, navigate } = useApp();
  const [filterSeverity, setFilterSeverity] = useState<string>('ALL');
  const [actionNotice, setActionNotice] = useState<string | null>(null);

  const filteredAlerts = riskAlerts.filter(a => {
    if (filterSeverity === 'ALL') return true;
    return a.severity === filterSeverity;
  });

  const handleViewReports = () => {
    setActionNotice('Generated Comprehensive Fraud Risk & Velocity Dossier (PDF/CSV exported).');
    setTimeout(() => setActionNotice(null), 3500);
  };

  return (
    <AppLayout
      title="Risk & Fraud Command Center"
      subtitle="Fraud monitoring, risk scoring, suspicious transactions, and investigations."
      icon={<ShieldAlert className="w-5 h-5 text-[#dc2626]" />}
      breadcrumbLabel="Risk & Fraud Command Center"
    >
      {/* Top Action Ribbon / Workspace Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6 pb-2 border-b border-[#ece6d9]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Workspace:
          </span>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#fef2f2] text-[#b91c1c] border border-[#fecaca]">
            Risk & Fraud Command Center · Fraud Intelligence Unit
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Filter className="w-3.5 h-3.5" />}
            onClick={() => navigate('/app/cases')}
          >
            Review Evidence
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Search className="w-3.5 h-3.5" />}
            onClick={() => navigate('/app/transactions')}
          >
            Investigate Alert
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<FileText className="w-3.5 h-3.5" />}
            onClick={handleViewReports}
          >
            View Risk Reports
          </Button>
        </div>
      </div>

      {actionNotice && (
        <div className="mb-6 p-4 rounded-2xl bg-[#ebf7f1] border border-[#aee3cb] text-xs font-semibold text-[#0a4d37] flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#0d5941]" />
          <span>{actionNotice}</span>
        </div>
      )}

      {/* Row 1: KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          title="Fraud Risk Transactions"
          value="238"
          change="2.4%"
          changeType="negative"
          comparisonPeriod="vs last month"
          icon={<ShieldAlert className="w-5 h-5 text-[#dc2626]" />}
          iconBg="bg-[#fef2f2]"
          sparklineColor="#ef4444"
          sparklineData={[18, 15, 17, 14, 19, 21, 20, 23, 25]}
        />
        <KpiCard
          title="Active Investigations"
          value="15"
          change="3"
          changeType="neutral"
          comparisonPeriod="new today"
          icon={<AlertTriangle className="w-5 h-5 text-[#b45309]" />}
          iconBg="bg-[#fffbeb]"
          sparklineColor="#f59e0b"
          sparklineData={[10, 12, 11, 14, 13, 15, 15]}
        />
        <KpiCard
          title="Prevented Fraud Loss"
          value="₹ 3,13,400"
          change="24.8%"
          changeType="positive"
          comparisonPeriod="saved this month"
          icon={<CheckCircle className="w-5 h-5 text-[#059669]" />}
          iconBg="bg-[#ecfdf5]"
          sparklineColor="#10b981"
          sparklineData={[15, 18, 22, 24, 28, 30, 31.3]}
        />
        <KpiCard
          title="False Positive Rate"
          value="0.74%"
          change="0.12%"
          changeType="positive"
          comparisonPeriod="reduction"
          icon={<ShieldAlert className="w-5 h-5 text-[#2563eb]" />}
          iconBg="bg-[#eff6ff]"
          sparklineColor="#10b981"
          sparklineData={[1.1, 1.0, 0.95, 0.88, 0.82, 0.78, 0.74]}
        />
      </div>

      {/* Row 2: Live Risk Alerts Queue + Risk Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        {/* Main Risk Queue Table */}
        <div className="lg:col-span-8 bg-white border border-[#ece7dc] rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
            <div>
              <h3 className="font-heading font-semibold text-base text-[#0a261c]">
                Live Risk Alert Investigation Queue
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">High-velocity score triggers awaiting analyst confirmation</p>
            </div>

            {/* Severity Filter Buttons */}
            <div className="flex items-center gap-1 p-1 bg-[#faf7f0] border border-[#e5dfd2] rounded-xl text-xs">
              {(['ALL', 'High', 'Medium', 'Low'] as const).map((sev) => (
                <button
                  key={sev}
                  onClick={() => setFilterSeverity(sev)}
                  className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                    filterSeverity === sev
                      ? 'bg-white text-[#093425] shadow-2xs font-semibold'
                      : 'text-slate-600 hover:text-black'
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#ece7dc] text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="pb-3">Alert ID</th>
                  <th className="pb-3">Customer</th>
                  <th className="pb-3">Anomaly Type</th>
                  <th className="pb-3">Amount</th>
                  <th className="pb-3">Risk Score</th>
                  <th className="pb-3">Location</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f5f2ea]">
                {filteredAlerts.map((alert) => (
                  <tr key={alert.alert_id} className="hover:bg-[#faf8f3] transition-colors">
                    <td className="py-3 font-semibold text-[#093425] font-mono">{alert.alert_id}</td>
                    <td className="py-3 font-medium text-slate-800">{alert.customer_name}</td>
                    <td className="py-3 text-slate-700">{alert.risk_type}</td>
                    <td className="py-3 font-semibold text-[#0a2b1f] font-mono">₹ {formatINR(alert.amount)}</td>
                    <td className="py-3">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`font-mono font-bold text-xs ${
                            alert.risk_score >= 80
                              ? 'text-red-600'
                              : alert.risk_score >= 50
                              ? 'text-amber-600'
                              : 'text-emerald-600'
                          }`}
                        >
                          {alert.risk_score}/100
                        </span>
                      </div>
                    </td>
                    <td className="py-3 text-slate-600">{alert.location}</td>
                    <td className="py-3"><StatusBadge status={alert.status} /></td>
                    <td className="py-3 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <Button
                          variant="emerald"
                          size="sm"
                          onClick={() => navigate('/app/cases')}
                          className="!py-1 !px-2 !text-[11px]"
                        >
                          Investigate
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => dismissAlert(alert.alert_id)}
                          className="!py-1 !px-2 !text-[11px]"
                        >
                          Clear
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Fraud Risk Distribution + Anomaly Watch */}
        <div className="lg:col-span-4 space-y-6">
          <DonutChart
            title="Fraud Risk Analysis"
            centerCount="238"
            centerLabel="High Risk"
            segments={FRAUD_RISK_DISTRIBUTION}
          />

          <div className="bg-white border border-[#ece7dc] rounded-2xl p-5 shadow-xs">
            <h4 className="font-heading font-semibold text-sm text-[#0a261c] mb-2">
              Geographic Anomaly Radar
            </h4>
            <p className="text-xs text-slate-500 mb-3">
              Locations deviating from cardholder baseline profiles:
            </p>
            <div className="space-y-2 text-xs">
              {[
                { city: 'London, UK', count: 4, level: 'Critical Anomaly', color: 'text-red-600' },
                { city: 'Dubai, UAE', count: 3, level: 'Unusual Volume', color: 'text-amber-600' },
                { city: 'Singapore', count: 1, level: 'Verified Travel', color: 'text-emerald-600' }
              ].map((loc, i) => (
                <div key={i} className="flex items-center justify-between p-2 rounded-lg bg-[#faf7f0] border border-[#f0ece1]">
                  <div>
                    <span className="font-semibold text-slate-800">{loc.city}</span>
                    <span className="text-[10px] text-slate-400 block">{loc.count} transactions flagged</span>
                  </div>
                  <span className={`text-[11px] font-semibold ${loc.color}`}>{loc.level}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
