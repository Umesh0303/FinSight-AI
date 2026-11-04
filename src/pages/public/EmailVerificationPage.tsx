import React, { useState, useEffect } from 'react';
import { Mail, ArrowRight, RefreshCw, CheckCircle2, AlertCircle, Clock } from 'lucide-react';
import { Logo } from '../../components/brand/Logo';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { useApp } from '../../context/AppContext';
import { supabase, recordAuditEvent } from '../../lib/supabase';

type VerificationState = 'checking' | 'success' | 'expired' | 'invalid' | 'idle';

export const EmailVerificationPage: React.FC = () => {
  const { navigate, resendVerificationEmail } = useApp();
  const [status, setStatus] = useState<VerificationState>('checking');
  const [emailInput, setEmailInput] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [redirectCountdown, setRedirectCountdown] = useState(5);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resendNotice, setResendNotice] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isResending, setIsResending] = useState(false);

  // Auto-redirect countdown when verification succeeds
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (status === 'success' && redirectCountdown > 0) {
      timer = setTimeout(() => {
        setRedirectCountdown((prev) => prev - 1);
      }, 1000);
    } else if (status === 'success' && redirectCountdown === 0) {
      navigate('/login');
    }
    return () => clearTimeout(timer);
  }, [status, redirectCountdown, navigate]);

  // Resend cooldown timer
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown((prev) => prev - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  // Inspect incoming verification parameters from Supabase email link
  useEffect(() => {
    let isMounted = true;

    const processVerification = async () => {
      if (typeof window === 'undefined') return;

      const searchParams = new URLSearchParams(window.location.search);
      const hash = window.location.hash.startsWith('#') ? window.location.hash.substring(1) : window.location.hash;
      const hashParams = new URLSearchParams(hash);

      const code = searchParams.get('code');
      const token = searchParams.get('token');
      const type = searchParams.get('type') || hashParams.get('type');
      const isVerifiedParam = searchParams.get('verified') === 'true';
      const error = hashParams.get('error') || searchParams.get('error');
      const errorCode = hashParams.get('error_code') || searchParams.get('error_code');
      const errorDesc = hashParams.get('error_description') || searchParams.get('error_description');
      const storedPendingEmail = typeof window !== 'undefined' ? sessionStorage.getItem('pending_verification_email') || '' : '';
      const urlEmail = searchParams.get('email') || hashParams.get('email') || storedPendingEmail;

      if (urlEmail && isMounted) {
        setEmailInput(urlEmail);
      }

      // Helper to mark email as verified on server
      const notifyServerVerified = async (targetEmail: string) => {
        if (!targetEmail) return;
        try {
          await fetch('/api/auth/mark-verified', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: targetEmail.trim().toLowerCase() })
          });
          sessionStorage.removeItem('pending_verification_email');
        } catch (e) {
          console.warn('[AUTH_VERIFY] Failed to notify mark-verified:', e);
        }
      };

      // 1. Detect explicit error returned by Supabase Auth (e.g. expired or invalid OTP)
      if (error || errorCode) {
        const decodedDesc = errorDesc ? decodeURIComponent(errorDesc.replace(/\+/g, ' ')) : '';
        const isExpired = errorCode === 'otp_expired' || decodedDesc.toLowerCase().includes('expired');

        if (isMounted) {
          if (isExpired) {
            setStatus('expired');
            setErrorMessage('Your verification link has expired or has already been used. Please request a new verification link below.');
          } else {
            setStatus('invalid');
            setErrorMessage(decodedDesc || 'The verification link provided is invalid or corrupted. Please request a new link.');
          }
        }
        return;
      }

      // 2. Direct verified parameter confirmation (callback redirect)
      if (isVerifiedParam && urlEmail) {
        await notifyServerVerified(urlEmail);
        try {
          if (supabase) await supabase.auth.signOut();
        } catch {}
        localStorage.removeItem('finsight_token');
        if (isMounted) {
          setStatus('success');
        }
        return;
      }

      // 3. PKCE verification flow: Exchange code for verified session
      if (code) {
        if (supabase) {
          try {
            const { data, error: exchangeErr } = await supabase.auth.exchangeCodeForSession(code);
            if (!isMounted) return;

            if (exchangeErr) {
              console.warn('[AUTH_VERIFY] Code exchange failed:', exchangeErr.message);
              const errLower = exchangeErr.message.toLowerCase();
              if (errLower.includes('expired') || errLower.includes('otp_expired')) {
                setStatus('expired');
                setErrorMessage('Your verification link has expired or has already been used. Please request a new verification link below.');
              } else {
                setStatus('invalid');
                setErrorMessage(exchangeErr.message || 'The verification link is invalid. Please request a new link.');
              }
              return;
            }

            // Successfully verified!
            const verifiedEmail = data?.user?.email || urlEmail;
            if (verifiedEmail) {
              setEmailInput(verifiedEmail);
              await notifyServerVerified(verifiedEmail);
              recordAuditEvent({
                email: verifiedEmail,
                eventType: 'email_verified',
                success: true,
                userId: data?.user?.id
              });
            }

            // CRITICAL: Strictly ensure user logs in normally with credentials
            try {
              await supabase.auth.signOut();
            } catch {}
            localStorage.removeItem('finsight_token');

            setStatus('success');
            return;
          } catch (err: any) {
            if (!isMounted) return;
            setStatus('invalid');
            setErrorMessage(err?.message || 'Failed to exchange verification code.');
            return;
          }
        }
      }

      // 4. Hash fragment flow or active session verification
      if (supabase) {
        try {
          const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
          if (!isMounted) return;

          if (session?.user && session.user.email_confirmed_at && !sessionErr) {
            const verifiedEmail = session.user.email || urlEmail;
            if (verifiedEmail) {
              setEmailInput(verifiedEmail);
              await notifyServerVerified(verifiedEmail);
              recordAuditEvent({
                email: verifiedEmail,
                eventType: 'email_verified',
                success: true,
                userId: session.user.id
              });
            }

            // Disconnect session so user logs in cleanly through the standard login page
            try {
              await supabase.auth.signOut();
            } catch {}
            localStorage.removeItem('finsight_token');

            setStatus('success');
            return;
          }
        } catch (err) {
          console.warn('[AUTH_VERIFY] Session verification check notice:', err);
        }
      }

      // 4. Default idle view (user arrived directly or via registration confirmation)
      if (isMounted) {
        setStatus('idle');
      }
    };

    processVerification();

    return () => {
      isMounted = false;
    };
  }, []);

  const handleResend = async () => {
    const target = emailInput.trim().toLowerCase();
    if (!target || !target.includes('@')) {
      setResendNotice({ type: 'error', message: 'Please enter a valid work email address.' });
      return;
    }

    if (resendCooldown > 0 || isResending) return;

    setIsResending(true);
    setResendNotice(null);
    try {
      const res = await resendVerificationEmail(target);
      if (res.success) {
        setResendCooldown(60);
        setResendNotice({ type: 'success', message: 'A fresh verification link has been sent to your email address.' });
      } else {
        setResendNotice({ type: 'error', message: res.message || 'Failed to resend verification email.' });
      }
    } catch (err: any) {
      setResendNotice({ type: 'error', message: err?.message || 'Error sending verification link.' });
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthLayout activePage="verify-email">
      <div className="bg-[#052b1e]/90 backdrop-blur-xl border border-[#0d4f38] rounded-3xl p-6 sm:p-8 shadow-[0_24px_70px_rgba(1,16,11,0.7)] text-white">
        
        {/* =========================================================================
            STATE 1: CHECKING / VALIDATING TOKEN
            ========================================================================= */}
        {status === 'checking' && (
          <div className="text-center py-8 space-y-4">
            <div className="flex justify-center mb-3 cursor-pointer" onClick={() => navigate('/')}>
              <Logo size="sm" variant="dark" showText={false} />
            </div>
            <div className="w-16 h-16 rounded-2xl bg-[#031d14] border border-[#10b981]/30 flex items-center justify-center mx-auto text-[#10b981] animate-pulse">
              <span className="w-8 h-8 border-3 border-[#10b981] border-t-transparent rounded-full animate-spin" />
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold font-heading text-white">
              Validating Verification Link
            </h2>
            <p className="text-xs text-[#8cb8a7] max-w-xs mx-auto leading-relaxed">
              Verifying your email token with Supabase Security Engine...
            </p>
          </div>
        )}

        {/* =========================================================================
            STATE 2: SUCCESSFUL VERIFICATION (MANDATORY EXACT TEXT)
            ========================================================================= */}
        {status === 'success' && (
          <div className="text-center py-4 space-y-4">
            <div className="flex justify-center mb-3 cursor-pointer" onClick={() => navigate('/')}>
              <Logo size="sm" variant="dark" showText={false} />
            </div>

            <div className="w-16 h-16 rounded-2xl bg-[#031d14] border border-[#10b981]/40 flex items-center justify-center mx-auto text-[#10b981] shadow-[0_0_25px_rgba(16,185,129,0.25)]">
              <CheckCircle2 className="w-9 h-9" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight">
              Email Verified Successfully!
            </h2>

            <p className="text-xs sm:text-sm text-[#8cb8a7] leading-relaxed max-w-sm mx-auto">
              Your email address has been verified. You can now log in to FinSight AI.
            </p>

            <div className="pt-2 pb-1">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#031d14] border border-[#0d4f38] text-[11px] text-[#deb03e] font-mono">
                <Clock className="w-3 h-3 text-[#deb03e]" />
                <span>Redirecting to sign in within {redirectCountdown}s</span>
              </span>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-[#ecc866] via-[#e5b842] to-[#d69f2e] hover:from-[#f3da87] hover:to-[#dfab38] active:scale-[0.99] text-[#052419] font-bold text-sm tracking-wide shadow-[0_6px_25px_rgba(229,184,66,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Log In to FinSight AI</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            STATE 3: EXPIRED LINK
            ========================================================================= */}
        {status === 'expired' && (
          <div className="text-center py-2 space-y-4">
            <div className="flex justify-center mb-3 cursor-pointer" onClick={() => navigate('/')}>
              <Logo size="sm" variant="dark" showText={false} />
            </div>

            <div className="w-16 h-16 rounded-2xl bg-[#031d14] border border-amber-500/40 flex items-center justify-center mx-auto text-amber-400">
              <Clock className="w-8 h-8" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight">
              Verification Link Expired
            </h2>

            <p className="text-xs sm:text-sm text-[#8cb8a7] leading-relaxed max-w-sm mx-auto">
              {errorMessage || 'Your verification link has expired or has already been used. Please request a new verification link below.'}
            </p>

            {resendNotice && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center justify-center gap-2 ${
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

            <div className="space-y-3 pt-2 text-left">
              <div>
                <label className="block text-xs font-semibold text-[#8cb8a7] mb-1" htmlFor="resend-email">
                  Work Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#10b981] pointer-events-none" />
                  <input
                    id="resend-email"
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="name@financial-institution.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#031d14] border border-[#0d4f38] rounded-xl text-xs sm:text-sm text-white placeholder-[#457261] focus:outline-none focus:ring-2 focus:ring-[#10b981] transition-all"
                  />
                </div>
              </div>

              <button
                type="button"
                disabled={isResending || resendCooldown > 0 || !emailInput}
                onClick={handleResend}
                className="w-full py-3 px-4 rounded-xl bg-[#031d14] hover:bg-[#073626] border border-[#0d4f38] text-xs sm:text-sm font-semibold text-[#8cb8a7] hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {isResending ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                    <span>Sending New Link...</span>
                  </>
                ) : resendCooldown > 0 ? (
                  <>
                    <Clock className="w-3.5 h-3.5 text-[#deb03e]" />
                    <span>Resend in {resendCooldown}s</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 text-[#10b981]" />
                    <span>Resend Verification Email</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#ecc866] via-[#e5b842] to-[#d69f2e] hover:from-[#f3da87] hover:to-[#dfab38] text-[#052419] font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Return to Login</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            STATE 4: INVALID LINK
            ========================================================================= */}
        {status === 'invalid' && (
          <div className="text-center py-2 space-y-4">
            <div className="flex justify-center mb-3 cursor-pointer" onClick={() => navigate('/')}>
              <Logo size="sm" variant="dark" showText={false} />
            </div>

            <div className="w-16 h-16 rounded-2xl bg-[#031d14] border border-red-500/40 flex items-center justify-center mx-auto text-red-400">
              <AlertCircle className="w-8 h-8" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight">
              Invalid Verification Link
            </h2>

            <p className="text-xs sm:text-sm text-[#8cb8a7] leading-relaxed max-w-sm mx-auto">
              {errorMessage || 'The verification link provided is invalid or incomplete. Please request a new verification link below.'}
            </p>

            {resendNotice && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center justify-center gap-2 ${
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

            <div className="space-y-3 pt-2 text-left">
              <div>
                <label className="block text-xs font-semibold text-[#8cb8a7] mb-1" htmlFor="resend-invalid-email">
                  Work Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#10b981] pointer-events-none" />
                  <input
                    id="resend-invalid-email"
                    type="email"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    placeholder="name@financial-institution.com"
                    className="w-full pl-10 pr-4 py-2.5 bg-[#031d14] border border-[#0d4f38] rounded-xl text-xs sm:text-sm text-white placeholder-[#457261] focus:outline-none focus:ring-2 focus:ring-[#10b981] transition-all"
                  />
                </div>
              </div>

              <button
                type="button"
                disabled={isResending || resendCooldown > 0 || !emailInput}
                onClick={handleResend}
                className="w-full py-3 px-4 rounded-xl bg-[#031d14] hover:bg-[#073626] border border-[#0d4f38] text-xs sm:text-sm font-semibold text-[#8cb8a7] hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {isResending ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                    <span>Sending New Link...</span>
                  </>
                ) : resendCooldown > 0 ? (
                  <>
                    <Clock className="w-3.5 h-3.5 text-[#deb03e]" />
                    <span>Resend in {resendCooldown}s</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 text-[#10b981]" />
                    <span>Resend Verification Email</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#ecc866] via-[#e5b842] to-[#d69f2e] hover:from-[#f3da87] hover:to-[#dfab38] text-[#052419] font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Return to Login</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* =========================================================================
            STATE 5: IDLE / CHECK YOUR EMAIL GUIDANCE
            ========================================================================= */}
        {status === 'idle' && (
          <div className="text-center py-2 space-y-4">
            <div className="flex justify-center mb-3 cursor-pointer" onClick={() => navigate('/')}>
              <Logo size="sm" variant="dark" showText={false} />
            </div>

            <div className="w-16 h-16 rounded-2xl bg-[#031d14] border border-[#10b981]/30 flex items-center justify-center mx-auto text-[#10b981] shadow-inner">
              <Mail className="w-8 h-8" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight">
              Check Your Email
            </h2>

            <p className="text-xs sm:text-sm text-[#8cb8a7] leading-relaxed max-w-sm mx-auto">
              We've sent a verification link to your registered email address. Please check your inbox and click the link to activate your FinSight AI account.
            </p>

            {emailInput && (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#031d14] border border-[#0d4f38] text-xs font-mono text-[#deb03e]">
                <Mail className="w-3.5 h-3.5 text-[#10b981]" />
                <span>{emailInput}</span>
              </div>
            )}

            {resendNotice && (
              <div
                className={`p-3 rounded-xl text-xs flex items-center justify-center gap-2 ${
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

            <div className="space-y-3 pt-2 text-left">
              {!emailInput && (
                <div>
                  <label className="block text-xs font-semibold text-[#8cb8a7] mb-1" htmlFor="idle-email">
                    Work Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-[#10b981] pointer-events-none" />
                    <input
                      id="idle-email"
                      type="email"
                      value={emailInput}
                      onChange={(e) => setEmailInput(e.target.value)}
                      placeholder="name@financial-institution.com"
                      className="w-full pl-10 pr-4 py-2.5 bg-[#031d14] border border-[#0d4f38] rounded-xl text-xs sm:text-sm text-white placeholder-[#457261] focus:outline-none focus:ring-2 focus:ring-[#10b981] transition-all"
                    />
                  </div>
                </div>
              )}

              <button
                type="button"
                disabled={isResending || resendCooldown > 0 || !emailInput}
                onClick={handleResend}
                className="w-full py-3 px-4 rounded-xl bg-[#031d14] hover:bg-[#073626] border border-[#0d4f38] text-xs sm:text-sm font-semibold text-[#8cb8a7] hover:text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 cursor-pointer"
              >
                {isResending ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" />
                    <span>Sending Verification Email...</span>
                  </>
                ) : resendCooldown > 0 ? (
                  <>
                    <Clock className="w-3.5 h-3.5 text-[#deb03e]" />
                    <span>Resend in {resendCooldown}s</span>
                  </>
                ) : (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 text-[#10b981]" />
                    <span>Resend Verification Email</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={() => navigate('/login')}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-[#ecc866] via-[#e5b842] to-[#d69f2e] hover:from-[#f3da87] hover:to-[#dfab38] text-[#052419] font-bold text-xs sm:text-sm shadow-md transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Return to Login</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

      </div>
    </AuthLayout>
  );
};
