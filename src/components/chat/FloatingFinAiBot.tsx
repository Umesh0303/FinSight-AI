import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, Mic, Radio, Move } from 'lucide-react';
import { useFinAi } from '../../context/FinAiContext';

export const FloatingFinAiBot: React.FC = () => {
  const {
    isChatOpen,
    toggleChat,
    wakeWordStatus,
    wakeWordFeedback,
    isVoiceModalOpen,
    isWakeWordEnabled,
    toggleWakeWord
  } = useFinAi();

  const [isHovered, setIsHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState<{ x: number; y: number } | null>(null);

  const botRef = useRef<HTMLElement>(null);
  const dragRef = useRef<{
    startX: number;
    startY: number;
    initialBotX: number;
    initialBotY: number;
  } | null>(null);

  const hasMovedRef = useRef<boolean>(false);

  const getStatusBadge = () => {
    switch (wakeWordStatus) {
      case 'listening':
        return {
          color: 'bg-emerald-400',
          label: 'Listening for "Hello Fin"',
          pulse: true
        };
      case 'in_conversation':
        return {
          color: 'bg-[#f1cd6b]',
          label: 'In conversation',
          pulse: true
        };
      case 'denied':
        return {
          color: 'bg-amber-400',
          label: 'Mic denied',
          pulse: false
        };
      default:
        return {
          color: 'bg-emerald-400',
          label: 'Fin AI Ready',
          pulse: false
        };
    }
  };

  const status = getStatusBadge();

  // Clamp helper to ensure the bot remains 100% inside the visible viewport
  const clampPosition = useCallback((rawX: number, rawY: number) => {
    const margin = 12;
    const botWidth = botRef.current?.offsetWidth || 64;
    const botHeight = botRef.current?.offsetHeight || 64;

    const minX = margin;
    const maxX = Math.max(margin, window.innerWidth - botWidth - margin);
    const minY = margin;
    const maxY = Math.max(margin, window.innerHeight - botHeight - margin);

    return {
      x: Math.min(Math.max(rawX, minX), maxX),
      y: Math.min(Math.max(rawY, minY), maxY)
    };
  }, []);

  // Window resize handler: clamps position to new viewport bounds
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        if (!prev) return null;
        return clampPosition(prev.x, prev.y);
      });
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [clampPosition]);

  // Pointer event lifecycle: tracks left-click dragging across the window
  useEffect(() => {
    const handlePointerMove = (e: PointerEvent) => {
      if (!dragRef.current) return;

      const dx = e.clientX - dragRef.current.startX;
      const dy = e.clientY - dragRef.current.startY;

      // Movement threshold of 5px to distinguish between a tap/click and an intentional drag
      if (!hasMovedRef.current && Math.hypot(dx, dy) > 5) {
        hasMovedRef.current = true;
        setIsDragging(true);
      }

      if (hasMovedRef.current) {
        const rawX = dragRef.current.initialBotX + dx;
        const rawY = dragRef.current.initialBotY + dy;
        setPosition(clampPosition(rawX, rawY));
      }
    };

    const handlePointerUp = (e: PointerEvent) => {
      if (dragRef.current) {
        // If the user performed an active drag, prevent accidental click action
        if (hasMovedRef.current) {
          setIsDragging(false);
          // Keep hasMovedRef true momentarily so click event doesn't trigger toggleChat
          setTimeout(() => {
            hasMovedRef.current = false;
          }, 60);
        } else {
          hasMovedRef.current = false;
          setIsDragging(false);
        }
        dragRef.current = null;
      }
    };

    const handlePointerCancel = () => {
      dragRef.current = null;
      hasMovedRef.current = false;
      setIsDragging(false);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
    window.addEventListener('pointercancel', handlePointerCancel);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerCancel);
    };
  }, [clampPosition]);

  // PointerDown on the bot initiates left-click drag tracking
  const handlePointerDown = (e: React.PointerEvent) => {
    // Only primary left button (button === 0)
    if (e.button !== 0) return;
    if (!botRef.current) return;

    const rect = botRef.current.getBoundingClientRect();
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialBotX: rect.left,
      initialBotY: rect.top
    };
    hasMovedRef.current = false;
  };

  // Click handler: opens/toggles chat panel only when no drag movement occurred
  const handleClick = (e: React.MouseEvent) => {
    // If movement was detected, do not toggle chat
    if (hasMovedRef.current || isDragging) return;
    toggleChat();
  };

  // Smart placement for tooltip and toasts relative to viewport edges
  const isNearLeft = position ? position.x < 220 : false;
  const isNearTop = position ? position.y < 120 : false;

  return (
    <aside
      ref={botRef}
      aria-label="Fin AI Assistant"
      onPointerDown={handlePointerDown}
      style={
        position
          ? {
              left: `${position.x}px`,
              top: `${position.y}px`,
              bottom: 'auto',
              right: 'auto'
            }
          : undefined
      }
      className={`fixed z-40 select-none print:hidden pointer-events-auto touch-none transition-[box-shadow,transform] duration-75 ${
        !position ? 'bottom-5 right-5 sm:bottom-6 sm:right-6' : ''
      } ${isDragging ? 'cursor-grabbing scale-105' : 'cursor-grab'}`}
    >
      {/* Dragging Feedback Badge */}
      {isDragging && (
        <div
          role="status"
          className="absolute -top-8 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-[#041d14] border border-[#deb03e] text-[#f1cd6b] text-[10px] font-semibold tracking-wide shadow-xl flex items-center gap-1.5 whitespace-nowrap animate-in fade-in pointer-events-none"
        >
          <Move className="w-3 h-3 text-[#deb03e]" />
          <span>Moving Fin AI</span>
        </div>
      )}

      {/* Toast Feedback when "Hello Fin" detected or listening state changes */}
      {wakeWordFeedback && !isDragging && (
        <div
          role="status"
          aria-live="polite"
          className={`absolute mb-2 px-3 py-1.5 rounded-full bg-[#041d14] border border-[#1b624d] text-white text-[11px] font-medium shadow-xl flex items-center gap-2 whitespace-nowrap animate-in fade-in duration-200 pointer-events-none ${
            isNearTop ? 'top-16' : 'bottom-16'
          } ${isNearLeft ? 'left-0' : 'right-0'}`}
        >
          <span className="w-2 h-2 rounded-full bg-[#f1cd6b] animate-ping" />
          <span className="text-[#e2f5ec]">{wakeWordFeedback}</span>
        </div>
      )}

      {/* Quick Wake-Word Toggle Pill (visible on bot for one-tap listening toggle) */}
      {!isDragging && !isChatOpen && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            toggleWakeWord();
          }}
          className={`absolute -top-7 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[10px] font-semibold tracking-tight shadow-md flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap z-30 ${
            isWakeWordEnabled && wakeWordStatus === 'listening'
              ? 'bg-[#04281b] border border-emerald-400 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.35)]'
              : isWakeWordEnabled && wakeWordStatus === 'denied'
              ? 'bg-red-950/90 border border-red-500 text-red-300'
              : 'bg-[#07261c]/95 hover:bg-[#0b3828] border border-[#1b624d] text-[#bce3d2] hover:text-white'
          }`}
          title={
            isWakeWordEnabled
              ? 'Wake word active. Click to turn off.'
              : 'Click to enable "Hello Fin" wake word listening'
          }
          aria-label="Toggle Wake Word Hello Fin"
        >
          <Mic
            className={`w-3 h-3 ${
              isWakeWordEnabled && wakeWordStatus === 'listening'
                ? 'text-emerald-400 animate-pulse'
                : 'text-[#deb03e]'
            }`}
          />
          <span>
            {isWakeWordEnabled && wakeWordStatus === 'listening'
              ? '“Hello Fin” Active'
              : isWakeWordEnabled && wakeWordStatus === 'denied'
              ? 'Mic Blocked'
              : 'Enable “Hello Fin”'}
          </span>
        </button>
      )}

      {/* Floating Bot Button Container */}
      <div className="relative flex items-center group">
        {/* Tooltip on hover (desktop) */}
        {!isDragging && (
          <div
            className={`hidden sm:flex absolute items-center gap-2 px-3 py-1.5 rounded-xl bg-[#07261c] border border-[#1b624d] text-white text-xs font-medium shadow-lg transition-all duration-200 pointer-events-none whitespace-nowrap ${
              isNearLeft ? 'left-full ml-3' : 'right-full mr-3'
            } ${
              isHovered && !isChatOpen
                ? 'opacity-100 translate-x-0'
                : 'opacity-0 translate-x-2'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#deb03e]" />
            <div className="flex flex-col leading-tight">
              <span>
                {wakeWordStatus === 'listening'
                  ? 'Say "Hello Fin" or Click to Chat'
                  : 'Ask Fin AI'}
              </span>
              <span className="text-[9px] text-[#86bfa8] font-normal">
                Click & drag to move
              </span>
            </div>
            <span className="text-[10px] text-[#86bfa8] bg-black/30 px-1.5 py-0.5 rounded font-mono">
              {status.label}
            </span>
          </div>
        )}

        {/* Outer Breathing Glow Halo */}
        <div
          className={`absolute inset-0 rounded-full transition-all duration-700 pointer-events-none motion-reduce:hidden ${
            isDragging
              ? 'scale-130 bg-gradient-to-r from-[#deb03e]/40 to-[#10b981]/40 blur-lg ring-2 ring-[#deb03e]'
              : wakeWordStatus === 'listening'
              ? 'scale-125 bg-gradient-to-r from-[#10b981]/30 to-[#deb03e]/30 blur-md animate-pulse'
              : isVoiceModalOpen || wakeWordStatus === 'in_conversation'
              ? 'scale-130 bg-gradient-to-r from-[#38bdf8]/40 to-[#10b981]/40 blur-lg animate-pulse'
              : 'scale-110 bg-[#10b981]/20 blur-md group-hover:scale-125 group-hover:bg-[#10b981]/35'
          }`}
        />

        {/* Main Floating Bot Circular Trigger */}
        <button
          type="button"
          onClick={handleClick}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          aria-label="Toggle Fin AI Assistant (Click and drag to move)"
          aria-expanded={isChatOpen}
          className={`relative w-14 h-14 sm:w-15 sm:h-15 rounded-full flex flex-col items-center justify-center transition-all duration-200 shadow-[0_10px_25px_-5px_rgba(4,22,16,0.6)] focus:outline-none focus:ring-3 focus:ring-[#10b981] focus:ring-offset-2 focus:ring-offset-[#faf7f0] ${
            isDragging
              ? 'bg-[#0a3828] border-2 border-[#deb03e] ring-4 ring-[#deb03e]/30 cursor-grabbing shadow-[0_20px_35px_rgba(4,22,16,0.85)]'
              : isChatOpen
              ? 'bg-[#093828] border-2 border-[#f1cd6b] scale-95 cursor-grab'
              : 'bg-gradient-to-br from-[#072a1e] via-[#0b3829] to-[#041a13] border border-[#1b624d] hover:border-[#10b981] hover:scale-105 active:scale-95 cursor-grab'
          }`}
        >
          {/* Elegant Fin Monogram and Orb Graphic */}
          <div className="relative flex flex-col items-center justify-center pointer-events-none">
            {isVoiceModalOpen ? (
              <Radio className="w-6 h-6 text-[#deb03e] animate-pulse" />
            ) : wakeWordStatus === 'listening' ? (
              <div className="relative flex items-center justify-center">
                <Mic className="w-5 h-5 text-[#f1cd6b] animate-bounce" />
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-[#10b981] animate-ping" />
              </div>
            ) : isDragging ? (
              <div className="flex flex-col items-center leading-none">
                <Move className="w-5 h-5 text-[#deb03e] animate-pulse" />
                <span className="text-[7px] font-mono uppercase tracking-widest text-[#f1cd6b] font-bold mt-0.5">
                  DRAG
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center leading-none">
                <div className="flex items-center gap-0.5">
                  <span className="font-heading font-extrabold text-[15px] sm:text-base tracking-tight bg-gradient-to-r from-white via-[#e8f6ef] to-[#f1cd6b] bg-clip-text text-transparent">
                    Fin
                  </span>
                  <Sparkles className="w-2.5 h-2.5 text-[#f1cd6b]" />
                </div>
                <span className="text-[8px] font-mono uppercase tracking-widest text-[#86bfa8] font-bold mt-0.5">
                  AI
                </span>
              </div>
            )}
          </div>

          {/* Micro Status Dot */}
          <span
            className={`absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full border-2 border-[#051c14] ${
              status.color
            } ${status.pulse ? 'animate-pulse' : ''}`}
            title={status.label}
          />
        </button>
      </div>
    </aside>
  );
};
