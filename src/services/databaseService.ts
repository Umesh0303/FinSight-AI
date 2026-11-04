/**
 * FinSight AI — Centralized Database Access Layer
 * Connects to Supabase business tables via secure authenticated API endpoints
 * and client-side queries with pagination, filtering, and customer scoping.
 */

import { supabase, isSupabaseConfigured, fetchWithAuth } from '../lib/supabase';
import {
  DbCustomer,
  DbAccount,
  DbTransaction,
  DbMerchant,
  DbBalanceSnapshot,
  DbCreditScoreHistory,
  DbFraudAlert,
  DbSupportCase,
  DbAppUser,
  PaginationParams,
  PaginatedResult,
  PlatformMetricsSummary,
  CategorySpendingSummary,
  SegmentDistributionSummary,
  CustomerFinancialDossier,
  TransactionTrendBucket,
  AnalystMetricsSummary,
  RiskMetricsSummary
} from '../types/database';

function getAuthHeader(): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('finsight_token') : null;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const databaseService = {
  /**
   * Fetch aggregated platform-wide KPIs
   */
  async getPlatformMetrics(): Promise<PlatformMetricsSummary> {
    const res = await fetchWithAuth('/api/data/platform-metrics', {
      headers: getAuthHeader()
    });
    if (res.ok) {
      return await res.json();
    }
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody?.error || `Failed to fetch platform metrics (${res.status})`);
  },

  /**
   * Fetch paginated transactions with server-side filtering
   */
  async getTransactions(params: PaginationParams & {
    customerId?: string;
    category?: string;
    status?: string;
    isFlagged?: boolean;
  } = {}): Promise<PaginatedResult<DbTransaction>> {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const query = new URLSearchParams({
      page: String(page),
      limit: String(limit)
    });
    if (params.search) query.set('search', params.search);
    if (params.customerId) query.set('customerId', params.customerId);
    if (params.category && params.category !== 'ALL') query.set('category', params.category);
    if (params.status && params.status !== 'ALL') query.set('status', params.status);
    if (params.isFlagged !== undefined) query.set('isFlagged', String(params.isFlagged));

    try {
      const res = await fetchWithAuth(`/api/data/transactions?${query.toString()}`, {
        headers: getAuthHeader()
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Failed to fetch transactions from API:', err);
    }

    return {
      data: [],
      total: 0,
      page,
      limit,
      totalPages: 0,
      hasMore: false,
      isFallback: true
    };
  },

  /**
   * Fetch paginated customers
   */
  async getCustomers(params: PaginationParams & {
    segment?: string;
    city?: string;
  } = {}): Promise<PaginatedResult<DbCustomer>> {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const query = new URLSearchParams({
      page: String(page),
      limit: String(limit)
    });
    if (params.search) query.set('search', params.search);
    if (params.segment && params.segment !== 'ALL') query.set('segment', params.segment);
    if (params.city && params.city !== 'ALL') query.set('city', params.city);

    try {
      const res = await fetchWithAuth(`/api/data/customers?${query.toString()}`, {
        headers: getAuthHeader()
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Failed to fetch customers from API:', err);
    }

    return {
      data: [],
      total: 0,
      page,
      limit,
      totalPages: 0,
      hasMore: false,
      isFallback: true
    };
  },

  /**
   * Fetch paginated accounts
   */
  async getAccounts(params: PaginationParams & { customerId?: string } = {}): Promise<PaginatedResult<DbAccount>> {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const query = new URLSearchParams({
      page: String(page),
      limit: String(limit)
    });
    if (params.search) query.set('search', params.search);
    if (params.customerId) query.set('customerId', params.customerId);

    try {
      const res = await fetchWithAuth(`/api/data/accounts?${query.toString()}`, {
        headers: getAuthHeader()
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Failed to fetch accounts from API:', err);
    }

    return {
      data: [],
      total: 0,
      page,
      limit,
      totalPages: 0,
      hasMore: false,
      isFallback: true
    };
  },

  /**
   * Fetch merchants
   */
  async getMerchants(params: PaginationParams = {}): Promise<PaginatedResult<DbMerchant>> {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const query = new URLSearchParams({
      page: String(page),
      limit: String(limit)
    });
    if (params.search) query.set('search', params.search);

    try {
      const res = await fetchWithAuth(`/api/data/merchants?${query.toString()}`, {
        headers: getAuthHeader()
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Failed to fetch merchants from API:', err);
    }

    return {
      data: [],
      total: 0,
      page,
      limit,
      totalPages: 0,
      hasMore: false,
      isFallback: true
    };
  },

  /**
   * Fetch paginated fraud alerts
   */
  async getFraudAlerts(params: PaginationParams & {
    severity?: string;
    alertStatus?: string;
    fraudType?: string;
  } = {}): Promise<PaginatedResult<DbFraudAlert>> {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const query = new URLSearchParams({
      page: String(page),
      limit: String(limit)
    });
    if (params.search) query.set('search', params.search);
    if (params.severity && params.severity !== 'ALL') query.set('severity', params.severity);
    if (params.alertStatus && params.alertStatus !== 'ALL') query.set('alertStatus', params.alertStatus);
    if (params.fraudType && params.fraudType !== 'ALL') query.set('fraudType', params.fraudType);

    try {
      const res = await fetchWithAuth(`/api/data/fraud-alerts?${query.toString()}`, {
        headers: getAuthHeader()
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Failed to fetch fraud alerts from API:', err);
    }

    return {
      data: [],
      total: 0,
      page,
      limit,
      totalPages: 0,
      hasMore: false,
      isFallback: true
    };
  },

  /**
   * Fetch support cases
   */
  async getSupportCases(params: PaginationParams & {
    status?: string;
    priority?: string;
    customerId?: string;
  } = {}): Promise<PaginatedResult<DbSupportCase>> {
    const page = params.page || 1;
    const limit = Math.min(params.limit || 20, 100);
    const query = new URLSearchParams({
      page: String(page),
      limit: String(limit)
    });
    if (params.search) query.set('search', params.search);
    if (params.status && params.status !== 'ALL') query.set('status', params.status);
    if (params.priority && params.priority !== 'ALL') query.set('priority', params.priority);
    if (params.customerId) query.set('customerId', params.customerId);

    try {
      const res = await fetchWithAuth(`/api/data/support-cases?${query.toString()}`, {
        headers: getAuthHeader()
      });
      if (res.ok) {
        return await res.json();
      }
    } catch (err) {
      console.warn('Failed to fetch support cases from API:', err);
    }

    return {
      data: [],
      total: 0,
      page,
      limit,
      totalPages: 0,
      hasMore: false,
      isFallback: true
    };
  },

  /**
   * Fetch spending category aggregation
   */
  async getCategorySpending(): Promise<CategorySpendingSummary[]> {
    const res = await fetchWithAuth('/api/data/category-spending', {
      headers: getAuthHeader()
    });
    if (res.ok) {
      return await res.json();
    }
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody?.error || `Failed to fetch category spending (${res.status})`);
  },

  /**
   * Fetch customer segment distribution
   */
  async getCustomerSegments(): Promise<SegmentDistributionSummary[]> {
    const res = await fetchWithAuth('/api/data/customer-segments', {
      headers: getAuthHeader()
    });
    if (res.ok) {
      return await res.json();
    }
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody?.error || `Failed to fetch customer segments (${res.status})`);
  },

  /**
   * Fetch full financial dossier for a specific customer
   * Used for the Customer Dashboard and Customer Profile modals
   */
  async getCustomerDossier(customerId: string): Promise<CustomerFinancialDossier> {
    const res = await fetchWithAuth(`/api/data/customer-dossier?customerId=${encodeURIComponent(customerId)}`, {
      headers: getAuthHeader()
    });
    if (res.ok) {
      return await res.json();
    }
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody?.error || `Customer financial dossier unavailable (${res.status})`);
  },

  /**
   * Update fraud alert status (e.g. Under Review -> Resolved or False Positive)
   */
  async updateFraudAlertStatus(alertId: string, alertStatus: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetchWithAuth(`/api/data/fraud-alerts/${alertId}/status`, {
        method: 'PATCH',
        headers: getAuthHeader(),
        body: JSON.stringify({ alertStatus })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        return { success: true };
      }
      return { success: false, error: data?.error || 'Failed to update alert' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error' };
    }
  },

  /**
   * Create a support case
   */
  async createSupportCase(caseData: Partial<DbSupportCase>): Promise<{ success: boolean; caseId?: string; error?: string }> {
    try {
      const res = await fetchWithAuth('/api/data/support-cases', {
        method: 'POST',
        headers: getAuthHeader(),
        body: JSON.stringify(caseData)
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        return { success: true, caseId: data?.caseId };
      }
      return { success: false, error: data?.error || 'Failed to create case' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error' };
    }
  },

  /**
   * Resolve a support case
   */
  async resolveSupportCase(caseId: string): Promise<{ success: boolean; error?: string }> {
    try {
      const res = await fetchWithAuth(`/api/data/support-cases/${caseId}/resolve`, {
        method: 'PATCH',
        headers: getAuthHeader()
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        return { success: true };
      }
      return { success: false, error: data?.error || 'Failed to resolve case' };
    } catch (err: any) {
      return { success: false, error: err?.message || 'Network error' };
    }
  },

  /**
   * Fetch time-series transaction trends
   */
  async getTransactionTrends(range: string = 'all'): Promise<TransactionTrendBucket[]> {
    const res = await fetchWithAuth(`/api/data/transaction-trends?range=${encodeURIComponent(range)}`, {
      headers: getAuthHeader()
    });
    if (res.ok) {
      return await res.json();
    }
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody?.error || `Failed to fetch transaction trends (${res.status})`);
  },

  /**
   * Fetch analyst comprehensive metrics
   */
  async getAnalystMetrics(): Promise<AnalystMetricsSummary> {
    const res = await fetchWithAuth('/api/data/analyst-metrics', {
      headers: getAuthHeader()
    });
    if (res.ok) {
      return await res.json();
    }
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody?.error || `Failed to fetch analyst metrics (${res.status})`);
  },

  /**
   * Fetch live Risk & Fraud intelligence metrics
   */
  async getRiskMetrics(): Promise<RiskMetricsSummary> {
    const res = await fetchWithAuth('/api/data/risk-metrics', {
      headers: getAuthHeader()
    });
    if (res.ok) {
      return await res.json();
    }
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody?.error || `Failed to fetch risk metrics (${res.status})`);
  },

  /**
   * Fetch authoritative shared financial summary
   */
  async getFinancialSummary() {
    const res = await fetchWithAuth('/api/data/financial-summary', {
      headers: getAuthHeader()
    });
    if (res.ok) {
      return await res.json();
    }
    const errBody = await res.json().catch(() => ({}));
    throw new Error(errBody?.error || `Failed to fetch financial summary (${res.status})`);
  }
};

