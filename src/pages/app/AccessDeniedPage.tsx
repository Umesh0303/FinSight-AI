import React from 'react';
import { ShieldX, ArrowLeft, Home } from 'lucide-react';
import { Logo } from '../../components/brand/Logo';
import { Button } from '../../components/ui/Button';
import { useApp } from '../../context/AppContext';

export const AccessDeniedPage: React.FC<{ requiredRole?: string }> = ({
  requiredRole = 'Platform Administrator'
}) => {
  const { currentUser, navigate } = useApp();

  const handleReturn = () => {
    if (currentUser.role === 'ADMIN') navigate('/app/admin');
    else if (currentUser.role === 'BUSINESS_ANALYST') navigate('/app/analyst');
    else if (currentUser.role === 'CUSTOMER') navigate('/app/customer');
    else if (currentUser.role === 'RISK_FRAUD_ANALYST') navigate('/app/risk');
    else navigate('/');
  };

  return (
    <div className="min-h-screen bg-[#faf8f4] flex flex-col justify-between py-12 px-4 sm:px-6 relative overflow-hidden">
      <div className="max-w-xl w-full mx-auto flex items-center justify-between mb-8 relative z-10">
        <Logo size="md" variant="light" showText={true} />
        <Button variant="outline" size="sm" onClick={() => navigate('/')}>
          Home
        </Button>
      </div>

      <div className="max-w-lg w-full mx-auto bg-white border border-[#f3d1d1] rounded-3xl p-8 shadow-[0_4px_24px_rgba(220,38,38,0.06)] relative z-10 my-auto text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-50 border border-red-200 text-red-600 flex items-center justify-center mx-auto mb-5 shadow-xs">
          <ShieldX className="w-8 h-8" />
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-red-900">
          Access Denied
        </h1>
        <p className="text-sm font-semibold text-red-700 mt-1">
          Restricted Institutional Area
        </p>

        <p className="text-xs text-slate-600 mt-4 leading-relaxed">
          Your current account (<strong className="text-slate-800">{currentUser.email}</strong>) has the assigned role of <strong className="text-slate-800">{currentUser.roleTitle}</strong>.
          This section requires <strong className="text-red-700">{requiredRole}</strong> clearance under FinSight AI data isolation policies.
        </p>

        <div className="mt-8 flex items-center justify-center gap-3">
          <Button
            variant="emerald"
            size="md"
            onClick={handleReturn}
            leftIcon={<ArrowLeft className="w-4 h-4" />}
          >
            Return to My Workspace
          </Button>
          <Button
            variant="outline"
            size="md"
            onClick={() => navigate('/')}
            leftIcon={<Home className="w-4 h-4" />}
          >
            Home Page
          </Button>
        </div>
      </div>

      <div className="text-center text-xs text-slate-400 mt-8 relative z-10">
        FinSight AI Zero-Trust Access Control
      </div>
    </div>
  );
};
