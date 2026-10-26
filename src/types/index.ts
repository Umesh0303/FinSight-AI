export type UserRole = 'ADMIN' | 'BUSINESS_ANALYST' | 'CUSTOMER' | 'RISK_FRAUD_ANALYST' | 'UNASSIGNED';

export type AccountStatus = 'ACTIVE' | 'PENDING_APPROVAL' | 'SUSPENDED';

export interface UserProfile {
  id: string;
  name: string;
  display_name?: string;
  email: string;
  role: UserRole;
  roleTitle: string;
  avatarInitials: string;
  accountStatus: AccountStatus;
  createdDate: string;
  created_at?: string;
  lastLogin?: string;
  last_login_at?: string;
  customerId?: string;
  authProviders?: Array<'email' | 'google'>;
  auth_provider?: string;
  emailVerified?: boolean;
}

export interface LoginEventRecord {
  id: string;
  userId: string;
  email: string;
  displayName: string;
  role: string;
  provider: 'email' | 'google';
  ipAddress: string;
  userAgent: string;
  status: 'SUCCESS' | 'FAILED';
  createdAt: string;
}

export interface Customer {
  customer_id: string;
  name: string;
  email: string;
  age: number;
  location: string;
  account_age_months: number;
  credit_score: number;
  account_balance: number;
  customer_segment: 'High Value' | 'Potential' | 'Regular' | 'At Risk' | 'New';
  phone: string;
  joined_date: string;
}

export interface Transaction {
  transaction_id: string;
  customer_id: string;
  customer_name: string;
  transaction_date: string;
  transaction_amount: number;
  merchant_category: 'Shopping' | 'Food & Dining' | 'Travel' | 'Utilities' | 'Entertainment' | 'Healthcare' | 'Financial Services';
  payment_method: 'UPI' | 'Credit Card' | 'Debit Card' | 'Net Banking' | 'Wire';
  device_type: 'Mobile iOS' | 'Mobile Android' | 'Web Browser' | 'POS Terminal';
  country: string;
  city: string;
  transaction_status: 'Completed' | 'Pending' | 'Flagged' | 'Declined';
  fraud_status: 'Normal' | 'Suspicious' | 'Confirmed Fraud' | 'Under Review';
  risk_score: number; // 0 - 100
}

export interface SupportCase {
  case_id: string;
  customer_id: string;
  customer_name: string;
  case_type: 'Dispute' | 'Account Access' | 'Limit Increase' | 'KYC Verification' | 'Technical';
  priority: 'High' | 'Medium' | 'Low' | 'Critical';
  status: 'Open' | 'In Progress' | 'Escalated' | 'Resolved';
  created_at: string;
  assigned_to: string;
  resolution?: string;
  description: string;
}

export interface AIRecommendation {
  recommendation_id: string;
  customer_id?: string;
  category: 'Growth' | 'Risk Prevention' | 'Engagement' | 'Credit';
  title: string;
  description: string;
  priority: 'High' | 'Medium' | 'Low';
  confidence: number; // percentage
  status: 'Active' | 'Applied' | 'Dismissed';
  action_label: string;
  icon_type: 'target' | 'alert' | 'megaphone' | 'chart';
}

export interface RiskAlert {
  alert_id: string;
  transaction_id: string;
  customer_id: string;
  customer_name: string;
  amount: number;
  risk_score: number;
  risk_type: 'Rapid Velocity' | 'Geographic Anomaly' | 'Unusual Amount' | 'High-Risk Merchant' | 'Multiple Failed Pins';
  severity: 'High' | 'Medium' | 'Low';
  status: 'New' | 'Investigating' | 'Cleared' | 'Blocked';
  created_at: string;
  location: string;
}

export interface SpendingCategorySummary {
  category: string;
  percentage: number;
  amount: number;
  colorClass: string;
  iconName: string;
}

export interface SegmentDistribution {
  name: string;
  percentage: number;
  count: number;
  color: string;
}

export * from './rag';

