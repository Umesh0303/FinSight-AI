import React, { useState } from 'react';
import {
  Sparkles,
  Search,
  ArrowRight,
  TrendingUp,
  ShieldAlert,
  Users,
  BarChart3,
  Layers,
  ChevronRight,
  Wallet,
  Activity,
  Coins,
  ShieldCheck,
  Compass,
  X,
  Info,
  DollarSign,
  ArrowUpRight,
  Lock,
  Cpu
} from 'lucide-react';
import { PublicNav } from '../../components/layout/PublicNav';
import { PublicFooter } from '../../components/layout/PublicFooter';
import { FinancialBackground } from '../../components/brand/FinancialBackground';
import { Button } from '../../components/ui/Button';
import { useApp } from '../../context/AppContext';
import { KpiCard } from '../../components/ui/KpiCard';
import { Card3D } from '../../components/ui/Card3D';
import { AnimatedNumber } from '../../components/ui/AnimatedNumber';
import { DonutChart } from '../../components/charts/DonutChart';
import { CUSTOMER_SEGMENTS } from '../../data/sampleData';

export const HomePage: React.FC = () => {
  const { navigate, customerSegments, platformMetrics } = useApp();
  const [heroSearch, setHeroSearch] = useState('');
  const [activeInspectorTopic, setActiveInspectorTopic] = useState<string | null>('High value customers');

  const quickPills = [
    'High value customers',
    'Fraud risk analysis',
    'Customer segmentation',
    'Spending pattern analysis'
  ];

  const topicDetails: Record<
    string,
    {
      title: string;
      subtitle: string;
      summary: string;
      kpis: { label: string; val: string; sub?: string }[];
      insight: string;
      targetSectionId: string;
    }
  > = {
    'High value customers': {
      title: 'High-Value Customer Intelligence',
      subtitle: 'Behavioral clustering and premium tier customer retention',
      summary:
        'FinSight AI monitors transaction velocity and deposit regularity to isolate the top 28% of account holders driving 64% of total transaction volume.',
      kpis: [
        { label: 'Segment Share', val: '28% (2,366 Users)', sub: 'Primary revenue base' },
        { label: 'Avg Account Balance', val: '₹ 14,80,000', sub: '+12.5% vs baseline' },
        { label: 'Growth Trend', val: '+12.5%', sub: 'Month over month' }
      ],
      insight:
        'Example AI Insight: High-value account holders demonstrate a 42% preference for international contactless cards and premium wealth advisory products.',
      targetSectionId: 'insights'
    },
    'Fraud risk analysis': {
      title: 'Real-Time Fraud Risk Intelligence',
      subtitle: 'Continuous anomaly scoring with human-in-the-loop review',
      summary:
        'Using Isolation Forest and XGBoost ensemble scoring, suspicious cross-border swiping and rapid velocity bursts trigger instant investigation alerts.',
      kpis: [
        { label: 'Flagged Alerts', val: '238 Transactions', sub: 'Instant queue routing' },
        { label: 'False Positive Rate', val: '0.74%', sub: 'Industry-leading low' },
        { label: 'Prevented Loss', val: '₹ 3,13,400 saved', sub: 'Synthetic test cohort' }
      ],
      insight:
        'Example AI Insight: Geographic velocity checks flagged 15 transactions in London POS deviating from Indian home profiles within a 45-minute window.',
      targetSectionId: 'risk'
    },
    'Customer segmentation': {
      title: 'Customer Segmentation Radar',
      subtitle: 'Dynamic multi-cohort classification across 8,452 customers',
      summary:
        'Replaces static legacy tiers with automated AI clustering based on active tenure, credit rating, and category spending distributions.',
      kpis: [
        { label: 'Total Cohorts', val: '5 Distinct Segments', sub: 'High Value, Potential, Regular, etc.' },
        { label: 'High Potential Base', val: '32% of customers', sub: 'Prime growth candidates' },
        { label: 'At-Risk Retention', val: '10% flagged', sub: 'Immediate outreach advised' }
      ],
      insight:
        'Example AI Insight: 250 customers in the Potential segment qualify for unsecured credit line increases based on credit scores exceeding 740.',
      targetSectionId: 'insights'
    },
    'Spending pattern analysis': {
      title: 'Merchant & Spending Category Analysis',
      subtitle: 'Contextual transaction classification & cashflow patterns',
      summary:
        'Transforms raw banking statement memos into categorized lifestyle verticals: Shopping (28%), Food & Dining (18%), and Travel (15%).',
      kpis: [
        { label: 'Top Vertical', val: 'Shopping (₹ 3,48,200)', sub: '28% of total outflow' },
        { label: 'Discretionary Outflow', val: '56% of volume', sub: 'High retail affinity' },
        { label: 'Weekend Surge', val: '+18% dining spend', sub: 'Recurring seasonal pattern' }
      ],
      insight:
        'Example AI Insight: Weekend dining expenditures surge by 18%, presenting a high-conversion opportunity for targeted dining cash-back partnerships.',
      targetSectionId: 'analytics'
    }
  };

  const handleHeroSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const query = heroSearch.trim();
    if (!query) {
      setActiveInspectorTopic('High value customers');
      return;
    }

    const matched = Object.keys(topicDetails).find((k) =>
      query.toLowerCase().includes(k.toLowerCase()) ||
      k.toLowerCase().includes(query.toLowerCase())
    );
    setActiveInspectorTopic(matched || 'High value customers');
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <FinancialBackground variant="hero" className="min-h-screen text-white flex flex-col selection:bg-[#deb03e] selection:text-black">
      {/* Top Main Navigation: Sticky at top: 0 with z-[100], no ticker above it */}
      <PublicNav />

      {/* ========================================================================= */}
      {/* 1. HERO SLIDE: Reference Master Atmospheric Financial AI Design           */}
      {/* ========================================================================= */}
      <section className="relative pt-10 sm:pt-12 pb-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full text-center">
        
        {/* Hero Scope Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#052b1e]/90 border border-[#0d4f38] text-xs font-semibold text-[#8cb8a7] mb-6 shadow-md backdrop-blur-md">
          <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
          <span>Institutional AI Intelligence Gateway</span>
          <span className="text-[#3b6f5c]">/</span>
          <span className="text-[#e5b842]">v2.4 Enterprise Platform</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold font-heading tracking-tight text-white max-w-4xl mx-auto leading-[1.12]">
          Turn Financial Data into{' '}
          <span className="bg-gradient-to-r from-[#ffd978] via-[#e5b842] to-[#c59627] bg-clip-text text-transparent">
            Smarter Decisions
          </span>
        </h1>

        {/* Subtitle */}
        <p className="text-base sm:text-lg text-[#8cb8a7] max-w-2xl mx-auto mt-5 leading-relaxed font-light">
          Customer behavioral clustering, real-time transaction risk scoring, and prescriptive wealth recommendations unified in one enterprise ecosystem.
        </p>

        {/* Informational Hero Search / Inspector */}
        <div className="max-w-2xl mx-auto mt-8">
          <form
            onSubmit={handleHeroSubmit}
            className="relative flex items-center bg-[#052b1e]/95 backdrop-blur-xl border border-[#0d4f38] rounded-full p-1.5 shadow-[0_8px_30px_rgba(2,16,11,0.6)] focus-within:border-[#e5b842] focus-within:ring-2 focus-within:ring-[#e5b842]/30 transition-all"
          >
            <Search className="w-5 h-5 text-[#10b981] ml-4 mr-2 flex-shrink-0" />
            <input
              type="text"
              placeholder="Explore topics (e.g. 'fraud risk analysis', 'customer segmentation')..."
              value={heroSearch}
              onChange={(e) => setHeroSearch(e.target.value)}
              className="w-full bg-transparent text-xs sm:text-sm text-white placeholder-[#588574] focus:outline-none pr-3"
            />
            <button
              type="submit"
              className="px-5 sm:px-6 py-2.5 rounded-full bg-gradient-to-r from-[#ecc866] via-[#e5b842] to-[#d69f2e] text-[#052419] font-bold text-xs sm:text-sm hover:from-[#f3da87] hover:to-[#dfab38] transition-all shadow-md flex items-center gap-1.5 flex-shrink-0 cursor-pointer active:scale-95"
            >
              <span>Inspect Topic</span>
              <Sparkles className="w-3.5 h-3.5 fill-[#052419]" />
            </button>
          </form>

          {/* Quick Topic Chips */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-3.5">
            {quickPills.map((pill) => (
              <button
                key={pill}
                type="button"
                onClick={() => setActiveInspectorTopic(pill)}
                className={`px-3.5 py-1.5 rounded-full border text-xs font-medium transition-all cursor-pointer ${
                  activeInspectorTopic === pill
                    ? 'bg-[#e5b842] text-[#052419] border-[#e5b842] font-bold shadow-xs'
                    : 'bg-[#042017]/90 border-[#0d4532] text-[#8cb8a7] hover:bg-[#072c20] hover:text-white'
                }`}
              >
                {pill}
              </button>
            ))}
          </div>
        </div>

        {/* On-Page Inspector Drawer / Modal */}
        {activeInspectorTopic && topicDetails[activeInspectorTopic] && (
          <div className="mt-7 max-w-3xl mx-auto p-6 rounded-3xl bg-[#052b1e]/95 backdrop-blur-xl border border-[#0d4f38] text-left shadow-2xl relative animate-in fade-in">
            <button
              onClick={() => setActiveInspectorTopic(null)}
              className="absolute top-4 right-4 text-[#6e9d8c] hover:text-white p-1 cursor-pointer"
              aria-label="Close preview"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 mb-1.5">
              <Info className="w-4 h-4 text-[#e5b842]" />
              <span className="text-[11px] font-bold uppercase tracking-wider text-[#e5b842]">
                Informational Overview · {activeInspectorTopic}
              </span>
            </div>

            <h3 className="font-heading font-bold text-lg text-white">
              {topicDetails[activeInspectorTopic].title}
            </h3>
            <p className="text-xs text-[#8cb8a7] mt-1 leading-relaxed">
              {topicDetails[activeInspectorTopic].summary}
            </p>

            {/* 3D Dynamic Metrics Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 my-4 pt-3 border-t border-[#093d2c]">
              {topicDetails[activeInspectorTopic].kpis.map((kpi, idx) => {
                const isPercent = kpi.val.includes('%');
                const isCurrency = kpi.val.includes('₹');
                return (
                  <Card3D
                    key={idx}
                    delayMs={idx * 100}
                    glowColor="gold"
                    className="p-3.5 rounded-2xl bg-[#031d14]/95 border border-[#0d4f38] hover:border-[#e5b842]/70 text-left"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-[#8cb8a7] tracking-wider uppercase block">
                        {kpi.label}
                      </span>
                      <span className="w-1.5 h-1.5 rounded-full bg-[#e5b842] animate-pulse" />
                    </div>
                    <div className="text-lg sm:text-xl font-extrabold text-white font-heading mt-1">
                      <AnimatedNumber value={kpi.val} duration={1100} />
                    </div>
                    {kpi.sub && (
                      <span className="text-[10px] font-medium text-[#34d399] block mt-0.5">
                        {kpi.sub}
                      </span>
                    )}

                    {/* Live Data Momentum Visualizer */}
                    <div className="mt-2.5 pt-2 border-t border-[#093d2c]/60 flex items-center justify-between text-[9px] text-[#6b9d8c]">
                      {isPercent ? (
                        <div className="w-full flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-[#073022] rounded-full overflow-hidden">
                            <div
                              className="h-full bg-gradient-to-r from-[#10b981] to-[#e5b842] rounded-full transition-all duration-1000"
                              style={{ width: `${Math.min(100, Math.max(28, parseInt(kpi.val) || 35))}%` }}
                            />
                          </div>
                          <span className="font-mono text-[#e5b842] text-[9px]">LIVE</span>
                        </div>
                      ) : isCurrency ? (
                        <div className="w-full flex items-center justify-between">
                          <span className="text-[#34d399] font-mono text-[9px]">VELOCITY: HIGH</span>
                          <svg className="w-14 h-3.5 overflow-visible" viewBox="0 0 56 14">
                            <polyline
                              fill="none"
                              stroke="#e5b842"
                              strokeWidth="1.6"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              points="2,12 14,8 26,10 38,5 52,2"
                            />
                            <circle cx="52" cy="2" r="2" fill="#ffd978" className="animate-pulse" />
                          </svg>
                        </div>
                      ) : (
                        <div className="w-full flex items-center justify-between">
                          <span className="font-mono text-[#8cb8a7] text-[9px]">MOMENTUM</span>
                          <div className="flex items-center gap-0.5 text-[#34d399] font-mono font-bold tracking-tight text-[10px]">
                            <span>╱</span><span>╱</span><span>╱</span><span>╱</span><span>╱</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </Card3D>
                );
              })}
            </div>

            {/* Quote & Section Link */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-2xl bg-[#073626] border border-[#105940]">
              <p className="text-xs text-[#cbe5d9] italic">
                "{topicDetails[activeInspectorTopic].insight}"
              </p>
              <button
                type="button"
                onClick={() => scrollToSection(topicDetails[activeInspectorTopic].targetSectionId)}
                className="text-xs text-[#e5b842] hover:text-[#f3da87] font-semibold flex items-center gap-1 flex-shrink-0 cursor-pointer transition-colors"
              >
                <span>Explore section below</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Primary Action Buttons */}
        <div className="flex items-center justify-center gap-4 mt-9">
          <button
            onClick={() => navigate('/app')}
            className="py-3.5 px-8 rounded-xl bg-gradient-to-r from-[#ecc866] via-[#e5b842] to-[#d69f2e] hover:from-[#f3da87] hover:to-[#dfab38] text-[#052419] font-bold text-sm shadow-[0_6px_25px_rgba(229,184,66,0.35)] transition-all flex items-center gap-2 cursor-pointer"
          >
            <span>Go to Dashboard</span>
            <span className="text-base font-extrabold leading-none">→</span>
          </button>
          <button
            onClick={() => scrollToSection('what-is-finsight')}
            className="py-3.5 px-6 rounded-xl bg-[#042017]/80 hover:bg-[#072c20] border border-[#0d4f38] text-xs sm:text-sm font-semibold text-[#8cb8a7] hover:text-white transition-all flex items-center gap-2 cursor-pointer"
          >
            <Compass className="w-4 h-4 text-[#10b981]" />
            <span>Explore Capabilities</span>
          </button>
        </div>

      </section>

      {/* ========================================================================= */}
      {/* 2. PRODUCT ARCHITECTURE SLIDE: Dark Glassmorphic Value Pillars            */}
      {/* ========================================================================= */}
      <section id="what-is-finsight" className="py-20 border-t border-[#093d2c]/50 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-[#e5b842] bg-[#052b1e] px-3.5 py-1.5 rounded-full border border-[#0d4f38]">
              Platform Architecture
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold font-heading text-white mt-4 tracking-tight">
              Unified Customer, Risk & Transaction Intelligence
            </h2>
            <p className="text-xs sm:text-sm text-[#8cb8a7] mt-3 leading-relaxed">
              FinSight AI bridges core banking transaction streams with executive decision-making. Built with zero-trust role access control, ethical human-in-the-loop oversight, and synthetic telemetry.
            </p>
          </div>

          {/* 3 Core Conceptual Value Pillars in 3D Dark Glass */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Pillar 1 */}
            <Card3D delayMs={0} glowColor="emerald" className="p-7 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#031d14] border border-[#0d4f38] text-[#34d399] flex items-center justify-center mb-5 shadow-xs transition-transform duration-300 group-hover:scale-105">
                  <BarChart3 className="w-6 h-6" />
                </div>
                <h3 className="font-heading font-bold text-lg text-white">
                  Real-Time Financial Analytics
                </h3>
                <p className="text-xs text-[#8cb8a7] mt-2.5 leading-relaxed">
                  Consolidates millions of transaction streams into legible volume trendlines, merchant vertical allocations, and liquidity health monitors.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-[#093d2c] flex items-center justify-between text-xs font-semibold text-[#10b981]">
                <span>30,000 monthly txns scanned</span>
                <TrendingUp className="w-4 h-4" />
              </div>
            </Card3D>

            {/* Pillar 2 */}
            <Card3D delayMs={150} glowColor="gold" className="p-7 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#031d14] border border-[#0d4f38] text-[#e5b842] flex items-center justify-center mb-5 shadow-xs transition-transform duration-300 group-hover:scale-105">
                  <Users className="w-6 h-6" />
                </div>
                <h3 className="font-heading font-bold text-lg text-white">
                  Customer Behavioral Clustering
                </h3>
                <p className="text-xs text-[#8cb8a7] mt-2.5 leading-relaxed">
                  Classifies customer accounts into actionable cohorts—High Value, Potential, Regular, At-Risk, and New—enabling precision retention strategies.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-[#093d2c] flex items-center justify-between text-xs font-semibold text-[#e5b842]">
                <span>8,452 active profiles</span>
                <Users className="w-4 h-4" />
              </div>
            </Card3D>

            {/* Pillar 3 */}
            <Card3D delayMs={300} glowColor="red" className="p-7 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-[#031d14] border border-[#0d4f38] text-[#ef4444] flex items-center justify-center mb-5 shadow-xs transition-transform duration-300 group-hover:scale-105">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <h3 className="font-heading font-bold text-lg text-white">
                  Risk & Fraud Mitigation
                </h3>
                <p className="text-xs text-[#8cb8a7] mt-2.5 leading-relaxed">
                  Continuous Isolation Forest anomaly scoring flags rapid velocity spikes, overseas impossible swipes, and unusual wire flows before settlement.
                </p>
              </div>
              <div className="mt-5 pt-4 border-t border-[#093d2c] flex items-center justify-between text-xs font-semibold text-[#ef4444]">
                <span>238 high-risk alerts flagged</span>
                <ShieldAlert className="w-4 h-4" />
              </div>
            </Card3D>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 3. FINANCIAL ANALYTICS SLIDE: KPI Cards in Master Reference Glass         */}
      {/* ========================================================================= */}
      <section id="analytics" className="py-20 border-t border-[#093d2c]/50 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-[#10b981] bg-[#052b1e] px-3.5 py-1 rounded-full border border-[#0d4f38]">
                Financial Telemetry Showcase
              </span>
              <h2 className="text-3xl font-extrabold font-heading text-white mt-3 tracking-tight">
                Sample Analytics Telemetry
              </h2>
              <p className="text-xs text-[#8cb8a7] mt-1.5">
                Aggregated financial performance metrics and synthetic trend benchmarks.
              </p>
            </div>
            <span className="text-xs font-mono font-medium text-[#8cb8a7] bg-[#052b1e] border border-[#0d4f38] px-3.5 py-1.5 rounded-xl self-start">
              Synthetic Demo Dataset · Q4 2024
            </span>
          </div>

          {/* 4 3D Dynamic Glassmorphism KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <KpiCard
              title="Total Transactions"
              value="30,000"
              change="12.5%"
              changeType="positive"
              comparisonPeriod="vs last month"
              icon={<Coins className="w-5 h-5 text-[#e5b842]" />}
              sparklineColor="#10b981"
              theme="dark"
              delayMs={0}
              sparklineData={[12, 14, 18, 16, 21, 24, 28, 27, 32]}
            />
            <KpiCard
              title="Transaction Volume"
              value="₹ 12,45,230"
              change="8.3%"
              changeType="positive"
              comparisonPeriod="vs last month"
              icon={<Wallet className="w-5 h-5 text-[#e5b842]" />}
              sparklineColor="#e5b842"
              glowColor="gold"
              theme="dark"
              delayMs={100}
              sparklineData={[10, 12, 15, 14, 19, 20, 24, 26, 29]}
            />
            <KpiCard
              title="Total Customers"
              value="8,452"
              change="10.1%"
              changeType="positive"
              comparisonPeriod="vs last month"
              icon={<Users className="w-5 h-5 text-[#e5b842]" />}
              sparklineColor="#10b981"
              theme="dark"
              delayMs={200}
              sparklineData={[8, 11, 13, 15, 17, 19, 22, 25, 27]}
            />
            <KpiCard
              title="Fraud Risk Alerts"
              value="238"
              change="2.4%"
              changeType="negative"
              comparisonPeriod="vs last month"
              icon={<ShieldAlert className="w-5 h-5 text-[#ef4444]" />}
              sparklineColor="#ef4444"
              glowColor="red"
              theme="dark"
              delayMs={300}
              sparklineData={[18, 15, 17, 14, 19, 21, 20, 23, 25]}
            />
          </div>

          {/* Direct CTA Banner */}
          <div className="p-6 rounded-3xl bg-[#052b1e]/90 border border-[#0d4f38] flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl">
            <div className="text-xs text-[#8cb8a7]">
              <strong className="text-white block text-sm font-heading mb-0.5">Want to drill into real-time ledger rows and segment distributions?</strong>
              Enter the authenticated application dashboard to inspect filters, transaction telemetry, and live risk scores.
            </div>
            <button
              onClick={() => navigate('/app')}
              className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-[#ecc866] via-[#e5b842] to-[#d69f2e] hover:from-[#f3da87] hover:to-[#dfab38] text-[#052419] font-bold text-xs tracking-wide shadow-md transition-all flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <span>Go to Dashboard</span>
              <span>→</span>
            </button>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 4. CUSTOMER INSIGHTS & SEGMENTATION SLIDE                                 */}
      {/* ========================================================================= */}
      <section id="insights" className="py-20 border-t border-[#093d2c]/50 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            <div className="lg:col-span-6 space-y-4">
              <span className="text-xs font-bold uppercase tracking-widest text-[#e5b842] bg-[#052b1e] px-3.5 py-1.5 rounded-full border border-[#0d4f38]">
                Customer Intelligence
              </span>
              <h2 className="text-3xl font-extrabold font-heading text-white tracking-tight">
                Segment Distribution & Behavioral Clustering
              </h2>
              <p className="text-xs text-[#8cb8a7] leading-relaxed">
                FinSight AI maps customer transaction patterns into dynamic clusters based on deposit velocity, credit standing, and vertical category engagement:
              </p>

              <div className="space-y-3 pt-2">
                {[
                  { title: 'High Value (28%)', desc: 'Average balance ₹14.8L. High international contactless swipe volume.', badge: 'Prime Tier', badgeColor: 'text-[#10b981] bg-[#073322]' },
                  { title: 'Potential (32%)', desc: 'Rapidly growing savings rate. Ready for premium credit line expansion.', badge: 'Growth', badgeColor: 'text-[#e5b842] bg-[#3a2c07]' },
                  { title: 'At Risk (10%)', desc: 'Declining monthly engagement. Proactive retention alert dispatched.', badge: 'Attention', badgeColor: 'text-[#ef4444] bg-[#3a0f12]' }
                ].map((item, idx) => (
                  <Card3D key={idx} delayMs={idx * 120} glowColor="emerald" className="p-4 rounded-2xl bg-[#052b1e]/90 border border-[#0d4f38] text-xs shadow-md">
                    <div className="flex justify-between items-center mb-1">
                      <span className="font-bold text-white">{item.title}</span>
                      <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-md ${item.badgeColor}`}>
                        {item.badge}
                      </span>
                    </div>
                    <p className="text-[#8cb8a7] text-[11px]">{item.desc}</p>
                  </Card3D>
                ))}
              </div>

              <div className="p-4 rounded-2xl bg-[#073626] border border-[#105940] text-xs text-[#cbe5d9]">
                <strong className="text-[#e5b842] block mb-1">Prescriptive AI Recommendation:</strong>
                "Weekend dining transactions increased by 18% across suburban metro accounts, presenting a high-conversion partner cash-back initiative."
              </div>
            </div>

            <div className="lg:col-span-6">
              <DonutChart
                title="Customer Segmentation Cohorts"
                centerCount={platformMetrics?.totalCustomers ? Number(platformMetrics.totalCustomers).toLocaleString() : "25,000"}
                centerLabel="Active Customers"
                segments={
                  customerSegments.length > 0
                    ? customerSegments.map((s, idx) => ({
                        name: s.name,
                        count: s.count,
                        percentage: s.percentage,
                        color: ['#093628', '#16795f', '#dfa634', '#9dcaa8', '#b5c0b9'][idx % 5]
                      }))
                    : CUSTOMER_SEGMENTS
                }
                theme="dark"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 5. RISK & FRAUD MITIGATION SLIDE                                          */}
      {/* ========================================================================= */}
      <section id="risk" className="py-20 border-t border-[#093d2c]/50 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-12">
            <span className="text-xs font-bold uppercase tracking-widest text-[#ef4444] bg-[#2a0c0f] px-3.5 py-1.5 rounded-full border border-[#4a181d]">
              Risk & Anomaly Mitigation
            </span>
            <h2 className="text-3xl font-extrabold font-heading text-white mt-3 tracking-tight">
              Proactive Financial Protection
            </h2>
            <p className="text-xs text-[#8cb8a7] mt-2">
              Autonomous isolation forest scoring detects velocity bursts and cross-border geographic anomalies.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card3D delayMs={0} glowColor="red" className="p-6 text-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-[#8cb8a7]">Example Risk Anomaly</span>
                <span className="w-2 h-2 rounded-full bg-[#ef4444] animate-ping" />
              </div>
              <div className="text-3xl font-extrabold font-heading text-[#ef4444]">
                <AnimatedNumber value="95 / 100" duration={1100} />
              </div>
              <h4 className="font-bold text-white text-sm">Geographic Anomaly Triggered</h4>
              <p className="text-[#8cb8a7] leading-relaxed">
                Cardholder registered in Bengaluru swiped in London POS 45 minutes after a local UPI purchase. Instant card isolation activated.
              </p>
              <span className="inline-block text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-red-950/80 text-red-300 border border-red-800">
                Action: Card Temporarily Locked
              </span>
            </Card3D>

            <Card3D delayMs={150} glowColor="gold" className="p-6 text-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-[#8cb8a7]">Compliance Routing</span>
                <span className="w-2 h-2 rounded-full bg-[#f59e0b] animate-pulse" />
              </div>
              <div className="text-3xl font-extrabold font-heading text-[#f59e0b]">
                <AnimatedNumber value="88 / 100" duration={1100} />
              </div>
              <h4 className="font-bold text-white text-sm">Unusual Outward Wire Volume</h4>
              <p className="text-[#8cb8a7] leading-relaxed">
                ₹1,84,500 outward remittance to foreign account. KYC velocity threshold reached, routing case to compliance review queue.
              </p>
              <span className="inline-block text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-amber-950/80 text-amber-300 border border-amber-800">
                Action: Human Officer Review
              </span>
            </Card3D>

            <Card3D delayMs={300} glowColor="emerald" className="p-6 text-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] uppercase font-bold text-[#8cb8a7]">Model Precision</span>
                <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
              </div>
              <div className="text-3xl font-extrabold font-heading text-[#10b981]">
                <AnimatedNumber value="0.74%" duration={1100} />
              </div>
              <h4 className="font-bold text-white text-sm">False Positive Rate</h4>
              <p className="text-[#8cb8a7] leading-relaxed">
                Trained on synthetic behavioral patterns to maximize fraud capture without disrupting legitimate account holders.
              </p>
              <span className="inline-block text-[10px] font-semibold px-2.5 py-1 rounded-lg bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                Status: Operational v2.4
              </span>
            </Card3D>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 6. SOLUTIONS BY STAKEHOLDER ROLE SLIDE                                    */}
      {/* ========================================================================= */}
      <section id="solutions" className="py-20 border-t border-[#093d2c]/50 relative">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-14">
            <span className="text-xs font-bold uppercase tracking-widest text-[#e5b842] bg-[#052b1e] px-3.5 py-1.5 rounded-full border border-[#0d4f38]">
              Role-Based Intelligence
            </span>
            <h2 className="text-3xl font-extrabold font-heading text-white mt-3 tracking-tight">
              Specialized Solutions for Every Stakeholder
            </h2>
            <p className="text-xs text-[#8cb8a7] mt-2">
              Each institutional role accesses dedicated tools, strictly segregated from unauthorized banking data.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <Card3D delayMs={0} glowColor="emerald" className="p-6 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-[#031d14] border border-[#0d4f38] text-[#34d399] flex items-center justify-center mb-3.5 transition-transform duration-300 group-hover:scale-105">
                  <BarChart3 className="w-5 h-5" />
                </div>
                <h4 className="font-heading font-bold text-base text-white">
                  Business Analyst
                </h4>
                <p className="text-xs text-[#8cb8a7] mt-2 leading-relaxed">
                  Cohort growth trends, deposit velocity, customer segmentation radar, and predictive spending trends.
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-[#093d2c] text-[11px] font-semibold text-[#10b981]">
                Assigned: Senior Financial Analysts
              </div>
            </Card3D>

            <Card3D delayMs={100} glowColor="red" className="p-6 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-[#031d14] border border-[#0d4f38] text-[#ef4444] flex items-center justify-center mb-3.5 transition-transform duration-300 group-hover:scale-105">
                  <ShieldAlert className="w-5 h-5" />
                </div>
                <h4 className="font-heading font-bold text-base text-white">
                  Risk & Fraud Analyst
                </h4>
                <p className="text-xs text-[#8cb8a7] mt-2 leading-relaxed">
                  Real-time anomaly scores (0–100), card locks, suspicious velocity alerts, and evidence investigation cases.
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-[#093d2c] text-[11px] font-semibold text-[#ef4444]">
                Assigned: Compliance Officers
              </div>
            </Card3D>

            <Card3D delayMs={200} glowColor="gold" className="p-6 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-[#031d14] border border-[#0d4f38] text-[#e5b842] flex items-center justify-center mb-3.5 transition-transform duration-300 group-hover:scale-105">
                  <Users className="w-5 h-5" />
                </div>
                <h4 className="font-heading font-bold text-base text-white">
                  Personal Wealth Client
                </h4>
                <p className="text-xs text-[#8cb8a7] mt-2 leading-relaxed">
                  Client-isolated portal: personal cashflow (₹12.45L), budget categorizations, and tailored savings suggestions.
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-[#093d2c] text-[11px] font-semibold text-[#e5b842]">
                Assigned: Account Holders
              </div>
            </Card3D>

            <Card3D delayMs={300} glowColor="emerald" className="p-6 flex flex-col justify-between">
              <div>
                <div className="w-10 h-10 rounded-xl bg-[#031d14] border border-[#0d4f38] text-[#38bdf8] flex items-center justify-center mb-3.5 transition-transform duration-300 group-hover:scale-105">
                  <Layers className="w-5 h-5" />
                </div>
                <h4 className="font-heading font-bold text-base text-white">
                  Platform Administrator
                </h4>
                <p className="text-xs text-[#8cb8a7] mt-2 leading-relaxed">
                  Single root control: User management, role provisioning, security audit log, and ML model telemetry.
                </p>
              </div>
              <div className="pt-4 mt-4 border-t border-[#093d2c] text-[11px] font-semibold text-[#38bdf8]">
                Assigned: Security Admins
              </div>
            </Card3D>
          </div>
        </div>
      </section>

      {/* ========================================================================= */}
      {/* 7. FINAL APPLICATION ENTRY CTA SLIDE                                      */}
      {/* ========================================================================= */}
      <section className="py-24 border-t border-[#093d2c]/60 text-center relative overflow-hidden">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <span className="text-xs font-bold uppercase tracking-widest text-[#e5b842] bg-[#052b1e] px-4 py-1.5 rounded-full border border-[#0d4f38]">
            Enter FinSight AI
          </span>
          <h2 className="text-3xl sm:text-5xl font-extrabold font-heading text-white mt-4 tracking-tight">
            Experience FinSight AI in Action
          </h2>
          <p className="text-xs sm:text-sm text-[#8cb8a7] max-w-xl mx-auto mt-4 leading-relaxed">
            Sign in with institutional credentials or explore the role dashboards with simulated banking telemetry.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mt-8">
            <button
              onClick={() => navigate('/app')}
              className="py-3.5 px-8 rounded-xl bg-gradient-to-r from-[#ecc866] via-[#e5b842] to-[#d69f2e] hover:from-[#f3da87] hover:to-[#dfab38] text-[#052419] font-bold text-sm shadow-[0_6px_25px_rgba(229,184,66,0.35)] transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>Go to Dashboard</span>
              <span className="text-base font-extrabold leading-none">→</span>
            </button>
            <button
              onClick={() => navigate('/login')}
              className="py-3.5 px-6 rounded-xl bg-[#042017]/90 hover:bg-[#072c20] border border-[#0d4f38] text-xs sm:text-sm font-semibold text-[#8cb8a7] hover:text-white transition-all flex items-center gap-2 cursor-pointer"
            >
              <span>Sign In with Account</span>
              <ArrowRight className="w-4 h-4 text-[#10b981]" />
            </button>
          </div>

          <p className="text-[11px] text-[#528472] mt-6">
            Phase 0 Foundation · Synthetic sample data only · Bank-Grade TLS Encrypted
          </p>
        </div>
      </section>

      {/* Global Footer */}
      <PublicFooter />
    </FinancialBackground>
  );
};
