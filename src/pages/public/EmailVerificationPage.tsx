import React, { useState, useRef, useEffect } from 'react';
import { ArrowRight, ArrowLeft, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { Logo } from '../../components/brand/Logo';
import { AuthLayout } from '../../components/layout/AuthLayout';
import { useApp } from '../../context/AppContext';

export const EmailVerificationPage: React.FC = () => {
  const { navigate } = useApp();
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [countdown, setCountdown] = useState(45);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleChange = (index: number, value: string) => {
    if (!/^[0-9]?$/.test(value)) return;
    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').slice(0, 6);
    if (!/^\d+$/.test(pasted)) return;
    const newDigits = [...digits];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setDigits(newDigits);
    inputRefs.current[Math.min(pasted.length, 5)]?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const code = digits.join('');
    if (code.length < 6) {
      setErrorMsg('Please enter all 6 digits of the verification code.');
      return;
    }

    setIsLoading(true);
    setErrorMsg('');

    setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);
      setTimeout(() => {
        navigate('/app/pending');
      }, 1500);
    }, 500);
  };

  const handleResend = () => {
    if (countdown > 0) return;
    setCountdown(60);
    setErrorMsg('');
  };

  return (
    <AuthLayout activePage="verify-email">
      <div className="bg-[#052b1e]/90 backdrop-blur-xl border border-[#0d4f38] rounded-3xl p-6 sm:p-8 shadow-[0_24px_70px_rgba(1,16,11,0.7)] text-white">
        
        {/* Header */}
        <div className="text-center mb-6">
          <div className="flex justify-center mb-3 cursor-pointer" onClick={() => navigate('/')}>
            <Logo size="sm" variant="dark" showText={false} />
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold font-heading text-white tracking-tight">
            Verify your email address
          </h2>
          <p className="text-xs text-[#8cb8a7] mt-1.5 leading-relaxed">
            Enter the 6-digit confirmation code dispatched to your institutional address.
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
            <h3 className="text-base font-bold text-white">Email Verified Successfully</h3>
            <p className="text-xs text-[#8cb8a7] leading-relaxed max-w-xs mx-auto">
              Your security clearance token has been validated. Entering workspace...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-semibold text-[#8cb8a7] mb-2 text-center">
                6-Digit Security Token
              </label>
              <div className="flex justify-center gap-2 sm:gap-2.5" onPaste={handlePaste}>
                {digits.map((digit, idx) => (
                  <input
                    key={idx}
                    ref={(el) => { inputRefs.current[idx] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    className="w-11 h-12 sm:w-12 sm:h-13 text-center text-lg sm:text-xl font-mono font-bold bg-[#031d14] border border-[#0d4f38] rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-[#10b981] focus:border-[#10b981] transition-all"
                  />
                ))}
              </div>
            </div>

            <div className="text-center text-xs text-[#8cb8a7]">
              {countdown > 0 ? (
                <span>Resend new code in <strong className="font-mono text-[#e5b842]">{countdown}s</strong></span>
              ) : (
                <button
                  type="button"
                  onClick={handleResend}
                  className="font-semibold text-[#e5b842] hover:underline cursor-pointer inline-flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Resend verification code</span>
                </button>
              )}
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-[#ecc866] via-[#e5b842] to-[#d69f2e] hover:from-[#f3da87] hover:to-[#dfab38] active:scale-[0.99] text-[#052419] font-bold text-sm tracking-wide shadow-[0_6px_25px_rgba(229,184,66,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-[#052419] border-t-transparent rounded-full animate-spin" />
                  <span>Verifying Token...</span>
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <span>Confirm & Continue</span>
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
