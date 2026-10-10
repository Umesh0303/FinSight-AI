import React, { useState } from 'react';
import { User, Shield, Bell, Sliders, Check } from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { Button } from '../../components/ui/Button';
import { useApp } from '../../context/AppContext';

export const SettingsPage: React.FC = () => {
  const { currentUser, currentRole } = useApp();
  const [saved, setSaved] = useState(false);
  const [fraudThreshold, setFraudThreshold] = useState(75);
  const [emailAlerts, setEmailAlerts] = useState(true);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <AppLayout
      title="Settings & System Configuration"
      subtitle="Manage workspace preferences, risk thresholds, and compliance controls."
    >
      <div className="max-w-4xl space-y-6">
        {/* Profile Card */}
        <div className="bg-white border border-[#ece7dc] rounded-2xl p-6 shadow-xs">
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[#f0ece1]">
            <User className="w-5 h-5 text-[#0d5941]" />
            <h3 className="font-heading font-semibold text-base text-[#092b1e]">User Profile & Identity</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="text-slate-500 font-medium block mb-1">Full Name</label>
              <input
                type="text"
                defaultValue={currentUser.name}
                className="w-full px-3 py-2 bg-[#faf7f0] border border-[#e5dfd2] rounded-xl text-slate-800"
              />
            </div>
            <div>
              <label className="text-slate-500 font-medium block mb-1">Email Address</label>
              <input
                type="email"
                defaultValue={currentUser.email}
                className="w-full px-3 py-2 bg-[#faf7f0] border border-[#e5dfd2] rounded-xl text-slate-800"
              />
            </div>
            <div>
              <label className="text-slate-500 font-medium block mb-1">Assigned Role</label>
              <input
                type="text"
                disabled
                value={`${currentUser.roleTitle} (${currentRole})`}
                className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 font-medium"
              />
            </div>
            <div>
              <label className="text-slate-500 font-medium block mb-1">Data Isolation Policy</label>
              <input
                type="text"
                disabled
                value="Enforced (Synthetic Prototype)"
                className="w-full px-3 py-2 bg-slate-100 border border-slate-200 rounded-xl text-slate-500"
              />
            </div>
          </div>
        </div>

        {/* Model Thresholds */}
        <div className="bg-white border border-[#ece7dc] rounded-2xl p-6 shadow-xs">
          <div className="flex items-center gap-3 mb-4 pb-3 border-b border-[#f0ece1]">
            <Sliders className="w-5 h-5 text-[#0d5941]" />
            <h3 className="font-heading font-semibold text-base text-[#092b1e]">Risk Model Sensitivity</h3>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <div className="flex justify-between mb-1">
                <span className="font-medium text-slate-700">Fraud Alert Score Trigger: {fraudThreshold}/100</span>
                <span className="text-slate-500">Transactions above this score trigger immediate alerts</span>
              </div>
              <input
                type="range"
                min="40"
                max="95"
                value={fraudThreshold}
                onChange={(e) => setFraudThreshold(Number(e.target.value))}
                className="w-full accent-[#0d5941]"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <div>
                <span className="font-medium text-slate-800 block">Instant Email Escalations</span>
                <span className="text-slate-500">Send notifications on high-severity alerts</span>
              </div>
              <input
                type="checkbox"
                checked={emailAlerts}
                onChange={(e) => setEmailAlerts(e.target.checked)}
                className="w-4 h-4 accent-[#0d5941]"
              />
            </div>
          </div>
        </div>

        {/* Save button */}
        <div className="flex items-center gap-3">
          <Button
            variant="emerald"
            onClick={handleSave}
            leftIcon={saved ? <Check className="w-4 h-4" /> : undefined}
          >
            {saved ? 'Preferences Saved' : 'Save Configuration'}
          </Button>
        </div>
      </div>
    </AppLayout>
  );
};
