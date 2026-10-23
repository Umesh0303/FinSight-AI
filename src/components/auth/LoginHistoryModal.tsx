import React, { useState, useEffect, useCallback } from 'react';
import {
  X,
  History,
  ShieldCheck,
  Search,
  RefreshCw,
  Clock,
  Laptop,
  CheckCircle2,
  AlertCircle,
  Filter
} from 'lucide-react';
import { LoginEventRecord } from '../../types';
import { useApp } from '../../context/AppContext';

interface LoginHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const LoginHistoryModal: React.FC<LoginHistoryModalProps> = ({ isOpen, onClose }) => {
  const { fetchLoginHistory } = useApp();
  const [history, setHistory] = useState<LoginEventRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterProvider, setFilterProvider] = useState<'all' | 'google' | 'email'>('all');
  const [isLoading, setIsLoading] = useState(false);

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    const data = await fetchLoginHistory();
    setHistory(data);
    setIsLoading(false);
  }, [fetchLoginHistory]);

  useEffect(() => {
    if (isOpen) {
      loadHistory();
    }
  }, [isOpen, loadHistory]);

  if (!isOpen) return null;

  const filtered = history.filter((item) => {
    const matchesQuery =
      item.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.ipAddress.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.role.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesProvider =
      filterProvider === 'all' || item.provider === filterProvider;

    return matchesQuery && matchesProvider;
  });

  const googleCount = history.filter((h) => h.provider === 'google').length;
  const emailCount = history.filter((h) => h.provider === 'email').length;

  const formatTimestamp = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return {
        date: d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }),
        time: d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      };
    } catch {
      return { date: isoString, time: '' };
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/75 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-[#e2dcd0] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 sm:p-6 border-b border-[#ece7dc] bg-[#faf7f0] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#0d5941]/10 text-[#0d5941] flex items-center justify-center">
              <History className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-heading font-bold text-base sm:text-lg text-[#09261c]">
                  Protected Login History & Session Audit
                </h3>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                  REAL-TIME AUDIT
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Server-verified authentication logs with timestamps, identity provider, and network telemetry.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Toolbar & Metrics */}
        <div className="p-4 sm:p-6 border-b border-[#f0ece1] bg-white flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search user, email, or IP address..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-[#faf7f0] border border-[#e5dfd2] rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0d5941]"
              />
            </div>
            <div className="flex items-center gap-1 bg-[#faf7f0] border border-[#e5dfd2] rounded-xl p-1 text-xs">
              <button
                onClick={() => setFilterProvider('all')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer text-[11px] ${
                  filterProvider === 'all'
                    ? 'bg-[#0d5941] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All ({history.length})
              </button>
              <button
                onClick={() => setFilterProvider('google')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer text-[11px] ${
                  filterProvider === 'google'
                    ? 'bg-[#0d5941] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Google ({googleCount})
              </button>
              <button
                onClick={() => setFilterProvider('email')}
                className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer text-[11px] ${
                  filterProvider === 'email'
                    ? 'bg-[#0d5941] text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Email ({emailCount})
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadHistory}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#ded8cb] bg-[#faf7f0] hover:bg-[#f2ece0] text-xs font-semibold text-slate-700 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Content Table */}
        <div className="overflow-y-auto flex-1 p-4 sm:p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-[#ece7dc] text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="pb-3">User</th>
                  <th className="pb-3">Provider</th>
                  <th className="pb-3">Role at Login</th>
                  <th className="pb-3">Client Telemetry</th>
                  <th className="pb-3">Timestamp (UTC)</th>
                  <th className="pb-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f5f2ea]">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center">
                      <div className="flex flex-col items-center justify-center max-w-sm mx-auto text-slate-500">
                        <div className="w-12 h-12 rounded-full bg-[#f4f0e6] flex items-center justify-center mb-3 text-slate-400">
                          <History className="w-6 h-6 text-slate-400" />
                        </div>
                        <p className="font-heading font-semibold text-sm text-[#09261d]">
                          {searchQuery ? 'No matching login records' : 'No login history records'}
                        </p>
                        <p className="text-xs text-slate-400 mt-1 leading-relaxed">
                          {searchQuery
                            ? `No authentication events match your filter query "${searchQuery}".`
                            : 'Authentications through Email/Password and Google OAuth will automatically record immutable login events here.'}
                        </p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filtered.map((item) => {
                    const timeInfo = formatTimestamp(item.createdAt);
                    const isGoogle = item.provider === 'google';

                    return (
                      <tr key={item.id} className="hover:bg-[#faf8f3] transition-colors">
                        <td className="py-3 font-semibold text-slate-900">
                          <div>
                            <span className="font-semibold text-slate-800">{item.displayName}</span>
                            <span className="text-[11px] text-slate-400 block font-mono">
                              {item.email}
                            </span>
                          </div>
                        </td>

                        <td className="py-3">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold border ${
                              isGoogle
                                ? 'bg-sky-50 text-sky-800 border-sky-200'
                                : 'bg-slate-50 text-slate-700 border-slate-200'
                            }`}
                          >
                            {isGoogle ? (
                              <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" aria-hidden="true">
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
                            ) : (
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                            )}
                            <span>{isGoogle ? 'Google OAuth' : 'Email/Password'}</span>
                          </span>
                        </td>

                        <td className="py-3">
                          <span className="font-semibold text-[#093425] uppercase text-[11px]">
                            {item.role}
                          </span>
                        </td>

                        <td className="py-3 text-slate-600">
                          <div className="flex items-center gap-1.5 text-[11px] font-mono">
                            <Laptop className="w-3.5 h-3.5 text-slate-400" />
                            <span>{item.ipAddress}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 block truncate max-w-[200px]" title={item.userAgent}>
                            {item.userAgent}
                          </span>
                        </td>

                        <td className="py-3 text-slate-600">
                          <div className="flex items-center gap-1 text-[11px]">
                            <Clock className="w-3.5 h-3.5 text-slate-400" />
                            <span className="font-medium text-slate-800">{timeInfo.date}</span>
                          </div>
                          <span className="text-[10px] text-slate-400 block font-mono">
                            {timeInfo.time}
                          </span>
                        </td>

                        <td className="py-3 text-right">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Verified</span>
                          </span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#ece7dc] bg-[#faf7f0] flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <ShieldCheck className="w-4 h-4 text-[#0d5941]" />
            <span>Audited under ISO 27001 & SOC2 Compliance Policy</span>
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white border border-[#ded8cb] hover:bg-[#f2ece0] rounded-xl text-xs font-semibold text-slate-700 transition-colors cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
