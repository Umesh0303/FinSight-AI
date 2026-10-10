import React from 'react';

export const DashboardBackground: React.FC = () => {
  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden select-none z-0"
      aria-hidden="true"
    >
      {/* Warm Ivory Canvas Base */}
      <div className="absolute inset-0 bg-[#faf7f0]" />

      {/* Soft, Low-Opacity Emerald & Gold Radial Gradients */}
      <div
        className="absolute top-0 left-1/4 w-[650px] h-[450px] rounded-full blur-[120px] pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(16, 185, 129, 0.06) 0%, transparent 70%)'
        }}
      />
      <div
        className="absolute top-1/3 right-10 w-[550px] h-[450px] rounded-full blur-[130px] pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(222, 176, 62, 0.05) 0%, transparent 70%)'
        }}
      />
      <div
        className="absolute bottom-10 left-1/3 w-[750px] h-[500px] rounded-full blur-[140px] pointer-events-none"
        style={{
          background: 'radial-gradient(circle, rgba(13, 89, 65, 0.045) 0%, transparent 70%)'
        }}
      />

      {/* Subtle Financial Coordinate Grid (44px x 44px) at 5-6% visual opacity */}
      <div
        className="absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `
            linear-gradient(to right, #0d5941 1px, transparent 1px),
            linear-gradient(to bottom, #0d5941 1px, transparent 1px)
          `,
          backgroundSize: '44px 44px'
        }}
      />

      {/* Faint Emerald Financial Data Lines (Vertical market coordinates at ~5-7% opacity) */}
      <div className="absolute inset-0 overflow-hidden opacity-[0.06]">
        {[14, 38, 62, 86].map((pos, idx) => (
          <div
            key={idx}
            className="absolute top-0 bottom-0 w-[1px] bg-gradient-to-b from-transparent via-[#10b981] to-transparent"
            style={{ left: `${pos}%` }}
          >
            {/* Subtle traveling data node pulse */}
            <div
              className="w-1.5 h-8 -ml-[2px] rounded-full bg-gradient-to-b from-[#deb03e] via-[#10b981] to-transparent"
              style={{
                marginTop: `${(idx * 160 + 80) % 520}px`
              }}
            />
          </div>
        ))}
      </div>

      {/* SVG Decorative Layer: Light Candlestick Patterns & Financial Market Geometry at 5-8% opacity */}
      <svg
        className="absolute inset-0 w-full h-full opacity-[0.065]"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="none"
        viewBox="0 0 1440 960"
      >
        <defs>
          <linearGradient id="ivoryCandleEmerald" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#059669" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#064e3b" stopOpacity="0.6" />
          </linearGradient>
          <linearGradient id="ivoryCandleGold" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d97706" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#92400e" stopOpacity="0.6" />
          </linearGradient>
        </defs>

        {/* Candlestick Cluster 1 (Upper Left-Center) */}
        <g stroke="#059669" strokeWidth="1.2">
          {/* Candle 1 */}
          <line x1="220" y1="70" x2="220" y2="135" />
          <rect x="214" y="85" width="12" height="35" fill="url(#ivoryCandleEmerald)" rx="1" />
          {/* Candle 2 */}
          <line x1="242" y1="80" x2="242" y2="155" />
          <rect x="236" y="95" width="12" height="42" fill="url(#ivoryCandleEmerald)" rx="1" />
          {/* Candle 3 (Gold) */}
          <line x1="264" y1="95" x2="264" y2="165" stroke="#d97706" />
          <rect x="258" y="105" width="12" height="38" fill="url(#ivoryCandleGold)" rx="1" stroke="#d97706" />
          {/* Candle 4 */}
          <line x1="286" y1="75" x2="286" y2="145" />
          <rect x="280" y="88" width="12" height="40" fill="url(#ivoryCandleEmerald)" rx="1" />
          {/* Candle 5 */}
          <line x1="308" y1="60" x2="308" y2="125" />
          <rect x="302" y="70" width="12" height="42" fill="url(#ivoryCandleEmerald)" rx="1" />
        </g>

        {/* Candlestick Cluster 2 (Lower Right) */}
        <g stroke="#059669" strokeWidth="1.2">
          {/* Candle 6 */}
          <line x1="1120" y1="520" x2="1120" y2="590" />
          <rect x="1114" y="535" width="12" height="38" fill="url(#ivoryCandleEmerald)" rx="1" />
          {/* Candle 7 (Gold) */}
          <line x1="1142" y1="530" x2="1142" y2="605" stroke="#d97706" />
          <rect x="1136" y="545" width="12" height="36" fill="url(#ivoryCandleGold)" rx="1" stroke="#d97706" />
          {/* Candle 8 */}
          <line x1="1164" y1="505" x2="1164" y2="575" />
          <rect x="1158" y="518" width="12" height="44" fill="url(#ivoryCandleEmerald)" rx="1" />
          {/* Candle 9 */}
          <line x1="1186" y1="490" x2="1186" y2="560" />
          <rect x="1180" y="502" width="12" height="40" fill="url(#ivoryCandleEmerald)" rx="1" />
          {/* Candle 10 */}
          <line x1="1208" y1="475" x2="1208" y2="540" />
          <rect x="1202" y="485" width="12" height="45" fill="url(#ivoryCandleEmerald)" rx="1" />
        </g>

        {/* Subtle Market Trajectory Wave Curves */}
        <path
          d="M 60 280 C 180 230, 280 320, 420 260 S 640 180, 820 220 S 1100 140, 1380 180"
          fill="none"
          stroke="#0d5941"
          strokeWidth="1.2"
          strokeDasharray="6 6"
        />
        <path
          d="M 120 780 C 260 740, 440 820, 680 750 S 960 670, 1180 720 S 1320 660, 1420 680"
          fill="none"
          stroke="#059669"
          strokeWidth="1"
          strokeDasharray="4 4"
        />

        {/* Subtle Geometric Financial Coordinate Nodes */}
        <circle cx="420" cy="260" r="3" fill="#deb03e" />
        <circle cx="820" cy="220" r="3" fill="#10b981" />
        <circle cx="680" cy="750" r="3" fill="#deb03e" />
        <circle cx="1180" cy="720" r="3" fill="#10b981" />
      </svg>
    </div>
  );
};
