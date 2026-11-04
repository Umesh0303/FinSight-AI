import React, { useState, useEffect } from 'react';
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, Clock, RefreshCw } from 'lucide-react';
import { Logo } from '../../components/brand/Logo';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { useApp } from '../../context/AppContext';

export const LoginPage: React.FC = () => {
  const { navigate, login, resendVerificationEmail } = useApp();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [infoMsg, setInfoMsg] = useState('');

  // Unverified account state & resend handling
  const [isUnverified, setIsUnverified] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendNotice, setResendNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleResend = async () => {
    const target = unverifiedEmail || email.trim().toLowerCase();
    if (resendCooldown > 0 || isResending || !target) return;
    setIsResending(true);
    setResendNotice(null);
    try {
      const res = await resendVerificationEmail(target);
      if (res.success) {
        setResendCooldown(60);
        setResendNotice({ type: 'success', message: 'A new verification link has been sent to your email address.' });
      } else {
        setResendNotice({ type: 'error', message: res.message || 'Failed to resend verification link.' });
      }
    } catch (err: any) {
      setResendNotice({ type: 'error', message: err?.message || 'Error sending verification link.' });
    } finally {
      setIsResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both your work email address and password.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');
    setInfoMsg('');
    setIsUnverified(false);
    setResendNotice(null);

    const res = await login(email, password);
    setIsLoading(false);

    if (!res.success) {
      if (res.isUnverified) {
        setIsUnverified(true);
        setUnverifiedEmail(res.unverifiedEmail || email.trim().toLowerCase());
        setErrorMsg(res.message || 'Your email address is not verified. Please check your inbox and verify your email before logging in.');
      } else {
        setErrorMsg(res.message || 'Invalid email address or password. Please verify your credentials.');
      }
    } else if (res.message) {
      setInfoMsg(res.message);
    }
  };

  return (
    <AuthLayout activePage="login">
      {/* =========================================================================
          REFERENCE IMAGE MASTER AUTHENTICATION CARD
          Translucent dark emerald-glass container with fine emerald border
          ========================================================================= */}
      <div className="bg-[#052b1e]/90 backdrop-blur-xl border border-[#0d4f38] rounded-3xl p-6 sm:p-8 shadow-[0_24px_70px_rgba(1,16,11,0.7)] text-white">
        
        {/* Card Header & Brand Emblem */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3 cursor-pointer" onClick={() => navigate('/')}>
            <Logo size="sm" variant="dark" showText={false} />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight">
            Welcome Back
          </h2>
          <p className="text-xs text-[#8cb8a7] mt-1.5 leading-relaxed">
            Sign in to continue to FinSight AI Platform
          </p>
        </div>

        {/* Informative Status / Pending Feedback */}
        {infoMsg && (
          <div className="mb-4 p-3.5 rounded-xl bg-amber-950/80 border border-amber-500/50 text-xs text-amber-200 flex items-start gap-2.5">
            <Clock className="w-4 h-4 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">
              <span>{infoMsg}</span>
            </div>
          </div>
        )}

        {/* Unverified Account Alert with Direct Resend Action */}
        {isUnverified ? (
          <div className="mb-5 p-4 rounded-xl bg-amber-950/80 border border-amber-500/60 text-xs text-amber-200 space-y-3">
            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div className="space-y-1">
                <span className="font-bold text-amber-300 block">Email Verification Required</span>
                <p className="text-amber-100 leading-relaxed">
                  Your email address is not verified. Please check your inbox and verify your email before logging in.
                </p>
              </div>
            </div>

            {resendNotice && (
              <div
                className={`p-2.5 rounded-lg text-xs flex items-center gap-2 ${
                  resendNotice.type === 'success'
                    ? 'bg-emerald-950/90 border border-emerald-500/40 text-emerald-200'
                    : 'bg-red-950/90 border border-red-500/40 text-red-200'
                }`}
              >
                {resendNotice.type === 'success' ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0" />
                )}
                <span>{resendNotice.message}</span>
              </div>
            )}

            <button
              type="button"
              disabled={isResending || resendCooldown > 0}
              onClick={handleResend}
              className="w-full py-2.5 px-3 rounded-lg bg-[#031d14] hover:bg-[#063324] border border-amber-500/40 text-amber-200 text-xs font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
            >
              {isResending ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
                  <span>Resending Verification Link...</span>
                </>
              ) : resendCooldown > 0 ? (
                <>
                  <Clock className="w-3.5 h-3.5 text-amber-400" />
                  <span>Resend in {resendCooldown}s</span>
                </>
              ) : (
                <>
                  <RefreshCw className="w-3.5 h-3.5 text-amber-400" />
                  <span>Resend Verification Email</span>
                </>
              )}
            </button>
          </div>
        ) : (
          /* Standard Error Feedback */
          errorMsg && (
            <div className="mb-4 p-3.5 rounded-xl bg-red-950/80 border border-red-500/50 text-xs text-red-200 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">
                <span>{errorMsg}</span>
              </div>
            </div>
          )
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#8cb8a7] mb-1.5" htmlFor="login-email">
              Work Email Address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#10b981] pointer-events-none" />
              <input
                id="login-email"
                type="email"
                placeholder="name@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-[#031d14] border border-[#0d4f38] rounded-xl text-xs sm:text-sm text-white placeholder-[#457261] focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-[#10b981] transition-all"
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-[#8cb8a7]" htmlFor="login-password">
                Password
              </label>
              <button
                type="button"
                onClick={() => navigate('/forgot-password')}
                className="text-xs font-semibold text-[#8cb8a7] hover:text-[#e5b842] transition-colors cursor-pointer"
              >
                Forgot password?
              </button>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#10b981] pointer-events-none" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="w-full pl-10 pr-10 py-2.5 sm:py-3 bg-[#031d14] border border-[#0d4f38] rounded-xl text-xs sm:text-sm text-white placeholder-[#457261] focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-[#10b981] transition-all"
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

          {/* Remember Me Checkbox */}
          <div className="flex items-center justify-between text-xs pt-0.5">
            <label className="flex items-center gap-2 cursor-pointer select-none text-[#8cb8a7]">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded-md accent-[#10b981] cursor-pointer"
              />
              <span>Remember me on this device</span>
            </label>
          </div>

          {/* Primary CTA Button: LUSTROUS WARM GOLD (From Reference Image) */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-[#ecc866] via-[#e5b842] to-[#d69f2e] hover:from-[#f3da87] hover:to-[#dfab38] active:scale-[0.99] text-[#052419] font-bold text-sm tracking-wide shadow-[0_6px_25px_rgba(229,184,66,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2"
          >
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="w-4 h-4 border-2 border-[#052419] border-t-transparent rounded-full animate-spin" />
                <span>Authenticating...</span>
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <span>Sign In</span>
                <span className="text-base font-extrabold leading-none">→</span>
              </span>
            )}
          </button>
        </form>

        {/* Footer Link to Signup */}
        <div className="text-center mt-6 pt-5 border-t border-[#0d4f38]/60 text-xs text-[#8cb8a7]">
          <span>Don't have an account? </span>
          <button
            type="button"
            onClick={() => navigate('/signup')}
            className="font-bold text-[#e5b842] hover:text-[#f3da87] hover:underline cursor-pointer ml-1"
          >
            Create account
          </button>
        </div>

      </div>
    </AuthLayout>
  );
};
