import React, { useRef, useState, useEffect } from 'react';

interface Card3DProps {
  children: React.ReactNode;
  className?: string;
  delayMs?: number; // Delay for staggered entrance animation
  glowColor?: 'emerald' | 'gold' | 'red';
  theme?: 'light' | 'dark';
  onClick?: () => void;
  interactive?: boolean;
}

export const Card3D: React.FC<Card3DProps> = ({
  children,
  className = '',
  delayMs = 0,
  glowColor = 'emerald',
  theme = 'dark',
  onClick,
  interactive = true
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // 3D rotation state (max ±5deg as specified)
  const [rotX, setRotX] = useState(0);
  const [rotY, setRotY] = useState(0);
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 });

  useEffect(() => {
    // Check touch and motion preferences
    if (typeof window !== 'undefined') {
      setIsTouchDevice(window.matchMedia('(pointer: coarse)').matches);
      setPrefersReducedMotion(
        window.matchMedia('(prefers-reduced-motion: reduce)').matches
      );
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (cardRef.current) {
      observer.observe(cardRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isTouchDevice || prefersReducedMotion || !interactive || !cardRef.current) return;

    const rect = cardRef.current.getBoundingClientRect();
    // Normalized position from center (-0.5 to 0.5)
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;

    // Physically tilt card toward pointer position, clamped strictly to ±5deg maximum
    // When pointer is at top-left (x < 0, y < 0), card tilts toward top-left
    const targetRotX = Math.max(-5, Math.min(5, y * 10));
    const targetRotY = Math.max(-5, Math.min(5, -x * 10));

    setRotX(targetRotX);
    setRotY(targetRotY);
    setMousePos({
      x: Math.round((x + 0.5) * 100),
      y: Math.round((y + 0.5) * 100)
    });
  };

  const handleMouseEnter = () => {
    if (!isTouchDevice && !prefersReducedMotion && interactive) {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setRotX(0);
    setRotY(0);
  };

  const isDark = theme === 'dark';

  // Glow configurations for light and dark themes
  const glowStyles = isDark
    ? {
        emerald: {
          borderHover: 'hover:border-[#10b981]/70',
          activeShadow:
            '0 24px 50px -10px rgba(1, 20, 14, 0.85), 0 0 30px rgba(16, 185, 129, 0.22), inset 0 1px 2px rgba(254, 240, 138, 0.25)',
          glare: 'rgba(52, 211, 153, 0.12)'
        },
        gold: {
          borderHover: 'hover:border-[#e5b842]/70',
          activeShadow:
            '0 24px 50px -10px rgba(1, 20, 14, 0.85), 0 0 30px rgba(229, 184, 66, 0.22), inset 0 1px 2px rgba(254, 240, 138, 0.35)',
          glare: 'rgba(229, 184, 66, 0.14)'
        },
        red: {
          borderHover: 'hover:border-[#ef4444]/70',
          activeShadow:
            '0 24px 50px -10px rgba(1, 20, 14, 0.85), 0 0 30px rgba(239, 68, 68, 0.2), inset 0 1px 2px rgba(254, 202, 202, 0.2)',
          glare: 'rgba(239, 68, 68, 0.12)'
        }
      }[glowColor]
    : {
        emerald: {
          borderHover: 'hover:border-[#10b981]/60',
          activeShadow:
            '0 20px 38px -10px rgba(16, 185, 129, 0.22), 0 8px 16px -4px rgba(18, 48, 36, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.95)',
          glare: 'rgba(16, 185, 129, 0.08)'
        },
        gold: {
          borderHover: 'hover:border-[#e5b842]/60',
          activeShadow:
            '0 20px 38px -10px rgba(229, 184, 66, 0.22), 0 8px 16px -4px rgba(18, 48, 36, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.95)',
          glare: 'rgba(229, 184, 66, 0.09)'
        },
        red: {
          borderHover: 'hover:border-[#ef4444]/60',
          activeShadow:
            '0 20px 38px -10px rgba(239, 68, 68, 0.2), 0 8px 16px -4px rgba(18, 48, 36, 0.08), inset 0 1px 1px rgba(255, 255, 255, 0.95)',
          glare: 'rgba(239, 68, 68, 0.08)'
        }
      }[glowColor];

  // Dynamic 3D transform string: perspective 1000px, max ±5deg rotation, translateY -6px, translateZ 12px, scale 1.02
  const transformStyle = prefersReducedMotion
    ? undefined
    : isHovered && !isTouchDevice
    ? `perspective(1000px) rotateX(${rotX}deg) rotateY(${rotY}deg) translateY(-6px) translateZ(12px) scale(1.02)`
    : isVisible
    ? `perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(0) translateZ(0) scale(1)`
    : `perspective(1000px) rotateX(0deg) rotateY(0deg) translateY(20px) translateZ(0) scale(0.97)`;

  // Avoid mixing shorthand transition and transitionDelay to prevent React style reconciliation warnings
  const entryDelayStr = !isVisible && delayMs ? `${delayMs}ms` : '0ms';
  const transitionStyle = prefersReducedMotion
    ? undefined
    : isHovered
    ? 'transform 0.08s ease-out, box-shadow 0.2s ease-out, border-color 0.2s ease-out'
    : `transform 0.45s cubic-bezier(0.16, 1, 0.3, 1) ${entryDelayStr}, opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1) ${entryDelayStr}, box-shadow 0.35s ease-out, border-color 0.3s ease-out`;

  // Resting box shadows
  const defaultShadow = isDark
    ? '0 16px 36px -10px rgba(1, 16, 11, 0.6), inset 0 1px 1px rgba(255, 255, 255, 0.05)'
    : '0 4px 16px -4px rgba(18, 48, 36, 0.06), 0 1px 3px rgba(18, 48, 36, 0.04), inset 0 1px 1px rgba(255, 255, 255, 0.8)';

  // Theme base classes
  const themeClasses = isDark
    ? 'bg-[#052b1e]/90 backdrop-blur-xl border border-[#0d4f38] text-white'
    : 'bg-white border border-[#ece7dc] text-[#14261f]';

  return (
    <div
      ref={cardRef}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      style={{
        transform: transformStyle,
        transition: transitionStyle,
        boxShadow: isHovered ? glowStyles.activeShadow : defaultShadow,
        transformStyle: 'preserve-3d',
        willChange: 'transform'
      }}
      className={`group relative rounded-2xl ${themeClasses} ${glowStyles.borderHover} ${
        isVisible ? 'opacity-100' : 'opacity-0'
      } ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {/* Layer 1: Ambient Depth Plate (Shadow plate beneath card surface) */}
      <div
        className={`absolute inset-0 rounded-2xl pointer-events-none -z-10 ${
          isDark
            ? 'bg-gradient-to-b from-transparent via-[#031d14]/50 to-[#01140d]/90'
            : 'bg-gradient-to-b from-transparent via-[#f5f1e8]/50 to-[#ebe5d8]/70'
        }`}
        style={{ transform: 'translateZ(-10px)' }}
        aria-hidden="true"
      />

      {/* Layer 2: Dynamic Surface Glare (Smoothly tracks pointer position) */}
      {isHovered && !isTouchDevice && !prefersReducedMotion && (
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none z-0 overflow-hidden"
          style={{
            background: `radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, ${glowStyles.glare}, transparent 65%)`
          }}
          aria-hidden="true"
        />
      )}

      {/* Layer 3: Elevated Foreground Content (Floats 14px in front of card surface) */}
      <div
        className="relative z-10 w-full h-full"
        style={{ transform: 'translateZ(14px)' }}
      >
        {children}
      </div>
    </div>
  );
};
