import React, { useEffect, useState, useRef } from 'react';

interface AnimatedNumberProps {
  value: string;
  duration?: number; // duration in ms
  className?: string;
}

export const AnimatedNumber: React.FC<AnimatedNumberProps> = ({
  value,
  duration = 1000,
  className = ''
}) => {
  const [displayValue, setDisplayValue] = useState<string>(value);
  const elementRef = useRef<HTMLSpanElement>(null);
  const hasAnimatedRef = useRef<boolean>(false);

  useEffect(() => {
    // Check if user prefers reduced motion
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setDisplayValue(value);
      return;
    }

    // Extract numeric portion and prefix/suffix
    // Handles formats like: "28%", "₹ 14,80,000", "+12.5%", "30,000", "238", "99.94%"
    const match = value.match(/^([^0-9.]*)([0-9,.]+)(.*)$/);
    if (!match) {
      setDisplayValue(value);
      return;
    }

    const prefix = match[1];
    const rawNumberStr = match[2].replace(/,/g, '');
    const suffix = match[3];
    const targetNum = parseFloat(rawNumberStr);

    if (isNaN(targetNum)) {
      setDisplayValue(value);
      return;
    }

    const hasComma = match[2].includes(',');
    const isIndianFormat = /,\d{2},/.test(match[2]) || match[1].includes('₹');
    const decimalPlaces = match[2].includes('.') ? match[2].split('.')[1].length : 0;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && !hasAnimatedRef.current) {
          hasAnimatedRef.current = true;
          const startTime = performance.now();

          const animate = (currentTime: number) => {
            const elapsed = currentTime - startTime;
            const progress = Math.min(elapsed / duration, 1);
            // Ease out cubic
            const easeOutProgress = 1 - Math.pow(1 - progress, 3);
            const currentNum = targetNum * easeOutProgress;

            let formattedNum = currentNum.toFixed(decimalPlaces);
            if (hasComma) {
              const parts = formattedNum.split('.');
              if (isIndianFormat && parts[0].length > 3) {
                const lastThree = parts[0].substring(parts[0].length - 3);
                const otherNumbers = parts[0].substring(0, parts[0].length - 3);
                parts[0] = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + ',' + lastThree;
              } else {
                parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
              }
              formattedNum = parts.join('.');
            }

            setDisplayValue(`${prefix}${formattedNum}${suffix}`);

            if (progress < 1) {
              requestAnimationFrame(animate);
            } else {
              setDisplayValue(value); // Ensure exact final string
            }
          };

          requestAnimationFrame(animate);
        }
      },
      { threshold: 0.15 }
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [value, duration]);

  return (
    <span ref={elementRef} className={`inline-block tabular-nums ${className}`}>
      {displayValue}
    </span>
  );
};
