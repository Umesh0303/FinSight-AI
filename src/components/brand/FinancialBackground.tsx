import React from 'react';

interface FinancialBackgroundProps {
  variant?: 'hero' | 'auth' | 'features' | 'analytics' | 'insights' | 'cta';
  className?: string;
  children?: React.ReactNode;
  sticky?: boolean;
}

export const FinancialBackground: React.FC<FinancialBackgroundProps> = ({
  variant = 'auth',
  className = '',
  children,
  sticky = true
}) => {
  const isHero = variant === 'hero';
  const useSticky = sticky && isHero;

  return (
    <div className={`relative bg-[#021811] text-white selection:bg-[#deb03e] selection:text-black ${className}`}>
      {/* =========================================================================
          STICKY / ANCHORED HERO VISUAL ENVIRONMENT
          Stays anchored to the viewport (top: 0, height: 100vh) while all content
          sections scroll effortlessly above it.
          ========================================================================= */}
      <div
        className={`${
          useSticky
            ? 'sticky top-0 h-screen w-full -mb-[100vh]'
            : 'absolute inset-0'
        } pointer-events-none overflow-hidden select-none z-0`}
        aria-hidden="true"
      >
        {/* Base Rich Emerald Radial Backdrop */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#021811] via-[#04261b] to-[#02140e]" />

        {/* Ambient Glow Orbs (Emerald & Gold) */}
        <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[600px] bg-[#0d5941]/25 rounded-full blur-[140px]" />
        <div className="absolute top-1/3 right-10 w-[550px] h-[550px] bg-[#e5b842]/14 rounded-full blur-[130px]" />
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 w-[800px] h-[450px] bg-[#053828]/40 rounded-full blur-[130px]" />

        {/* Fine Financial Coordinate Grid (40px x 40px) */}
        <div
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `
              linear-gradient(to right, #34d399 1px, transparent 1px),
              linear-gradient(to bottom, #34d399 1px, transparent 1px)
            `,
            backgroundSize: '40px 40px'
          }}
        />

        {/* Vertical Glowing Financial Data Lines (Simulated Live Streaming Matrix) */}
        <div className="absolute inset-0 overflow-hidden opacity-30">
          {[12, 28, 45, 62, 78, 92].map((pos, i) => (
            <div
              key={i}
              className="absolute top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-[#10b981]/50 to-transparent"
              style={{ left: `${pos}%` }}
            >
              {/* Traveling light node on data line */}
              <div
                className="w-1.5 h-6 -ml-[2px] rounded-full bg-gradient-to-b from-[#fef08a] via-[#10b981] to-transparent shadow-[0_0_8px_#10b981] animate-pulse"
                style={{
                  animationDuration: `${3 + (i % 3)}s`,
                  animationDelay: `${i * 0.7}s`,
                  marginTop: `${(i * 120) % 500}px`
                }}
              />
            </div>
          ))}
        </div>

        {/* SVG Atmospheric Graphics Layer: 3D Candlesticks & Trajectory Arcs */}
        <svg
          className="absolute inset-0 w-full h-full"
          xmlns="http://www.w3.org/2000/svg"
          preserveAspectRatio="none"
          viewBox="0 0 1440 900"
        >
          <defs>
            {/* Emerald Candlestick Gradient */}
            <linearGradient id="refCandleGreen" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.85" />
              <stop offset="40%" stopColor="#10b981" stopOpacity="0.75" />
              <stop offset="100%" stopColor="#047857" stopOpacity="0.45" />
            </linearGradient>

            {/* Golden Candlestick Gradient */}
            <linearGradient id="refCandleGold" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#fef08a" stopOpacity="0.9" />
              <stop offset="40%" stopColor="#f59e0b" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#b45309" stopOpacity="0.5" />
            </linearGradient>

            {/* Glowing Candlestick Filter */}
            <filter id="candleGlowGreen" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            <filter id="candleGlowGold" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="6" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Sweeping Dashed Financial Trajectory Arcs */}
          <path
            d="M -40,580 Q 280,480 620,530 T 1480,310"
            fill="none"
            stroke="#10b981"
            strokeWidth="1.8"
            strokeDasharray="8 8"
            opacity="0.32"
          />
          <path
            d="M -40,650 Q 340,560 760,590 T 1480,420"
            fill="none"
            stroke="#e5b842"
            strokeWidth="1.4"
            strokeDasharray="6 8"
            opacity="0.24"
          />

          {/* Left Cluster: Glowing 3D Emerald Candlesticks */}
          <g filter="url(#candleGlowGreen)" opacity="0.7">
            <line x1="80" y1="200" x2="80" y2="400" stroke="#34d399" strokeWidth="2" opacity="0.7" />
            <rect x="70" y="240" width="20" height="110" rx="3" fill="url(#refCandleGreen)" />

            <line x1="125" y1="140" x2="125" y2="460" stroke="#34d399" strokeWidth="2.5" opacity="0.85" />
            <rect x="113" y="190" width="24" height="210" rx="3" fill="url(#refCandleGreen)" />

            <line x1="175" y1="180" x2="175" y2="410" stroke="#34d399" strokeWidth="2" opacity="0.8" />
            <rect x="164" y="220" width="22" height="140" rx="3" fill="url(#refCandleGreen)" />

            <line x1="225" y1="160" x2="225" y2="350" stroke="#34d399" strokeWidth="2" opacity="0.7" />
            <rect x="215" y="195" width="20" height="115" rx="3" fill="url(#refCandleGreen)" />
          </g>

          {/* Right Cluster: Glowing 3D Golden Candlesticks */}
          <g filter="url(#candleGlowGold)" opacity="0.7">
            <line x1="1240" y1="200" x2="1240" y2="430" stroke="#f59e0b" strokeWidth="2" opacity="0.75" />
            <rect x="1230" y="240" width="20" height="140" rx="3" fill="url(#refCandleGold)" />

            <line x1="1295" y1="130" x2="1295" y2="450" stroke="#f59e0b" strokeWidth="2.5" opacity="0.85" />
            <rect x="1283" y="180" width="24" height="210" rx="3" fill="url(#refCandleGold)" />

            <line x1="1350" y1="160" x2="1350" y2="380" stroke="#f59e0b" strokeWidth="2" opacity="0.8" />
            <rect x="1340" y="200" width="20" height="130" rx="3" fill="url(#refCandleGold)" />

            <line x1="1395" y1="140" x2="1395" y2="330" stroke="#f59e0b" strokeWidth="2" opacity="0.7" />
            <rect x="1386" y="170" width="18" height="110" rx="3" fill="url(#refCandleGold)" />
          </g>
        </svg>

        {/* Currency & Financial Watermarks (Rupee ₹, %, €, $) */}
        <div className="absolute top-[48%] left-14 sm:left-24 text-[#10b981] opacity-[0.09] font-heading font-extrabold text-7xl sm:text-8xl select-none pointer-events-none hidden md:block">
          ₹
        </div>
        <div className="absolute top-[28%] left-48 sm:left-64 text-[#34d399] opacity-[0.08] font-heading font-extrabold text-6xl sm:text-7xl select-none pointer-events-none hidden lg:block">
          %
        </div>
        <div className="absolute top-[25%] right-56 sm:right-72 text-[#e5b842] opacity-[0.08] font-heading font-extrabold text-6xl sm:text-7xl select-none pointer-events-none hidden lg:block">
          €
        </div>
        <div className="absolute top-[48%] right-16 sm:right-28 text-[#e5b842] opacity-[0.09] font-heading font-extrabold text-7xl sm:text-8xl select-none pointer-events-none hidden md:block">
          $
        </div>

        {/* Soft Vignette Overlay for Focus on Content */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#02140e]/80 via-transparent to-[#021811]/40" />
      </div>

      {/* =========================================================================
          3. SCROLLABLE CONTENT LAYER
          Floats seamlessly above the persistent hero visual environment
          ========================================================================= */}
      <div className="relative z-10 w-full flex-1 flex flex-col">
        {children}
      </div>
    </div>
  );
};
