/**
 * FinSight AI — Database Schema Types
 * Matches the 9 Supabase business tables and their exact column definitions.
 */

// 1. customers (25,000 rows)
export interface DbCustomer {
  customer_id: string; // PK
  full_name: string;
  gender: string;
  date_of_birth: string; // date YYYY-MM-DD
  age_band: string; // e.g. "18-25", "26-35", "36-50", "50+"
  city: string;
  state: string;
  pincode: number;
  occupation: string;
  income_band: string; // e.g. "3L-6L", "6L-12L", "12L+"
  segment: string; // e.g. "Mass", "High Value", "Affluent"
  kyc_status: string; // e.g. "Verified", "Pending"
  customer_since: string; // date YYYY-MM-DD
  is_active: number; // 0 or 1
}

// 2. accounts (29,898 rows)
export interface DbAccount {
  account_id: string; // PK
  customer_id: string; // FK -> customers.customer_id
  account_type: string; // e.g. "Current", "Savings", "Fixed Deposit"
  branch_city: string;
  open_date: string; // date YYYY-MM-DD
  status: string; // e.g. "Active", "Dormant", "Closed"
  currency: string; // e.g. "INR"
}

// 3. transactions (217,818 rows)
export interface DbTransaction {
  transaction_id: string; // PK
  customer_id: string; // FK -> customers.customer_id
  account_id: string; // FK -> accounts.account_id
  txn_datetime: string; // ISO 8601 timestamptz
  amount_inr: number;
  txn_type: 'Debit' | 'Credit' | string;
  category: string; // e.g. "Cash Withdrawal", "Grocery", "Shopping", "Food & Dining"
  merchant_id: string; // FK -> merchants.merchant_id
  payment_method: string; // e.g. "ATM", "UPI", "Net Banking", "Card"
  device_type: string; // e.g. "ATM", "Mobile", "Web", "POS"
  city: string;
  status: 'Success' | 'Failed' | 'Pending' | string;
  is_international: number; // 0 or 1
  is_flagged: number; // 0 or 1
}

// 4. merchants (526 rows)
export interface DbMerchant {
  merchant_id: string; // PK
  merchant_name: string;
  category: string;
  merchant_city: string;
}

// 5. balance_snapshots (355,025 rows)
export interface DbBalanceSnapshot {
  account_id: string; // FK -> accounts.account_id
  customer_id: string; // FK -> customers.customer_id
  month_end_date: string; // date YYYY-MM-DD
  closing_balance_inr: number;
  avg_balance_inr: number;
}

// 6. credit_score_history (99,081 rows)
export interface DbCreditScoreHistory {
  customer_id: string; // FK -> customers.customer_id
  score_date: string; // date YYYY-MM-DD
  credit_score: number;
  score_band: string; // e.g. "Poor", "Fair", "Good", "Excellent"
}

// 7. fraud_alerts (3,500 rows)
export interface DbFraudAlert {
  alert_id: string; // PK
  transaction_id: string; // FK -> transactions.transaction_id
  customer_id: string; // FK -> customers.customer_id
  alert_date: string; // ISO 8601 timestamptz
  fraud_type: string; // e.g. "Account Takeover", "Velocity Spike", "Card Fraud"
  rule_triggered: string; // e.g. "Unusual Hour", "High Velocity"
  alert_status: 'Under Review' | 'Resolved' | 'False Positive' | 'Escalated' | string;
  assigned_analyst_id: string | null;
  resolved_date: string | null; // date YYYY-MM-DD
  loss_amount_inr: number;
}

// 8. support_cases (0 rows initially)
export interface DbSupportCase {
  case_id: string; // PK
  customer_id: string; // FK -> customers.customer_id
  transaction_id: string | null; // FK -> transactions.transaction_id
  issue_category: string;
  priority: 'Critical' | 'High' | 'Medium' | 'Low' | string;
  channel: string;
  status: 'Open' | 'In Progress' | 'Escalated' | 'Resolved' | string;
  created_at: string; // timestamptz
  first_response_at: string | null;
  resolved_at: string | null;
  agent_id: string | null;
  sla_hours: number | null;
  sla_met: number | null; // 0 or 1
  csat_rating: number | null;
}

// 9. app_users (25,056 rows)
export interface DbAppUser {
  user_id: string; // PK
  username: string;
  role: string;
  customer_id: string | null; // FK -> customers.customer_id
  display_name: string;
  team: string | null;
  city: string;
  status: string;
  last_login: string | null;
  mfa_enabled: number; // 0 or 1
}

// Pagination & Query Parameter Types
export interface PaginationParams {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResult<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasMore: boolean;
  isFallback?: boolean;
}

export interface PlatformMetricsSummary {
  totalCustomers: number;
  activeCustomers?: number;
  totalAccounts: number;
  totalTransactions: number;
  totalVolumeInr: number;
  settledVolumeInr?: number;
  grossVolumeInr?: number;
  totalFraudAlerts: number;
  fraudAlertsByStatus?: {
    underReview: number;
    confirmedFraud: number;
    falsePositive: number;
    open: number;
    resolved: number;
  };
  openCasesCount: number;
  activeUsersCount: number;
  activeInvestigationsCount: number;
  preventedFraudLossInr: number;
  avgCreditScore: number;
  paymentMethodBreakdown?: { method: string; count: number; percentage: number; volumeInr: number }[];
  merchantBreakdown?: { merchantId: string; merchantName: string; category: string; valueInr: number; count: number }[];
  accountTypeBreakdown?: { type: string; count: number; percentage: number }[];
  customerSegmentBreakdown?: { segment: string; count: number; percentage: number }[];
  statusBreakdown?: { status: string; count: number; percentage: number; volumeInr: number }[];
  txnTypeBreakdown?: { type: string; count: number; percentage: number; volumeInr: number }[];
  isLive?: boolean;
  lastUpdated?: string;
  countsFreshAsOf?: string;
  lastConnectivityCheck?: string;
  ledgerAggregatedAt?: string;
  dataFreshness?: string;
  financialsSource?: string;
  countsSource?: string;
  snapshotPolicy?: string;
}

export interface CategorySpendingSummary {
  category: string;
  amount: number;
  percentage: number;
  transactionCount: number;
}

export interface SegmentDistributionSummary {
  name: string;
  count: number;
  percentage: number;
}

export interface CustomerFinancialDossier {
  customer: DbCustomer | null;
  accounts: DbAccount[];
  recentTransactions: DbTransaction[];
  balanceSnapshots: DbBalanceSnapshot[];
  creditHistory: DbCreditScoreHistory[];
  portfolioBalanceInr: number;
  latestSnapshotDate?: string | null;
  totalMonthlyInflowInr?: number;
  totalMonthlyOutflowInr?: number;
  netSavingsInr?: number;
  monthlyInflowInr: number;
  monthlyOutflowInr: number;
  monthlySavingsInr: number;
  latestCreditScore: number;
  creditScoreBand: string;
  creditScoreDate?: string | null;
}

export interface TransactionTrendBucket {
  date: string;
  count: number; // Total ledger transactions
  settledCount?: number; // Successful settled transactions
  amountLakh: number; // Settled volume in Lakhs
  volumeInr: number; // Settled volume in INR
  grossVolumeInr?: number; // Gross volume in INR
}

export interface AnalystMetricsSummary {
  totalTransactions: number;
  totalVolumeInr: number;
  settledVolumeInr?: number;
  grossVolumeInr?: number;
  avgTransactionInr: number;
  settledTransactions: number;
  failedTransactions: number;
  reversedTransactions: number;
  flaggedTransactions: number;
  successRate: number;
  flaggedRate: number;
  totalCustomers: number;
  activeCustomers: number;
  activeCustomerRate: number;
  totalAccounts: number;
  accountTypeBreakdown: { type: string; count: number; percentage: number }[];
  paymentMethodBreakdown: { method: string; count: number; percentage: number }[];
  txnTypeBreakdown: { type: string; count: number; percentage: number }[];
  creditScoreBreakdown: { band: string; count: number; percentage: number; color: string }[];
  fraudRiskDistribution: { name: string; count: number; percentage: number; color: string }[];
  isLive?: boolean;
  lastUpdated?: string;
  countsFreshAsOf?: string;
  lastConnectivityCheck?: string;
  ledgerAggregatedAt?: string;
  dataFreshness?: string;
  financialsSource?: string;
  countsSource?: string;
  snapshotPolicy?: string;
}

export interface RiskMetricsSummary {
  totalAlerts: number;
  underReviewCount: number;
  confirmedFraudCount: number;
  falsePositiveCount: number;
  openCount: number;
  flaggedTransactionsCount: number;
  totalRecordedLossInr: number;
  preventedFraudLossInr: number;
  falsePositiveRate: number;
  flaggedTransactionRate: number;
  avgResolutionDays?: number;
  resolvedAlertsCount?: number;
  fraudTypeBreakdown?: { type: string; count: number; percentage: number; color?: string }[];
  riskDistribution: { name: string; count: number; percentage: number; color: string }[];
  topRulesTriggered: { rule: string; count: number; percentage: number }[];
  geographicAnomalies: { city: string; count: number; level: string; color: string }[];
  allAlertsSummary?: {
    id: string;
    date: string;
    type: string;
    rule: string;
    status: string;
    loss: number;
    resDate: string | null;
    custId?: string;
    txnId?: string;
  }[];
}

