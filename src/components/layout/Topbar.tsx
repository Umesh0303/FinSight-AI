import React, { useState, useRef, useEffect } from 'react';
import {
  Search,
  Bell,
  Calendar,
  ChevronDown,
  Menu,
  Shield,
  Briefcase,
  User,
  ShieldAlert,
  LogOut,
  Home,
  CheckCircle2,
  Wrench,
  Mic
} from 'lucide-react';
import { Logo } from '../brand/Logo';
import { useApp } from '../../context/AppContext';
import { useFinAi } from '../../context/FinAiContext';
import { NotificationPanel } from '../ui/NotificationPanel';
import { UserRole } from '../../types';

interface TopbarProps {
  onMenuClick: () => void;
  title?: string;
  subtitle?: string;
  icon?: React.ReactNode;
  breadcrumbLabel?: string;
  actions?: React.ReactNode;
}

export const Topbar: React.FC<TopbarProps> = ({
  onMenuClick,
  title = 'Dashboard',
  subtitle = 'Get a comprehensive view of your financial data and AI-driven insights.',
  icon,
  breadcrumbLabel,
  actions
}) => {
  const {
    currentUser,
    currentRole,
    dateRange,
    setDateRange,
    searchQuery,
    setSearchQuery,
    notificationsOpen,
    setNotificationsOpen,
    activeNotificationCount,
    logout,
    navigate,
    devSwitchRole
  } = useApp();

  const { openTranscribeModal } = useFinAi();

  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [devToolsExpanded, setDevToolsExpanded] = useState(false);
  const profileDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="bg-[#fcfaf6] border-b border-[#ece7dc] px-4 sm:px-8 py-4 sticky top-0 z-30">
      {/* Top row: Mobile menu button, search, notifications, profile */}
      <div className="flex items-center justify-between gap-4">
        {/* Mobile menu hamburger & brand logo */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onMenuClick}
            className="lg:hidden p-2 rounded-xl bg-white border border-[#ece7dc] text-slate-700 hover:text-black cursor-pointer"
            aria-label="Open sidebar navigation"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Mobile FinSight AI logo (visible when sidebar is closed) */}
          <div className="lg:hidden flex-shrink-0 cursor-pointer">
            <Logo size="sm" variant="light" showText={false} />
          </div>

          {/* Search bar matching Dashboard Reference Image */}
          <div className="relative w-56 sm:w-80 md:w-96">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <input
              type="text"
              placeholder="Search customers, transactions, insights..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-white border border-[#e5dfd2] rounded-full text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#0d5941]/30 focus:border-[#0d5941] shadow-2xs transition-all"
            />
          </div>
        </div>

        {/* Right Controls: Date Picker, Notifications, User Profile */}
        <div className="flex items-center gap-3">
          {/* Dedicated Transcribe Audio Button (gemini-3.5-transcribe) */}
          <button
            onClick={openTranscribeModal}
            className="flex items-center gap-2 px-3 py-1.5 bg-[#ebf5f0] hover:bg-[#d8ece2] border border-[#0d5941]/30 rounded-xl text-xs font-semibold text-[#0d5941] shadow-2xs transition-all cursor-pointer group"
            title="Transcribe microphone audio using gemini-3.5-transcribe"
          >
            <Mic className="w-3.5 h-3.5 text-[#0d5941] group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">Transcribe</span>
            <span className="px-1.5 py-0.2 rounded-md bg-[#0d5941] text-white text-[9px] font-mono">3.5</span>
          </button>

          {/* Date Range Picker Pill */}
          <div className="relative hidden md:block">
            <button
              onClick={() => setDatePickerOpen(!datePickerOpen)}
              className="flex items-center gap-2 px-3.5 py-1.5 bg-white border border-[#e5dfd2] rounded-xl text-xs font-medium text-slate-700 hover:border-[#cfc6b5] shadow-2xs transition-all"
            >
              <Calendar className="w-3.5 h-3.5 text-slate-500" />
              <span>{dateRange}</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {datePickerOpen && (
              <div className="absolute right-0 top-11 w-56 bg-white border border-[#ece7dc] rounded-xl shadow-lg p-2 z-50 text-xs">
                {['Oct 1, 2024 – Oct 31, 2024', 'Last 7 Days', 'Quarter to Date (Q4 2024)', 'Year to Date 2024'].map(
                  (range) => (
                    <button
                      key={range}
                      onClick={() => {
                        setDateRange(range);
                        setDatePickerOpen(false);
                      }}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                        dateRange === range
                          ? 'bg-[#ebf5f0] text-[#0d5941] font-semibold'
                          : 'hover:bg-slate-50 text-slate-700'
                      }`}
                    >
                      {range}
                    </button>
                  )
                )}
              </div>
            )}
          </div>

          {/* Notifications Bell */}
          <div className="relative">
            <button
              onClick={() => setNotificationsOpen(!notificationsOpen)}
              className="relative p-2 rounded-xl bg-white border border-[#e5dfd2] text-slate-600 hover:text-slate-900 shadow-2xs transition-all"
              aria-label="View notifications"
            >
              <Bell className="w-4 h-4" />
              {activeNotificationCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500 animate-ping" />
              )}
              {activeNotificationCount > 0 && (
                <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-red-500" />
              )}
            </button>
            <NotificationPanel />
          </div>

          {/* User Profile Pill (Clean production style — Role Switcher removed) */}
          <div className="relative" ref={profileDropdownRef}>
            <button
              onClick={() => setProfileMenuOpen(!profileMenuOpen)}
              className="flex items-center gap-2.5 pl-1.5 pr-2.5 py-1 bg-white border border-[#e5dfd2] rounded-full hover:border-[#cfc6b5] shadow-2xs transition-all cursor-pointer"
            >
              <div className="w-7 h-7 rounded-full bg-[#0d4a36] text-white flex items-center justify-center font-bold text-xs shadow-xs">
                {currentUser.avatarInitials}
              </div>
              <div className="hidden sm:flex flex-col text-left leading-tight">
                <span className="text-xs font-semibold text-[#092b1f] truncate max-w-[110px]">
                  {currentUser.name}
                </span>
                <span className="text-[10px] text-slate-500 font-medium">{currentUser.roleTitle}</span>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {/* Profile Dropdown */}
            {profileMenuOpen && (
              <div className="absolute right-0 top-12 w-72 bg-white border border-[#ece7dc] rounded-2xl shadow-xl p-3 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                {/* User Identity Details */}
                <div className="px-3 py-2.5 bg-[#faf7f0] rounded-xl border border-[#eee8da] mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-[#0a2f22]">{currentUser.name}</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-semibold">
                      {currentUser.accountStatus}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">{currentUser.email}</p>
                  <p className="text-[11px] font-semibold text-[#0d5941] mt-1">
                    Role: {currentUser.roleTitle}
                  </p>
                </div>

                <div className="space-y-1">
                  <button
                    onClick={() => {
                      setProfileMenuOpen(false);
                      navigate('/');
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-slate-700 hover:text-black hover:bg-[#faf7f0] rounded-xl transition-colors cursor-pointer"
                  >
                    <Home className="w-4 h-4 text-[#0d5941]" />
                    <span>Return to Home Page</span>
                  </button>

                  <button
                    onClick={() => {
                      setProfileMenuOpen(false);
                      logout();
                    }}
                    className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-red-600" />
                    <span>Sign Out</span>
                  </button>
                </div>

                {/* Strictly Segregated Dev/Test Tool at bottom */}
                <div className="mt-3 pt-2.5 border-t border-[#f0ece1]">
                  <button
                    type="button"
                    onClick={() => setDevToolsExpanded(!devToolsExpanded)}
                    className="w-full flex items-center justify-between text-[10px] font-bold text-slate-400 hover:text-slate-600 uppercase tracking-wider py-1 cursor-pointer"
                  >
                    <span className="flex items-center gap-1">
                      <Wrench className="w-3 h-3" />
                      <span>Development / Test Only</span>
                    </span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                      {devToolsExpanded ? 'Hide' : 'Test Personas'}
                    </span>
                  </button>

                  {devToolsExpanded && (
                    <div className="mt-2 space-y-1 text-xs bg-slate-50 p-2 rounded-xl border border-slate-200">
                      <p className="text-[10px] text-slate-500 mb-1.5 leading-tight">
                        Switch accounts instantly to verify acceptance criteria:
                      </p>
                      <button
                        onClick={() => {
                          devSwitchRole('ADMIN');
                          setProfileMenuOpen(false);
                        }}
                        className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-white text-[11px] font-medium text-slate-700 flex justify-between"
                      >
                        <span>Admin (Elena)</span>
                        <span className="text-slate-400 font-mono">admin@</span>
                      </button>
                      <button
                        onClick={() => {
                          devSwitchRole('BUSINESS_ANALYST');
                          setProfileMenuOpen(false);
                        }}
                        className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-white text-[11px] font-medium text-slate-700 flex justify-between"
                      >
                        <span>Analyst (Gopi)</span>
                        <span className="text-slate-400 font-mono">analyst@</span>
                      </button>
                      <button
                        onClick={() => {
                          devSwitchRole('CUSTOMER');
                          setProfileMenuOpen(false);
                        }}
                        className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-white text-[11px] font-medium text-slate-700 flex justify-between"
                      >
                        <span>Customer (Arjun)</span>
                        <span className="text-slate-400 font-mono">customer@</span>
                      </button>
                      <button
                        onClick={() => {
                          devSwitchRole('RISK_FRAUD_ANALYST');
                          setProfileMenuOpen(false);
                        }}
                        className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-white text-[11px] font-medium text-slate-700 flex justify-between"
                      >
                        <span>Risk Officer (Devraj)</span>
                        <span className="text-slate-400 font-mono">risk@</span>
                      </button>
                      <button
                        onClick={() => {
                          devSwitchRole('UNASSIGNED');
                          setProfileMenuOpen(false);
                        }}
                        className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-white text-[11px] font-medium text-amber-700 flex justify-between"
                      >
                        <span>Pending User (Kavita)</span>
                        <span className="text-slate-400 font-mono">unassigned</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Header Title & Subtitle row */}
      <div className="mt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <div>
          <div className="flex items-center gap-1.5 mb-1.5">
            <button
              onClick={() => navigate('/')}
              className="text-[11px] font-semibold text-slate-400 hover:text-[#0d5941] flex items-center gap-1 transition-colors cursor-pointer group"
              title="Return to FinSight AI Home"
            >
              <span className="group-hover:underline">FinSight AI</span>
            </button>
            <span className="text-slate-300 text-xs">/</span>
            <span className="text-[11px] font-semibold text-[#0d5941]">{breadcrumbLabel || title}</span>
          </div>

          <div className="flex items-center gap-3">
            {icon && (
              <div className="w-10 h-10 rounded-xl bg-[#ebf5f0] border border-[#aee3cb] text-[#0d5941] flex items-center justify-center shadow-2xs flex-shrink-0">
                {icon}
              </div>
            )}
            <div>
              <h1 className="text-xl sm:text-2xl font-bold font-heading text-[#09281d] tracking-tight">
                {title}
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>
            </div>
          </div>
        </div>

        {actions && (
          <div className="flex items-center flex-wrap gap-2.5 self-start md:self-auto">
            {actions}
          </div>
        )}
      </div>
    </header>
  );
};
