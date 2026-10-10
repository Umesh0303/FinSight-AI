import React, { useState } from 'react';
import {
  Server,
  Users,
  ShieldCheck,
  Activity,
  UserPlus,
  Database,
  Lock,
  Eye,
  Search,
  CheckCircle2,
  AlertCircle,
  ShieldAlert,
  Download
} from 'lucide-react';
import { AppLayout } from '../../components/layout/AppLayout';
import { KpiCard } from '../../components/ui/KpiCard';
import { Button } from '../../components/ui/Button';
import { StatusBadge } from '../../components/ui/StatusBadge';
import { useApp } from '../../context/AppContext';
import { UserRole } from '../../types';

export const AdminDashboard: React.FC = () => {
  const { cases, navigate, systemUsers, adminAssignRole, adminToggleUserStatus } = useApp();
  const [userSearch, setUserSearch] = useState('');
  const [notificationMsg, setNotificationMsg] = useState<string | null>(null);

  const filteredUsers = systemUsers.filter(
    (u) =>
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.role.toLowerCase().includes(userSearch.toLowerCase())
  );

  const handleRoleChange = (userId: string, targetRole: UserRole, userName: string) => {
    const success = adminAssignRole(userId, targetRole);
    if (success) {
      setNotificationMsg(`Role updated: ${userName} is now assigned as "${targetRole}".`);
      setTimeout(() => setNotificationMsg(null), 3500);
    }
  };

  const handleStatusToggle = (userId: string, userName: string) => {
    const success = adminToggleUserStatus(userId);
    if (success) {
      setNotificationMsg(`Account status toggled for ${userName}.`);
      setTimeout(() => setNotificationMsg(null), 3000);
    }
  };

  const auditLogs = [
    { id: 'LOG-881', actor: 'Devraj Sen (Risk)', action: 'Blocked Card for CUST-1008', timestamp: '10 mins ago', level: 'Security' },
    { id: 'LOG-880', actor: 'System ML Engine', action: 'Triggered batch scoring for 4,200 txns', timestamp: '35 mins ago', level: 'System' },
    { id: 'LOG-879', actor: 'Elena Rostova (Admin)', action: 'Updated KYC compliance policy threshold', timestamp: '2 hours ago', level: 'Governance' },
    { id: 'LOG-878', actor: 'T. Gopi Chand (Analyst)', action: 'Exported Q3 segmentation telemetry', timestamp: '4 hours ago', level: 'Audit' }
  ];

  return (
    <AppLayout
      title="Platform Command Center"
      subtitle="Platform administration, user governance, system health, and security monitoring."
      icon={<ShieldCheck className="w-5 h-5 text-[#0d5941]" />}
      breadcrumbLabel="Platform Command Center"
    >
      {/* Top Action Ribbon / Workspace Toolbar */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6 pb-2 border-b border-[#ece6d9]">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Workspace:
          </span>
          <span className="text-xs font-semibold px-2.5 py-1 rounded-lg bg-[#ebf5f0] text-[#0d5941] border border-[#aee3cb]">
            Platform Command Center · Authorized Administrator (Elena Rostova)
          </span>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Users className="w-3.5 h-3.5" />}
            onClick={() => {
              const el = document.getElementById('user-governance-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            Manage Users
          </Button>
          <Button
            variant="emerald"
            size="sm"
            leftIcon={<Activity className="w-3.5 h-3.5" />}
            onClick={() => {
              const el = document.getElementById('platform-health-section');
              if (el) el.scrollIntoView({ behavior: 'smooth' });
            }}
          >
            System Health
          </Button>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Download className="w-3.5 h-3.5" />}
            onClick={() => {
              setNotificationMsg('Platform Audit & Compliance Report generated and exported.');
              setTimeout(() => setNotificationMsg(null), 3500);
            }}
          >
            Export Report
          </Button>
        </div>
      </div>

      {notificationMsg && (
        <div className="mb-6 p-4 rounded-2xl bg-[#ebf7f1] border border-[#aee3cb] text-xs font-semibold text-[#0a4d37] flex items-center gap-2 animate-in fade-in">
          <CheckCircle2 className="w-4 h-4 text-[#0d5941]" />
          <span>{notificationMsg}</span>
        </div>
      )}

      {/* Row 1: KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard
          title="Total Registered Users"
          value="8,452"
          change="10.1%"
          changeType="positive"
          comparisonPeriod="vs last month"
          icon={<Users className="w-5 h-5 text-[#b0882e]" />}
          iconBg="bg-[#fcf4e4]"
          sparklineColor="#10b981"
          sparklineData={[10, 12, 14, 16, 18, 20, 24, 25, 28]}
        />
        <KpiCard
          title="Platform Volume"
          value="₹ 1.48 Cr"
          change="14.2%"
          changeType="positive"
          comparisonPeriod="vs last month"
          icon={<Database className="w-5 h-5 text-[#b0882e]" />}
          iconBg="bg-[#fcf4e4]"
          sparklineColor="#10b981"
          sparklineData={[15, 14, 18, 21, 23, 26, 28, 30, 34]}
        />
        <KpiCard
          title="Open Support Cases"
          value="18"
          change="4.2%"
          changeType="positive"
          comparisonPeriod="resolution speed"
          icon={<ShieldCheck className="w-5 h-5 text-[#b0882e]" />}
          iconBg="bg-[#fcf4e4]"
          sparklineColor="#10b981"
          sparklineData={[25, 22, 20, 19, 18, 16, 17, 18, 18]}
        />
        <KpiCard
          title="Model Health & Uptime"
          value="99.98%"
          change="0.01%"
          changeType="positive"
          comparisonPeriod="last 30 days"
          icon={<Server className="w-5 h-5 text-[#b0882e]" />}
          iconBg="bg-[#fcf4e4]"
          sparklineColor="#10b981"
          sparklineData={[99, 99, 99.5, 99.8, 99.9, 99.95, 99.98]}
        />
      </div>

      {/* Row 2: User Role Assignment & Governance Console (Requirements 11, 14) */}
      <div id="user-governance-section" className="bg-white border border-[#ece7dc] rounded-2xl p-5 shadow-xs mb-6 scroll-mt-24">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-heading font-semibold text-base text-[#0a261c]">
                User Management & Role Assignment
              </h3>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-100 text-amber-800 border border-amber-200">
                ADMIN AUTHORIZED ONLY
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Review user accounts, assign verified roles (Business Analyst, Customer, Risk Analyst), and manage access.
            </p>
          </div>

          <div className="relative w-64">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search user or email..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-[#faf7f0] border border-[#e5dfd2] rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0d5941]"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[#ece7dc] text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                <th className="pb-3">User</th>
                <th className="pb-3">Email</th>
                <th className="pb-3">Status</th>
                <th className="pb-3">Current Role</th>
                <th className="pb-3">Admin Role Assignment</th>
                <th className="pb-3 text-right">Account Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f5f2ea]">
              {filteredUsers.map((user) => {
                const isAdmin = user.role === 'ADMIN';

                return (
                  <tr key={user.id} className="hover:bg-[#faf8f3] transition-colors">
                    <td className="py-3 font-semibold text-slate-900">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-[#0d4a36] text-white flex items-center justify-center font-bold text-xs">
                          {user.avatarInitials}
                        </div>
                        <div>
                          <span>{user.name}</span>
                          <span className="text-[10px] text-slate-400 block font-normal">
                            Joined: {user.createdDate}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 text-slate-600 font-mono text-[11px]">{user.email}</td>

                    <td className="py-3">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${
                          user.accountStatus === 'ACTIVE'
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : user.accountStatus === 'PENDING_APPROVAL'
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-red-50 text-red-700 border-red-200'
                        }`}
                      >
                        {user.accountStatus}
                      </span>
                    </td>

                    <td className="py-3">
                      <span className="font-semibold text-[#093425]">{user.roleTitle}</span>
                    </td>

                    <td className="py-3">
                      {isAdmin ? (
                        <span className="text-xs text-slate-400 font-medium italic">
                          Protected Single Root Admin
                        </span>
                      ) : (
                        <select
                          value={user.role}
                          onChange={(e) =>
                            handleRoleChange(user.id, e.target.value as UserRole, user.name)
                          }
                          className="px-2.5 py-1 bg-[#faf7f0] border border-[#ded8cb] rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#0d5941] cursor-pointer"
                        >
                          <option value="UNASSIGNED">UNASSIGNED (Pending)</option>
                          <option value="BUSINESS_ANALYST">Business Analyst</option>
                          <option value="CUSTOMER">Personal Customer</option>
                          <option value="RISK_FRAUD_ANALYST">Risk & Fraud Analyst</option>
                        </select>
                      )}
                    </td>

                    <td className="py-3 text-right">
                      {!isAdmin && (
                        <button
                          onClick={() => handleStatusToggle(user.id, user.name)}
                          className={`text-[11px] font-semibold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                            user.accountStatus === 'ACTIVE'
                              ? 'text-red-700 hover:bg-red-50 border-red-200'
                              : 'text-emerald-700 hover:bg-emerald-50 border-emerald-200'
                          }`}
                        >
                          {user.accountStatus === 'ACTIVE' ? 'Suspend' : 'Activate'}
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Row 3: Operational Health + Audit Trail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
        {/* System Services Status */}
        <div id="platform-health-section" className="lg:col-span-6 bg-white border border-[#ece7dc] rounded-2xl p-5 shadow-xs scroll-mt-24">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-base text-[#0a261c]">
              Service Architecture Health
            </h3>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
              All Systems Operational
            </span>
          </div>

          <div className="space-y-3">
            {[
              { name: 'Fraud Scoring Model (Isolation Forest + XGBoost)', status: 'Online', latency: '24ms', load: '14%' },
              { name: 'Customer Recommendation Pipeline', status: 'Online', latency: '42ms', load: '22%' },
              { name: 'Transaction Stream Pipeline (Kafka / RPC)', status: 'Online', latency: '12ms', load: '38%' },
              { name: 'Document Knowledge Embeddings (RAG Ready)', status: 'Standby', latency: '—', load: '0%' }
            ].map((svc, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-xl bg-[#faf7f0] border border-[#f0ece1] text-xs">
                <div>
                  <p className="font-semibold text-slate-800">{svc.name}</p>
                  <p className="text-[11px] text-slate-500 mt-0.5">Latency: {svc.latency} · Cluster Load: {svc.load}</p>
                </div>
                <StatusBadge status={svc.status} />
              </div>
            ))}
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="lg:col-span-6 bg-white border border-[#ece7dc] rounded-2xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-heading font-semibold text-base text-[#0a261c]">
              Security & Audit Trail
            </h3>
            <button
              onClick={() => navigate('/app/cases')}
              className="text-xs font-semibold text-[#0d5941] hover:underline"
            >
              View Full Audit
            </button>
          </div>

          <div className="space-y-2.5">
            {auditLogs.map((log) => (
              <div key={log.id} className="p-3 rounded-xl border border-[#ece7dc] hover:bg-[#faf8f4] transition-colors text-xs flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#0d4a36]">{log.actor}</span>
                    <span className="text-[10px] text-slate-400">· {log.timestamp}</span>
                  </div>
                  <p className="text-slate-600 mt-0.5">{log.action}</p>
                </div>
                <span className="text-[10px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                  {log.level}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
};
