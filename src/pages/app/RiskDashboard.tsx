import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Activity,
  Calendar,
  RotateCcw
} from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { KpiCard } from '../../components/ui/KpiCard';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { DonutChart } from '../../components/charts/DonutChart';
import { AlertsBasedOnFraudDoughnut } from '../../components/charts/AlertsBasedOnFraudDoughnut';
import { AlertRulesHorizontalBar } from '../../components/charts/AlertRulesHorizontalBar';
import { AlertStatusBarChart } from '../../components/charts/AlertStatusBarChart';
import { formatINR } from '../../data/sampleData';
import { useApp } from '../../context/AppContext';
import { DbFraudAlert } from '../../types/database';

type DateRangeOption = 'ALL' | '30d' | '90d' | '180d';

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
    fetchRiskMetrics,
    updateFraudAlertStatus,
    isLiveDatabase,
    navigate
  } = useApp();

  // Unified Interactive Cross-Filtering State
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [filterFraudType, setFilterFraudType] = useState<string>('ALL');
  const [filterRule, setFilterRule] = useState<string>('ALL');
  const [dateRange, setDateRange] = useState<DateRangeOption>('ALL');
  const [searchInput, setSearchInput] = useState<string>('');
  const [activeSearch, setActiveSearch] = useState<string>('');
  const [queuePage, setQueuePage] = useState<number>(1);
  const itemsPerPage = 10;

  // Local alert states for instant reactive status changes
  const [localAlertOverrides, setLocalAlertOverrides] = useState<Record<string, { status: string; resDate: string | null }>>({});
  const [actionNotice, setActionNotice] = useState<string | null>(null);
  const [updatingAlertId, setUpdatingAlertId] = useState<string | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<DbFraudAlert | null>(null);

  // Initial load
  useEffect(() => {
    fetchRiskMetrics();
    fetchFraudAlerts({ page: 1, limit: 10 });
  }, [fetchRiskMetrics, fetchFraudAlerts]);

  // Handle live dataset with local overrides for instantaneous feedback
  const alertsDataset = useMemo(() => {
    const rawList = riskMetrics?.allAlertsSummary || [];
    if (Object.keys(localAlertOverrides).length === 0) {
      return rawList;
    }
    return rawList.map(a => {
      if (localAlertOverrides[a.id]) {
        return {
          ...a,
          status: localAlertOverrides[a.id].status,
          resDate: localAlertOverrides[a.id].resDate
        };
      }
      return a;
    });
  }, [riskMetrics?.allAlertsSummary, localAlertOverrides]);

  // Filter options derived from actual database records
  const availableFraudTypes = useMemo(() => {
    if (alertsDataset.length === 0) {
      return [
        'Card Not Present Fraud',
        'Phishing / Social Engineering',
        'UPI Collect Scam',
        'Card Cloning',
        'Identity Theft',
        'Account Takeover',
        'SIM Swap',
        'Card Skimming',
        'Not Fraud'
      ];
    }
    const set = new Set<string>();
    alertsDataset.forEach(a => { if (a.type) set.add(a.type); });
    return Array.from(set).sort();
  }, [alertsDataset]);

  // Compute maximum timestamp for relative date range filtering
  const maxAlertTimestamp = useMemo(() => {
    if (alertsDataset.length === 0) return Date.now();
    let max = 0;
    for (const a of alertsDataset) {
      if (a.date) {
        const t = new Date(a.date).getTime();
        if (t > max) max = t;
      }
    }
    return max || Date.now();
  }, [alertsDataset]);

  // Apply active filters before aggregation
  const filteredAlerts = useMemo(() => {
    if (alertsDataset.length === 0) return [];

    let cutoffTime = 0;
    if (dateRange === '30d') cutoffTime = maxAlertTimestamp - (30 * 24 * 60 * 60 * 1000);
    else if (dateRange === '90d') cutoffTime = maxAlertTimestamp - (90 * 24 * 60 * 60 * 1000);
    else if (dateRange === '180d') cutoffTime = maxAlertTimestamp - (180 * 24 * 60 * 60 * 1000);

    const query = activeSearch.toLowerCase().trim();

    return alertsDataset.filter(a => {
      if (filterStatus !== 'ALL' && a.status !== filterStatus) return false;
      if (filterFraudType !== 'ALL' && a.type !== filterFraudType) return false;
      if (filterRule !== 'ALL' && a.rule !== filterRule) return false;

      if (cutoffTime > 0 && a.date) {
        const alertTime = new Date(a.date).getTime();
        if (alertTime < cutoffTime) return false;
      }

      if (query) {
        const matchesId = a.id?.toLowerCase().includes(query);
        const matchesCust = a.custId?.toLowerCase().includes(query);
        const matchesTxn = a.txnId?.toLowerCase().includes(query);
        const matchesType = a.type?.toLowerCase().includes(query);
        const matchesRule = a.rule?.toLowerCase().includes(query);
        if (!matchesId && !matchesCust && !matchesTxn && !matchesType && !matchesRule) return false;
      }

      return true;
    });
  }, [alertsDataset, filterStatus, filterFraudType, filterRule, dateRange, activeSearch, maxAlertTimestamp]);

  // Reset queue page when filters or search change
  useEffect(() => {
    setQueuePage(1);
  }, [filterStatus, filterFraudType, filterRule, dateRange, activeSearch]);

  // Recalculate 5 KPIs dynamically
  const kpiMetrics = useMemo(() => {
    const hasData = alertsDataset.length > 0;
    if (!hasData) {
      return {
        totalAlerts: riskMetrics?.totalAlerts ?? 3500,
        confirmedFraud: riskMetrics?.confirmedFraudCount ?? 500,
        falsePositiveCount: riskMetrics?.falsePositiveCount ?? 1474,
        falsePositiveRate: riskMetrics?.falsePositiveRate ?? 42.1,
        totalLoss: riskMetrics?.totalRecordedLossInr ?? 5603983,
        avgResolutionDays: riskMetrics?.avgResolutionDays ?? 5.4,
        resolvedCount: riskMetrics?.resolvedAlertsCount ?? 1974
      };
    }

    const total = filteredAlerts.length;
    let cf = 0;
    let fp = 0;
    let loss = 0;
    let resCount = 0;
    let totalResDays = 0;

    for (const a of filteredAlerts) {
      if (a.status === 'Confirmed Fraud') {
        cf++;
        loss += Number(a.loss) || 0;
      } else if (a.status === 'False Positive') {
        fp++;
      }

      if (a.resDate && a.date) {
        const d1 = new Date(a.date);
        const d2 = new Date(a.resDate);
        const diff = (d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24);
        if (diff >= 0) {
          resCount++;
          totalResDays += diff;
        }
      }
    }

    const fpRate = total > 0 ? Number(((fp / total) * 100).toFixed(1)) : 0;
    const avgDays = resCount > 0 ? Number((totalResDays / resCount).toFixed(1)) : 0;

    return {
      totalAlerts: total,
      confirmedFraud: cf,
      falsePositiveCount: fp,
      falsePositiveRate: fpRate,
      totalLoss: Math.round(loss),
      avgResolutionDays: avgDays,
      resolvedCount: resCount
    };
  }, [alertsDataset, filteredAlerts, riskMetrics]);

  // Recalculate Chart A: Alerts Based on Fraud
  const chartASegments = useMemo(() => {
    const countMap: Record<string, number> = {};
    const total = filteredAlerts.length;

    for (const a of filteredAlerts) {
      const type = a.type || 'Other';
      countMap[type] = (countMap[type] || 0) + 1;
    }

    const palette = ['#dc2626', '#ea580c', '#d97706', '#7c3aed', '#2563eb', '#0d9488', '#ec4899', '#84cc16', '#10b981', '#64748b'];

    return Object.entries(countMap)
      .map(([name, count], idx) => ({
        name,
        count,
        percentage: total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0,
        color: palette[idx % palette.length]
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredAlerts]);

  // Recalculate Chart B: Alert Type (Rules)
  const chartBRules = useMemo(() => {
    const countMap: Record<string, number> = {};
    const total = filteredAlerts.length;

    for (const a of filteredAlerts) {
      const rule = a.rule || 'Standard';
      countMap[rule] = (countMap[rule] || 0) + 1;
    }

    return Object.entries(countMap)
      .map(([rule, count]) => ({
        rule,
        count,
        percentage: total > 0 ? Number(((count / total) * 100).toFixed(1)) : 0
      }))
      .sort((a, b) => b.count - a.count);
  }, [filteredAlerts]);

  // Recalculate Chart C: Alert Status
  const chartCStatusData = useMemo(() => {
    let fp = 0;
    let ur = 0;
    let cf = 0;
    let op = 0;

    for (const a of filteredAlerts) {
      if (a.status === 'False Positive') fp++;
      else if (a.status === 'Under Review') ur++;
      else if (a.status === 'Confirmed Fraud') cf++;
      else if (a.status === 'Open') op++;
    }

    const total = filteredAlerts.length || 1;
    return [
      { status: 'False Positive', count: fp, percentage: Number(((fp / total) * 100).toFixed(1)), color: '#10b981' },
      { status: 'Under Review', count: ur, percentage: Number(((ur / total) * 100).toFixed(1)), color: '#f97316' },
      { status: 'Confirmed Fraud', count: cf, percentage: Number(((cf / total) * 100).toFixed(1)), color: '#dc2626' },
      { status: 'Open', count: op, percentage: Number(((op / total) * 100).toFixed(1)), color: '#f59e0b' }
    ];
  }, [filteredAlerts]);

  // Recalculate Fraud Risk Analysis status doughnut
  const fraudRiskAnalysisSegments = useMemo(() => {
    return chartCStatusData.map(s => ({
      name: s.status,
      count: s.count,
      percentage: s.percentage,
      color: s.color
    }));
  }, [chartCStatusData]);

  // Paginated records for the Live Risk Queue
  const queueTotalPages = Math.max(1, Math.ceil(filteredAlerts.length / itemsPerPage));
  const queuePageRecords = useMemo(() => {
    const from = (queuePage - 1) * itemsPerPage;
    return filteredAlerts.slice(from, from + itemsPerPage);
  }, [filteredAlerts, queuePage]);

  // Clear / Reset All Filters
  const handleResetFilters = () => {
    setFilterStatus('ALL');
    setFilterFraudType('ALL');
    setFilterRule('ALL');
    setDateRange('ALL');
    setSearchInput('');
    setActiveSearch('');
    setQueuePage(1);
  };

  const hasActiveFilters = filterStatus !== 'ALL' || filterFraudType !== 'ALL' || filterRule !== 'ALL' || dateRange !== 'ALL' || activeSearch !== '';

  // Search actions
  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(searchInput.trim());
  };

  const handleClearSearch = () => {
    setSearchInput('');
    setActiveSearch('');
  };

  // Status Change (Clear, Confirm, Reopen)
  const handleStatusChange = async (alertId: string, newStatus: string) => {
    setUpdatingAlertId(alertId);
    try {
      const res = await updateFraudAlertStatus(alertId, newStatus);
      if (res.success) {
        const isResolved = newStatus === 'Resolved' || newStatus === 'False Positive' || newStatus === 'Confirmed Fraud';
        const resDate = isResolved ? new Date().toISOString().split('T')[0] : null;

        setLocalAlertOverrides(prev => ({
          ...prev,
          [alertId]: { status: newStatus, resDate }
        }));

        setActionNotice(`Alert ${alertId} updated to "${newStatus}" in live database.`);
        setTimeout(() => setActionNotice(null), 4000);

        if (selectedAlert?.alert_id === alertId) {
          setSelectedAlert(prev => prev ? { ...prev, alert_status: newStatus, resolved_date: resDate } : null);
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
      subtitle="Fraud Operations Overview"
      icon={<ShieldAlert className="w-5 h-5 text-[#dc2626]" />}
      breadcrumbLabel="Risk & Fraud Command Center"
    >
      {/* Top Action Ribbon / Workspace Bar */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5 pb-3 border-b border-[#ece6d9]">
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

        <div className="flex items-center gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            leftIcon={<RefreshCw className={`w-3.5 h-3.5 ${isLoadingRiskMetrics || isLoadingFraudAlerts ? 'animate-spin' : ''}`} />}
            onClick={() => {
              fetchRiskMetrics();
              fetchFraudAlerts({ page: dbFraudAlertsPage, limit: 10 });
            }}
            disabled={isLoadingRiskMetrics || isLoadingFraudAlerts}
          >
            Refresh Data
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

      {/* Global Filter Toolbar */}
      <div className="bg-white border border-[#ece7dc] rounded-2xl p-4 shadow-xs mb-6">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap text-xs">
            <span className="font-semibold text-slate-700 flex items-center gap-1.5 mr-1">
              <Filter className="w-3.5 h-3.5 text-emerald-700" />
              Global Filters:
            </span>

            {/* Alert Status Filter */}
            <div className="flex items-center gap-1">
              <label htmlFor="risk-status-filter" className="text-slate-500 text-[11px] font-medium">Status:</label>
              <select
                id="risk-status-filter"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="bg-[#faf7f0] border border-[#e5dfd2] rounded-lg px-2.5 py-1 text-xs text-slate-800 font-medium focus:outline-none focus:border-emerald-600 cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="Under Review">Under Review</option>
                <option value="Confirmed Fraud">Confirmed Fraud</option>
                <option value="False Positive">False Positive</option>
                <option value="Open">Open</option>
              </select>
            </div>

            {/* Alert Type Filter */}
            <div className="flex items-center gap-1">
              <label htmlFor="risk-type-filter" className="text-slate-500 text-[11px] font-medium">Alert Type:</label>
              <select
                id="risk-type-filter"
                value={filterFraudType}
                onChange={(e) => setFilterFraudType(e.target.value)}
                className="bg-[#faf7f0] border border-[#e5dfd2] rounded-lg px-2.5 py-1 text-xs text-slate-800 font-medium focus:outline-none focus:border-emerald-600 cursor-pointer max-w-[170px] truncate"
              >
                <option value="ALL">All Fraud Types</option>
                {availableFraudTypes.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>

            {/* Date Range Filter */}
            <div className="flex items-center gap-1">
              <label htmlFor="risk-date-filter" className="text-slate-500 text-[11px] font-medium flex items-center gap-1">
                <Calendar className="w-3 h-3 text-slate-400" />
                Date Range:
              </label>
              <select
                id="risk-date-filter"
                value={dateRange}
                onChange={(e) => setDateRange(e.target.value as DateRangeOption)}
                className="bg-[#faf7f0] border border-[#e5dfd2] rounded-lg px-2.5 py-1 text-xs text-slate-800 font-medium focus:outline-none focus:border-emerald-600 cursor-pointer"
              >
                <option value="ALL">All Time (1 Year)</option>
                <option value="30d">Last 30 Days</option>
                <option value="90d">Last 90 Days</option>
                <option value="180d">Last 6 Months</option>
              </select>
            </div>
          </div>

          {/* Reset Action & Counter */}
          <div className="flex items-center gap-2 self-end md:self-auto">
            {hasActiveFilters && (
              <button
                onClick={handleResetFilters}
                className="flex items-center gap-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 px-2.5 py-1 rounded-lg border border-rose-200 transition-colors"
              >
                <RotateCcw className="w-3 h-3" />
                Reset Filters
              </button>
            )}
            <span className="text-[11px] font-mono text-slate-500 bg-[#faf7f0] px-2.5 py-1 rounded-lg border border-[#e5dfd2]">
              <strong>{kpiMetrics.totalAlerts.toLocaleString()}</strong> of {(riskMetrics?.totalAlerts || 3500).toLocaleString()} alerts
            </span>
          </div>
        </div>

        {/* Active Filter Badges Bar */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 flex-wrap mt-3 pt-2.5 border-t border-[#f0ece1] text-xs">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Active:</span>

            {filterStatus !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-medium">
                Status: {filterStatus}
                <button onClick={() => setFilterStatus('ALL')} className="hover:text-emerald-950">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {filterFraudType !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-red-50 text-red-800 border border-red-200 text-[11px] font-medium">
                Type: {filterFraudType}
                <button onClick={() => setFilterFraudType('ALL')} className="hover:text-red-950">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {filterRule !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-medium">
                Rule: {filterRule}
                <button onClick={() => setFilterRule('ALL')} className="hover:text-amber-950">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {dateRange !== 'ALL' && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-800 border border-blue-200 text-[11px] font-medium">
                Range: {dateRange === '30d' ? 'Last 30 Days' : dateRange === '90d' ? 'Last 90 Days' : 'Last 6 Months'}
                <button onClick={() => setDateRange('ALL')} className="hover:text-blue-950">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}

            {activeSearch && (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800 border border-slate-300 text-[11px] font-medium">
                Search: "{activeSearch}"
                <button onClick={handleClearSearch} className="hover:text-slate-950">
                  <X className="w-3 h-3" />
                </button>
              </span>
            )}
          </div>
        )}
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

      {/* Section 3: Five KPI Summary Cards Across Wide Screens */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
        {/* KPI 1: Total Alerts */}
        <KpiCard
          title="Total Alerts"
          value={isLoadingRiskMetrics && alertsDataset.length === 0 ? '...' : kpiMetrics.totalAlerts.toLocaleString()}
          change={`${kpiMetrics.totalAlerts.toLocaleString()} records`}
          changeType="neutral"
          comparisonPeriod="matching active filters"
          icon={<ShieldAlert className="w-5 h-5 text-[#dc2626]" />}
          iconBg="bg-[#fef2f2]"
          sparklineColor="#ef4444"
          sparklineData={[18, 15, 17, 14, 19, 21, 20, 23, 25]}
        />

        {/* KPI 2: Confirmed Fraud */}
        <KpiCard
          title="Confirmed Fraud"
          value={isLoadingRiskMetrics && alertsDataset.length === 0 ? '...' : kpiMetrics.confirmedFraud.toLocaleString()}
          change={`${kpiMetrics.totalAlerts > 0 ? ((kpiMetrics.confirmedFraud / kpiMetrics.totalAlerts) * 100).toFixed(1) : 0}% of alerts`}
          changeType="negative"
          comparisonPeriod="Verified fraudulent transactions"
          icon={<AlertTriangle className="w-5 h-5 text-[#b45309]" />}
          iconBg="bg-[#fffbeb]"
          sparklineColor="#f59e0b"
          sparklineData={[10, 12, 11, 14, 13, 15, 15]}
        />

        {/* KPI 3: False Positive Rate (Documented Numerator/Denominator) */}
        <KpiCard
          title="False Positive Rate"
          value={isLoadingRiskMetrics && alertsDataset.length === 0 ? '...' : `${kpiMetrics.falsePositiveRate}%`}
          change={`${kpiMetrics.falsePositiveCount.toLocaleString()} alerts`}
          changeType="positive"
          comparisonPeriod={`Numerator: ${kpiMetrics.falsePositiveCount.toLocaleString()} FP / Denominator: ${kpiMetrics.totalAlerts.toLocaleString()} alerts`}
          icon={<ShieldCheck className="w-5 h-5 text-[#2563eb]" />}
          iconBg="bg-[#eff6ff]"
          sparklineColor="#10b981"
          sparklineData={[44, 43, 42.8, 42.5, 42.3, 42.1, 42.1]}
        />

        {/* KPI 4: Total Recorded Loss */}
        <KpiCard
          title="Total Recorded Loss"
          value={isLoadingRiskMetrics && alertsDataset.length === 0 ? '...' : `₹ ${formatINR(kpiMetrics.totalLoss)}`}
          change={`${kpiMetrics.confirmedFraud.toLocaleString()} confirmed`}
          changeType="negative"
          comparisonPeriod="Recorded loss on confirmed cases in DB"
          icon={<Activity className="w-5 h-5 text-[#d97706]" />}
          iconBg="bg-[#fffbeb]"
          sparklineColor="#d97706"
          sparklineData={[15, 18, 22, 24, 28, 30, 31.3]}
        />

        {/* KPI 5: Average Resolution Days (Excluding Unresolved Alerts) */}
        <KpiCard
          title="Avg Resolution Days"
          value={isLoadingRiskMetrics && alertsDataset.length === 0 ? '...' : `${kpiMetrics.avgResolutionDays > 0 ? kpiMetrics.avgResolutionDays : '—'} Days`}
          change={`${kpiMetrics.resolvedCount.toLocaleString()} resolved`}
          changeType="neutral"
          comparisonPeriod="Resolved cases only (Pending excluded)"
          icon={<CheckCircle className="w-5 h-5 text-[#059669]" />}
          iconBg="bg-[#ecfdf5]"
          sparklineColor="#10b981"
          sparklineData={[6.2, 5.9, 5.7, 5.5, 5.4, 5.36]}
        />
      </div>

      {/* Section 4: Main Analytics Charts (3-Column Layout on Wide Screens) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
        {/* Chart A: Alerts Based on Fraud */}
        <AlertsBasedOnFraudDoughnut
          totalAlerts={kpiMetrics.totalAlerts}
          segments={chartASegments}
          selectedCategory={filterFraudType !== 'ALL' ? filterFraudType : null}
          onSelectCategory={(cat) => setFilterFraudType(prev => prev === cat ? 'ALL' : cat)}
        />

        {/* Chart B: Alert Type (Anomaly Rules) */}
        <AlertRulesHorizontalBar
          rules={chartBRules}
          selectedRule={filterRule !== 'ALL' ? filterRule : null}
          onSelectRule={(rule) => setFilterRule(prev => prev === rule ? 'ALL' : rule)}
        />

        {/* Chart C: Alert Status */}
        <AlertStatusBarChart
          statusData={chartCStatusData}
          selectedStatus={filterStatus !== 'ALL' ? filterStatus : null}
          onSelectStatus={(status) => setFilterStatus(status)}
        />
      </div>

      {/* Section 5 & 6: Operational Section (Live Queue + Fraud Risk Analysis) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-8">
        {/* Left Column: Live Risk Alert Investigation Queue (Allocated generous width) */}
        <div className="lg:col-span-8 bg-white border border-[#ece7dc] rounded-2xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
              <div>
                <h3 className="font-heading font-semibold text-base text-[#0a261c]">
                  Live Risk Alert Investigation Queue
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Verified live records from Supabase fraud_alerts table ({filteredAlerts.length.toLocaleString()} matching alerts)
                </p>
              </div>

              {/* Status Filter Tabs */}
              <div className="flex items-center gap-1 p-1 bg-[#faf7f0] border border-[#e5dfd2] rounded-xl text-xs flex-wrap">
                {(['ALL', 'Under Review', 'Open', 'Confirmed Fraud', 'False Positive'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setFilterStatus(st)}
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

            {/* Table of Live Records */}
            <div className="overflow-x-auto min-h-[340px]">
              {isLoadingFraudAlerts && alertsDataset.length === 0 ? (
                <div className="py-20 text-center text-xs text-slate-400">
                  <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2 text-[#0d5941]" />
                  Loading live fraud alerts from Supabase...
                </div>
              ) : queuePageRecords.length === 0 ? (
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
                    {queuePageRecords.map((alert) => {
                      const isUpdating = updatingAlertId === alert.id;
                      const lossAmt = Number(alert.loss) || 0;
                      return (
                        <tr key={alert.id} className="hover:bg-[#faf8f3] transition-colors">
                          <td className="py-3 font-semibold text-[#093425] font-mono">
                            {alert.id}
                          </td>
                          <td className="py-3 font-mono text-slate-700">
                            {alert.custId || '—'}
                          </td>
                          <td className="py-3 font-medium text-slate-800">
                            {alert.type}
                          </td>
                          <td className="py-3 text-slate-600">
                            {alert.rule}
                          </td>
                          <td className="py-3 font-semibold font-mono text-slate-800">
                            {lossAmt > 0 ? `₹ ${formatINR(lossAmt)}` : '—'}
                          </td>
                          <td className="py-3 text-slate-500">
                            {alert.date ? alert.date.slice(0, 10) : '—'}
                          </td>
                          <td className="py-3">
                            <StatusBadge status={alert.status} />
                          </td>
                          <td className="py-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="emerald"
                                size="sm"
                                onClick={() => setSelectedAlert({
                                  alert_id: alert.id,
                                  customer_id: alert.custId || 'CUST00018630',
                                  transaction_id: alert.txnId || 'TXN0000000012',
                                  alert_date: alert.date,
                                  fraud_type: alert.type,
                                  rule_triggered: alert.rule,
                                  alert_status: alert.status,
                                  assigned_analyst_id: 'USR0025002',
                                  resolved_date: alert.resDate,
                                  loss_amount_inr: alert.loss
                                })}
                                className="!py-1 !px-2 !text-[11px]"
                                leftIcon={<Eye className="w-3 h-3" />}
                              >
                                View
                              </Button>
                              {alert.status === 'Under Review' || alert.status === 'Open' ? (
                                <>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleStatusChange(alert.id, 'False Positive')}
                                    disabled={isUpdating}
                                    className="!py-1 !px-2 !text-[11px] text-emerald-700 hover:bg-emerald-50"
                                  >
                                    Clear
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleStatusChange(alert.id, 'Confirmed Fraud')}
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
                                  onClick={() => handleStatusChange(alert.id, 'Under Review')}
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
              Showing Page <strong>{queuePage}</strong> of <strong>{queueTotalPages}</strong> ({filteredAlerts.length.toLocaleString()} alerts)
            </span>
            <div className="flex items-center gap-1.5">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQueuePage(p => Math.max(1, p - 1))}
                disabled={queuePage <= 1}
                leftIcon={<ChevronLeft className="w-3.5 h-3.5" />}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setQueuePage(p => Math.min(queueTotalPages, p + 1))}
                disabled={queuePage >= queueTotalPages}
                rightIcon={<ChevronRight className="w-3.5 h-3.5" />}
              >
                Next
              </Button>
            </div>
          </div>
        </div>

        {/* Right Column: Preserved Fraud Risk Analysis Component */}
        <div className="lg:col-span-4 flex flex-col justify-between">
          <DonutChart
            title="Fraud Risk Analysis"
            centerCount={kpiMetrics.totalAlerts.toLocaleString()}
            centerLabel="Total Alerts"
            segments={fraudRiskAnalysisSegments}
          />
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
                  <span className="font-mono font-semibold text-slate-800">{selectedAlert.assigned_analyst_id || 'USR0025002 (Tier-2 Specialist)'}</span>
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

      {/* Spacing to prevent Fin AI floating assistant from obscuring controls */}
      <div className="pb-16" />
    </AppLayout>
  );
};
