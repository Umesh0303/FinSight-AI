import React, { useState } from 'react';
import { User, Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, Clock, RefreshCw } from 'lucide-react';
import { Logo } from '../../components/brand/Logo';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { useApp } from '../../context/AppContext';

export const SignupPage: React.FC = () => {
  const { navigate, signup, resendVerificationEmail } = useApp();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // Email verification state
  const [isRegistered, setIsRegistered] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendNotice, setResendNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isResending, setIsResending] = useState(false);

  React.useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleResend = async () => {
    if (resendCooldown > 0 || isResending || !registeredEmail) return;
    setIsResending(true);
    setResendNotice(null);
    try {
      const res = await resendVerificationEmail(registeredEmail);
      if (res.success) {
        setResendCooldown(60);
        setResendNotice({ type: 'success', message: 'Verification email resent successfully! Please check your inbox.' });
      } else {
        setResendNotice({ type: 'error', message: res.message || 'Failed to resend verification email.' });
      }
    } catch (err: any) {
      setResendNotice({ type: 'error', message: err?.message || 'Error sending verification link.' });
    } finally {
      setIsResending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
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
      setErrorMsg('You must agree to the Institutional Terms of Service and Privacy Policy.');
      return;
    }

    setIsLoading(true);
    const targetEmail = email.trim().toLowerCase();
    const res = await signup(fullName, targetEmail, password);
    setIsLoading(false);

    if (!res.success) {
      setErrorMsg(res.message || 'Registration failed. Please try again.');
    } else {
      // Transition immediately to the Check Your Email confirmation view
      setIsRegistered(true);
      setRegisteredEmail(targetEmail);
      setResendCooldown(60);
    }
  };

  return (
    <AuthLayout activePage="signup">
      {/* =========================================================================
          REFERENCE-IMAGE MASTER SIGNUP CARD
          Dark emerald container with fine emerald border and warm gold CTA
          ========================================================================= */}
      <div className="bg-[#052b1e]/90 backdrop-blur-xl border border-[#0d4f38] rounded-3xl p-6 sm:p-8 shadow-[0_24px_70px_rgba(1,16,11,0.7)] text-white">
        
        {isRegistered ? (
          /* =======================================================================
             CHECK YOUR EMAIL CONFIRMATION SCREEN
             ======================================================================= */
          <div className="text-center py-2">
            {/* Card Header & Brand Emblem */}
            <div className="flex justify-center mb-4 cursor-pointer" onClick={() => navigate('/')}>
              <Logo size="sm" variant="dark" showText={false} />
            </div>

            <div className="w-16 h-16 rounded-2xl bg-[#031d14] border border-[#10b981]/30 flex items-center justify-center mx-auto mb-4 text-[#10b981] shadow-inner">
              <Mail className="w-8 h-8" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight">
              Check Your Email
            </h2>

            <p className="text-xs sm:text-sm text-[#8cb8a7] mt-3 leading-relaxed max-w-sm mx-auto">
              We've sent a verification link to your registered email address. Please check your inbox and click the link to activate your FinSight AI account.
            </p>

            <div className="mt-4 mb-6 inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#031d14] border border-[#0d4f38] text-xs font-mono text-[#deb03e]">
              <Mail className="w-3.5 h-3.5 text-[#10b981]" />
              <span>{registeredEmail}</span>
            </div>

            {/* Resend Notice (if any) */}
            {resendNotice && (
              <div
                className={`mb-4 p-3 rounded-xl text-xs flex items-center justify-center gap-2 ${
                  resendNotice.type === 'success'
                    ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-200'
                    : 'bg-red-950/80 border border-red-500/50 text-red-200'
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

            {/* Resend Verification Email option with cooldown and rate-limit handling */}
            <div className="space-y-3 pt-2">
              <button
                type="button"
                disabled={isResending || resendCooldown > 0}
                onClick={handleResend}
                className="w-full py-3 px-4 rounded-xl bg-[#031d14] hover:bg-[#073626] border border-[#0d4f38] text-xs sm:text-sm font-semibold text-[#8cb8a7] hover:text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {isResending ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                    <span>Sending Verification Email...</span>
                  </>
                ) : resendCooldown > 0 ? (
                  <>
                    <Clock className="w-3.5 h-3.5 text-[#deb03e]" />
                    <span>Resend Verification Email in {resendCooldown}s</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 text-[#10b981]" />
                    <span>Resend Verification Email</span>
                  </>
                )}
              </button>

              {/* Option to return to the login page */}
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#ecc866] via-[#e5b842] to-[#d69f2e] hover:from-[#f3da87] hover:to-[#dfab38] text-[#052419] font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Return to Login</span>
                <span className="text-sm font-extrabold leading-none">→</span>
              </button>
            </div>
          </div>
        ) : (
          /* =======================================================================
             REGISTRATION INPUT FORM
             ======================================================================= */
          <>
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
        </>
        )}

      </div>
    </AuthLayout>
  );
};
