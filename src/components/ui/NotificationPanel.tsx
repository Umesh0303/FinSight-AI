import React from 'react';
import { X, ShieldAlert, CheckCircle2, ChevronRight } from 'lucide-react';
import { useApp } from '../../context/AppContext';

export const NotificationPanel: React.FC = () => {
  const {
    notificationsOpen,
    setNotificationsOpen,
    riskAlerts,
    dismissAlert,
    navigate
  } = useApp();

  if (!notificationsOpen) return null;

  return (
    <div className="absolute right-0 top-12 w-80 sm:w-96 bg-white border border-[#ece7dc] rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-[#faf7f0] border-b border-[#ece7dc]">
        <div className="flex items-center gap-2">
          <span className="font-heading font-semibold text-sm text-[#092b1f]">Notifications</span>
          <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-[#0d5941] text-white">
            {riskAlerts.length}
          </span>
        </div>
        <button
          onClick={() => setNotificationsOpen(false)}
          className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Notifications List */}
      <div className="max-h-80 overflow-y-auto divide-y divide-[#f5f2ea]">
        {riskAlerts.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2 opacity-70" />
            No active risk notifications. All queues cleared.
          </div>
        ) : (
          riskAlerts.map((alert) => (
            <div
              key={alert.alert_id}
              className="p-3.5 hover:bg-[#fbf9f4] transition-colors flex items-start gap-3 text-xs"
            >
              <div className="w-7 h-7 rounded-lg bg-red-50 text-red-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                <ShieldAlert className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-semibold text-slate-900 truncate">
                    {alert.risk_type}
                  </span>
                  <span className="text-[10px] text-slate-400">{alert.created_at.split(' ')[1]}</span>
                </div>
                <p className="text-slate-600 text-[11px] mt-0.5 line-clamp-1">
                  Customer {alert.customer_name} (₹{alert.amount.toLocaleString()}) in {alert.location}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <button
                    onClick={() => {
                      setNotificationsOpen(false);
                      navigate('/app/risk');
                    }}
                    className="text-[11px] font-medium text-[#0b5c43] hover:underline inline-flex items-center gap-0.5"
                  >
                    Investigate <ChevronRight className="w-3 h-3" />
                  </button>
                  <span className="text-slate-300">·</span>
                  <button
                    onClick={() => dismissAlert(alert.alert_id)}
                    className="text-[11px] text-slate-400 hover:text-slate-600"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 bg-[#faf7f0] border-t border-[#ece7dc] text-center">
        <button
          onClick={() => {
            setNotificationsOpen(false);
            navigate('/app/risk');
          }}
          className="text-xs font-semibold text-[#0d5941] hover:text-[#073627]"
        >
          View All Risk Alerts
        </button>
      </div>
    </div>
  );
};
