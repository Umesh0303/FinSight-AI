import React from 'react';
import { Shield, Brain, Sparkles, CheckCircle2, ArrowRight, BarChart3, ShieldAlert, Users, Layers } from 'lucide-react';
import { PublicNav } from '../../components/layout/PublicNav';
import { PublicFooter } from '../../components/layout/PublicFooter';
import { FinancialBackground } from '../../components/brand/FinancialBackground';
import { useApp } from '../../context/AppContext';

export const AboutPage: React.FC = () => {
  const { navigate } = useApp();

  return (
    <FinancialBackground variant="features" className="min-h-screen text-white flex flex-col selection:bg-[#deb03e] selection:text-black">
      <PublicNav />

      {/* Header Banner */}
      <section className="relative py-20 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto text-center">
        <span className="text-xs font-bold uppercase tracking-widest text-[#e5b842] bg-[#052b1e] px-4 py-1.5 rounded-full border border-[#0d4f38]">
          About FinSight AI
        </span>
        <h1 className="text-3xl sm:text-5xl font-extrabold font-heading text-white mt-4 tracking-tight">
          AI-Powered Financial Customer Insights & Recommendation Platform
        </h1>
        <p className="text-sm sm:text-base text-[#8cb8a7] max-w-2xl mx-auto mt-4 leading-relaxed font-light">
          FinSight AI unifies financial transaction streaming, customer behavioral clustering, real-time risk mitigation, and prescriptive recommendation models into one enterprise ecosystem.
        </p>
      </section>

      {/* Main Content Area */}
      <section className="py-12 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 flex-1 w-full">
        {/* Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-16">
          <div className="p-8 rounded-3xl bg-[#052b1e]/90 border border-[#0d4f38] shadow-xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#031d14] border border-[#0d4f38] text-[#34d399] flex items-center justify-center">
              <Brain className="w-6 h-6" />
            </div>
            <h3 className="font-heading font-bold text-xl text-white">Our Product Vision</h3>
            <p className="text-xs text-[#8cb8a7] leading-relaxed">
              Modern financial organizations manage fragmented data across core banking, card processing networks, and CRM silos. FinSight AI acts as an intelligent decision layer, turning raw ledger entries into contextual insights for business teams and customers alike.
            </p>
          </div>

          <div className="p-8 rounded-3xl bg-[#052b1e]/90 border border-[#0d4f38] shadow-xl space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#031d14] border border-[#0d4f38] text-[#e5b842] flex items-center justify-center">
              <Shield className="w-6 h-6" />
            </div>
            <h3 className="font-heading font-bold text-xl text-white">Ethical & Auditable AI</h3>
            <p className="text-xs text-[#8cb8a7] leading-relaxed">
              We reject opaque black-box autonomous financial interventions. FinSight AI is architected from the ground up as a human-in-the-loop decision support system, ensuring credit scoring, transaction blocks, and campaign triggers remain auditable by analysts.
            </p>
          </div>
        </div>

        {/* Four Core Roles Overview */}
        <div className="p-8 rounded-3xl bg-[#052b1e]/90 border border-[#0d4f38] shadow-xl mb-16">
          <div className="text-center max-w-2xl mx-auto mb-8">
            <span className="text-xs font-bold uppercase tracking-widest text-[#e5b842] bg-[#031d14] px-3.5 py-1.5 rounded-full border border-[#0d4f38]">
              Architecture Foundations
            </span>
            <h3 className="font-heading font-bold text-2xl text-white mt-3">
              The Four Core Personas
            </h3>
            <p className="text-xs text-[#8cb8a7] mt-1">
              Strict role isolation guarantees data safety while equipping each persona with specialized tools.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 text-xs text-[#8cb8a7]">
            <div className="p-5 rounded-2xl bg-[#031d14] border border-[#0d4f38]">
              <div className="w-8 h-8 rounded-xl bg-[#062c1f] text-[#34d399] flex items-center justify-center mb-2.5">
                <BarChart3 className="w-4 h-4" />
              </div>
              <strong className="text-white block text-sm mb-1">1. Business Analyst</strong>
              Uncovers cohort expansion, deposit patterns, and top spending categories to drive product roadmap.
            </div>

            <div className="p-5 rounded-2xl bg-[#031d14] border border-[#0d4f38]">
              <div className="w-8 h-8 rounded-xl bg-[#062c1f] text-[#ef4444] flex items-center justify-center mb-2.5">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <strong className="text-white block text-sm mb-1">2. Risk Analyst</strong>
              Mitigates financial loss through live anomaly detection, transaction risk scoring, and evidence dossiers.
            </div>

            <div className="p-5 rounded-2xl bg-[#031d14] border border-[#0d4f38]">
              <div className="w-8 h-8 rounded-xl bg-[#062c1f] text-[#e5b842] flex items-center justify-center mb-2.5">
                <Users className="w-4 h-4" />
              </div>
              <strong className="text-white block text-sm mb-1">3. Personal Client</strong>
              Receives transparent, isolated personal wealth tracking, cashflow breakdowns, and AI advice.
            </div>

            <div className="p-5 rounded-2xl bg-[#031d14] border border-[#0d4f38]">
              <div className="w-8 h-8 rounded-xl bg-[#062c1f] text-[#38bdf8] flex items-center justify-center mb-2.5">
                <Layers className="w-4 h-4" />
              </div>
              <strong className="text-white block text-sm mb-1">4. Platform Admin</strong>
              Governs organizational tenants, machine learning model health, API latency, and compliance policies.
            </div>
          </div>
        </div>

        {/* Action Button */}
        <div className="text-center">
          <button
            onClick={() => navigate('/app')}
            className="py-3.5 px-8 rounded-xl bg-gradient-to-r from-[#ecc866] via-[#e5b842] to-[#d69f2e] hover:from-[#f3da87] hover:to-[#dfab38] text-[#052419] font-bold text-sm shadow-[0_6px_25px_rgba(229,184,66,0.35)] transition-all inline-flex items-center gap-2 cursor-pointer"
          >
            <span>Explore Prototype Foundation</span>
            <span>→</span>
          </button>
        </div>
      </section>

      <PublicFooter />
    </FinancialBackground>
  );
};
