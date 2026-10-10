import React, { useState } from 'react';
import { Mail, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { Logo } from '../../components/brand/Logo';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { useApp } from '../../context/AppContext';

export const ForgotPasswordPage: React.FC = () => {
  const { navigate } = useApp();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      setErrorMsg('Please enter your registered email address.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    setTimeout(() => {
      setIsLoading(false);
      setIsSubmitted(true);
    }, 450);
  };

  return (
    <AuthLayout activePage="forgot-password">
      <div className="bg-[#052b1e]/90 backdrop-blur-xl border border-[#0d4f38] rounded-3xl p-6 sm:p-8 shadow-[0_24px_70px_rgba(1,16,11,0.7)] text-white">
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3 cursor-pointer" onClick={() => navigate('/')}>
            <Logo size="sm" variant="dark" showText={false} />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight">
            Forgot your password?
          </h2>
          <p className="text-xs text-[#8cb8a7] mt-1.5 leading-relaxed">
            Enter your email address and we'll help you securely reset your password.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/80 border border-red-500/50 text-xs text-red-200 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {isSubmitted ? (
          <div className="space-y-5 py-2">
            <div className="p-4 rounded-2xl bg-[#042017] border border-[#0d4f38] text-center">
              <div className="w-12 h-12 rounded-full bg-[#083325] text-[#34d399] flex items-center justify-center mx-auto mb-3 shadow-xs">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h3 className="text-sm font-bold text-white">Reset Link Dispatched</h3>
              <p className="text-xs text-[#8cb8a7] mt-1 leading-relaxed">
                We've sent a secure recovery link to <strong className="font-semibold text-white">{email}</strong>.
              </p>
            </div>

            <div className="space-y-2.5 pt-2">
              <button
                type="button"
                onClick={() => navigate(`/reset-password?email=${encodeURIComponent(email)}`)}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-[#ecc866] via-[#e5b842] to-[#d69f2e] hover:from-[#f3da87] hover:to-[#dfab38] text-[#052419] font-bold text-sm tracking-wide shadow-[0_6px_25px_rgba(229,184,66,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Proceed to Reset Password</span>
                <span className="text-base font-extrabold leading-none">→</span>
              </button>

              <button
                type="button"
                onClick={() => setIsSubmitted(false)}
                className="w-full py-2.5 rounded-xl border border-[#0d4532] text-xs font-semibold text-[#8cb8a7] hover:text-white hover:bg-[#072c20] transition-colors cursor-pointer"
              >
                Send to a different email
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#8cb8a7] mb-1.5" htmlFor="forgot-email">
                Registered Work Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#10b981] pointer-events-none" />
                <input
                  id="forgot-email"
                  type="email"
                  placeholder="analyst@finsight.ai"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full pl-10 pr-4 py-3 bg-[#031d14] border border-[#0d4f38] rounded-xl text-xs sm:text-sm text-white placeholder-[#457261] focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-[#10b981] transition-all"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-[#ecc866] via-[#e5b842] to-[#d69f2e] hover:from-[#f3da87] hover:to-[#dfab38] active:scale-[0.99] text-[#052419] font-bold text-sm tracking-wide shadow-[0_6px_25px_rgba(229,184,66,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed mt-2"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-[#052419] border-t-transparent rounded-full animate-spin" />
                  <span>Sending Link...</span>
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <span>Send Reset Link</span>
                  <span className="text-base font-extrabold leading-none">→</span>
                </span>
              )}
            </button>
          </form>
        )}

        {/* Back to Sign In */}
        <div className="text-center mt-6 pt-4 border-t border-[#093d2c]">
          <button
            type="button"
            onClick={() => navigate('/login')}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8cb8a7] hover:text-[#e5b842] transition-colors cursor-pointer group"
          >
            <span className="text-sm font-bold text-[#10b981] group-hover:-translate-x-0.5 transition-transform">←</span>
            <span>Back to Sign In</span>
          </button>
        </div>

      </div>
    </AuthLayout>
  );
};
