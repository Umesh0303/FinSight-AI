import React, { useState } from 'react';
import { X, Lock, KeyRound, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface AdminSetupPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminSetupPasswordModal: React.FC<AdminSetupPasswordModalProps> = ({
  isOpen,
  onClose
}) => {
  const { setupInitialAdminPassword } = useApp();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    if (password.length < 8) {
      setErrorMsg('Password must be at least 8 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter.');
      return;
    }

    setIsLoading(true);
    const res = await setupInitialAdminPassword(password);
    setIsLoading(false);

    if (!res.success) {
      setErrorMsg(res.error || 'Failed to setup password.');
    } else {
      setSuccessMsg(res.message || 'Administrator password configured securely.');
      setTimeout(() => {
        onClose();
      }, 1500);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-[#e2dcd0] overflow-hidden text-slate-800">
        <div className="p-6 border-b border-[#ece7dc] bg-[#faf7f0] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0d5941]/10 text-[#0d5941] flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-base text-[#09261c]">
                Setup Initial Admin Password
              </h3>
              <p className="text-xs text-slate-500 font-mono">admindashboard5@gmail.com</p>
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

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          <div className="p-3 bg-[#fbf9f4] border border-[#ece7dc] rounded-xl text-[11px] text-slate-600 leading-relaxed">
            <div className="flex items-center gap-1.5 font-semibold text-[#092b1f] mb-0.5">
              <ShieldCheck className="w-3.5 h-3.5 text-[#0d5941]" />
              <span>Secure One-Time Credential Initialization</span>
            </div>
            Set the master password for <strong className="font-mono text-slate-800">admindashboard5@gmail.com</strong>.
            The server encrypts and salts this credential via scrypt. Plaintext passwords are never stored.
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              New Master Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                placeholder="At least 8 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2 bg-white border border-[#ded8cb] rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0d5941]"
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1">
              Confirm Master Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="password"
                placeholder="Confirm password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="w-full pl-10 pr-4 py-2 bg-white border border-[#ded8cb] rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#0d5941]"
              />
            </div>
          </div>

          <div className="pt-2 flex items-center justify-between">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading || !password || !confirmPassword}
              className="px-5 py-2.5 rounded-xl bg-[#0d5941] hover:bg-[#0a4633] text-white text-xs font-bold shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              {isLoading ? 'Saving Credential...' : 'Set Password & Sign In'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
