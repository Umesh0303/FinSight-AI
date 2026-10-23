import React, { useState } from 'react';
import { X, CheckCircle2, ShieldCheck, User, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface GoogleAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
}

export const GoogleAuthModal: React.FC<GoogleAuthModalProps> = ({
  isOpen,
  onClose,
  title = 'Continue with Google'
}) => {
  const { loginWithGoogle } = useApp();
  const [selectedPreset, setSelectedPreset] = useState<string>('admindashboard5@gmail.com');
  const [customEmail, setCustomEmail] = useState<string>('');
  const [customName, setCustomName] = useState<string>('');
  const [isCustom, setIsCustom] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGoogleSubmit = async (emailToUse: string, nameToUse?: string) => {
    setIsLoading(true);
    setErrorMsg(null);

    const res = await loginWithGoogle(emailToUse, nameToUse || emailToUse.split('@')[0]);
    setIsLoading(false);

    if (!res.success) {
      setErrorMsg(res.message || 'Google authentication failed.');
    } else {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-[#e2dcd0] overflow-hidden text-slate-800">
        {/* Google Header */}
        <div className="p-6 border-b border-[#ece7dc] bg-[#faf7f0] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <svg className="w-6 h-6 flex-shrink-0" viewBox="0 0 24 24" aria-hidden="true">
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
            <div>
              <h3 className="font-heading font-bold text-base text-[#09261c]">{title}</h3>
              <p className="text-xs text-slate-500">Google Identity Authentication Service</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <p className="text-xs text-slate-600">
            Select a verified Google Identity or enter your Google Workspace email to continue to FinSight AI.
          </p>

          {/* Account Choices */}
          <div className="space-y-2.5">
            {/* 1. Initial Admin Identity */}
            <div
              onClick={() => {
                setSelectedPreset('admindashboard5@gmail.com');
                setIsCustom(false);
              }}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between ${
                !isCustom && selectedPreset === 'admindashboard5@gmail.com'
                  ? 'border-[#0d5941] bg-[#ebf5f0] ring-2 ring-[#0d5941]/20'
                  : 'border-[#e5dfd2] hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-[#0d4a36] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  AD
                </div>
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-xs text-[#062017]">admindashboard5@gmail.com</span>
                    <span className="px-1.5 py-0.2 rounded-full text-[9px] font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Verified Admin
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500">Platform Administrator Identity</span>
                </div>
              </div>
              <ShieldCheck className="w-4 h-4 text-[#0d5941]" />
            </div>

            {/* 2. Custom Google User */}
            <div
              onClick={() => setIsCustom(true)}
              className={`p-3.5 rounded-2xl border transition-all cursor-pointer ${
                isCustom
                  ? 'border-[#0d5941] bg-[#faf7f0] ring-2 ring-[#0d5941]/20'
                  : 'border-[#e5dfd2] hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <User className="w-4 h-4 text-slate-500" />
                  <span className="font-semibold text-xs text-slate-800">Use Another Google Account</span>
                </div>
                {isCustom && <CheckCircle2 className="w-4 h-4 text-[#0d5941]" />}
              </div>

              {isCustom && (
                <div className="space-y-2 mt-3 pt-2 border-t border-[#ece7dc]">
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">
                      Google Email Address
                    </label>
                    <input
                      type="email"
                      placeholder="e.g. yourname@gmail.com"
                      value={customEmail}
                      onChange={(e) => setCustomEmail(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#ded8cb] rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0d5941]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-slate-600 block mb-1">
                      Display Name (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. John Doe"
                      value={customName}
                      onChange={(e) => setCustomName(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-[#ded8cb] rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0d5941]"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-[#faf7f0] border-t border-[#ece7dc] flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
          >
            Cancel
          </button>
          <button
            disabled={isLoading || (isCustom && !customEmail.trim())}
            onClick={() => {
              if (isCustom) {
                handleGoogleSubmit(customEmail, customName);
              } else {
                handleGoogleSubmit(selectedPreset);
              }
            }}
            className="px-5 py-2.5 rounded-xl bg-[#0d5941] hover:bg-[#0a4633] text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50 flex items-center gap-2"
          >
            {isLoading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Authenticating...</span>
              </>
            ) : (
              <span>Continue</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
