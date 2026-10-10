import React from 'react';
import { Loader2 } from 'lucide-react';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'gold' | 'emerald' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'emerald',
  size = 'md',
  isLoading = false,
  leftIcon,
  rightIcon,
  className = '',
  disabled,
  ...props
}) => {
  const sizeClasses = {
    sm: 'py-1.5 px-3 text-xs gap-1.5 rounded-lg',
    md: 'py-2.5 px-4 text-sm font-medium gap-2 rounded-xl',
    lg: 'py-3.5 px-6 text-base font-semibold gap-2.5 rounded-xl'
  };

  const variantClasses = {
    // Deep emerald button (seen on Login "Sign In ->", and Dashboard primary actions)
    emerald:
      'bg-[#083325] text-white hover:bg-[#0c4432] active:bg-[#06291e] shadow-sm border border-[#0d4f39] focus:ring-2 focus:ring-[#1a7f5d]/50',
    // Lustrous Gold button (seen on Home "Ask FinSight ✨", Login "Get Started ->")
    gold:
      'bg-gradient-to-r from-[#edd071] via-[#e2b947] to-[#c99a2c] text-[#062419] font-semibold hover:from-[#f3da87] hover:to-[#d4a537] active:opacity-95 shadow-md border border-[#f5de8e]/30 focus:ring-2 focus:ring-[#e2b947]/50',
    // Dark outline / glass button (seen on Home "Explore Insights")
    outline:
      'border border-[#234d3f] text-[#c5ded5] hover:bg-[#12382b]/60 hover:text-white hover:border-[#387560] active:bg-[#0d2f23]',
    // Light mode border button (used on cream dashboard)
    primary:
      'bg-white text-[#0f3427] border border-[#ded8cb] hover:bg-[#f6f2e9] hover:border-[#cfc6b5] shadow-xs active:bg-[#ede7da]',
    // Ghost button
    ghost:
      'text-[#3a5349] hover:text-[#0b3325] hover:bg-[#124232]/10 active:bg-[#124232]/15',
    // Danger button
    danger:
      'bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-xs'
  };

  return (
    <button
      disabled={disabled || isLoading}
      className={`inline-flex items-center justify-center transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed select-none ${sizeClasses[size]} ${variantClasses[variant]} ${className}`}
      {...props}
    >
      {isLoading ? (
        <Loader2 className="w-4 h-4 animate-spin text-current" />
      ) : (
        leftIcon && <span className="flex-shrink-0">{leftIcon}</span>
      )}
      <span>{children}</span>
      {!isLoading && rightIcon && <span className="flex-shrink-0">{rightIcon}</span>}
    </button>
  );
};
