import React from 'react';
import { useApp } from '../../context/AppContext';

interface LogoProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'light' | 'dark'; // dark is for dark green/black background, light is for cream/white
  showText?: boolean;
  showTagline?: boolean;
  className?: string;
  onClick?: () => void;
  navigateHome?: boolean;
}

export const Logo: React.FC<LogoProps> = ({
  size = 'md',
  variant = 'dark',
  showText = true,
  showTagline = false,
  className = '',
  onClick,
  navigateHome = true
}) => {
  const { navigate } = useApp();

  const handleClick = (e: React.MouseEvent) => {
    if (onClick) {
      onClick();
    } else if (navigateHome) {
      e.stopPropagation();
      navigate('/');
    }
  };

  // Responsive emblem dimensions preserving the official 120:68 eye ratio
  const iconSizes = {
    sm: { w: 38, h: 22, text: 'text-lg sm:text-xl', gap: 'gap-2.5', taglineText: 'text-[7px]' },
    md: { w: 52, h: 30, text: 'text-xl sm:text-2xl', gap: 'gap-3', taglineText: 'text-[8px]' },
    lg: { w: 74, h: 42, text: 'text-2xl sm:text-[28px]', gap: 'gap-3.5', taglineText: 'text-[9px]' },
    xl: { w: 104, h: 59, text: 'text-3xl sm:text-[38px]', gap: 'gap-4', taglineText: 'text-[11px]' }
  };

  const { w, h, text, gap, taglineText } = iconSizes[size];

  // Colors based on variant
  const textColor = variant === 'dark' ? 'text-white' : 'text-[#06291e]';

  return (
    <div
      onClick={handleClick}
      role="link"
      tabIndex={0}
      title="FinSight AI — Return to Home"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          handleClick(e as unknown as React.MouseEvent);
        }
      }}
      aria-label="FinSight AI"
      className={`inline-flex items-center ${gap} select-none cursor-pointer group transition-transform duration-200 hover:scale-[1.02] active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#e5b842] rounded-xl ${className}`}
    >
      {/* Official FinSight AI Emblem: 3D Eye with Metallic Emerald & Gold Eyelids, Golden Iris Bezel, 4 Emerald Growth Bars, and Rising Trendline with 4 Golden Nodes */}
      <svg
        width={w}
        height={h}
        viewBox="0 0 120 68"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        role="img"
        aria-label="FinSight AI"
        className="flex-shrink-0 drop-shadow-[0_4px_14px_rgba(4,22,16,0.38)]"
      >
        <title>FinSight AI</title>
        <desc>Official FinSight AI Logo — Eye emblem with financial analytics growth chart</desc>
        <defs>
          {/* Emerald metallic eyelid gradient */}
          <linearGradient id="fsEmeraldDark" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#08382a" />
            <stop offset="40%" stopColor="#0a4c37" />
            <stop offset="80%" stopColor="#062e21" />
            <stop offset="100%" stopColor="#021811" />
          </linearGradient>

          {/* Emerald bevel rim */}
          <linearGradient id="fsEmeraldBevel" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="50%" stopColor="#10b981" />
            <stop offset="100%" stopColor="#047857" />
          </linearGradient>

          {/* Upper-right radiant 3D gold arch */}
          <linearGradient id="fsGoldArch" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#b45309" />
            <stop offset="25%" stopColor="#d97706" />
            <stop offset="60%" stopColor="#f59e0b" />
            <stop offset="85%" stopColor="#fde047" />
            <stop offset="100%" stopColor="#fffbeb" />
          </linearGradient>

          {/* Outer gold ring bezel around iris */}
          <linearGradient id="fsGoldRingBezel" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="35%" stopColor="#f59e0b" />
            <stop offset="70%" stopColor="#b45309" />
            <stop offset="100%" stopColor="#fde68a" />
          </linearGradient>

          {/* Pupil dark circular background */}
          <radialGradient id="fsPupilBg" cx="50%" cy="40%" r="65%">
            <stop offset="0%" stopColor="#0d523d" />
            <stop offset="60%" stopColor="#06281e" />
            <stop offset="100%" stopColor="#02140e" />
          </radialGradient>

          {/* Financial bars emerald gradient */}
          <linearGradient id="fsBarEmerald" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#34d399" />
            <stop offset="100%" stopColor="#059669" />
          </linearGradient>

          {/* Golden trendline gradient */}
          <linearGradient id="fsGoldTrend" x1="0%" y1="100%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#f59e0b" />
            <stop offset="50%" stopColor="#fde047" />
            <stop offset="100%" stopColor="#fffbeb" />
          </linearGradient>

          {/* 3D Golden data node sphere */}
          <radialGradient id="fsGoldNode" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#fffbeb" />
            <stop offset="40%" stopColor="#fbbf24" />
            <stop offset="80%" stopColor="#d97706" />
            <stop offset="100%" stopColor="#78350f" />
          </radialGradient>

          {/* Soft drop shadow for 3D elevation */}
          <filter id="fsDepthShadow" x="-20%" y="-20%" width="140%" height="140%">
            <feDropShadow dx="0" dy="2.5" stdDeviation="2.5" floodColor="#010d0a" floodOpacity="0.5" />
          </filter>
        </defs>

        {/* 1. Outer Eye Lower Eyelid (Emerald Curve) */}
        <path
          d="M 6,34 C 22,54 42,61 60,61 C 78,61 98,54 114,34 C 98,47 78,52 60,52 C 42,52 22,47 6,34 Z"
          fill="url(#fsEmeraldDark)"
          stroke="url(#fsEmeraldBevel)"
          strokeWidth="0.8"
          filter="url(#fsDepthShadow)"
        />

        {/* 2. Outer Eye Upper Eyelid: Left Segment (Metallic Emerald) */}
        <path
          d="M 6,34 C 20,15 38,7 60,7 C 60,16 44,18 24,25 C 14,29 6,34 6,34 Z"
          fill="url(#fsEmeraldDark)"
          stroke="url(#fsEmeraldBevel)"
          strokeWidth="0.8"
          filter="url(#fsDepthShadow)"
        />

        {/* 3. Outer Eye Upper Eyelid: Right Segment (3D Polished Gold Arch) */}
        <path
          d="M 60,7 C 78,7 98,15 114,34 C 114,34 104,28 92,23 C 78,17 60,16 60,7 Z"
          fill="url(#fsGoldArch)"
          filter="url(#fsDepthShadow)"
        />
        {/* Specular highlight rim on gold arch */}
        <path
          d="M 60,7 C 76,7 96,15 114,34"
          stroke="#fffbeb"
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.85"
        />

        {/* 4. Center Iris / Pupil Golden Bezel */}
        {/* Outer Heavy Gold Ring */}
        <circle
          cx="60"
          cy="34"
          r="18.5"
          fill="none"
          stroke="url(#fsGoldRingBezel)"
          strokeWidth="2.8"
          filter="url(#fsDepthShadow)"
        />
        {/* Inner Thin Gold Rim */}
        <circle
          cx="60"
          cy="34"
          r="15.8"
          fill="none"
          stroke="#fef08a"
          strokeWidth="0.75"
          opacity="0.9"
        />

        {/* 5. Center Pupil Disc */}
        <circle cx="60" cy="34" r="15.2" fill="url(#fsPupilBg)" />

        {/* 6. Four Financial Analytics Vertical Bars (Rising Heights) */}
        {/* Bar 1 (Leftmost, Shortest) */}
        <rect x="50" y="37" width="3.2" height="7.5" rx="1.2" fill="url(#fsBarEmerald)" />
        <rect x="50" y="37" width="3.2" height="1" rx="0.5" fill="#a7f3d0" opacity="0.8" />

        {/* Bar 2 (Medium-Low) */}
        <rect x="54.6" y="32.5" width="3.2" height="12" rx="1.2" fill="url(#fsBarEmerald)" />
        <rect x="54.6" y="32.5" width="3.2" height="1" rx="0.5" fill="#a7f3d0" opacity="0.8" />

        {/* Bar 3 (Medium-Tall) */}
        <rect x="59.2" y="27.5" width="3.2" height="17" rx="1.2" fill="url(#fsBarEmerald)" />
        <rect x="59.2" y="27.5" width="3.2" height="1" rx="0.5" fill="#a7f3d0" opacity="0.8" />

        {/* Bar 4 (Rightmost, Tallest) */}
        <rect x="63.8" y="22.5" width="3.2" height="22" rx="1.2" fill="url(#fsBarEmerald)" />
        <rect x="63.8" y="22.5" width="3.2" height="1" rx="0.5" fill="#a7f3d0" opacity="0.8" />

        {/* 7. Golden Trendline connecting 4 spherical data points */}
        <polyline
          points="46.5,40.5 51.6,34.5 56.2,35.5 65.6,20"
          fill="none"
          stroke="url(#fsGoldTrend)"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <polyline
          points="46.5,40.5 51.6,34.5 56.2,35.5 65.6,20"
          fill="none"
          stroke="#ffffff"
          strokeWidth="0.6"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.75"
        />

        {/* 8. Four 3D Golden Data Spheres (Nodes) */}
        {/* Node 1 */}
        <circle cx="46.5" cy="40.5" r="2.2" fill="url(#fsGoldNode)" filter="url(#fsDepthShadow)" />
        <circle cx="45.8" cy="39.8" r="0.6" fill="#ffffff" opacity="0.9" />

        {/* Node 2 */}
        <circle cx="51.6" cy="34.5" r="2.2" fill="url(#fsGoldNode)" filter="url(#fsDepthShadow)" />
        <circle cx="50.9" cy="33.8" r="0.6" fill="#ffffff" opacity="0.9" />

        {/* Node 3 */}
        <circle cx="56.2" cy="35.5" r="2.2" fill="url(#fsGoldNode)" filter="url(#fsDepthShadow)" />
        <circle cx="55.5" cy="34.8" r="0.6" fill="#ffffff" opacity="0.9" />

        {/* Node 4 (Peak, Top Right) */}
        <circle cx="65.6" cy="20" r="2.5" fill="url(#fsGoldNode)" filter="url(#fsDepthShadow)" />
        <circle cx="64.8" cy="19.2" r="0.7" fill="#ffffff" opacity="0.95" />

        {/* 9. Specular Glint on Left Eye Corner */}
        <circle cx="10" cy="34" r="1.5" fill="#6ee7b7" opacity="0.75" />
        <circle cx="10" cy="34" r="0.6" fill="#ffffff" />
      </svg>

      {/* Official Typography: "FinSight" + "AI" */}
      {showText ? (
        <div className="flex flex-col leading-none">
          <div className={`font-bold tracking-tight font-heading flex items-center ${text} ${textColor}`}>
            <span>FinSight</span>
            <span
              className="ml-1.5 font-extrabold bg-gradient-to-br from-[#fff3b0] via-[#e5b842] to-[#b45309] bg-clip-text text-transparent drop-shadow-[0_2px_8px_rgba(229,184,66,0.35)]"
            >
              AI
            </span>
          </div>

          {/* Optional Official Strapline: "INTELLIGENT FINANCIAL ANALYTICS" */}
          {showTagline && (
            <span className={`tracking-[0.22em] font-semibold uppercase mt-0.5 text-[#e5b842] ${taglineText}`}>
              Intelligent Financial Analytics
            </span>
          )}
        </div>
      ) : (
        <span className="sr-only">FinSight AI</span>
      )}
    </div>
  );
};
