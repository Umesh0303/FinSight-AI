import React from 'react';
import { Logo } from '../brand/Logo';
import { useApp } from '../../context/AppContext';
import { Shield, Sparkles, ArrowRight } from 'lucide-react';

export const PublicFooter: React.FC = () => {
  const { navigate } = useApp();

  return (
    <footer className="bg-[#03130d] border-t border-[#0f3d2f] text-[#8ea79c] pt-16 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-10 mb-12">
          {/* Col 1: Brand & Mission */}
          <div className="md:col-span-1 space-y-4">
            <div className="cursor-pointer" onClick={() => navigate('/')}>
              <Logo size="md" variant="dark" showText={true} />
            </div>
            <p className="text-xs text-[#7d998c] leading-relaxed">
              AI-Powered Financial Customer Insights & Recommendation Platform. Turning complex financial data into intelligent, auditable decisions.
            </p>
            <div className="flex items-center gap-2 text-xs text-[#deb03e]">
              <Shield className="w-4 h-4 text-[#deb03e]" />
              <span className="font-medium">Enterprise Security & Role Isolation</span>
            </div>
          </div>

          {/* Col 2: Solutions */}
          <div className="space-y-3 text-xs">
            <h4 className="font-heading font-semibold text-sm text-white tracking-wide">
              Intelligence Pillars
            </h4>
            <ul className="space-y-2">
              <li>
                <button onClick={() => navigate('/app/analyst')} className="hover:text-white transition-colors">
                  Financial Analytics
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/app/customers')} className="hover:text-white transition-colors">
                  Customer Intelligence
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/app/risk')} className="hover:text-white transition-colors">
                  Risk & Fraud Detection
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/app/recommendations')} className="hover:text-white transition-colors">
                  AI Recommendations
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/app/assistant')} className="hover:text-white transition-colors">
                  Fin AI Assistant
                </button>
              </li>
            </ul>
          </div>

          {/* Col 3: Role Portals */}
          <div className="space-y-3 text-xs">
            <h4 className="font-heading font-semibold text-sm text-white tracking-wide">
              Core User Roles
            </h4>
            <ul className="space-y-2">
              <li>
                <button onClick={() => navigate('/app/analyst')} className="hover:text-white transition-colors">
                  Business Analyst Portal
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/app/admin')} className="hover:text-white transition-colors">
                  Platform Admin Portal
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/app/customer')} className="hover:text-white transition-colors">
                  Personal Customer Portal
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/app/risk')} className="hover:text-white transition-colors">
                  Risk & Fraud Analyst Portal
                </button>
              </li>
            </ul>
          </div>

          {/* Col 4: Platform */}
          <div className="space-y-3 text-xs">
            <h4 className="font-heading font-semibold text-sm text-white tracking-wide">
              Platform & Governance
            </h4>
            <ul className="space-y-2">
              <li>
                <button onClick={() => navigate('/about')} className="hover:text-white transition-colors">
                  About FinSight AI
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/contact')} className="hover:text-white transition-colors">
                  Institutional Contact
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/app/documents')} className="hover:text-white transition-colors">
                  Compliance Knowledge Base
                </button>
              </li>
              <li>
                <button onClick={() => navigate('/login')} className="hover:text-white transition-colors">
                  Sign In to Workspace
                </button>
              </li>
            </ul>
          </div>
        </div>

        <div className="pt-8 border-t border-[#0b3326] flex flex-col sm:flex-row items-center justify-between text-xs text-[#5d7a6e] gap-4">
          <p>© 2026 FinSight AI. Built for Phase 0 Foundation. Synthetic Demo Data Only.</p>
          <div className="flex items-center gap-6">
            <span>Non-production prototype</span>
            <span>·</span>
            <span>No real financial accounts accessed</span>
          </div>
        </div>
      </div>
    </footer>
  );
};
