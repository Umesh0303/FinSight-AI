import React, { useState } from 'react';
import { Lock, Eye, EyeOff, ArrowRight, ArrowLeft, CheckCircle2, AlertCircle } from 'lucide-react';
import { Logo } from '../../components/brand/Logo';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { useApp } from '../../context/AppContext';

export const ResetPasswordPage: React.FC = () => {
  const { navigate } = useApp();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const hasMinLength = newPassword.length >= 8;
  const hasUpperCase = /[A-Z]/.test(newPassword);
  const hasNumberOrSpecial = /[0-9!@#$%^&*(),.?":{}|<>]/.test(newPassword);

  const strengthScore = [hasMinLength, hasUpperCase, hasNumberOrSpecial].filter(Boolean).length;
  const strengthLabels = ['Too Weak', 'Fair', 'Good', 'Strong'];
  const strengthColors = ['bg-red-500', 'bg-amber-500', 'bg-blue-500', 'bg-emerald-500'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!newPassword || !confirmPassword) {
      setErrorMsg('Please enter and confirm your new password.');
      return;
    }

    if (newPassword.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please verify.');
      return;
    }

    setIsLoading(true);

    try {
      const { supabase, recordAuditEvent } = await import('../../lib/supabase');
      if (supabase) {
        const { error } = await supabase.auth.updateUser({ password: newPassword });
        if (error) {
          setErrorMsg(error.message);
          setIsLoading(false);
          return;
        }
      }
      setIsLoading(false);
      setIsSuccess(true);
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err: any) {
      setIsLoading(false);
      setErrorMsg(err?.message || 'Password update failed.');
    }
  };

  return (
    <AuthLayout activePage="reset-password">
      <div className="bg-[#052b1e]/90 backdrop-blur-xl border border-[#0d4f38] rounded-3xl p-6 sm:p-8 shadow-[0_24px_70px_rgba(1,16,11,0.7)] text-white">
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3 cursor-pointer" onClick={() => navigate('/')}>
            <Logo size="sm" variant="dark" showText={false} />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight">
            Create a new password
          </h2>
          <p className="text-xs text-[#8cb8a7] mt-1.5 leading-relaxed">
            Choose a strong password to protect your financial intelligence workspace.
          </p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 rounded-xl bg-red-950/80 border border-red-500/50 text-xs text-red-200 flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <span>{errorMsg}</span>
          </div>
        )}

        {isSuccess ? (
          <div className="space-y-4 py-4 text-center">
            <div className="w-14 h-14 rounded-full bg-[#083325] text-[#34d399] flex items-center justify-center mx-auto shadow-xs">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-white">Password Updated Successfully</h3>
            <p className="text-xs text-[#8cb8a7] leading-relaxed max-w-xs mx-auto">
              Your security credentials have been updated. Redirecting you to Sign In...
            </p>
            <div className="pt-2">
              <button
                onClick={() => navigate('/login')}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-[#ecc866] via-[#e5b842] to-[#d69f2e] text-[#052419] font-bold text-sm shadow-md cursor-pointer"
              >
                Sign In Now →
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[#8cb8a7] mb-1" htmlFor="reset-new-password">
                New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#10b981] pointer-events-none" />
                <input
                  id="reset-new-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter new strong password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-10 py-3 bg-[#031d14] border border-[#0d4f38] rounded-xl text-xs sm:text-sm text-white placeholder-[#457261] focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-[#10b981] transition-all"
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

              {newPassword && (
                <div className="mt-2 space-y-1.5">
                  <div className="flex items-center justify-between text-[11px] text-[#8cb8a7]">
                    <span>Password strength:</span>
                    <span className="font-semibold text-white">{strengthLabels[strengthScore]}</span>
                  </div>
                  <div className="w-full h-1.5 bg-[#021811] rounded-full overflow-hidden flex gap-1">
                    <div className={`h-full transition-all duration-300 ${strengthScore >= 1 ? strengthColors[strengthScore] : 'bg-transparent'} flex-1`} />
                    <div className={`h-full transition-all duration-300 ${strengthScore >= 2 ? strengthColors[strengthScore] : 'bg-transparent'} flex-1`} />
                    <div className={`h-full transition-all duration-300 ${strengthScore >= 3 ? strengthColors[strengthScore] : 'bg-transparent'} flex-1`} />
                  </div>
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#8cb8a7] mb-1" htmlFor="reset-confirm-password">
                Confirm New Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#10b981] pointer-events-none" />
                <input
                  id="reset-confirm-password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Re-enter new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  className="w-full pl-10 pr-10 py-3 bg-[#031d14] border border-[#0d4f38] rounded-xl text-xs sm:text-sm text-white placeholder-[#457261] focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-[#10b981] transition-all"
                />
              </div>
            </div>

            <div className="p-3 bg-[#031d14] border border-[#0d4f38]/60 rounded-xl text-[11px] text-[#8cb8a7] space-y-1">
              <span className="font-semibold text-white block">Password Requirements:</span>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${hasMinLength ? 'bg-[#10b981]' : 'bg-slate-600'}`} />
                <span className={hasMinLength ? 'text-[#34d399] font-medium' : ''}>At least 8 characters</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${hasUpperCase ? 'bg-[#10b981]' : 'bg-slate-600'}`} />
                <span className={hasUpperCase ? 'text-[#34d399] font-medium' : ''}>Contains uppercase letter</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${hasNumberOrSpecial ? 'bg-[#10b981]' : 'bg-slate-600'}`} />
                <span className={hasNumberOrSpecial ? 'text-[#34d399] font-medium' : ''}>Contains number or special character</span>
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
                  <span>Updating Password...</span>
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <span>Update Password</span>
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
