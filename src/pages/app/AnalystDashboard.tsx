import React, { useState } from 'react';
import { Coins, Wallet, Users, ShieldAlert, Sparkles, Filter, Download, BarChart3, ArrowLeftRight, CheckCircle2 } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { KpiCard } from '../../components/ui/KpiCard';
import { TransactionTrendChart } from '../../components/charts/TransactionTrendChart';
import { DonutChart } from '../../components/charts/DonutChart';
import { SpendingCategoryBars } from '../../components/charts/SpendingCategoryBars';
import { RecommendationsCard } from '../../components/dashboard/RecommendationsCard';
import { Button } from '../../components/ui/Button';
import { CUSTOMER_SEGMENTS, FRAUD_RISK_DISTRIBUTION } from '../../data/sampleData';
import { useApp } from '../../context/AppContext';

export const AnalystDashboard: React.FC = () => {
  const { navigate } = useApp();
  const [exportNotice, setExportNotice] = useState<string | null>(null);

  const handleExport = () => {
    setExportNotice('Financial Analytics Workbench report exported successfully (CSV & PDF formats).');
    setTimeout(() => setExportNotice(null), 3500);
  };

  return (
    <AppLayout
      title="Financial Analytics Workbench"
      subtitle="Transaction analytics, customer segmentation, financial trends, and operational reviews."
      icon={<BarChart3 className="w-5 h-5 text-[#0d5941]" />}
      breadcrumbLabel="Financial Analytics Workbench"
    >
      {/* Top Action Ribbon / Workspace Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6 pb-2 border-b border-[#ece6d9]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Workspace:
          </span>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#ebf5f0] text-[#0d5941] border border-[#aee3cb]">
            Financial Analytics Workbench · Business Analyst Intelligence
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="primary"
            size="sm"
            leftIcon={<ArrowLeftRight className="w-3.5 h-3.5" />}
            onClick={() => navigate('/app/transactions')}
          >
            Analyze Transactions
          </Button>
          <Button
            variant="emerald"
            size="sm"
            leftIcon={<Sparkles className="w-3.5 h-3.5 text-[#f1cd6b]" />}
            onClick={() => navigate('/app/assistant')}
          >
            Generate Insight
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Download className="w-3.5 h-3.5" />}
            onClick={handleExport}
          >
            Export Report
          </Button>
        </div>
      </div>

      {exportNotice && (
        <div className="mb-6 p-4 rounded-2xl bg-[#ebf7f1] border border-[#aee3cb] text-xs font-semibold text-[#0a4d37] flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#0d5941]" />
          <span>{exportNotice}</span>
        </div>
      )}

      {/* Row 1: 4 KPI Cards Matching Dashboard Reference Image with Interactive 3D */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* KPI 1: Total Transactions */}
        <KpiCard
          title="Total Transactions"
          value="30,000"
          change="12.5%"
          changeType="positive"
          comparisonPeriod="vs last month"
          icon={<Coins className="w-5 h-5 text-[#b0882e]" />}
          iconBg="bg-[#fcf4e4]"
          sparklineColor="#10b981"
          delayMs={0}
          sparklineData={[12, 14, 18, 16, 21, 24, 28, 27, 32]}
        />

        {/* KPI 2: Total Amount */}
        <KpiCard
          title="Total Amount"
          value="₹ 12,45,230"
          change="8.3%"
          changeType="positive"
          comparisonPeriod="vs last month"
          icon={<Wallet className="w-5 h-5 text-[#b0882e]" />}
          iconBg="bg-[#fcf4e4]"
          sparklineColor="#10b981"
          glowColor="gold"
          delayMs={80}
          sparklineData={[10, 12, 15, 14, 19, 20, 24, 26, 29]}
        />

        {/* KPI 3: Total Customers */}
        <KpiCard
          title="Total Customers"
          value="8,452"
          change="10.1%"
          changeType="positive"
          comparisonPeriod="vs last month"
          icon={<Users className="w-5 h-5 text-[#b0882e]" />}
          iconBg="bg-[#fcf4e4]"
          sparklineColor="#10b981"
          delayMs={160}
          sparklineData={[8, 11, 13, 15, 17, 19, 22, 25, 27]}
        />

        {/* KPI 4: Fraud Risk Transactions */}
        <KpiCard
          title="Fraud Risk Transactions"
          value="238"
          change="2.4%"
          changeType="negative"
          comparisonPeriod="vs last month"
          icon={<ShieldAlert className="w-5 h-5 text-[#b0882e]" />}
          iconBg="bg-[#fcf4e4]"
          sparklineColor="#ef4444"
          glowColor="red"
          delayMs={240}
          sparklineData={[18, 15, 17, 14, 19, 21, 20, 23, 25]}
        />
      </div>

      {/* Row 2: Transaction Trend + Customer Segmentation */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        <div className="lg:col-span-8">
          <TransactionTrendChart />
        </div>
        <div className="lg:col-span-4">
          <DonutChart
            title="Customer Segmentation"
            centerCount="8,452"
            centerLabel="Customers"
            segments={CUSTOMER_SEGMENTS}
          />
        </div>
      </div>

      {/* Row 3: Top Spending Categories + Fraud Risk Analysis + AI Recommendations */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Widget 1: Top Spending Categories */}
        <SpendingCategoryBars />

        {/* Widget 2: Fraud Risk Analysis */}
        <DonutChart
          title="Fraud Risk Analysis"
          centerCount="238"
          centerLabel="High Risk"
          segments={FRAUD_RISK_DISTRIBUTION}
        />

        {/* Widget 3: AI Recommendations */}
        <RecommendationsCard />
      </div>
    </AppLayout>
  );
};
