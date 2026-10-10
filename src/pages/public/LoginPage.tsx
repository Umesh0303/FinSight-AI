import React, { useState } from 'react';
import { Mail, Lock, Eye, EyeOff, ArrowRight, AlertCircle } from 'lucide-react';
import { Logo } from '../../components/brand/Logo';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { useApp } from '../../context/AppContext';

export const LoginPage: React.FC = () => {
  const { navigate, login } = useApp();
  const [email, setEmail] = useState('analyst@finsight.ai');
  const [password, setPassword] = useState('demoPassword123');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setErrorMsg('Please enter both your email address and password.');
      return;
    }
    setIsLoading(true);
    setErrorMsg('');

    setTimeout(() => {
      const res = login(email, password);
      setIsLoading(false);
      if (!res.success && res.message) {
        setErrorMsg(res.message);
      }
    }, 350);
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

        {/* Social / SSO Buttons (Dark Translucent Style from Reference Image) */}
        <div className="space-y-2.5 mb-5">
          {/* Continue with Google */}
          <button
            type="button"
            onClick={() => login('analyst@finsight.ai', 'demo123')}
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

          {/* Continue with Microsoft */}
          <button
            type="button"
            onClick={() => login('admin@finsight.ai', 'demo123')}
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

        {/* Divider "OR" */}
        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-[#0b3d2c]" />
          </div>
          <div className="relative flex justify-center text-[10px] uppercase tracking-wider text-[#689985]">
            <span className="bg-[#052b1e] px-3 font-semibold">OR</span>
          </div>
        </div>

        {/* Error Feedback */}
        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/80 border border-red-500/50 text-xs text-red-200 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Credentials Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-[#8cb8a7] mb-1.5" htmlFor="login-email">
              Email address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#10b981] pointer-events-none" />
              <input
                id="login-email"
                type="email"
                placeholder="analyst@finsight.ai"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
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
          <div className="flex items-center text-xs pt-0.5">
            <label className="flex items-center gap-2 cursor-pointer select-none text-[#8cb8a7]">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded-md accent-[#10b981] cursor-pointer"
              />
              <span>Remember me</span>
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

        {/* Quick Reviewer Credentials Helper */}
        <div className="mt-5 pt-4 border-t border-[#093d2c] text-[11px] text-[#719d8c] text-center leading-relaxed">
          <span className="font-semibold text-[#8eb8a7] block mb-1">Prototype Role Shortcuts:</span>
          <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 text-[#8eb8a7]">
            <button
              type="button"
              onClick={() => { setEmail('admin@finsight.ai'); setPassword('demo123'); }}
              className="hover:text-[#e5b842] hover:underline cursor-pointer"
            >
              Admin: <strong>admin@finsight.ai</strong>
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => { setEmail('analyst@finsight.ai'); setPassword('demo123'); }}
              className="hover:text-[#e5b842] hover:underline cursor-pointer"
            >
              Analyst: <strong>analyst@finsight.ai</strong>
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => { setEmail('customer@finsight.ai'); setPassword('demo123'); }}
              className="hover:text-[#e5b842] hover:underline cursor-pointer"
            >
              Client: <strong>customer@finsight.ai</strong>
            </button>
            <span>·</span>
            <button
              type="button"
              onClick={() => { setEmail('risk@finsight.ai'); setPassword('demo123'); }}
              className="hover:text-[#e5b842] hover:underline cursor-pointer"
            >
              Risk: <strong>risk@finsight.ai</strong>
            </button>
          </div>
        </div>

        {/* Footer Link to Signup */}
        <div className="text-center mt-5 text-xs text-[#8cb8a7]">
          <span>Don't have an account? </span>
          <button
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
