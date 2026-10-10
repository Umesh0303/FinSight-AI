import React, { useState } from 'react';
import { User, Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react';
import { Logo } from '../../components/brand/Logo';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { useApp } from '../../context/AppContext';

export const SignupPage: React.FC = () => {
  const { navigate, signup } = useApp();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!fullName.trim() || !email.trim() || !password) {
      setErrorMsg('Please fill in all required registration fields.');
      return;
    }

    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter.');
      return;
    }

    if (!agreed) {
      setErrorMsg('You must agree to the Terms of Service and Privacy Policy.');
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      signup(fullName, email, password);
    }, 400);
  };

  return (
    <AuthLayout activePage="signup">
      {/* =========================================================================
          REFERENCE-IMAGE MASTER SIGNUP CARD
          ========================================================================= */}
      <div className="bg-[#052b1e]/90 backdrop-blur-xl border border-[#0d4f38] rounded-3xl p-6 sm:p-8 shadow-[0_24px_70px_rgba(1,16,11,0.7)] text-white">
        
        {/* Card Header & Brand Emblem */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3 cursor-pointer" onClick={() => navigate('/')}>
            <Logo size="sm" variant="dark" showText={false} />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight">
            Create your account
          </h2>
          <p className="text-xs text-[#8cb8a7] mt-1.5 leading-relaxed">
            Start turning financial data into actionable intelligence
          </p>
        </div>

        {/* Social SSO Buttons */}
        <div className="space-y-2.5 mb-5">
          <button
            type="button"
            onClick={() => signup('Google User', 'new.google@example.com', 'demo123')}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-[#0d4532] bg-[#042017] hover:bg-[#072c20] hover:border-[#135941] text-xs font-semibold text-white transition-all cursor-pointer shadow-xs active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[#10b981]"
          >
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          <button
            type="button"
            onClick={() => signup('Microsoft User', 'new.ms@example.com', 'demo123')}
            className="w-full flex items-center justify-center gap-3 py-2.5 px-4 rounded-xl border border-[#0d4532] bg-[#042017] hover:bg-[#072c20] hover:border-[#135941] text-xs font-semibold text-white transition-all cursor-pointer shadow-xs active:scale-[0.99] focus:outline-none focus:ring-2 focus:ring-[#10b981]"
          >
            <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 23 23" aria-hidden="true">
              <path fill="#f35325" d="M1 1h10v10H1z" />
              <path fill="#81bc06" d="M12 1h10v10H12z" />
              <path fill="#05a6f0" d="M1 12h10v10H1z" />
              <path fill="#ffba08" d="M12 12h10v10H12z" />
            </svg>
            <span>Continue with Microsoft</span>
          </button>
        </div>

        {/* Divider */}
        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#0b3d2c]" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase tracking-wider text-[#689985]">
            <span className="bg-[#052b1e] px-3 font-semibold">OR REGISTER WITH EMAIL</span>
          </div>
        </div>

        {/* Error Feedback */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/80 border border-red-500/50 text-xs text-red-200 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div>
            <label className="block text-xs font-semibold text-[#8cb8a7] mb-1" htmlFor="signup-name">
              Full Legal Name
            </label>
            <div className="relative">
              <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#10b981] pointer-events-none" />
              <input
                id="signup-name"
                type="text"
                placeholder="Elena Rostova"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 bg-[#031d14] border border-[#0d4f38] rounded-xl text-xs sm:text-sm text-white placeholder-[#457261] focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-[#10b981] transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#8cb8a7] mb-1" htmlFor="signup-email">
              Work Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#10b981] pointer-events-none" />
              <input
                id="signup-email"
                type="email"
                placeholder="name@financial-institution.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2.5 bg-[#031d14] border border-[#0d4f38] rounded-xl text-xs sm:text-sm text-white placeholder-[#457261] focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-[#10b981] transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#8cb8a7] mb-1" htmlFor="signup-password">
              Create Password (min. 8 characters)
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#10b981] pointer-events-none" />
              <input
                id="signup-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Create strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-10 py-2.5 bg-[#031d14] border border-[#0d4f38] rounded-xl text-xs sm:text-sm text-white placeholder-[#457261] focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-[#10b981] transition-all"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#10b981] hover:text-[#34d399] p-0.5 cursor-pointer"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#8cb8a7] mb-1" htmlFor="signup-confirm-password">
              Confirm Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#10b981] pointer-events-none" />
              <input
                id="signup-confirm-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full pl-10 pr-10 py-2.5 bg-[#031d14] border border-[#0d4f38] rounded-xl text-xs sm:text-sm text-white placeholder-[#457261] focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-[#10b981] transition-all"
              />
            </div>
          </div>

          <div className="flex items-start gap-2.5 text-xs text-[#8cb8a7] pt-1">
            <input
              id="signup-terms"
              type="checkbox"
              checked={agreed}
              onChange={(e) => setAgreed(e.target.checked)}
              required
              className="w-4 h-4 rounded accent-[#10b981] mt-0.5 flex-shrink-0 cursor-pointer"
            />
            <label htmlFor="signup-terms" className="cursor-pointer leading-relaxed">
              I agree to the <span className="font-semibold text-white hover:underline">Institutional Terms of Service</span> and{' '}
              <span className="font-semibold text-white hover:underline">Financial Privacy Policy</span>
            </label>
          </div>

          {/* Primary CTA: WARM GOLD GRADIENT BUTTON */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-[#ecc866] via-[#e5b842] to-[#d69f2e] hover:from-[#f3da87] hover:to-[#dfab38] active:scale-[0.99] text-[#052419] font-bold text-sm tracking-wide shadow-[0_6px_25px_rgba(229,184,66,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-[#052419] border-t-transparent rounded-full animate-spin" />
                <span>Creating Account...</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span>Create Account</span>
                <span className="text-base font-extrabold leading-none">→</span>
              </span>
            )}
          </button>
        </form>

        <p className="text-[11px] text-[#5e8c7b] text-center mt-4">
          New accounts are provisioned in the secure verification state pending compliance approval.
        </p>

        {/* Footer Link to Login */}
        <div className="text-center mt-5 text-xs text-[#8cb8a7]">
          <span>Already have an account? </span>
          <button
            onClick={() => navigate('/login')}
            className="font-bold text-[#e5b842] hover:text-[#f3da87] hover:underline cursor-pointer ml-1"
          >
            Sign In
          </button>
        </div>

      </div>
    </AuthLayout>
  );
};
