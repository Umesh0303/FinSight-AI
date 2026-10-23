import React, { useState } from 'react';
import { User, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, Clock } from 'lucide-react';
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
  const [agreed, setAgreed] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

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
      setErrorMsg('You must agree to the Institutional Terms of Service and Privacy Policy.');
      return;
    }

    setIsLoading(true);
    const res = await signup(fullName, email, password);
    setIsLoading(false);

    if (!res.success) {
      setErrorMsg(res.message || 'Registration failed. Please try again.');
    } else if (res.message) {
      setSuccessMsg(res.message);
    }
  };

  return (
    <AuthLayout activePage="signup">
      {/* =========================================================================
          REFERENCE-IMAGE MASTER SIGNUP CARD
          Dark emerald container with fine emerald border and warm gold CTA
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
            Institutional access to FinSight AI analytics platform
          </p>
        </div>

        {/* Success / Verification Required Feedback */}
        {successMsg && (
          <div className="mb-5 p-4 rounded-xl bg-emerald-950/80 border border-emerald-500/50 text-xs text-emerald-200 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1.5 leading-relaxed">
              <span className="font-semibold block text-emerald-300">Registration Submitted Successfully</span>
              <p>{successMsg}</p>
              <div className="pt-2 flex items-center gap-2 text-emerald-400 font-medium">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Account Status: Active Customer Access</span>
              </div>
            </div>
          </div>
        )}

        {/* Error Feedback */}
        {errorMsg && (
          <div className="mb-4 p-3.5 rounded-xl bg-red-950/80 border border-red-500/50 text-xs text-red-200 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1 leading-relaxed">
              <span>{errorMsg}</span>
            </div>
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
                autoComplete="name"
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
                autoComplete="email"
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
                autoComplete="new-password"
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
                autoComplete="new-password"
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
          All registrations are assigned unassigned access by default pending compliance and administrator approval.
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
