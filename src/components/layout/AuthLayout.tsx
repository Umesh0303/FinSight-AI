import React from 'react';
import { Logo } from '../brand/Logo';
import { FinancialBackground } from '../brand/FinancialBackground';
import { ArrowLeft } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface AuthLayoutProps {
  children: React.ReactNode;
  activePage?: 'login' | 'signup' | 'forgot-password' | 'reset-password' | 'verify-email';
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  activePage = 'login'
}) => {
  const { navigate } = useApp();

  return (
    <FinancialBackground variant="auth" className="min-h-screen flex flex-col justify-between selection:bg-[#deb03e] selection:text-black">
      {/* =========================================================================
          TOP NAVIGATION HEADER (Matching Reference Image Exactly)
          Left: FinSight AI Brand Logo
          Right: "← Return to Home"
          ========================================================================= */}
      <header className="relative z-20 w-full px-4 sm:px-8 py-5 flex items-center justify-between border-b border-[#093d2c]/40 backdrop-blur-xs">
        {/* FinSight AI Official Logo */}
        <div className="flex items-center gap-3">
          <Logo size="md" variant="dark" showText={true} />
        </div>

        {/* Return to Home Navigation */}
        <button
          onClick={() => navigate('/')}
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8eb8a7] hover:text-[#f3da87] transition-colors cursor-pointer group"
          title="Return to FinSight AI Home"
        >
          <span className="text-sm font-bold text-[#10b981] group-hover:-translate-x-0.5 transition-transform">←</span>
          <span>Return to Home</span>
        </button>
      </header>

      {/* =========================================================================
          MAIN AUTHENTICATION CARD VIEWPORT (Centered with Candlestick Wings)
          ========================================================================= */}
      <main className="relative z-10 flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex items-center justify-center">
        <div className="w-full max-w-md">
          {children}
        </div>
      </main>

      {/* =========================================================================
          FOOTER COMPLIANCE & ACCESSIBILITY NOTE
          ========================================================================= */}
      <footer className="relative z-20 w-full px-4 sm:px-8 py-4 border-t border-[#093d2c]/40 text-center text-xs text-[#6e9685] backdrop-blur-xs">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2 text-[11px]">
          <span>&copy; {new Date().getFullYear()} FinSight AI Platform. Institutional Financial Intelligence.</span>
          <div className="flex items-center gap-3 text-[#8eb8a7]">
            <button onClick={() => navigate('/about')} className="hover:text-white transition-colors cursor-pointer">Security & Architecture</button>
            <span>·</span>
            <button onClick={() => navigate('/contact')} className="hover:text-white transition-colors cursor-pointer">Compliance Verification</button>
            <span>·</span>
            <span className="text-[#e5b842] font-semibold">Bank-Grade 256-Bit TLS</span>
          </div>
        </div>
      </footer>
    </FinancialBackground>
  );
};
