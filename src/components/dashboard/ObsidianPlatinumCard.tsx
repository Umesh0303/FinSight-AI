import React, { useState, useRef, useEffect } from 'react';
import {
  ShieldCheck,
  CreditCard,
  RotateCw,
  Eye,
  EyeOff,
  Copy,
  Check,
  Lock,
  Unlock,
  Sparkles,
  Wifi
} from 'lucide-react';

interface ObsidianPlatinumCardProps {
  cardholderName?: string;
  cardNumber?: string;
  expiryDate?: string;
  cvv?: string;
  creditScore?: number;
  className?: string;
}

export const ObsidianPlatinumCard: React.FC<ObsidianPlatinumCardProps> = ({
  cardholderName = 'ARJUN VERMA',
  cardNumber = '4532 8920 1845 9081',
  expiryDate = '09/29',
  cvv = '842',
  creditScore = 795,
  className = ''
}) => {
  const [isFlipped, setIsFlipped] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [copied, setCopied] = useState(false);

  // 3D physics tilt state
  const cardContainerRef = useRef<HTMLDivElement>(null);
  const [rotX, setRotX] = useState(0);
  const [rotY, setRotY] = useState(0);
  const [glarePos, setGlarePos] = useState({ x: 50, y: 50 });
  const [isHovered, setIsHovered] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsTouchDevice(window.matchMedia('(pointer: coarse)').matches);
      setPrefersReducedMotion(
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      );
    }
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isTouchDevice || prefersReducedMotion || !cardContainerRef.current) return;

    const rect = cardContainerRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;

    // Physical card tilt clamped to ±6 degrees
    const targetRotX = Math.max(-6, Math.min(6, y * 12));
    const targetRotY = Math.max(-6, Math.min(6, -x * 12));

    setRotX(targetRotX);
    setRotY(targetRotY);
    setGlarePos({
      x: Math.round((x + 0.5) * 100),
      y: Math.round((y + 0.5) * 100)
    });
  };

  const handleMouseEnter = () => {
    if (!isTouchDevice && !prefersReducedMotion) {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotX(0);
    setRotY(0);
  };

  const handleCopyCard = (e: React.MouseEvent) => {
    e.stopPropagation();
    const cleanNumber = cardNumber.replace(/\s+/g, '');
    navigator.clipboard?.writeText?.(cleanNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  };

  const toggleFlip = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setIsFlipped(prev => !prev);
  };

  const formattedCardNumber = showDetails
    ? cardNumber
    : `•••• •••• •••• ${cardNumber.slice(-4)}`;

  // 3D rotation transform combining flip and mouse tilt
  const currentFlipY = isFlipped ? 180 : 0;
  const computedRotX = prefersReducedMotion ? 0 : rotX;
  const computedRotY = prefersReducedMotion ? currentFlipY : currentFlipY + (isFlipped ? -rotY : rotY);

  const cardTransform = `perspective(1200px) rotateX(${computedRotX}deg) rotateY(${computedRotY}deg) ${
    isHovered && !prefersReducedMotion ? 'translateZ(14px) scale(1.015)' : 'translateZ(0px) scale(1)'
  }`;

  return (
    <div className={`flex flex-col justify-between h-full ${className}`}>
      {/* 3D Card Stage */}
      <div
        ref={cardContainerRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        onClick={toggleFlip}
        role="button"
        tabIndex={0}
        aria-label={`FinSight Obsidian Platinum card for ${cardholderName}. Click or press Enter to flip.`}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleFlip();
          }
        }}
        className="w-full relative cursor-pointer select-none group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#deb03e] rounded-3xl"
        style={{ perspective: '1200px' }}
      >
        {/* Subtle physical floating shadow beneath card */}
        <div
          className="absolute -inset-1 rounded-3xl blur-xl opacity-60 transition-opacity duration-500 pointer-events-none"
          style={{
            background: isLocked
              ? 'radial-gradient(circle, rgba(239,68,68,0.2) 0%, transparent 70%)'
              : 'radial-gradient(circle, rgba(222,176,62,0.18) 0%, rgba(16,185,129,0.25) 40%, transparent 70%)',
            transform: isHovered ? 'translateY(12px) scale(0.96)' : 'translateY(4px) scale(0.92)'
          }}
        />

        {/* 3D Flippable Card Object */}
        <div
          className="w-full aspect-[1.586/1] rounded-2xl relative transition-transform duration-700 ease-[cubic-bezier(0.34,1.56,0.64,1)]"
          style={{
            transformStyle: 'preserve-3d',
            transform: cardTransform,
            willChange: 'transform'
          }}
        >
          {/* ============================================================== */}
          {/* CARD FRONT FACE                                                */}
          {/* ============================================================== */}
          <div
            className="absolute inset-0 rounded-2xl p-5 sm:p-6 text-white border border-[#235847]/80 shadow-[0_20px_45px_-12px_rgba(2,18,12,0.85)] flex flex-col justify-between overflow-hidden"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              background: 'linear-gradient(135deg, #051610 0%, #08281e 35%, #0e3d2f 70%, #03140e 100%)',
              boxShadow: 'inset 0 1px 1px rgba(254,240,138,0.22), inset 0 -1px 2px rgba(0,0,0,0.8), 0 22px 40px -10px rgba(0,0,0,0.7)'
            }}
          >
            {/* Fine Metallic Guilloché Micro-Pattern Background */}
            <svg
              className="absolute inset-0 w-full h-full opacity-10 pointer-events-none"
              xmlns="http://www.w3.org/2000/svg"
              width="100%"
              height="100%"
            >
              <defs>
                <pattern id="cardGrid" width="24" height="24" patternUnits="userSpaceOnUse">
                  <path d="M 24 0 L 0 0 0 24" fill="none" stroke="#f6cf71" strokeWidth="0.5" />
                  <circle cx="12" cy="12" r="1" fill="#10b981" />
                </pattern>
                <radialGradient id="meshGlow" cx="70%" cy="30%" r="60%">
                  <stop offset="0%" stopColor="#deb03e" stopOpacity="0.4" />
                  <stop offset="100%" stopColor="#051610" stopOpacity="0" />
                </radialGradient>
              </defs>
              <rect width="100%" height="100%" fill="url(#cardGrid)" />
              <rect width="100%" height="100%" fill="url(#meshGlow)" />
            </svg>

            {/* Radiant Ambient Corner Glows */}
            <div className="absolute -top-16 -right-16 w-44 h-44 bg-[#e5b842]/15 rounded-full blur-2xl pointer-events-none" />
            <div className="absolute -bottom-16 -left-16 w-44 h-44 bg-[#10b981]/15 rounded-full blur-2xl pointer-events-none" />

            {/* Specular Interactive Sheen / Glare Highlight */}
            {isHovered && !prefersReducedMotion && (
              <div
                className="absolute inset-0 pointer-events-none rounded-2xl transition-opacity duration-300 mix-blend-overlay"
                style={{
                  background: `radial-gradient(circle 240px at ${glarePos.x}% ${glarePos.y}%, rgba(254, 240, 138, 0.45) 0%, rgba(52, 211, 153, 0.2) 35%, transparent 70%)`
                }}
              />
            )}

            {/* Top Bar: Brand, Tier & Contactless Wave */}
            <div className="relative z-10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                {/* FinSight 3D Eye Mini Emblem */}
                <div className="w-7 h-5 relative flex items-center justify-center">
                  <svg viewBox="0 0 120 68" fill="none" className="w-full h-full drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]">
                    <path d="M6 34 C30 10, 90 10, 114 34 C90 58, 30 58, 6 34 Z" fill="#06281e" stroke="#10b981" strokeWidth="3" />
                    <circle cx="60" cy="34" r="16" fill="#041a13" stroke="#f59e0b" strokeWidth="2.5" />
                    <circle cx="60" cy="34" r="7" fill="#fbbf24" />
                  </svg>
                </div>
                <div>
                  <div className="text-[11px] sm:text-xs font-bold tracking-[0.18em] uppercase text-transparent bg-clip-text bg-gradient-to-r from-[#fae8b2] via-[#e5b842] to-[#fde68a]">
                    FinSight Obsidian
                  </div>
                  <div className="text-[8px] font-semibold tracking-[0.25em] text-[#93c7b2] uppercase -mt-0.5">
                    Platinum Edition
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[9px] uppercase tracking-widest text-[#f5d487] font-semibold bg-[#e5b842]/10 border border-[#e5b842]/30 px-2 py-0.5 rounded-full backdrop-blur-xs">
                  World Elite
                </span>
                <div className="p-1 text-[#e5b842]/80">
                  <Wifi className="w-4 h-4 rotate-90" />
                </div>
              </div>
            </div>

            {/* Middle Row: EMV Chip + Hologram Accent */}
            <div className="relative z-10 flex items-center justify-between my-auto pt-1">
              {/* Authentic Brushed Gold EMV Chip */}
              <div className="w-11 h-8 sm:w-12 sm:h-9 rounded-md bg-gradient-to-br from-[#fde68a] via-[#d97706] to-[#b45309] p-[1px] shadow-[inset_0_1px_1px_rgba(255,255,255,0.7),0_2px_4px_rgba(0,0,0,0.5)]">
                <div className="w-full h-full rounded-[5px] bg-gradient-to-tr from-[#d97706] via-[#fbbf24] to-[#fef08a] relative overflow-hidden flex items-center justify-center">
                  {/* Microchip internal contact pads etched lines */}
                  <div className="absolute inset-0 border border-[#92400e]/40 rounded-[4px]" />
                  <div className="w-full h-[1px] bg-[#92400e]/50 absolute top-1/2 -translate-y-1/2" />
                  <div className="h-full w-[1px] bg-[#92400e]/50 absolute left-1/2 -translate-x-1/2" />
                  <div className="w-4 h-4 rounded-full border border-[#92400e]/50 absolute" />
                </div>
              </div>

              {/* Holographic Obsidian Shield Emblem */}
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-[#0b3829] via-[#10b981]/30 to-[#fde047]/30 border border-[#34d399]/40 flex items-center justify-center shadow-inner">
                <Sparkles className="w-4 h-4 text-[#fae8b2] animate-pulse" />
              </div>
            </div>

            {/* Bottom Row: Embossed Number, Cardholder & Expiry */}
            <div className="relative z-10 space-y-2">
              {/* Card Number with Embossed Foil Effect */}
              <div className="flex items-center justify-between">
                <p
                  className="font-mono text-base sm:text-lg md:text-xl font-bold tracking-[0.22em] text-[#f7faf8] drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]"
                  style={{ textShadow: '0 1px 1px rgba(0,0,0,0.9), 0 -1px 1px rgba(255,255,255,0.2)' }}
                >
                  {formattedCardNumber}
                </p>
                <button
                  type="button"
                  onClick={handleCopyCard}
                  className="p-1 text-[#e5b842] hover:text-white transition-colors rounded hover:bg-white/10"
                  title="Copy Card Number"
                  aria-label="Copy Card Number"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>

              {/* Cardholder Name & Expiration Details */}
              <div className="flex justify-between items-end text-xs text-[#a9cebf] pt-0.5">
                <div>
                  <p className="text-[9px] uppercase tracking-wider text-[#739e8c] font-semibold">
                    Cardholder
                  </p>
                  <p className="font-semibold text-white tracking-widest text-[11px] sm:text-xs">
                    {cardholderName}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-[9px] uppercase tracking-wider text-[#739e8c] font-semibold">
                    Expires
                  </p>
                  <p className="font-semibold text-white tracking-wider text-[11px] sm:text-xs font-mono">
                    {expiryDate}
                  </p>
                </div>
              </div>
            </div>

            {/* Active Lock Overlay if Card is Frozen */}
            {isLocked && (
              <div className="absolute inset-0 bg-[#020b08]/85 backdrop-blur-xs rounded-2xl flex flex-col items-center justify-center z-20 text-center p-4">
                <div className="w-11 h-11 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 mb-2 shadow-lg">
                  <Lock className="w-5 h-5" />
                </div>
                <div className="text-xs font-bold uppercase tracking-widest text-red-300">
                  Card Temporarily Frozen
                </div>
                <div className="text-[10px] text-slate-400 mt-1">
                  Tap unlock below to restore authorization
                </div>
              </div>
            )}
          </div>

          {/* ============================================================== */}
          {/* CARD BACK FACE                                                 */}
          {/* ============================================================== */}
          <div
            className="absolute inset-0 rounded-2xl py-4 sm:py-5 text-white border border-[#235847]/80 shadow-[0_20px_45px_-12px_rgba(2,18,12,0.85)] flex flex-col justify-between overflow-hidden"
            style={{
              backfaceVisibility: 'hidden',
              WebkitBackfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              background: 'linear-gradient(135deg, #03140e 0%, #07251c 40%, #092e22 75%, #02110c 100%)',
              boxShadow: 'inset 0 1px 1px rgba(254,240,138,0.22), inset 0 -1px 2px rgba(0,0,0,0.8), 0 22px 40px -10px rgba(0,0,0,0.7)'
            }}
          >
            {/* Specular Interactive Sheen on Back */}
            {isHovered && !prefersReducedMotion && (
              <div
                className="absolute inset-0 pointer-events-none rounded-2xl transition-opacity duration-300 mix-blend-overlay"
                style={{
                  background: `radial-gradient(circle 240px at ${100 - glarePos.x}% ${glarePos.y}%, rgba(254, 240, 138, 0.45) 0%, rgba(52, 211, 153, 0.2) 35%, transparent 70%)`
                }}
              />
            )}

            {/* Magnetic Stripe (Edge-to-edge dark metallic band) */}
            <div className="w-full h-10 sm:h-11 bg-gradient-to-r from-[#030907] via-[#0d1612] to-[#030907] relative border-y border-[#183a2d] shadow-inner flex items-center px-4">
              <div className="text-[8px] text-[#2d5c4b] font-mono tracking-widest uppercase opacity-75">
                FinSight Magnetic Core Track 1 · 2 · 3 Encrypted
              </div>
            </div>

            {/* Middle Section: Authorized Signature Strip & CVV Box */}
            <div className="px-5 sm:px-6 space-y-2">
              <div className="flex items-center gap-3">
                {/* Security Signature Strip with Pattern */}
                <div className="flex-1 h-8 sm:h-9 bg-[#f4efe4] rounded-sm px-3 flex items-center justify-between relative shadow-inner overflow-hidden border border-[#d6cbba]">
                  <div className="absolute inset-0 opacity-15 pointer-events-none bg-[repeating-linear-gradient(45deg,#0a3324,#0a3324_4px,#f4efe4_4px,#f4efe4_8px)]" />
                  <span className="font-serif italic font-bold text-slate-800 text-xs sm:text-sm tracking-wide z-10 select-none">
                    {cardholderName.toLowerCase()}
                  </span>
                  <span className="text-[8px] uppercase tracking-wider text-slate-500 font-sans font-bold z-10">
                    Authorized Signer
                  </span>
                </div>

                {/* CVV Security Code Box */}
                <div className="w-14 sm:w-16 h-8 sm:h-9 bg-[#0e3b2e] border border-[#2b7159] rounded-sm flex flex-col items-center justify-center shadow-inner">
                  <span className="text-[7px] uppercase tracking-widest text-[#93c7b2] font-semibold">
                    CVC / CVV
                  </span>
                  <span className="font-mono text-xs sm:text-sm font-bold tracking-widest text-[#f5d487]">
                    {showDetails ? cvv : '•••'}
                  </span>
                </div>
              </div>

              {/* Bank Disclaimers & Licensing Microtext */}
              <div className="text-[8px] leading-tight text-[#82aa9a] space-y-0.5 pt-1">
                <p>
                  Issued by FinSight AI Global Banking Network pursuant to license from International Financial Reserve.
                </p>
                <div className="flex justify-between items-center text-[7.5px] text-[#699382] pt-0.5">
                  <span>24/7 Concierge: +1 (800) FINSIGHT</span>
                  <span>global.finsight.ai</span>
                </div>
              </div>
            </div>

            {/* Bottom Row: Security Badges & Microchip Indicator */}
            <div className="px-5 sm:px-6 flex items-center justify-between pt-1 border-t border-[#1a4a39]">
              <div className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[9px] text-emerald-300 font-medium">
                  Autonomous Fraud Defense Active
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="text-[8px] font-mono text-[#f1cd6b] uppercase tracking-wider">
                  Tier: Private Wealth
                </div>
              </div>
            </div>

            {/* Active Lock Overlay on Back if Frozen */}
            {isLocked && (
              <div className="absolute inset-0 bg-[#020b08]/85 backdrop-blur-xs rounded-2xl flex flex-col items-center justify-center z-20 text-center p-4">
                <div className="w-11 h-11 rounded-full bg-red-500/20 border border-red-500/40 flex items-center justify-center text-red-400 mb-2">
                  <Lock className="w-5 h-5" />
                </div>
                <div className="text-xs font-bold uppercase tracking-widest text-red-300">
                  Card Temporarily Frozen
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Interactive Controls & Action Toolbar */}
      <div className="mt-4 pt-4 border-t border-[#ece6d9] space-y-3">
        {/* Quick Card Action Buttons */}
        <div className="grid grid-cols-4 gap-2 text-xs">
          <button
            type="button"
            onClick={toggleFlip}
            className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl bg-white border border-[#e4ded0] hover:border-[#deb03e] hover:bg-[#fbf9f4] text-slate-700 hover:text-[#0b3829] transition-all shadow-2xs group"
          >
            <RotateCw className="w-4 h-4 text-[#deb03e] group-hover:rotate-180 transition-transform duration-500" />
            <span className="text-[10px] font-semibold">
              {isFlipped ? 'Show Front' : 'Flip Card'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setShowDetails(!showDetails)}
            className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl bg-white border border-[#e4ded0] hover:border-[#deb03e] hover:bg-[#fbf9f4] text-slate-700 hover:text-[#0b3829] transition-all shadow-2xs"
          >
            {showDetails ? (
              <EyeOff className="w-4 h-4 text-[#0d5941]" />
            ) : (
              <Eye className="w-4 h-4 text-[#0d5941]" />
            )}
            <span className="text-[10px] font-semibold">
              {showDetails ? 'Hide Info' : 'Show CVV'}
            </span>
          </button>

          <button
            type="button"
            onClick={handleCopyCard}
            className="flex flex-col items-center justify-center gap-1 p-2 rounded-xl bg-white border border-[#e4ded0] hover:border-[#deb03e] hover:bg-[#fbf9f4] text-slate-700 hover:text-[#0b3829] transition-all shadow-2xs"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <Copy className="w-4 h-4 text-slate-500" />
            )}
            <span className="text-[10px] font-semibold">
              {copied ? 'Copied!' : 'Copy Num'}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setIsLocked(!isLocked)}
            className={`flex flex-col items-center justify-center gap-1 p-2 rounded-xl border transition-all shadow-2xs ${
              isLocked
                ? 'bg-red-50 border-red-200 text-red-700 hover:bg-red-100'
                : 'bg-white border-[#e4ded0] hover:border-red-300 hover:bg-[#fbf9f4] text-slate-700 hover:text-red-700'
            }`}
          >
            {isLocked ? (
              <Lock className="w-4 h-4 text-red-600" />
            ) : (
              <Unlock className="w-4 h-4 text-slate-500" />
            )}
            <span className="text-[10px] font-semibold">
              {isLocked ? 'Frozen' : 'Lock Card'}
            </span>
          </button>
        </div>

        {/* Security & Credit Score Status Row */}
        <div className="flex items-center justify-between pt-2 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
            </span>
            <span className="text-[11px] font-medium text-emerald-800">
              Real-time Fraud Shield Active
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-slate-500">Credit Score:</span>
            <span className="text-xs font-bold text-[#b45309] bg-[#fef9ec] px-2 py-0.5 rounded-md border border-[#fde68a]">
              {creditScore} (Excellent)
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
