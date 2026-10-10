import React, { useState, useEffect } from 'react';
import { MoreHorizontal, Activity } from 'lucide-react';
import { Card3D } from './Card3D';
import { AnimatedNumber } from './AnimatedNumber';

interface KpiCardProps {
  title: string;
  value: string;
  change: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  comparisonPeriod?: string;
  icon: React.ReactNode;
  iconBg?: string;
  sparklineColor?: string;
  sparklineData?: number[];
  theme?: 'light' | 'dark';
  className?: string;
  onClick?: () => void;
  delayMs?: number;
  glowColor?: 'emerald' | 'gold' | 'red';
  showLiveBadge?: boolean;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  title,
  value,
  change,
  changeType = 'positive',
  comparisonPeriod = 'vs last month',
  icon,
  iconBg = 'bg-[#f7f0df]',
  sparklineColor = '#10b981',
  sparklineData = [10, 15, 12, 18, 16, 22, 25, 24, 30],
  theme = 'light',
  className = '',
  onClick,
  delayMs = 0,
  glowColor,
  showLiveBadge = true
}) => {
  const isDark = theme === 'dark';

  // Determine glow based on changeType or explicit prop
  const effectiveGlow = glowColor || (changeType === 'negative' ? 'red' : 'emerald');

  // Sparkline coordinates & animated drawing
  const min = Math.min(...sparklineData);
  const max = Math.max(...sparklineData);
  const range = max - min || 1;
  const width = 110;
  const height = 40;
  const coords = sparklineData.map((val, idx) => {
    const x = (idx / (sparklineData.length - 1)) * width;
    const y = height - ((val - min) / range) * (height - 10) - 5;
    return { x: Number(x.toFixed(1)), y: Number(y.toFixed(1)) };
  });

  const points = coords.map((p) => `${p.x},${p.y}`).join(' ');
  const lastCoord = coords[coords.length - 1];

  // SVG stroke animation state
  const [drawn, setDrawn] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => setDrawn(true), 150 + delayMs);
    return () => clearTimeout(timer);
  }, [delayMs]);

  const cardContent = (
    <div className="p-5 flex flex-col justify-between h-full">
      {/* Top row: Icon, Live Stream Beacon, and Menu */}
      <div className="flex items-center justify-between mb-3.5">
        <div className="flex items-center gap-2.5">
          <div
            className={`w-11 h-11 rounded-2xl ${
              isDark
                ? 'bg-[#031d14] border border-[#0d4f38] text-[#34d399]'
                : `${iconBg} text-[#213f32]`
            } flex items-center justify-center shadow-xs transition-transform duration-300 group-hover:scale-105`}
          >
            {icon}
          </div>
          {isDark && showLiveBadge && (
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-[#032318] border border-[#0d4f38] text-[9px] font-mono font-semibold text-[#8cb8a7]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#10b981] animate-pulse" />
              <span>LIVE</span>
            </div>
          )}
        </div>

        <button
          aria-label="Options"
          className={`${
            isDark ? 'text-[#6b9d8c] hover:text-white' : 'text-slate-400 hover:text-slate-700'
          } p-1 rounded-md transition-colors cursor-pointer`}
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* Middle row: Title & Primary Value with count-up animation */}
      <div className="my-1">
        <p
          className={`text-xs font-semibold uppercase tracking-wider ${
            isDark ? 'text-[#8cb8a7]' : 'text-slate-500'
          }`}
        >
          {title}
        </p>
        <p
          className={`text-2xl sm:text-3xl font-extrabold tracking-tight mt-1 font-heading ${
            isDark ? 'text-white' : 'text-[#0a261c]'
          }`}
        >
          <AnimatedNumber value={value} duration={1100} />
        </p>
      </div>

      {/* Bottom row: Trend indicator & Animated Sparkline */}
      <div
        className={`flex items-center justify-between mt-4 pt-3.5 border-t ${
          isDark ? 'border-[#093d2c]' : 'border-[#f4f0e6]'
        }`}
      >
        <div className="flex items-center gap-1.5 text-xs font-semibold">
          <span
            className={
              changeType === 'positive'
                ? isDark
                  ? 'text-[#34d399]'
                  : 'text-[#059669]'
                : changeType === 'negative'
                ? 'text-[#ef4444]'
                : isDark
                ? 'text-[#8cb8a7]'
                : 'text-slate-500'
            }
          >
            {change.startsWith('↑') || change.startsWith('↓')
              ? ''
              : changeType === 'positive'
              ? '↑ '
              : '↓ '}
            {change}
          </span>
          <span
            className={`font-normal text-[11px] ${
              isDark ? 'text-[#6b9d8c]' : 'text-slate-400'
            }`}
          >
            {comparisonPeriod}
          </span>
        </div>

        {/* Live SVG Sparkline with Drawing Effect & Pulse Node */}
        <div className="w-24 h-9 overflow-visible relative flex items-center justify-end">
          <svg
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-full overflow-visible"
          >
            <defs>
              <linearGradient id={`grad-${title.replace(/\s+/g, '')}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={sparklineColor} stopOpacity="0.3" />
                <stop offset="100%" stopColor={sparklineColor} stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Sparkline Polyline */}
            <polyline
              fill="none"
              stroke={sparklineColor}
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={points}
              style={{
                strokeDasharray: 300,
                strokeDashoffset: drawn ? 0 : 300,
                transition: 'stroke-dashoffset 1.2s cubic-bezier(0.16, 1, 0.3, 1)'
              }}
            />

            {/* Pulsing Active Node at the trajectory tip */}
            {lastCoord && (
              <g>
                <circle
                  cx={lastCoord.x}
                  cy={lastCoord.y}
                  r="3.5"
                  fill={sparklineColor}
                  className="animate-pulse"
                />
                <circle
                  cx={lastCoord.x}
                  cy={lastCoord.y}
                  r="1.5"
                  fill="#ffffff"
                />
              </g>
            )}
          </svg>
        </div>
      </div>
    </div>
  );

  // Wrap in Card3D for the responsive 3D mouse-tracking interaction across both light & dark themes
  return (
    <Card3D
      theme={theme}
      delayMs={delayMs}
      glowColor={effectiveGlow}
      onClick={onClick}
      className={className}
    >
      {cardContent}
    </Card3D>
  );
};
