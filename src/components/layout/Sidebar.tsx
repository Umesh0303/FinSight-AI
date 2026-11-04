import React, { useState } from 'react';
import {
  LayoutDashboard,
  BarChart3,
  Users,
  PieChart,
  ShieldAlert,
  ShieldCheck,
  Wallet,
  Lightbulb,
  ArrowLeftRight,
  FileText,
  Settings,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  Bot
} from 'lucide-react';
import { Logo } from '../brand/Logo';
import { useApp } from '../../context/AppContext';

interface SidebarProps {
  isMobileOpen: boolean;
  setIsMobileOpen: (open: boolean) => void;
  collapsed?: boolean;
  setCollapsed?: React.Dispatch<React.SetStateAction<boolean>>;
}

export const Sidebar: React.FC<SidebarProps> = ({
  isMobileOpen,
  setIsMobileOpen,
  collapsed: propCollapsed,
  setCollapsed: propSetCollapsed
}) => {
  const {
    currentPath,
    navigate,
    currentRole,
    sidebarCollapsed,
    toggleSidebarCollapse
  } = useApp();

  const isCollapsed = propCollapsed !== undefined ? propCollapsed : (sidebarCollapsed ?? false);

  const handleToggleCollapse = () => {
    if (propSetCollapsed) {
      propSetCollapsed(!isCollapsed);
    } else if (toggleSidebarCollapse) {
      toggleSidebarCollapse();
    }
  };

  // Determine dashboard route based on current role
  const getDashboardRoute = () => {
    switch (currentRole) {
      case 'ADMIN':
        return '/app/admin';
      case 'CUSTOMER':
        return '/app/customer';
      case 'RISK_FRAUD_ANALYST':
        return '/app/risk';
      case 'BUSINESS_ANALYST':
      default:
        return '/app/analyst';
    }
  };

  const dashboardRoute = getDashboardRoute();

  const getRoleDashboardInfo = () => {
    switch (currentRole) {
      case 'ADMIN':
        return { label: 'Platform Command Center', icon: ShieldCheck };
      case 'RISK_FRAUD_ANALYST':
        return { label: 'Risk & Fraud Command Center', icon: ShieldAlert };
      case 'CUSTOMER':
        return { label: 'My Financial Overview', icon: Wallet };
      case 'BUSINESS_ANALYST':
      default:
        return { label: 'Financial Analytics Workbench', icon: BarChart3 };
    }
  };

  const roleDashboard = getRoleDashboardInfo();

  const allNavItems = [
    {
      id: 'dashboard',
      label: roleDashboard.label,
      icon: roleDashboard.icon,
      path: dashboardRoute,
      allowedRoles: ['ADMIN', 'BUSINESS_ANALYST', 'CUSTOMER', 'RISK_FRAUD_ANALYST'],
      isActive:
        currentPath === '/app' ||
        currentPath === '/app/analyst' ||
        currentPath === '/app/admin' ||
        currentPath === '/app/customer' ||
        currentPath === '/app/risk'
    },
    {
      id: 'customers',
      label: 'Customer Insights',
      icon: Users,
      path: '/app/customers',
      allowedRoles: ['ADMIN', 'BUSINESS_ANALYST'],
      isActive: currentPath === '/app/customers'
    },
    {
      id: 'risk',
      label: 'Risk & Fraud',
      icon: ShieldAlert,
      path: '/app/risk',
      allowedRoles: ['ADMIN', 'RISK_FRAUD_ANALYST'],
      isActive: currentPath === '/app/risk'
    },
    {
      id: 'recommendations',
      label: 'Recommendations',
      icon: Lightbulb,
      path: '/app/recommendations',
      allowedRoles: ['ADMIN', 'BUSINESS_ANALYST'],
      isActive: currentPath === '/app/recommendations'
    },
    {
      id: 'transactions',
      label: currentRole === 'CUSTOMER' ? 'My Transactions' : 'Transactions',
      icon: ArrowLeftRight,
      path: '/app/transactions',
      allowedRoles: ['ADMIN', 'BUSINESS_ANALYST', 'CUSTOMER', 'RISK_FRAUD_ANALYST'],
      isActive: currentPath === '/app/transactions'
    },
    {
      id: 'assistant',
      label: 'Fin AI',
      icon: Bot,
      path: '/app/assistant',
      allowedRoles: ['ADMIN', 'BUSINESS_ANALYST', 'CUSTOMER', 'RISK_FRAUD_ANALYST'],
      isActive: currentPath === '/app/assistant'
    },
    {
      id: 'cases',
      label: 'Support Cases',
      icon: FileText,
      path: '/app/cases',
      allowedRoles: ['ADMIN', 'RISK_FRAUD_ANALYST', 'BUSINESS_ANALYST'],
      isActive: currentPath === '/app/cases'
    },
    {
      id: 'documents',
      label: 'Knowledge / Docs',
      icon: FileText,
      path: '/app/documents',
      allowedRoles: ['ADMIN', 'BUSINESS_ANALYST', 'RISK_FRAUD_ANALYST'],
      isActive: currentPath === '/app/documents'
    },
    {
      id: 'settings',
      label: 'Settings',
      icon: Settings,
      path: '/app/settings',
      allowedRoles: ['ADMIN', 'BUSINESS_ANALYST', 'CUSTOMER', 'RISK_FRAUD_ANALYST'],
      isActive: currentPath === '/app/settings'
    }
  ];

  const visibleNavItems = allNavItems.filter((item) =>
    item.allowedRoles.includes(currentRole)
  );

  return (
    <>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar Container: Permanently fixed to left edge of viewport */}
      <aside
        className={`fixed top-0 bottom-0 left-0 h-screen h-[100vh] z-40 flex flex-col justify-between bg-[#061d16] border-r border-[#0e3a2d] text-[#c3dad0] transition-all duration-300 overflow-y-auto overflow-x-hidden select-none [scrollbar-width:thin] [scrollbar-color:#124234_transparent] ${
          isCollapsed ? 'w-20' : 'w-64'
        } ${isMobileOpen ? 'translate-x-0 z-50 shadow-2xl' : '-translate-x-full lg:translate-x-0'}`}
      >
        {/* Top Header with Logo: Clicking returns to Home / Dashboard */}
        <div>
          <div className="flex items-center justify-between h-20 px-4 border-b border-[#0f3d2f]">
            <div
              className="cursor-pointer"
              onClick={() => {
                navigate(dashboardRoute);
                setIsMobileOpen(false);
              }}
              title="FinSight AI Dashboard"
            >
              {isCollapsed ? (
                <Logo size="sm" variant="dark" showText={false} />
              ) : (
                <Logo size="md" variant="dark" showText={true} />
              )}
            </div>
            {/* Desktop collapse toggle */}
            <button
              onClick={handleToggleCollapse}
              className="hidden lg:flex p-1.5 rounded-lg text-[#779c8e] hover:text-white hover:bg-[#0d3b2c] transition-colors cursor-pointer"
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </button>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    navigate(item.path);
                    setIsMobileOpen(false);
                  }}
                  className={`w-full flex items-center gap-3.5 px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all duration-150 cursor-pointer ${
                    item.isActive
                      ? 'bg-gradient-to-r from-[#144737] to-[#0f3d2f] text-white shadow-sm border border-[#206650]/40 font-semibold'
                      : 'text-[#8eb1a3] hover:text-white hover:bg-[#0b3326]'
                  }`}
                  title={isCollapsed ? item.label : undefined}
                >
                  <Icon
                    className={`w-4 h-4 flex-shrink-0 ${
                      item.isActive ? 'text-[#f1ce72]' : 'text-[#7da595]'
                    }`}
                  />
                  {!isCollapsed && <span className="truncate">{item.label}</span>}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Role-Specific Status Card matching Reference Image */}
        {!isCollapsed && (
          <div className="p-3.5 m-3 rounded-2xl bg-[#031d14] border border-[#0e4433] shadow-md">
            {currentRole === 'ADMIN' && (
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-semibold text-[#7da595] block uppercase tracking-wider">
                    Platform Health
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
                    <span className="text-xs font-bold text-white font-heading">Healthy</span>
                  </div>
                </div>
                <svg className="w-16 h-6 overflow-visible" viewBox="0 0 64 24">
                  <path
                    d="M 2,16 Q 16,6 30,12 T 62,4"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            )}

            {currentRole === 'BUSINESS_ANALYST' && (
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-semibold text-[#7da595] block uppercase tracking-wider">
                    System Status
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
                    <span className="text-xs font-bold text-white font-heading">Normal</span>
                  </div>
                </div>
                <svg className="w-16 h-6 overflow-visible" viewBox="0 0 64 24">
                  <path
                    d="M 2,18 Q 16,8 32,14 T 62,6"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            )}

            {currentRole === 'RISK_FRAUD_ANALYST' && (
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-semibold text-[#93b8a9] block uppercase tracking-wider">
                    Risk Status
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-[#ef4444] animate-ping" />
                    <span className="text-xs font-bold text-[#ef4444] font-heading">Critical</span>
                  </div>
                </div>
                <svg className="w-16 h-6 overflow-visible" viewBox="0 0 64 24">
                  <path
                    d="M 2,8 Q 18,20 34,10 T 62,18"
                    fill="none"
                    stroke="#ef4444"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            )}

            {currentRole === 'CUSTOMER' && (
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-semibold text-[#7da595] block uppercase tracking-wider">
                    Financial Health
                  </span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-[#10b981] animate-pulse" />
                    <span className="text-xs font-bold text-white font-heading">Good</span>
                  </div>
                </div>
                <svg className="w-16 h-6 overflow-visible" viewBox="0 0 64 24">
                  <path
                    d="M 2,18 Q 18,6 34,14 T 62,4"
                    fill="none"
                    stroke="#10b981"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </div>
            )}
          </div>
        )}
      </aside>
    </>
  );
};
