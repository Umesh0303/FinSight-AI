import React from 'react';
import { Clock, ShieldAlert, CheckCircle2, LogOut, ArrowLeft } from 'lucide-react';
import { Logo } from '../../components/brand/Logo';
import { Button } from '../../components/ui/Button';
import { useApp } from '../../context/AppContext';

export const PendingPage: React.FC = () => {
  const { currentUser, logout, navigate } = useApp();

  return (
    <div className="min-h-screen bg-[#faf8f4] flex flex-col justify-between py-12 px-4 sm:px-6 relative overflow-hidden">
      {/* Background swooshes */}
      <div className="absolute top-0 left-0 right-0 h-40 bg-gradient-to-b from-[#ebf5f0] to-transparent pointer-events-none" />

      {/* Header */}
      <div className="max-w-xl w-full mx-auto flex items-center justify-between mb-8 relative z-10">
        <Logo size="md" variant="light" showText={true} />
        <Button
          variant="outline"
          size="sm"
          onClick={logout}
          leftIcon={<LogOut className="w-3.5 h-3.5" />}
        >
          Sign Out
        </Button>
      </div>

      {/* Main Card */}
      <div className="max-w-xl w-full mx-auto bg-white border border-[#eae4d7] rounded-3xl p-8 shadow-[0_4px_24px_rgba(10,38,28,0.06)] relative z-10 my-auto text-center">
        <div className="w-16 h-16 rounded-2xl bg-[#fffbeb] border border-[#fde68a] text-[#b45309] flex items-center justify-center mx-auto mb-5 shadow-xs">
          <Clock className="w-8 h-8 text-[#d97706] animate-pulse" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-[#09261c]">
          Account Created Successfully
        </h1>
        <p className="text-sm font-semibold text-[#b45309] mt-1">
          Your access is pending administrator assignment
        </p>

        <p className="text-xs text-slate-600 mt-4 leading-relaxed max-w-md mx-auto">
          Welcome, <strong className="text-slate-800">{currentUser.name}</strong>. In accordance with institutional fintech governance, user roles must be verified and assigned by the platform administrator before financial telemetry or customer records can be accessed.
        </p>

        {/* Account Details Box */}
        <div className="my-6 p-4 rounded-2xl bg-[#faf7f0] border border-[#eee8da] text-xs text-left space-y-2.5">
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Account Email:</span>
            <span className="font-semibold text-slate-800 font-mono">{currentUser.email}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Current Role:</span>
            <span className="font-semibold px-2 py-0.5 rounded bg-[#fef3c7] text-[#92400e]">
              UNASSIGNED (Pending Admin)
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Account Status:</span>
            <span className="font-semibold px-2 py-0.5 rounded bg-[#fef3c7] text-[#92400e]">
              {currentUser.accountStatus}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-slate-500">Registration Date:</span>
            <span className="text-slate-700">{currentUser.createdDate}</span>
          </div>
        </div>

        {/* Next Steps */}
        <div className="text-left text-xs text-slate-600 p-4 rounded-2xl bg-[#f0f8f4] border border-[#bbf0db] space-y-2">
          <h4 className="font-bold text-[#0a4834] uppercase tracking-wider text-[11px]">
            What happens next?
          </h4>
          <p>
            1. The Platform Administrator (<span className="font-mono text-[#0a4834]">admin@finsight.ai</span>) reviews your identity credentials.
          </p>
          <p>
            2. You will be provisioned access to either the <strong>Business Analyst</strong>, <strong>Customer</strong>, or <strong>Risk & Fraud</strong> portal.
          </p>
          <p>
            3. Upon role assignment, your next sign-in will automatically route directly to your assigned workspace.
          </p>
        </div>

        {/* Actions */}
        <div className="mt-8 flex items-center justify-center gap-3">
          <Button
            variant="emerald"
            size="md"
            onClick={() => navigate('/')}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Return to Home
          </Button>
          <Button
            variant="outline"
            size="md"
            onClick={logout}
            leftIcon={<LogOut className="w-4 h-4" />}
          >
            Sign Out
          </Button>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-slate-400 mt-8 relative z-10">
        FinSight AI Enterprise Security · Strict Role-Based Access Governance
      </div>
    </div>
  );
};
