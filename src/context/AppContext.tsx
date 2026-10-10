import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserRole, UserProfile, Transaction, SupportCase, AIRecommendation, RiskAlert } from '../types';
import {
  USER_PROFILES,
  INITIAL_SYSTEM_USERS,
  SAMPLE_TRANSACTIONS,
  SAMPLE_CASES,
  SAMPLE_RECOMMENDATIONS,
  SAMPLE_RISK_ALERTS
} from '../data/sampleData';

interface AppContextType {
  currentPath: string;
  navigate: (path: string) => void;
  currentUser: UserProfile;
  currentRole: UserRole;
  systemUsers: UserProfile[];
  login: (email: string, pass: string) => { success: boolean; role?: UserRole; message?: string };
  signup: (fullName: string, email: string, pass: string) => { success: boolean };
  logout: () => void;
  adminAssignRole: (userId: string, newRole: UserRole) => boolean;
  adminToggleUserStatus: (userId: string) => boolean;
  dateRange: string;
  setDateRange: (range: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  notificationsOpen: boolean;
  setNotificationsOpen: (open: boolean) => void;
  transactions: Transaction[];
  cases: SupportCase[];
  recommendations: AIRecommendation[];
  riskAlerts: RiskAlert[];
  dismissAlert: (id: string) => void;
  applyRecommendation: (id: string) => void;
  resolveCase: (id: string) => void;
  activeNotificationCount: number;
  devSwitchRole: (role: UserRole) => void; // Clearly segregated for test convenience
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const p = window.location.pathname;
      return p && p !== '' ? p : '/';
    }
    return '/';
  });

  // System users database (initial Admin is Elena Rostova)
  const [systemUsers, setSystemUsers] = useState<UserProfile[]>(INITIAL_SYSTEM_USERS);

  // Authenticated user (default to Business Analyst T. Gopi Chand for seamless prototype review)
  const [currentUser, setCurrentUser] = useState<UserProfile>(INITIAL_SYSTEM_USERS[1]);

  const [dateRange, setDateRange] = useState<string>('Oct 1, 2024 – Oct 31, 2024');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [notificationsOpen, setNotificationsOpen] = useState<boolean>(false);

  // Dynamic sample data
  const [transactions, setTransactions] = useState<Transaction[]>(SAMPLE_TRANSACTIONS);
  const [cases, setCases] = useState<SupportCase[]>(SAMPLE_CASES);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>(SAMPLE_RECOMMENDATIONS);
  const [riskAlerts, setRiskAlerts] = useState<RiskAlert[]>(SAMPLE_RISK_ALERTS);

  const navigate = (path: string) => {
    setCurrentPath(path);
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', path);
      window.scrollTo(0, 0);
    }
  };

  useEffect(() => {
    const handlePop = () => {
      if (typeof window !== 'undefined') {
        setCurrentPath(window.location.pathname || '/');
      }
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  // Email-based authentication
  const login = (email: string, pass: string): { success: boolean; role?: UserRole; message?: string } => {
    const cleanEmail = email.trim().toLowerCase();

    // Look up in system users
    const matched = systemUsers.find(
      (u) =>
        u.email.toLowerCase() === cleanEmail ||
        (cleanEmail.includes('admin') && u.role === 'ADMIN') ||
        (cleanEmail.includes('analyst') && u.role === 'BUSINESS_ANALYST') ||
        (cleanEmail.includes('customer') && u.role === 'CUSTOMER') ||
        (cleanEmail.includes('risk') && u.role === 'RISK_FRAUD_ANALYST')
    );

    if (matched) {
      if (matched.accountStatus === 'SUSPENDED') {
        return { success: false, message: 'This account has been suspended by an administrator.' };
      }

      setCurrentUser(matched);

      // Route by role
      if (matched.role === 'ADMIN') {
        navigate('/app/admin');
      } else if (matched.role === 'BUSINESS_ANALYST') {
        navigate('/app/analyst');
      } else if (matched.role === 'CUSTOMER') {
        navigate('/app/customer');
      } else if (matched.role === 'RISK_FRAUD_ANALYST') {
        navigate('/app/risk');
      } else {
        navigate('/app/pending');
      }

      return { success: true, role: matched.role };
    }

    // Default unrecognized login creates a new registered user in UNASSIGNED state
    const newUser: UserProfile = {
      id: `user-${Date.now()}`,
      name: email.split('@')[0],
      email: cleanEmail,
      role: 'UNASSIGNED',
      roleTitle: 'Pending Role Assignment',
      avatarInitials: email[0].toUpperCase(),
      accountStatus: 'PENDING_APPROVAL',
      createdDate: new Date().toISOString().split('T')[0],
      lastLogin: 'Just now'
    };

    setSystemUsers((prev) => [...prev, newUser]);
    setCurrentUser(newUser);
    navigate('/app/pending');
    return { success: true, role: 'UNASSIGNED' };
  };

  // Signup creates user in PENDING state
  const signup = (fullName: string, email: string, pass: string): { success: boolean } => {
    const cleanEmail = email.trim().toLowerCase();
    const newUser: UserProfile = {
      id: `user-${Date.now()}`,
      name: fullName.trim(),
      email: cleanEmail,
      role: 'UNASSIGNED',
      roleTitle: 'Pending Role Assignment',
      avatarInitials: fullName.trim()[0]?.toUpperCase() || 'U',
      accountStatus: 'PENDING_APPROVAL',
      createdDate: new Date().toISOString().split('T')[0],
      lastLogin: 'Just now'
    };

    setSystemUsers((prev) => [...prev, newUser]);
    setCurrentUser(newUser);
    navigate('/app/pending');
    return { success: true };
  };

  const logout = () => {
    navigate('/login');
  };

  // Admin ONLY: Assign or change roles
  const adminAssignRole = (userId: string, newRole: UserRole): boolean => {
    if (currentUser.role !== 'ADMIN') {
      alert('Access Denied: Only Platform Administrators can assign or change user roles.');
      return false;
    }

    const roleTitles: Record<UserRole, string> = {
      ADMIN: 'Platform Administrator',
      BUSINESS_ANALYST: 'Senior Financial Analyst',
      CUSTOMER: 'Private Wealth Client',
      RISK_FRAUD_ANALYST: 'Risk & Fraud Specialist',
      UNASSIGNED: 'Pending Role Assignment'
    };

    setSystemUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          return {
            ...u,
            role: newRole,
            roleTitle: roleTitles[newRole],
            accountStatus: newRole === 'UNASSIGNED' ? 'PENDING_APPROVAL' : 'ACTIVE'
          };
        }
        return u;
      })
    );

    // If current logged in user was modified, sync session
    if (currentUser.id === userId) {
      setCurrentUser((prev) => ({
        ...prev,
        role: newRole,
        roleTitle: roleTitles[newRole],
        accountStatus: newRole === 'UNASSIGNED' ? 'PENDING_APPROVAL' : 'ACTIVE'
      }));
    }

    return true;
  };

  // Admin ONLY: Activate or suspend user
  const adminToggleUserStatus = (userId: string): boolean => {
    if (currentUser.role !== 'ADMIN') {
      alert('Access Denied: Only Platform Administrators can manage account status.');
      return false;
    }

    setSystemUsers((prev) =>
      prev.map((u) => {
        if (u.id === userId) {
          const nextStatus = u.accountStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
          return { ...u, accountStatus: nextStatus };
        }
        return u;
      })
    );

    return true;
  };

  // Development-only role testing switcher (segregated from user UI)
  const devSwitchRole = (role: UserRole) => {
    const matched = systemUsers.find((u) => u.role === role) || USER_PROFILES[role];
    if (matched) {
      setCurrentUser(matched);
      if (role === 'ADMIN') navigate('/app/admin');
      else if (role === 'BUSINESS_ANALYST') navigate('/app/analyst');
      else if (role === 'CUSTOMER') navigate('/app/customer');
      else if (role === 'RISK_FRAUD_ANALYST') navigate('/app/risk');
      else navigate('/app/pending');
    }
  };

  const dismissAlert = (id: string) => {
    setRiskAlerts((prev) => prev.filter((a) => a.alert_id !== id));
  };

  const applyRecommendation = (id: string) => {
    setRecommendations((prev) =>
      prev.map((r) => (r.recommendation_id === id ? { ...r, status: 'Applied' } : r))
    );
  };

  const resolveCase = (id: string) => {
    setCases((prev) =>
      prev.map((c) => (c.case_id === id ? { ...c, status: 'Resolved' } : c))
    );
  };

  const activeNotificationCount = riskAlerts.filter((a) => a.status === 'New').length + 2;

  return (
    <AppContext.Provider
      value={{
        currentPath,
        navigate,
        currentUser,
        currentRole: currentUser.role,
        systemUsers,
        login,
        signup,
        logout,
        adminAssignRole,
        adminToggleUserStatus,
        dateRange,
        setDateRange,
        searchQuery,
        setSearchQuery,
        notificationsOpen,
        setNotificationsOpen,
        transactions,
        cases,
        recommendations,
        riskAlerts,
        dismissAlert,
        applyRecommendation,
        resolveCase,
        activeNotificationCount,
        devSwitchRole
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
