import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { UserRole, AccountStatus, UserProfile, Transaction, SupportCase, AIRecommendation, RiskAlert, LoginEventRecord } from '../types';
import { supabase, isSupabaseConfigured, recordAuditEvent } from '../lib/supabase';
import {
  DbCustomer,
  DbAccount,
  DbTransaction,
  DbMerchant,
  DbBalanceSnapshot,
  DbCreditScoreHistory,
  DbFraudAlert,
  DbSupportCase,
  PaginationParams,
  PlatformMetricsSummary,
  CategorySpendingSummary,
  SegmentDistributionSummary,
  CustomerFinancialDossier,
  TransactionTrendBucket,
  AnalystMetricsSummary,
  RiskMetricsSummary
} from '../types/database';
import { databaseService } from '../services/databaseService';

interface AppContextType {
  currentPath: string;
  navigate: (path: string) => void;
  currentUser: UserProfile;
  currentRole: UserRole;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  systemUsers: UserProfile[];
  login: (email: string, pass: string) => Promise<{ success: boolean; role?: UserRole; message?: string; requiresInitialSetup?: boolean }>;
  loginWithGoogle: (email: string, name?: string, googleId?: string) => Promise<{ success: boolean; role?: UserRole; message?: string }>;
  signup: (fullName: string, email: string, pass: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  adminAssignRole: (userId: string, newRole: UserRole) => Promise<{ success: boolean; error?: string }>;
  adminToggleUserStatus: (userId: string) => Promise<{ success: boolean; error?: string }>;
  adminSetUserStatus: (userId: string, newStatus: AccountStatus) => Promise<{ success: boolean; error?: string }>;
  updateUserDisplayName: (name: string) => Promise<{ success: boolean; error?: string }>;
  setupInitialAdminPassword: (password: string) => Promise<{ success: boolean; message?: string; error?: string }>;
  refreshAdminUsers: () => Promise<void>;
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
  sidebarCollapsed: boolean;
  setSidebarCollapsed: React.Dispatch<React.SetStateAction<boolean>>;
  toggleSidebarCollapse: () => void;
  devSwitchRole?: (role: UserRole) => void;
  fetchLoginHistory: () => Promise<LoginEventRecord[]>;

  // Live Supabase Database State
  isLiveDatabase: boolean;
  platformMetrics: PlatformMetricsSummary | null;
  isLoadingPlatformMetrics: boolean;
  platformMetricsError: string | null;

  dbTransactions: DbTransaction[];
  dbTransactionsTotal: number;
  dbTransactionsPage: number;
  dbTransactionsPages: number;
  isLoadingTransactions: boolean;
  transactionsError: string | null;

  dbCustomers: DbCustomer[];
  dbCustomersTotal: number;
  dbCustomersPage: number;
  dbCustomersPages: number;
  isLoadingCustomers: boolean;
  customersError: string | null;

  dbAccounts: DbAccount[];
  isLoadingAccounts: boolean;

  dbMerchants: DbMerchant[];
  isLoadingMerchants: boolean;

  dbFraudAlerts: DbFraudAlert[];
  dbFraudAlertsTotal: number;
  dbFraudAlertsPage: number;
  dbFraudAlertsPages: number;
  isLoadingFraudAlerts: boolean;
  fraudAlertsError: string | null;

  dbSupportCases: DbSupportCase[];
  dbSupportCasesTotal: number;
  isLoadingSupportCases: boolean;
  supportCasesError: string | null;

  categorySpending: CategorySpendingSummary[];
  isLoadingCategorySpending: boolean;

  customerSegments: SegmentDistributionSummary[];
  isLoadingCustomerSegments: boolean;

  customerDossier: CustomerFinancialDossier | null;
  isLoadingCustomerDossier: boolean;
  customerDossierError: string | null;

  transactionTrends: TransactionTrendBucket[];
  isLoadingTransactionTrends: boolean;
  fetchTransactionTrends: (range?: string) => Promise<void>;

  analystMetrics: AnalystMetricsSummary | null;
  isLoadingAnalystMetrics: boolean;
  analystMetricsError: string | null;
  fetchAnalystMetrics: () => Promise<void>;

  riskMetrics: RiskMetricsSummary | null;
  isLoadingRiskMetrics: boolean;
  riskMetricsError: string | null;
  fetchRiskMetrics: () => Promise<void>;

  // Reusable Database Actions
  fetchPlatformMetrics: () => Promise<void>;
  fetchTransactions: (params?: PaginationParams & { customerId?: string; category?: string; status?: string; isFlagged?: boolean }) => Promise<void>;
  fetchCustomers: (params?: PaginationParams & { segment?: string; city?: string }) => Promise<void>;
  fetchAccounts: (customerId?: string) => Promise<void>;
  fetchMerchants: (search?: string) => Promise<void>;
  fetchFraudAlerts: (params?: PaginationParams & { severity?: string; alertStatus?: string; fraudType?: string; search?: string }) => Promise<void>;
  fetchSupportCases: (params?: PaginationParams & { status?: string; priority?: string; customerId?: string }) => Promise<void>;
  fetchCategorySpending: () => Promise<void>;
  fetchCustomerSegments: () => Promise<void>;
  fetchCustomerDossier: (customerId?: string) => Promise<void>;
  updateFraudAlertStatus: (alertId: string, alertStatus: string) => Promise<{ success: boolean; error?: string }>;
  createSupportCase: (caseData: Partial<DbSupportCase>) => Promise<{ success: boolean; caseId?: string; error?: string }>;
  resolveDbSupportCase: (caseId: string) => Promise<{ success: boolean; error?: string }>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const GUEST_USER: UserProfile = {
  id: 'guest',
  name: 'Guest User',
  email: '',
  role: 'UNASSIGNED',
  roleTitle: 'Unauthenticated Guest',
  avatarInitials: 'G',
  accountStatus: 'PENDING_APPROVAL',
  createdDate: new Date().toISOString().split('T')[0]
};

// Map backend role to client UserRole enum
export const mapRoleToClient = (serverRole: string): UserRole => {
  const r = (serverRole || '').toLowerCase();
  if (r === 'admin') return 'ADMIN';
  if (r === 'business_analyst') return 'BUSINESS_ANALYST';
  if (r === 'risk_analyst') return 'RISK_FRAUD_ANALYST';
  if (r === 'customer') return 'CUSTOMER';
  return 'UNASSIGNED';
};

export const mapRoleToServer = (clientRole: UserRole): string => {
  switch (clientRole) {
    case 'ADMIN': return 'admin';
    case 'BUSINESS_ANALYST': return 'business_analyst';
    case 'RISK_FRAUD_ANALYST': return 'risk_analyst';
    case 'CUSTOMER': return 'customer';
    case 'UNASSIGNED':
    default: return 'unassigned';
  }
};

// Explicit normalization layer for Account Status (fails closed to PENDING_APPROVAL)
export const normalizeAccountStatus = (rawStatus: any): AccountStatus => {
  const s = String(rawStatus || '').trim().toLowerCase();
  if (s === 'active') return 'ACTIVE';
  if (s === 'suspended') return 'SUSPENDED';
  if (s === 'pending approval' || s === 'pending_approval' || s === 'pending') return 'PENDING_APPROVAL';
  // Fail closed on any unknown, malformed, or missing value
  return 'PENDING_APPROVAL';
};

export const mapStatusToServer = (clientStatus: AccountStatus): string => {
  switch (clientStatus) {
    case 'ACTIVE': return 'active';
    case 'SUSPENDED': return 'suspended';
    case 'PENDING_APPROVAL':
    default: return 'pending_approval';
  }
};

const formatUserProfile = (u: any): UserProfile => {
  const clientRole = mapRoleToClient(u.role);
  const nowIso = new Date().toISOString();
  const displayName = u.display_name || u.name || (u.email ? u.email.split('@')[0] : 'User');
  const normalizedStatus = normalizeAccountStatus(u.status || u.account_status || u.accountStatus);
  return {
    id: u.id,
    name: displayName,
    display_name: displayName,
    email: u.email,
    role: clientRole,
    roleTitle: u.roleTitle || (clientRole === 'ADMIN' ? 'Platform Administrator' : clientRole === 'BUSINESS_ANALYST' ? 'Senior Financial Analyst' : clientRole === 'RISK_FRAUD_ANALYST' ? 'Risk & Fraud Specialist' : clientRole === 'CUSTOMER' ? 'Personal Wealth Client' : 'Pending Role Assignment'),
    avatarInitials: u.avatarInitials || (displayName[0] || 'U').toUpperCase(),
    accountStatus: normalizedStatus,
    createdDate: u.createdDate || (u.created_at ? u.created_at.split('T')[0] : nowIso.split('T')[0]),
    created_at: u.created_at || (u.createdDate ? new Date(u.createdDate).toISOString() : nowIso),
    lastLogin: u.lastLogin || (u.last_login_at ? new Date(u.last_login_at).toLocaleTimeString() : 'Just now'),
    last_login_at: u.last_login_at || nowIso,
    customerId: u.customer_id || u.customerId,
    authProviders: u.authProviders || (u.auth_provider ? [u.auth_provider] : ['email']),
    auth_provider: u.auth_provider || (u.authProviders && u.authProviders[0]) || 'email',
    emailVerified: u.emailVerified ?? true
  };
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentPath, setCurrentPath] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const p = window.location.pathname;
      return p && p !== '' ? p : '/';
    }
    return '/';
  });

  const [authToken, setAuthToken] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('finsight_token');
    }
    return null;
  });

  const [currentUser, setCurrentUser] = useState<UserProfile>(GUEST_USER);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(true);
  const [systemUsers, setSystemUsers] = useState<UserProfile[]>([]);

  const [dateRange, setDateRange] = useState<string>('Oct 1, 2024 – Oct 31, 2024');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [notificationsOpen, setNotificationsOpen] = useState<boolean>(false);

  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('finsight_sidebar_collapsed') === 'true';
      } catch {
        return false;
      }
    }
    return false;
  });

  const toggleSidebarCollapse = useCallback(() => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        try {
          localStorage.setItem('finsight_sidebar_collapsed', String(next));
        } catch {}
      }
      return next;
    });
  }, []);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [cases, setCases] = useState<SupportCase[]>([]);
  const [recommendations, setRecommendations] = useState<AIRecommendation[]>([]);
  const [riskAlerts, setRiskAlerts] = useState<RiskAlert[]>([]);

  // Live Supabase Database States
  const [isLiveDatabase] = useState<boolean>(true);

  const [platformMetrics, setPlatformMetrics] = useState<PlatformMetricsSummary | null>(null);
  const [isLoadingPlatformMetrics, setIsLoadingPlatformMetrics] = useState<boolean>(false);
  const [platformMetricsError, setPlatformMetricsError] = useState<string | null>(null);

  const [dbTransactions, setDbTransactions] = useState<DbTransaction[]>([]);
  const [dbTransactionsTotal, setDbTransactionsTotal] = useState<number>(0);
  const [dbTransactionsPage, setDbTransactionsPage] = useState<number>(1);
  const [dbTransactionsPages, setDbTransactionsPages] = useState<number>(1);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState<boolean>(false);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);

  const [dbCustomers, setDbCustomers] = useState<DbCustomer[]>([]);
  const [dbCustomersTotal, setDbCustomersTotal] = useState<number>(0);
  const [dbCustomersPage, setDbCustomersPage] = useState<number>(1);
  const [dbCustomersPages, setDbCustomersPages] = useState<number>(1);
  const [isLoadingCustomers, setIsLoadingCustomers] = useState<boolean>(false);
  const [customersError, setCustomersError] = useState<string | null>(null);

  const [dbAccounts, setDbAccounts] = useState<DbAccount[]>([]);
  const [isLoadingAccounts, setIsLoadingAccounts] = useState<boolean>(false);

  const [dbMerchants, setDbMerchants] = useState<DbMerchant[]>([]);
  const [isLoadingMerchants, setIsLoadingMerchants] = useState<boolean>(false);

  const [dbFraudAlerts, setDbFraudAlerts] = useState<DbFraudAlert[]>([]);
  const [dbFraudAlertsTotal, setDbFraudAlertsTotal] = useState<number>(0);
  const [dbFraudAlertsPage, setDbFraudAlertsPage] = useState<number>(1);
  const [dbFraudAlertsPages, setDbFraudAlertsPages] = useState<number>(1);
  const [isLoadingFraudAlerts, setIsLoadingFraudAlerts] = useState<boolean>(false);
  const [fraudAlertsError, setFraudAlertsError] = useState<string | null>(null);

  const [riskMetrics, setRiskMetrics] = useState<RiskMetricsSummary | null>(null);
  const [isLoadingRiskMetrics, setIsLoadingRiskMetrics] = useState<boolean>(false);
  const [riskMetricsError, setRiskMetricsError] = useState<string | null>(null);

  const [dbSupportCases, setDbSupportCases] = useState<DbSupportCase[]>([]);
  const [dbSupportCasesTotal, setDbSupportCasesTotal] = useState<number>(0);
  const [isLoadingSupportCases, setIsLoadingSupportCases] = useState<boolean>(false);
  const [supportCasesError, setSupportCasesError] = useState<string | null>(null);

  const [categorySpending, setCategorySpending] = useState<CategorySpendingSummary[]>([]);
  const [isLoadingCategorySpending, setIsLoadingCategorySpending] = useState<boolean>(false);

  const [customerSegments, setCustomerSegments] = useState<SegmentDistributionSummary[]>([]);
  const [isLoadingCustomerSegments, setIsLoadingCustomerSegments] = useState<boolean>(false);

  const [customerDossier, setCustomerDossier] = useState<CustomerFinancialDossier | null>(null);
  const [isLoadingCustomerDossier, setIsLoadingCustomerDossier] = useState<boolean>(false);
  const [customerDossierError, setCustomerDossierError] = useState<string | null>(null);

  const [transactionTrends, setTransactionTrends] = useState<TransactionTrendBucket[]>([]);
  const [isLoadingTransactionTrends, setIsLoadingTransactionTrends] = useState<boolean>(false);

  const [analystMetrics, setAnalystMetrics] = useState<AnalystMetricsSummary | null>(null);
  const [isLoadingAnalystMetrics, setIsLoadingAnalystMetrics] = useState<boolean>(false);
  const [analystMetricsError, setAnalystMetricsError] = useState<string | null>(null);

  // Database to Client Mapping Helpers for seamless backward compatibility
  const mapDbTxToClientTx = (d: DbTransaction): Transaction => ({
    transaction_id: d.transaction_id,
    customer_id: d.customer_id,
    customer_name: d.customer_id,
    transaction_date: d.txn_datetime ? d.txn_datetime.replace('T', ' ').slice(0, 16) : '2025-10-01 12:00',
    transaction_amount: Number(d.amount_inr) || 0,
    merchant_category: (d.category as any) || 'Shopping',
    payment_method: (d.payment_method as any) || 'UPI',
    device_type: (d.device_type as any) || 'Mobile Android',
    country: d.is_international === 1 ? 'International' : 'India',
    city: d.city || 'Mumbai',
    transaction_status: d.status === 'Success' ? 'Completed' : (d.status === 'Failed' ? 'Declined' : 'Pending'),
    fraud_status: d.is_flagged === 1 ? 'Suspicious' : 'Normal',
    risk_score: d.is_flagged === 1 ? 85 : 12
  });

  const mapDbAlertToClientAlert = (a: DbFraudAlert): RiskAlert => ({
    alert_id: a.alert_id,
    transaction_id: a.transaction_id,
    customer_id: a.customer_id,
    customer_name: a.customer_id,
    amount: Number(a.loss_amount_inr) || 0,
    risk_score: a.alert_status === 'Confirmed Fraud' ? 95 : (a.alert_status === 'Under Review' ? 82 : 45),
    risk_type: (a.rule_triggered as any) || (a.fraud_type as any) || 'Suspicious Activity',
    severity: a.alert_status === 'Confirmed Fraud' ? 'High' : (a.alert_status === 'Under Review' ? 'High' : 'Medium'),
    status: a.alert_status === 'Under Review' ? 'Investigating' : (a.alert_status === 'Resolved' || a.alert_status === 'False Positive' ? 'Cleared' : 'New'),
    created_at: a.alert_date ? a.alert_date.slice(0, 10) : '',
    location: 'India'
  });

  const mapDbCaseToClientCase = (c: DbSupportCase): SupportCase => ({
    case_id: c.case_id,
    customer_id: c.customer_id,
    customer_name: c.customer_id,
    case_type: (c.issue_category as any) || 'Technical',
    priority: (c.priority as any) || 'Medium',
    status: (c.status as any) || 'Open',
    created_at: c.created_at ? c.created_at.slice(0, 10) : 'Today',
    assigned_to: c.agent_id || 'Tier-1 Support',
    description: `Case ${c.case_id} regarding ${c.issue_category} via ${c.channel}`
  });

  // Reusable Typed Actions
  const fetchPlatformMetrics = useCallback(async () => {
    setIsLoadingPlatformMetrics(true);
    setPlatformMetricsError(null);
    try {
      const data = await databaseService.getPlatformMetrics();
      setPlatformMetrics(data);
    } catch (err: any) {
      setPlatformMetricsError(err?.message || 'Failed to fetch platform metrics');
    } finally {
      setIsLoadingPlatformMetrics(false);
    }
  }, []);

  const fetchTransactions = useCallback(async (params?: PaginationParams & { customerId?: string; category?: string; status?: string; isFlagged?: boolean }) => {
    setIsLoadingTransactions(true);
    setTransactionsError(null);
    try {
      const res = await databaseService.getTransactions(params);
      setDbTransactions(res.data);
      setDbTransactionsTotal(res.total);
      setDbTransactionsPage(res.page);
      setDbTransactionsPages(res.totalPages);
      setTransactions(res.data ? res.data.map(mapDbTxToClientTx) : []);
    } catch (err: any) {
      setTransactionsError(err?.message || 'Failed to fetch transactions');
    } finally {
      setIsLoadingTransactions(false);
    }
  }, []);

  const fetchCustomers = useCallback(async (params?: PaginationParams & { segment?: string; city?: string }) => {
    setIsLoadingCustomers(true);
    setCustomersError(null);
    try {
      const res = await databaseService.getCustomers(params);
      setDbCustomers(res.data);
      setDbCustomersTotal(res.total);
      setDbCustomersPage(res.page);
      setDbCustomersPages(res.totalPages);
    } catch (err: any) {
      setCustomersError(err?.message || 'Failed to fetch customers');
    } finally {
      setIsLoadingCustomers(false);
    }
  }, []);

  const fetchAccounts = useCallback(async (customerId?: string) => {
    setIsLoadingAccounts(true);
    try {
      const res = await databaseService.getAccounts({ customerId, limit: 50 });
      setDbAccounts(res.data);
    } catch (err) {
      console.warn('Failed to fetch accounts:', err);
    } finally {
      setIsLoadingAccounts(false);
    }
  }, []);

  const fetchMerchants = useCallback(async (search?: string) => {
    setIsLoadingMerchants(true);
    try {
      const res = await databaseService.getMerchants({ search, limit: 50 });
      setDbMerchants(res.data);
    } catch (err) {
      console.warn('Failed to fetch merchants:', err);
    } finally {
      setIsLoadingMerchants(false);
    }
  }, []);

  const fetchFraudAlerts = useCallback(async (params?: PaginationParams & { severity?: string; alertStatus?: string; fraudType?: string; search?: string }) => {
    setIsLoadingFraudAlerts(true);
    setFraudAlertsError(null);
    try {
      const res = await databaseService.getFraudAlerts(params);
      setDbFraudAlerts(res.data);
      setDbFraudAlertsTotal(res.total);
      setDbFraudAlertsPage(res.page);
      setDbFraudAlertsPages(res.totalPages);
      setRiskAlerts(res.data ? res.data.map(mapDbAlertToClientAlert) : []);
    } catch (err: any) {
      setFraudAlertsError(err?.message || 'Failed to fetch fraud alerts');
    } finally {
      setIsLoadingFraudAlerts(false);
    }
  }, []);

  const fetchSupportCases = useCallback(async (params?: PaginationParams & { status?: string; priority?: string; customerId?: string }) => {
    setIsLoadingSupportCases(true);
    setSupportCasesError(null);
    try {
      const res = await databaseService.getSupportCases(params);
      setDbSupportCases(res.data);
      setDbSupportCasesTotal(res.total);
      setCases(res.data ? res.data.map(mapDbCaseToClientCase) : []);
    } catch (err: any) {
      setSupportCasesError(err?.message || 'Failed to fetch support cases');
    } finally {
      setIsLoadingSupportCases(false);
    }
  }, []);

  const fetchCategorySpending = useCallback(async () => {
    setIsLoadingCategorySpending(true);
    try {
      const data = await databaseService.getCategorySpending();
      setCategorySpending(data);
    } catch (err) {
      console.warn('Failed to fetch category spending:', err);
    } finally {
      setIsLoadingCategorySpending(false);
    }
  }, []);

  const fetchCustomerSegments = useCallback(async () => {
    setIsLoadingCustomerSegments(true);
    try {
      const data = await databaseService.getCustomerSegments();
      setCustomerSegments(data);
    } catch (err) {
      console.warn('Failed to fetch customer segments:', err);
    } finally {
      setIsLoadingCustomerSegments(false);
    }
  }, []);

  const fetchCustomerDossier = useCallback(async (customerId?: string) => {
    setIsLoadingCustomerDossier(true);
    setCustomerDossierError(null);
    try {
      const targetId = customerId || currentUser.customerId || '';
      const dossier = await databaseService.getCustomerDossier(targetId);
      setCustomerDossier(dossier);
      if (dossier.recentTransactions && dossier.recentTransactions.length > 0) {
        setTransactions(dossier.recentTransactions.map(mapDbTxToClientTx));
      }
    } catch (err: any) {
      setCustomerDossier(null);
      setCustomerDossierError(err?.message || 'Failed to fetch customer financial dossier');
    } finally {
      setIsLoadingCustomerDossier(false);
    }
  }, [currentUser.customerId]);

  const fetchRiskMetrics = useCallback(async () => {
    setIsLoadingRiskMetrics(true);
    setRiskMetricsError(null);
    try {
      const data = await databaseService.getRiskMetrics();
      setRiskMetrics(data);
    } catch (err: any) {
      setRiskMetricsError(err?.message || 'Failed to fetch risk metrics');
    } finally {
      setIsLoadingRiskMetrics(false);
    }
  }, []);

  const updateFraudAlertStatus = useCallback(async (alertId: string, alertStatus: string) => {
    const res = await databaseService.updateFraudAlertStatus(alertId, alertStatus);
    if (res.success) {
      await Promise.all([
        fetchFraudAlerts(),
        fetchRiskMetrics(),
        fetchPlatformMetrics()
      ]);
    }
    return res;
  }, [fetchFraudAlerts, fetchRiskMetrics, fetchPlatformMetrics]);

  const createSupportCase = useCallback(async (caseData: Partial<DbSupportCase>) => {
    const res = await databaseService.createSupportCase(caseData);
    if (res.success) {
      await fetchSupportCases();
    }
    return res;
  }, [fetchSupportCases]);

  const resolveDbSupportCase = useCallback(async (caseId: string) => {
    const res = await databaseService.resolveSupportCase(caseId);
    if (res.success) {
      await fetchSupportCases();
    }
    return res;
  }, [fetchSupportCases]);

  const fetchTransactionTrends = useCallback(async (range: string = 'all') => {
    setIsLoadingTransactionTrends(true);
    try {
      const data = await databaseService.getTransactionTrends(range);
      setTransactionTrends(data);
    } catch (err) {
      console.warn('Failed to fetch transaction trends:', err);
    } finally {
      setIsLoadingTransactionTrends(false);
    }
  }, []);

  const fetchAnalystMetrics = useCallback(async () => {
    setIsLoadingAnalystMetrics(true);
    setAnalystMetricsError(null);
    try {
      const data = await databaseService.getAnalystMetrics();
      setAnalystMetrics(data);
      if (data?.paymentMethodBreakdown && data.paymentMethodBreakdown.length > 0) {
        setRecommendations([
          {
            recommendation_id: 'REC-001',
            category: 'Growth',
            title: `Scale UPI Infrastructure (${data.paymentMethodBreakdown[0]?.percentage || 37.4}% Rail Share)`,
            description: `${data.paymentMethodBreakdown[0]?.method || 'UPI'} handles ${data.paymentMethodBreakdown[0]?.count?.toLocaleString() || '81,464'} transactions. Implement proactive load balancing.`,
            priority: 'High',
            confidence: 94,
            status: 'Active',
            action_label: 'Review Capacity',
            icon_type: 'target'
          },
          {
            recommendation_id: 'REC-002',
            category: 'Risk Prevention',
            title: 'Refine False-Positive Velocity Checks',
            description: '1,474 of 3,500 alerts (42.1%) resolved as False Positives. Recalibrate anomaly threshold rules.',
            priority: 'High',
            confidence: 91,
            status: 'Active',
            action_label: 'Review Thresholds',
            icon_type: 'alert'
          },
          {
            recommendation_id: 'REC-003',
            category: 'Engagement',
            title: 'Target Active Customer Segments',
            description: `${data.activeCustomers?.toLocaleString() || '21,781'} of ${data.totalCustomers?.toLocaleString() || '25,000'} customers active (${data.activeCustomerRate || 87.1}%). Deploy personalized engagement.`,
            priority: 'Medium',
            confidence: 88,
            status: 'Active',
            action_label: 'Deploy Offers',
            icon_type: 'megaphone'
          },
          {
            recommendation_id: 'REC-004',
            category: 'Credit',
            title: 'Optimize Savings Account Yields',
            description: `${data.accountTypeBreakdown?.[0]?.count?.toLocaleString() || '19,553'} savings accounts holding primary liquidity. Automate sweep-in advisory.`,
            priority: 'Medium',
            confidence: 86,
            status: 'Active',
            action_label: 'Update Parameters',
            icon_type: 'chart'
          }
        ]);
      }
    } catch (err: any) {
      setAnalystMetricsError(err?.message || 'Failed to fetch analyst metrics');
    } finally {
      setIsLoadingAnalystMetrics(false);
    }
  }, []);

  // Role-Aware Live Data Loading upon authentication or role change
  useEffect(() => {
    if (!isAuthenticated || currentUser.accountStatus === 'SUSPENDED') return;

    if (currentUser.role === 'ADMIN') {
      fetchPlatformMetrics();
      fetchCustomerSegments();
      fetchCategorySpending();
      fetchCustomers({ page: 1, limit: 10 });
      fetchFraudAlerts({ limit: 10 });
      fetchTransactions({ limit: 20 });
      fetchSupportCases({ limit: 10 });
    } else if (currentUser.role === 'BUSINESS_ANALYST') {
      fetchPlatformMetrics();
      fetchCustomerSegments();
      fetchCategorySpending();
      fetchTransactionTrends();
      fetchAnalystMetrics();
      fetchTransactions({ limit: 20 });
      fetchMerchants();
    } else if (currentUser.role === 'RISK_FRAUD_ANALYST') {
      fetchPlatformMetrics();
      fetchRiskMetrics();
      fetchFraudAlerts({ page: 1, limit: 15 });
      fetchTransactions({ isFlagged: true, limit: 15 });
    } else if (currentUser.role === 'CUSTOMER') {
      const custId = currentUser.customerId || '';
      fetchCustomerDossier(custId);
      fetchTransactions(custId ? { customerId: custId, limit: 20 } : { limit: 20 });
      fetchSupportCases(custId ? { customerId: custId, limit: 10 } : { limit: 10 });
    }
  }, [
    isAuthenticated,
    currentUser.role,
    currentUser.customerId,
    currentUser.accountStatus,
    fetchPlatformMetrics,
    fetchCustomerSegments,
    fetchCategorySpending,
    fetchCustomers,
    fetchFraudAlerts,
    fetchTransactions,
    fetchSupportCases,
    fetchMerchants,
    fetchCustomerDossier,
    fetchTransactionTrends,
    fetchAnalystMetrics,
    fetchRiskMetrics
  ]);

  const navigate = useCallback((path: string) => {
    setCurrentPath(path);
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', path);
      window.scrollTo(0, 0);
    }
  }, []);

  useEffect(() => {
    const handlePop = () => {
      if (typeof window !== 'undefined') {
        setCurrentPath(window.location.pathname || '/');
      }
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, []);

  // Redirect helper based on trusted server/database role
  const redirectByRole = useCallback((role: UserRole) => {
    switch (role) {
      case 'ADMIN':
        navigate('/app/admin');
        break;
      case 'BUSINESS_ANALYST':
        navigate('/app/analyst');
        break;
      case 'RISK_FRAUD_ANALYST':
        navigate('/app/risk');
        break;
      case 'CUSTOMER':
        navigate('/app/customer');
        break;
      case 'UNASSIGNED':
      default:
        navigate('/app/pending');
        break;
    }
  }, [navigate]);

  // Load transactions based on authenticated clearance
  const fetchAuthorizedTransactions = useCallback(async (token: string, role: UserRole) => {
    try {
      const res = await fetch('/api/data/transactions', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.transactions) {
          setTransactions(data.transactions);
        }
      }
    } catch {
      // Retain fallback
    }
  }, []);

  // Fetch registered users from Supabase or server
  const refreshAdminUsers = useCallback(async () => {
    const token = localStorage.getItem('finsight_token');

    // 1. If Supabase client is configured, query public.profiles
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        if (!error && Array.isArray(data)) {
          const formatted: UserProfile[] = data.map((u: any) => formatUserProfile(u));
          setSystemUsers(formatted);
          return;
        }
      } catch (err) {
        console.warn('Supabase profiles query error, checking backend endpoint:', err);
      }
    }

    // 2. Query backend /api/admin/users
    if (!token) return;
    try {
      const res = await fetch('/api/admin/users', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data.users)) {
          const formatted: UserProfile[] = data.users.map((u: any) => formatUserProfile(u));
          setSystemUsers(formatted);
        }
      }
    } catch (err) {
      console.error('Failed to fetch admin users:', err);
    }
  }, []);

  // Hydrate Supabase authenticated session and profile
  const syncSupabaseProfile = useCallback(async (sbUser: any, token: string) => {
    if (!supabase) return null;
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', sbUser.id)
        .maybeSingle();

      let resolvedProfile = profile;
      if (!resolvedProfile) {
        try {
          const ensureRes = await fetch('/api/auth/ensure-profile', {
            method: 'POST',
            headers: { Authorization: `Bearer ${token}` }
          });
          if (ensureRes.ok) {
            const ensureData = await ensureRes.json();
            if (ensureData.user) {
              resolvedProfile = {
                id: ensureData.user.id,
                email: ensureData.user.email,
                display_name: ensureData.user.name || ensureData.user.display_name,
                role: ensureData.user.role || 'customer',
                account_status: ensureData.user.accountStatus?.toLowerCase() || 'active',
                customer_id: ensureData.user.customerId,
                created_at: ensureData.user.createdDate || ensureData.user.created_at,
                last_login_at: ensureData.user.lastLogin || ensureData.user.last_login_at
              };
            }
          }
        } catch (ensureErr) {
          console.warn('Notice: Error in ensure-profile fallback:', ensureErr);
        }
      }

      if (resolvedProfile) {
        const formatted = formatUserProfile({
          ...resolvedProfile,
          email: sbUser.email || resolvedProfile.email,
        });

        // Fail closed if suspended
        if (formatted.accountStatus === 'SUSPENDED') {
          await supabase.auth.signOut();
          localStorage.removeItem('finsight_token');
          setAuthToken(null);
          setIsAuthenticated(false);
          setCurrentUser(GUEST_USER);
          return { error: 'Your account is suspended. Please contact an administrator.' };
        }

        setCurrentUser(formatted);
        setIsAuthenticated(true);
        setAuthToken(token);
        localStorage.setItem('finsight_token', token);

        if (formatted.role === 'ADMIN') {
          refreshAdminUsers();
        }
        fetchAuthorizedTransactions(token, formatted.role);
        return { profile: formatted };
      }
    } catch (err) {
      console.warn('Failed to load Supabase profile:', err);
    }
    return null;
  }, [refreshAdminUsers, fetchAuthorizedTransactions]);

  // Session verification: Check Supabase session first, then fallback to server session
  useEffect(() => {
    let isMounted = true;

    const verifySession = async () => {
      setIsLoadingAuth(true);

      // A. Check Supabase session
      if (supabase) {
        try {
          const { data: { session }, error } = await supabase.auth.getSession();
          if (session && session.user && !error) {
            const result = await syncSupabaseProfile(session.user, session.access_token);
            if (result && !result.error) {
              if (isMounted) setIsLoadingAuth(false);
              return;
            }
          }
        } catch (sbErr) {
          console.warn('Supabase session retrieval warning:', sbErr);
        }
      }

      // B. Fallback to server session verification
      const token = localStorage.getItem('finsight_token');
      if (!token) {
        if (isMounted) {
          setIsAuthenticated(false);
          setCurrentUser(GUEST_USER);
          setIsLoadingAuth(false);
        }
        return;
      }

      try {
        const res = await fetch('/api/auth/session', {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.ok) {
          const data = await res.json();
          const profile = formatUserProfile(data.user);

          if (isMounted) {
            setCurrentUser(profile);
            setIsAuthenticated(true);
            setAuthToken(token);

            if (profile.role === 'ADMIN') {
              refreshAdminUsers();
            }
            fetchAuthorizedTransactions(token, profile.role);
          }
        } else {
          localStorage.removeItem('finsight_token');
          if (isMounted) {
            setAuthToken(null);
            setIsAuthenticated(false);
            setCurrentUser(GUEST_USER);
          }
        }
      } catch (err) {
        console.error('Session validation error:', err);
        if (isMounted) {
          setIsAuthenticated(false);
          setCurrentUser(GUEST_USER);
        }
      } finally {
        if (isMounted) setIsLoadingAuth(false);
      }
    };

    verifySession();

    // Listen for Supabase Auth state changes (token refresh, sign in, logout)
    let authListener: { subscription: { unsubscribe: () => void } } | null = null;
    if (supabase) {
      const { data } = supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const res = await syncSupabaseProfile(session.user, session.access_token);
          if (res?.profile) {
            recordAuditEvent(
              {
                email: session.user.email || res.profile.email,
                eventType: 'login_success',
                success: true,
                userId: session.user.id
              },
              session.access_token
            );
          }
        } else if (event === 'SIGNED_OUT') {
          localStorage.removeItem('finsight_token');
          setAuthToken(null);
          setIsAuthenticated(false);
          setCurrentUser(GUEST_USER);
        }
      });
      authListener = data;
    }

    return () => {
      isMounted = false;
      if (authListener?.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, [syncSupabaseProfile, refreshAdminUsers, fetchAuthorizedTransactions]);

  // A. Email & Password Login
  const login = async (
    email: string,
    pass: string
  ): Promise<{ success: boolean; role?: UserRole; message?: string; requiresInitialSetup?: boolean }> => {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Authoritative Supabase Auth login when client is configured
    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password: pass
        });

        if (error) {
          const errLower = error.message.toLowerCase();
          let userMessage = error.message;
          let errorCat = 'invalid_credentials';

          if (errLower.includes('email not confirmed')) {
            userMessage = 'Your email address is not yet confirmed. Please check your verification inbox.';
            errorCat = 'unconfirmed_email';
          } else if (errLower.includes('invalid login credentials') || errLower.includes('invalid credentials')) {
            userMessage = 'Invalid email address or password. Please verify your credentials and try again.';
            errorCat = 'invalid_credentials';
          }

          recordAuditEvent({
            email: cleanEmail,
            eventType: 'login_failure',
            success: false,
            errorCategory: errorCat
          });

          return { success: false, message: userMessage };
        }

        if (data.session && data.user) {
          const token = data.session.access_token;
          const profileSync = await syncSupabaseProfile(data.user, token);

          if (profileSync?.error) {
            recordAuditEvent({
              email: cleanEmail,
              eventType: 'login_failure',
              success: false,
              errorCategory: 'account_suspended',
              userId: data.user.id
            }, token);
            return { success: false, message: profileSync.error };
          }

          if (profileSync?.profile) {
            const profile = profileSync.profile;
            recordAuditEvent({
              email: cleanEmail,
              eventType: 'login_success',
              success: true,
              userId: data.user.id
            }, token);

            if (profile.accountStatus === 'PENDING_APPROVAL' || profile.role === 'UNASSIGNED') {
              navigate('/app/pending');
              return {
                success: true,
                role: profile.role,
                message: 'Your account has been verified and is awaiting administrator approval.'
              };
            }

            redirectByRole(profile.role);
            return { success: true, role: profile.role };
          }
        }
      } catch (sbError: any) {
        console.error('Supabase authentication error:', sbError);
        recordAuditEvent({
          email: cleanEmail,
          eventType: 'login_failure',
          success: false,
          errorCategory: 'network_error'
        });
        return {
          success: false,
          message: sbError?.message || 'Authentication service error. Please try again.'
        };
      }
    }

    // 2. Local fallback endpoint (when Supabase client is unconfigured)
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanEmail, password: pass })
      });

      const data = await res.json();

      if (!res.ok) {
        return {
          success: false,
          message: data.error || data.message || 'Authentication failed.',
          requiresInitialSetup: data.requiresInitialSetup
        };
      }

      const token = data.token;
      const profile = formatUserProfile(data.user);

      localStorage.setItem('finsight_token', token);
      setAuthToken(token);
      setIsAuthenticated(true);
      setCurrentUser(profile);

      if (profile.role === 'ADMIN') {
        refreshAdminUsers();
      }

      fetchAuthorizedTransactions(token, profile.role);

      if (profile.accountStatus === 'PENDING_APPROVAL' || profile.role === 'UNASSIGNED') {
        navigate('/app/pending');
      } else {
        redirectByRole(profile.role);
      }

      return { success: true, role: profile.role };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Network error during login.' };
    }
  };

  // B. Google Authentication (Explicitly disabled per security boundary)
  const loginWithGoogle = async (
    _email: string,
    _name?: string,
    _googleId?: string
  ): Promise<{ success: boolean; role?: UserRole; message?: string }> => {
    return {
      success: false,
      message: 'Google Sign-In has been removed. Please use your work email and password to sign in.'
    };
  };

  // C. Registration (Assigns customer role server-side, routing directly to /app/customer)
  const signup = async (
    fullName: string,
    email: string,
    pass: string
  ): Promise<{ success: boolean; message?: string }> => {
    const cleanEmail = email.trim().toLowerCase();

    // 1. Authoritative Supabase Auth registration
    if (supabase) {
      try {
        const { data, error } = await supabase.auth.signUp({
          email: cleanEmail,
          password: pass,
          options: {
            data: {
              full_name: fullName.trim(),
              name: fullName.trim(),
            }
          }
        });

        if (error) {
          const errLower = error.message.toLowerCase();
          if (errLower.includes('already registered') || errLower.includes('user already exists')) {
            return {
              success: false,
              message: 'An account with this email address already exists. Please sign in or reset your password.'
            };
          }
          return { success: false, message: error.message };
        }

        // Audit registration event
        recordAuditEvent({
          email: cleanEmail,
          eventType: 'registration',
          success: true,
          userId: data.user?.id
        });

        // Email confirmation flow
        if (data.user && !data.session) {
          return {
            success: true,
            message: 'Account created successfully! Please check your email inbox to verify your address. Once verified, you will have immediate customer access.'
          };
        }

        if (data.session && data.user) {
          const token = data.session.access_token;
          try {
            await fetch('/api/auth/ensure-profile', {
              method: 'POST',
              headers: { Authorization: `Bearer ${token}` }
            });
          } catch (ensureErr) {
            console.warn('Notice: Profile ensure endpoint notice:', ensureErr);
          }
          await syncSupabaseProfile(data.user, token);
          navigate('/app/customer');
          return {
            success: true,
            message: 'Account created successfully! Welcome to FinSight AI.'
          };
        }

      } catch (sbErr: any) {
        console.error('Supabase registration error:', sbErr);
        return { success: false, message: sbErr?.message || 'Registration failed.' };
      }
    }

    // 2. Server API fallback registration (when Supabase is unconfigured)
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: fullName, email: cleanEmail, password: pass })
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, message: data.error || 'Registration failed.' };
      }

      const token = data.token;
      const profile = formatUserProfile(data.user);

      localStorage.setItem('finsight_token', token);
      setAuthToken(token);
      setIsAuthenticated(true);
      setCurrentUser(profile);
      navigate(data.targetRoute || '/app/customer');

      return {
        success: true,
        message: 'Account registered successfully! Welcome to FinSight AI.'
      };
    } catch (err: any) {
      return { success: false, message: err?.message || 'Registration failed.' };
    }
  };

  // D. Logout (Revoke session, log audit event, clear state)
  const logout = async () => {
    const token = localStorage.getItem('finsight_token') || authToken;

    // 1. Audit logout event
    if (currentUser?.email) {
      recordAuditEvent(
        {
          email: currentUser.email,
          eventType: 'logout',
          success: true,
          userId: currentUser.id !== 'guest' ? currentUser.id : undefined
        },
        token
      );
    }

    // 2. Clear Supabase Auth session
    if (supabase) {
      try {
        await supabase.auth.signOut();
      } catch (err) {
        console.warn('Supabase signOut error:', err);
      }
    }

    // 3. Clear backend session
    if (token) {
      try {
        await fetch('/api/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
      } catch {}
    }

    // 4. Clear all cached database states so no user/role data leaks across sessions
    setCustomerDossier(null);
    setCustomerDossierError(null);
    setDbTransactions([]);
    setTransactions([]);
    setDbCustomers([]);
    setDbFraudAlerts([]);
    setRiskAlerts([]);
    setDbSupportCases([]);
    setCases([]);
    setPlatformMetrics(null);
    setAnalystMetrics(null);
    setAnalystMetricsError(null);
    setRiskMetrics(null);
    setRiskMetricsError(null);
    setCustomerSegments([]);
    setCategorySpending([]);
    setTransactionTrends([]);
    setRecommendations([]);

    localStorage.removeItem('finsight_token');
    setAuthToken(null);
    setIsAuthenticated(false);
    setCurrentUser(GUEST_USER);
    navigate('/login');
  };

  // E. Admin Assign Role (Server-Authorized Admin Endpoint with Database Sync)
  const adminAssignRole = async (
    userId: string,
    newRole: UserRole
  ): Promise<{ success: boolean; error?: string }> => {
    const token = localStorage.getItem('finsight_token');
    const serverRole = mapRoleToServer(newRole);

    if (!token) return { success: false, error: 'Unauthorized: Admin authentication session required.' };

    try {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ role: serverRole })
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to update role' };
      }

      await refreshAdminUsers();

      if (currentUser.id === userId && data.user) {
        setCurrentUser((prev) => ({
          ...prev,
          role: newRole,
          roleTitle: data.user.roleTitle
        }));
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error updating role' };
    }
  };

  // F. Admin Toggle Status (Server-Authorized Admin Endpoint with Database Sync)
  const adminToggleUserStatus = async (
    userId: string
  ): Promise<{ success: boolean; error?: string }> => {
    const targetUser = systemUsers.find((u) => u.id === userId);
    if (!targetUser) return { success: false, error: 'User not found' };

    const nextStatus: AccountStatus = targetUser.accountStatus === 'ACTIVE' ? 'SUSPENDED' : 'ACTIVE';
    return adminSetUserStatus(userId, nextStatus);
  };

  // F2. Admin Set Status directly (Active, Pending Approval, Suspended)
  const adminSetUserStatus = async (
    userId: string,
    newStatus: AccountStatus
  ): Promise<{ success: boolean; error?: string }> => {
    const token = localStorage.getItem('finsight_token');
    if (!token) return { success: false, error: 'Unauthorized: Admin authentication session required.' };

    try {
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to update account status' };
      }

      await refreshAdminUsers();
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error updating status' };
    }
  };

  // G. Update Own Display Name (Allowed for ordinary authenticated users)
  const updateUserDisplayName = async (
    name: string
  ): Promise<{ success: boolean; error?: string }> => {
    const trimmed = name.trim();
    if (!trimmed) return { success: false, error: 'Display name cannot be empty.' };

    if (supabase && currentUser.id) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ display_name: trimmed })
          .eq('id', currentUser.id);

        if (error) {
          return { success: false, error: error.message };
        }
      } catch (err: any) {
        return { success: false, error: err?.message || 'Database update error' };
      }
    }

    setCurrentUser((prev) => ({
      ...prev,
      name: trimmed,
      display_name: trimmed
    }));

    return { success: true };
  };

  // H. Initial Admin Master Password Setup
  const setupInitialAdminPassword = async (
    password: string
  ): Promise<{ success: boolean; message?: string; error?: string }> => {
    try {
      const res = await fetch('/api/auth/setup-admin-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {})
        },
        body: JSON.stringify({ password })
      });

      const data = await res.json();
      if (!res.ok) {
        return { success: false, error: data.error || 'Failed to configure password.' };
      }

      if (data.token) {
        localStorage.setItem('finsight_token', data.token);
        setAuthToken(data.token);
        setIsAuthenticated(true);
        if (data.user) {
          const clientRole = mapRoleToClient(data.user.role);
          setCurrentUser(formatUserProfile(data.user));
          redirectByRole(clientRole);
        }
      }

      return { success: true, message: data.message };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Failed to setup administrator password.' };
    }
  };

  const dismissAlert = (id: string) => {
    setRiskAlerts((prev) => prev.filter((a) => a.alert_id !== id));
    updateFraudAlertStatus(id, 'False Positive').catch((err) => {
      console.warn('Failed to persist alert dismissal:', err);
    });
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

  // Fetch Login History from Supabase or server
  const fetchLoginHistory = useCallback(async (): Promise<LoginEventRecord[]> => {
    // 1. Query Supabase login_history table
    if (supabase) {
      try {
        const { data, error } = await supabase
          .from('login_history')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100);

        if (!error && Array.isArray(data)) {
          return data.map((item: any) => ({
            id: item.id,
            userId: item.user_id,
            email: item.email,
            displayName: item.display_name || item.email,
            role: item.role,
            provider: item.provider || 'email',
            ipAddress: item.ip_address || '—',
            userAgent: item.user_agent || '—',
            status: item.status === 'success' ? 'SUCCESS' : 'FAILED',
            createdAt: item.created_at
          }));
        }
      } catch (err) {
        console.warn('Supabase login_history query fallback:', err);
      }
    }

    // 2. Query backend /api/admin/login-history
    const token = localStorage.getItem('finsight_token');
    if (!token) return [];
    try {
      const res = await fetch('/api/admin/login-history', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        return data.history || [];
      }
    } catch (err) {
      console.error('Failed to fetch login history:', err);
    }
    return [];
  }, []);

  const devSwitchRole = useCallback((role: UserRole) => {
    setCurrentUser((prev) => ({
      ...prev,
      role,
      roleTitle:
        role === 'ADMIN'
          ? 'Platform Administrator'
          : role === 'BUSINESS_ANALYST'
          ? 'Senior Financial Analyst'
          : role === 'RISK_FRAUD_ANALYST'
          ? 'Risk & Fraud Specialist'
          : role === 'CUSTOMER'
          ? 'Personal Wealth Client'
          : 'Pending Role Assignment'
    }));
    redirectByRole(role);
  }, [redirectByRole]);

  const activeNotificationCount = riskAlerts.filter((a) => a.status === 'New').length + 2;

  return (
    <AppContext.Provider
      value={{
        currentPath,
        navigate,
        currentUser,
        currentRole: currentUser.role,
        isAuthenticated,
        isLoadingAuth,
        systemUsers,
        login,
        loginWithGoogle,
        signup,
        logout,
        adminAssignRole,
        adminToggleUserStatus,
        adminSetUserStatus,
        updateUserDisplayName,
        setupInitialAdminPassword,
        refreshAdminUsers,
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
        sidebarCollapsed,
        setSidebarCollapsed,
        toggleSidebarCollapse,
        devSwitchRole,
        fetchLoginHistory,

        // Live Database States
        isLiveDatabase,
        platformMetrics,
        isLoadingPlatformMetrics,
        platformMetricsError,

        dbTransactions,
        dbTransactionsTotal,
        dbTransactionsPage,
        dbTransactionsPages,
        isLoadingTransactions,
        transactionsError,

        dbCustomers,
        dbCustomersTotal,
        dbCustomersPage,
        dbCustomersPages,
        isLoadingCustomers,
        customersError,

        dbAccounts,
        isLoadingAccounts,

        dbMerchants,
        isLoadingMerchants,

        dbFraudAlerts,
        dbFraudAlertsTotal,
        dbFraudAlertsPage,
        dbFraudAlertsPages,
        isLoadingFraudAlerts,
        fraudAlertsError,

        dbSupportCases,
        dbSupportCasesTotal,
        isLoadingSupportCases,
        supportCasesError,

        categorySpending,
        isLoadingCategorySpending,

        customerSegments,
        isLoadingCustomerSegments,

        customerDossier,
        isLoadingCustomerDossier,
        customerDossierError,

        transactionTrends,
        isLoadingTransactionTrends,
        fetchTransactionTrends,

        analystMetrics,
        isLoadingAnalystMetrics,
        analystMetricsError,
        fetchAnalystMetrics,

        riskMetrics,
        isLoadingRiskMetrics,
        riskMetricsError,
        fetchRiskMetrics,

        // Reusable Actions
        fetchPlatformMetrics,
        fetchTransactions,
        fetchCustomers,
        fetchAccounts,
        fetchMerchants,
        fetchFraudAlerts,
        fetchSupportCases,
        fetchCategorySpending,
        fetchCustomerSegments,
        fetchCustomerDossier,
        updateFraudAlertStatus,
        createSupportCase,
        resolveDbSupportCase
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
