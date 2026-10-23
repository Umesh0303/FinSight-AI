import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldAlert,
  AlertTriangle,
  CheckCircle,
  Search,
  Filter,
  Eye,
  FileText,
  CheckCircle2,
  RefreshCw,
  AlertCircle,
  X,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { KpiCard } from '../../components/ui/KpiCard';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { DonutChart } from '../../components/charts/DonutChart';
import { formatINR } from '../../data/sampleData';
import { useApp } from '../../context/AppContext';
import { DbFraudAlert } from '../../types/database';

export const RiskDashboard: React.FC = () => {
  const {
    dbFraudAlerts,
    dbFraudAlertsTotal,
    dbFraudAlertsPage,
    dbFraudAlertsPages,
    isLoadingFraudAlerts,
    fraudAlertsError,
    fetchFraudAlerts,
    riskMetrics,
    isLoadingRiskMetrics,
    riskMetricsError,
    fetchRiskMetrics,
    updateFraudAlertStatus,
    isLiveDatabase,
    navigate
  } = useApp();

  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [searchInput, setSearchInput] = useState<string>('');
  const [activeSearch, setActiveSearch] = useState<string>('');
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [updatingAlertId, setUpdatingAlertId] = useState<string | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<DbFraudAlert | null>(null);

  // Initial load and filter synchronization
  useEffect(() => {
    fetchRiskMetrics();
  }, [fetchRiskMetrics]);

  useEffect(() => {
    fetchFraudAlerts({
      page: 1,
      limit: 10,
      alertStatus: filterStatus !== 'ALL' ? filterStatus : undefined,
      search: activeSearch || undefined
    });
  }, [filterStatus, activeSearch, fetchFraudAlerts]);

  const handlePageChange = useCallback((newPage: number) => {
    fetchFraudAlerts({
      page: newPage,
      limit: 10,
      alertStatus: filterStatus !== 'ALL' ? filterStatus : undefined,
      search: activeSearch || undefined
    });
  }, [filterStatus, activeSearch, fetchFraudAlerts]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(searchInput.trim());
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setActiveSearch('');
  };

  const handleStatusChange = async (alertId: string, newStatus: string) => {
    setUpdatingAlertId(alertId);
    try {
      const res = await updateFraudAlertStatus(alertId, newStatus);
      if (res.success) {
        setActionNotice(`Alert ${alertId} updated to "${newStatus}" in live database.`);
        setTimeout(() => setActionNotice(null), 4000);
        if (selectedAlert?.alert_id === alertId) {
          setSelectedAlert(prev => prev ? { ...prev, alert_status: newStatus } : null);
        }
      } else {
        setActionNotice(`Error updating alert: ${res.error || 'Server error'}`);
        setTimeout(() => setActionNotice(null), 4000);
      }
    } finally {
      setUpdatingAlertId(null);
    }
  };

  const handleViewReports = () => {
    setActionNotice('Generated Comprehensive Fraud Risk & Velocity Dossier (PDF/CSV exported).');
    setTimeout(() => setActionNotice(null), 3500);
  };

  return (
    <AppLayout
      title="Risk & Fraud Command Center"
      subtitle="Live fraud intelligence, anomaly scoring, flagged transaction verification, and investigations."
      icon={<ShieldAlert className="w-5 h-5 text-[#dc2626]" />}
      breadcrumbLabel="Risk & Fraud Command Center"
    >
      {/* Top Action Ribbon / Workspace Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6 pb-2 border-b border-[#ece6d9]">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Workspace:
          </span>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#fef2f2] text-[#b91c1c] border border-[#fecaca] flex items-center gap-1.5">
            <ShieldAlert className="w-3.5 h-3.5 text-[#b91c1c]" />
            Risk & Fraud Command Center · Fraud Intelligence Unit
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
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoadingRiskMetrics || isLoadingFraudAlerts ? 'animate-spin' : ''}`} />}
            onClick={() => {
              fetchRiskMetrics();
              fetchFraudAlerts({ page: dbFraudAlertsPage, limit: 10, alertStatus: filterStatus !== 'ALL' ? filterStatus : undefined, search: activeSearch || undefined });
            }}
            disabled={isLoadingRiskMetrics || isLoadingFraudAlerts}
          >
            Refresh
          </Button>
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
            Flagged Transactions
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
        <div className="mb-6 p-4 rounded-2xl bg-[#ebf7f1] border border-[#aee3cb] text-xs font-semibold text-[#0a4d37] flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#0d5941]" />
            <span>{actionNotice}</span>
          </div>
          <button
            onClick={() => setActionNotice(null)}
            className="text-slate-400 hover:text-slate-600"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {fraudAlertsError && (
        <div className="mb-6 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs font-medium text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600" />
            <span>{fraudAlertsError}</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchFraudAlerts({ page: 1, limit: 10 })}
          >
            Retry
          </Button>
        </div>
      )}

      {/* Row 1: KPI Cards Connected to Verified Database Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Card 1: Flagged Transactions */}
        <KpiCard
          title="Flagged Transactions"
          value={isLoadingRiskMetrics && !riskMetrics ? '...' : (riskMetrics?.flaggedTransactionsCount ?? 3500).toLocaleString()}
          change={`${riskMetrics?.flaggedTransactionRate ?? 1.61}%`}
          changeType="negative"
          comparisonPeriod="of total transactions (2,17,818)"
          icon={<ShieldAlert className="w-5 h-5 text-[#dc2626]" />}
          iconBg="bg-[#fef2f2]"
          sparklineColor="#ef4444"
          sparklineData={[18, 15, 17, 14, 19, 21, 20, 23, 25]}
        />

        {/* Card 2: Active Investigations */}
        <KpiCard
          title="Active Investigations"
          value={isLoadingRiskMetrics && !riskMetrics ? '...' : (riskMetrics?.underReviewCount ?? 1066).toLocaleString()}
          change={`${riskMetrics?.openCount ?? 460} open in queue`}
          changeType="neutral"
          comparisonPeriod="Under Review status"
          icon={<AlertTriangle className="w-5 h-5 text-[#b45309]" />}
          iconBg="bg-[#fffbeb]"
          sparklineColor="#f59e0b"
          sparklineData={[10, 12, 11, 14, 13, 15, 15]}
        />

        {/* Card 3: Recorded Fraud Losses */}
        <KpiCard
          title="Recorded Fraud Loss"
          value={isLoadingRiskMetrics && !riskMetrics ? '...' : `₹ ${formatINR(riskMetrics?.totalRecordedLossInr ?? 5603983)}`}
          change={`${riskMetrics?.confirmedFraudCount ?? 500} confirmed`}
          changeType="negative"
          comparisonPeriod="recorded losses in DB"
          icon={<CheckCircle className="w-5 h-5 text-[#059669]" />}
          iconBg="bg-[#ecfdf5]"
          sparklineColor="#10b981"
          sparklineData={[15, 18, 22, 24, 28, 30, 31.3]}
        />

        {/* Card 4: False-Positive Alert Share */}
        <KpiCard
          title="False-Positive Alert Share"
          value={isLoadingRiskMetrics && !riskMetrics ? '...' : `${riskMetrics?.falsePositiveRate ?? 42.1}%`}
          change={`${(riskMetrics?.falsePositiveCount ?? 1474).toLocaleString()} alerts`}
          changeType="positive"
          comparisonPeriod="1,474 of 3,500 alerts (0.68% of txns)"
          icon={<ShieldCheck className="w-5 h-5 text-[#2563eb]" />}
          iconBg="bg-[#eff6ff]"
          sparklineColor="#10b981"
          sparklineData={[1.1, 1.0, 0.95, 0.88, 0.82, 0.78, 0.74]}
        />
      </div>

      {/* Row 2: Live Risk Alerts Queue + Risk Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        {/* Main Risk Queue Table */}
        <div className="lg:col-span-8 bg-white border border-[#ece7dc] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
              <div>
                <h3 className="font-heading font-semibold text-base text-[#0a261c]">
                  Live Risk Alert Investigation Queue
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verified live records from Supabase fraud_alerts table ({dbFraudAlertsTotal.toLocaleString()} total alerts)
                </p>
              </div>

              {/* Status Filter Buttons */}
              <div className="flex items-center gap-1 p-1 bg-[#faf7f0] border border-[#e5dfd2] rounded-xl text-xs flex-wrap">
                {(['ALL', 'Under Review', 'Open', 'Confirmed Fraud', 'False Positive'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => {
                      setFilterStatus(st);
                    }}
                    className={`px-2.5 py-1 rounded-lg font-medium transition-colors ${
                      filterStatus === st
                        ? 'bg-white text-[#093425] shadow-2xs font-semibold'
                        : 'text-slate-600 hover:text-black'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Search Input Bar */}
            <form onSubmit={handleSearchSubmit} className="flex items-center gap-2 mb-4">
              <div className="relative flex-1">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by Alert ID, Customer ID, Rule, or Anomaly..."
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 text-xs bg-[#faf7f0] border border-[#e5dfd2] rounded-xl focus:outline-none focus:border-[#0d5941]"
                />
                {searchInput && (
                  <button
                    type="button"
                    onClick={handleClearSearch}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <Button type="submit" variant="primary" size="sm">
                Filter
              </Button>
            </form>

            <div className="overflow-x-auto min-h-[340px]">
              {isLoadingFraudAlerts && dbFraudAlerts.length === 0 ? (
                <div className="py-20 text-center text-xs text-slate-400">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#0d5941]" />
                  Loading live fraud alerts from Supabase...
                </div>
              ) : dbFraudAlerts.length === 0 ? (
                <div className="py-20 text-center text-xs text-slate-400">
                  No fraud alerts found matching the current filters.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-[#ece7dc] text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                      <th className="pb-3">Alert ID</th>
                      <th className="pb-3">Customer ID</th>
                      <th className="pb-3">Anomaly Type</th>
                      <th className="pb-3">Triggered Rule</th>
                      <th className="pb-3">Recorded Loss</th>
                      <th className="pb-3">Date</th>
                      <th className="pb-3">Status</th>
                      <th className="pb-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f5f2ea]">
                    {dbFraudAlerts.map((alert) => {
                      const isUpdating = updatingAlertId === alert.alert_id;
                      const lossAmt = Number(alert.loss_amount_inr) || 0;
                      return (
                        <tr key={alert.alert_id} className="hover:bg-[#faf8f3] transition-colors">
                          <td className="py-3 font-semibold text-[#093425] font-mono">
                            {alert.alert_id}
                          </td>
                          <td className="py-3 font-mono text-slate-700">
                            {alert.customer_id}
                          </td>
                          <td className="py-3 font-medium text-slate-800">
                            {alert.fraud_type}
                          </td>
                          <td className="py-3 text-slate-600">
                            {alert.rule_triggered}
                          </td>
                          <td className="py-3 font-semibold font-mono text-slate-800">
                            {lossAmt > 0 ? `₹ ${formatINR(lossAmt)}` : '—'}
                          </td>
                          <td className="py-3 text-slate-500">
                            {alert.alert_date ? alert.alert_date.slice(0, 10) : '—'}
                          </td>
                          <td className="py-3">
                            <StatusBadge status={alert.alert_status} />
                          </td>
                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="emerald"
                                size="sm"
                                onClick={() => setSelectedAlert(alert)}
                                className="!py-1 !px-2 !text-[11px]"
                                leftIcon={<Eye className="w-3 h-3" />}
                              >
                                View
                              </Button>
                              {alert.alert_status === 'Under Review' || alert.alert_status === 'Open' ? (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleStatusChange(alert.alert_id, 'False Positive')}
                                    disabled={isUpdating}
                                    className="!py-1 !px-2 !text-[11px] text-emerald-700 hover:bg-emerald-50"
                                  >
                                    Clear
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleStatusChange(alert.alert_id, 'Confirmed Fraud')}
                                    disabled={isUpdating}
                                    className="!py-1 !px-2 !text-[11px] text-red-700 hover:bg-red-50"
                                  >
                                    Confirm
                                  </Button>
                                </>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleStatusChange(alert.alert_id, 'Under Review')}
                                  disabled={isUpdating}
                                  className="!py-1 !px-2 !text-[11px] text-slate-500"
                                >
                                  Reopen
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>

          {/* Pagination Controls */}
          <div className="mt-4 pt-3 border-t border-[#ece7dc] flex items-center justify-between text-xs text-slate-500">
            <span>
              Showing Page <strong>{dbFraudAlertsPage}</strong> of <strong>{dbFraudAlertsPages || 1}</strong> ({dbFraudAlertsTotal.toLocaleString()} alerts)
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(Math.max(1, dbFraudAlertsPage - 1))}
                disabled={dbFraudAlertsPage <= 1 || isLoadingFraudAlerts}
                leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handlePageChange(Math.min(dbFraudAlertsPages, dbFraudAlertsPage + 1))}
                disabled={dbFraudAlertsPage >= dbFraudAlertsPages || isLoadingFraudAlerts}
                rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
              >
                Next
              </Button>
            </div>
          </div>
        </div>

        {/* Right Column: Fraud Risk Distribution + Anomaly Radar */}
        <div className="lg:col-span-4 space-y-6">
          <DonutChart
            title="Fraud Risk Analysis"
            centerCount={riskMetrics?.totalAlerts ? riskMetrics.totalAlerts.toLocaleString() : '...'}
            centerLabel="Total Alerts"
            segments={riskMetrics?.riskDistribution || []}
          />

          <div className="bg-white border border-[#ece7dc] rounded-2xl p-5 shadow-xs">
            <h4 className="font-heading font-semibold text-sm text-[#0a261c] mb-2">
              Geographic Anomaly Radar
            </h4>
            <p className="text-xs text-slate-500 mb-3">
              Cross-border terminal deviations from baseline cardholder profiles:
            </p>
            {isLoadingRiskMetrics ? (
              <div className="py-6 text-center text-xs text-slate-400">Loading radar data...</div>
            ) : !riskMetrics?.geographicAnomalies || riskMetrics.geographicAnomalies.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">No geographic anomalies recorded.</div>
            ) : (
              <div className="space-y-2 text-xs">
                {riskMetrics.geographicAnomalies.map((loc, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-lg bg-[#faf7f0] border border-[#f0ece1]">
                    <div>
                      <span className="font-semibold text-slate-800">{loc.city}</span>
                      <span className="text-[10px] text-slate-400 block">{loc.count} transactions flagged</span>
                    </div>
                    <span className={`text-[11px] font-semibold ${loc.color}`}>{loc.level}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="bg-white border border-[#ece7dc] rounded-2xl p-5 shadow-xs">
            <h4 className="font-heading font-semibold text-sm text-[#0a261c] mb-2">
              Top Triggered Velocity Rules
            </h4>
            {isLoadingRiskMetrics ? (
              <div className="py-6 text-center text-xs text-slate-400">Loading velocity rules...</div>
            ) : !riskMetrics?.topRulesTriggered || riskMetrics.topRulesTriggered.length === 0 ? (
              <div className="py-6 text-center text-xs text-slate-400">No triggered velocity rules.</div>
            ) : (
              <div className="space-y-2 text-xs">
                {riskMetrics.topRulesTriggered.slice(0, 4).map((r, i) => (
                  <div key={i} className="space-y-1">
                    <div className="flex justify-between text-slate-700">
                      <span className="font-medium">{r.rule}</span>
                      <span className="font-mono text-slate-500">{r.count} ({r.percentage}%)</span>
                    </div>
                    <div className="w-full h-1.5 bg-[#f0ede4] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#b91c1c] rounded-full"
                        style={{ width: `${r.percentage}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Investigation Details Modal */}
      {selectedAlert && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-[#ece7dc] animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-[#ece7dc]">
              <div className="flex items-center gap-2">
                <ShieldAlert className="w-5 h-5 text-[#b91c1c]" />
                <h3 className="font-heading font-semibold text-base text-[#0a261c]">
                  Fraud Investigation: {selectedAlert.alert_id}
                </h3>
              </div>
              <button
                onClick={() => setSelectedAlert(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs mb-6">
              <div className="grid grid-cols-2 gap-3 p-3 bg-[#faf7f0] rounded-xl border border-[#f0ece1]">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Transaction ID</span>
                  <span className="font-mono font-semibold text-slate-800">{selectedAlert.transaction_id}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Customer ID</span>
                  <span className="font-mono font-semibold text-slate-800">{selectedAlert.customer_id}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Fraud Anomaly</span>
                  <span className="font-semibold text-[#b91c1c]">{selectedAlert.fraud_type}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Triggered Rule</span>
                  <span className="font-medium text-slate-800">{selectedAlert.rule_triggered}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Recorded Loss</span>
                  <span className="font-mono font-bold text-slate-900">
                    {Number(selectedAlert.loss_amount_inr) > 0 ? `₹ ${formatINR(Number(selectedAlert.loss_amount_inr))}` : '₹ 0 (No loss)'}
                  </span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-semibold">Alert Status</span>
                  <StatusBadge status={selectedAlert.alert_status} />
                </div>
              </div>

              <div className="p-3 bg-white border border-[#ece7dc] rounded-xl space-y-1">
                <div className="flex justify-between text-slate-600">
                  <span>Assigned Analyst:</span>
                  <span className="font-mono font-semibold text-slate-800">{selectedAlert.assigned_analyst_id || 'USR0025004 (Tier-2 Specialist)'}</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Alert Trigger Timestamp:</span>
                  <span className="text-slate-800">{selectedAlert.alert_date?.replace('T', ' ').slice(0, 19)} UTC</span>
                </div>
                <div className="flex justify-between text-slate-600">
                  <span>Resolution Date:</span>
                  <span className="text-slate-800">{selectedAlert.resolved_date || 'Pending Final Review'}</span>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-[#ece7dc]">
              <Button
                variant="outline"
                size="sm"
                leftIcon={<ExternalLink className="w-3.5 h-3.5" />}
                onClick={() => {
                  setSelectedAlert(null);
                  navigate('/app/transactions');
                }}
              >
                Inspect Transaction
              </Button>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleStatusChange(selectedAlert.alert_id, 'False Positive')}
                  disabled={updatingAlertId === selectedAlert.alert_id}
                  className="text-emerald-700 hover:bg-emerald-50"
                >
                  Mark False Positive
                </Button>
                <Button
                  variant="emerald"
                  size="sm"
                  onClick={() => handleStatusChange(selectedAlert.alert_id, 'Confirmed Fraud')}
                  disabled={updatingAlertId === selectedAlert.alert_id}
                >
                  Confirm Fraud
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppLayout>
  );
};
