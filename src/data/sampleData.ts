import {
  Customer,
  Transaction,
  SupportCase,
  AIRecommendation,
  RiskAlert,
  SpendingCategorySummary,
  SegmentDistribution,
  UserProfile
} from '../types';

export const INITIAL_SYSTEM_USERS: UserProfile[] = [
  {
    id: 'demo-user-admin',
    name: 'Elena Rostova',
    display_name: 'Elena Rostova',
    email: 'admin@finsight.ai',
    role: 'ADMIN',
    roleTitle: 'Platform Administrator',
    avatarInitials: 'ER',
    accountStatus: 'ACTIVE',
    createdDate: '2026-10-10',
    lastLogin: 'Just now'
  },
  {
    id: 'demo-user-analyst',
    name: 'T. Gopi Chand',
    display_name: 'T. Gopi Chand',
    email: 'analyst@finsight.ai',
    role: 'BUSINESS_ANALYST',
    roleTitle: 'Senior Financial Analyst',
    avatarInitials: 'TG',
    accountStatus: 'ACTIVE',
    createdDate: '2026-10-10',
    lastLogin: 'Just now'
  },
  {
    id: 'demo-user-risk',
    name: 'Devraj Sen',
    display_name: 'Devraj Sen',
    email: 'risk@finsight.ai',
    role: 'RISK_FRAUD_ANALYST',
    roleTitle: 'Risk & Fraud Specialist',
    avatarInitials: 'DS',
    accountStatus: 'ACTIVE',
    createdDate: '2026-10-10',
    lastLogin: 'Just now'
  },
  {
    id: 'demo-user-customer',
    name: 'Arjun Verma',
    display_name: 'Arjun Verma',
    email: 'customer@finsight.ai',
    role: 'CUSTOMER',
    roleTitle: 'Personal Wealth Client',
    avatarInitials: 'AV',
    accountStatus: 'ACTIVE',
    customerId: 'CUST-1001',
    createdDate: '2026-10-10',
    lastLogin: 'Just now'
  }
];

export const USER_PROFILES: Record<string, UserProfile> = {
  ADMIN: INITIAL_SYSTEM_USERS[0],
  BUSINESS_ANALYST: INITIAL_SYSTEM_USERS[1],
  RISK_FRAUD_ANALYST: INITIAL_SYSTEM_USERS[2],
  CUSTOMER: INITIAL_SYSTEM_USERS[3]
};

export const SAMPLE_CUSTOMERS: Customer[] = [
  {
    customer_id: 'CUST-1001',
    name: 'Arjun Verma',
    email: 'arjun.verma@example.com',
    age: 38,
    location: 'Bengaluru, India',
    account_age_months: 42,
    credit_score: 795,
    account_balance: 1245230,
    customer_segment: 'High Value',
    phone: '+91 98201 44521',
    joined_date: '2023-04-15'
  },
  {
    customer_id: 'CUST-1002',
    name: 'Priya Sundaram',
    email: 'priya.s@example.com',
    age: 29,
    location: 'Mumbai, India',
    account_age_months: 18,
    credit_score: 740,
    account_balance: 580400,
    customer_segment: 'Potential',
    phone: '+91 97112 88402',
    joined_date: '2024-01-10'
  },
  {
    customer_id: 'CUST-1003',
    name: 'Rohan Mehra',
    email: 'rohan.m@example.com',
    age: 45,
    location: 'Delhi NCR, India',
    account_age_months: 60,
    credit_score: 820,
    account_balance: 2450000,
    customer_segment: 'High Value',
    phone: '+91 98103 22190',
    joined_date: '2021-08-20'
  },
  {
    customer_id: 'CUST-1004',
    name: 'Ananya Sharma',
    email: 'ananya.sharma@example.com',
    age: 24,
    location: 'Hyderabad, India',
    account_age_months: 6,
    credit_score: 680,
    account_balance: 142000,
    customer_segment: 'New',
    phone: '+91 99404 11234',
    joined_date: '2024-07-02'
  },
  {
    customer_id: 'CUST-1005',
    name: 'Kabir Singhania',
    email: 'kabir.s@example.com',
    age: 52,
    location: 'Pune, India',
    account_age_months: 36,
    credit_score: 590,
    account_balance: 64200,
    customer_segment: 'At Risk',
    phone: '+91 98220 54109',
    joined_date: '2022-11-14'
  },
  {
    customer_id: 'CUST-1006',
    name: 'Meera Nambiar',
    email: 'meera.n@example.com',
    age: 33,
    location: 'Chennai, India',
    account_age_months: 24,
    credit_score: 765,
    account_balance: 410800,
    customer_segment: 'Regular',
    phone: '+91 94441 23098',
    joined_date: '2023-09-05'
  },
  {
    customer_id: 'CUST-1007',
    name: 'Vikram Joshi',
    email: 'vikram.j@example.com',
    age: 41,
    location: 'Ahmedabad, India',
    account_age_months: 14,
    credit_score: 710,
    account_balance: 320950,
    customer_segment: 'Potential',
    phone: '+91 97230 45612',
    joined_date: '2024-03-18'
  },
  {
    customer_id: 'CUST-1008',
    name: 'Sneha Patel',
    email: 'sneha.patel@example.com',
    age: 36,
    location: 'Surat, India',
    account_age_months: 28,
    credit_score: 615,
    account_balance: 95400,
    customer_segment: 'At Risk',
    phone: '+91 98251 77231',
    joined_date: '2023-06-22'
  }
];

export const SAMPLE_TRANSACTIONS: Transaction[] = [
  {
    transaction_id: 'TXN-90812',
    customer_id: 'CUST-1001',
    customer_name: 'Arjun Verma',
    transaction_date: '2024-10-31 18:42',
    transaction_amount: 45200,
    merchant_category: 'Shopping',
    payment_method: 'Credit Card',
    device_type: 'Mobile iOS',
    country: 'India',
    city: 'Bengaluru',
    transaction_status: 'Completed',
    fraud_status: 'Normal',
    risk_score: 12
  },
  {
    transaction_id: 'TXN-90811',
    customer_id: 'CUST-1005',
    customer_name: 'Kabir Singhania',
    transaction_date: '2024-10-31 16:15',
    transaction_amount: 184500,
    merchant_category: 'Financial Services',
    payment_method: 'Wire',
    device_type: 'Web Browser',
    country: 'United Arab Emirates',
    city: 'Dubai',
    transaction_status: 'Flagged',
    fraud_status: 'Suspicious',
    risk_score: 88
  },
  {
    transaction_id: 'TXN-90810',
    customer_id: 'CUST-1002',
    customer_name: 'Priya Sundaram',
    transaction_date: '2024-10-31 14:02',
    transaction_amount: 3450,
    merchant_category: 'Food & Dining',
    payment_method: 'UPI',
    device_type: 'Mobile Android',
    country: 'India',
    city: 'Mumbai',
    transaction_status: 'Completed',
    fraud_status: 'Normal',
    risk_score: 5
  },
  {
    transaction_id: 'TXN-90809',
    customer_id: 'CUST-1003',
    customer_name: 'Rohan Mehra',
    transaction_date: '2024-10-30 20:10',
    transaction_amount: 82100,
    merchant_category: 'Travel',
    payment_method: 'Credit Card',
    device_type: 'Web Browser',
    country: 'Singapore',
    city: 'Singapore',
    transaction_status: 'Completed',
    fraud_status: 'Normal',
    risk_score: 22
  },
  {
    transaction_id: 'TXN-90808',
    customer_id: 'CUST-1008',
    customer_name: 'Sneha Patel',
    transaction_date: '2024-10-30 19:44',
    transaction_amount: 128900,
    merchant_category: 'Shopping',
    payment_method: 'Debit Card',
    device_type: 'POS Terminal',
    country: 'United Kingdom',
    city: 'London',
    transaction_status: 'Declined',
    fraud_status: 'Confirmed Fraud',
    risk_score: 95
  },
  {
    transaction_id: 'TXN-90807',
    customer_id: 'CUST-1001',
    customer_name: 'Arjun Verma',
    transaction_date: '2024-10-30 11:20',
    transaction_amount: 12400,
    merchant_category: 'Utilities',
    payment_method: 'Net Banking',
    device_type: 'Mobile iOS',
    country: 'India',
    city: 'Bengaluru',
    transaction_status: 'Completed',
    fraud_status: 'Normal',
    risk_score: 8
  },
  {
    transaction_id: 'TXN-90806',
    customer_id: 'CUST-1006',
    customer_name: 'Meera Nambiar',
    transaction_date: '2024-10-29 17:05',
    transaction_amount: 8900,
    merchant_category: 'Entertainment',
    payment_method: 'Credit Card',
    device_type: 'Mobile iOS',
    country: 'India',
    city: 'Chennai',
    transaction_status: 'Completed',
    fraud_status: 'Normal',
    risk_score: 14
  },
  {
    transaction_id: 'TXN-90805',
    customer_id: 'CUST-1004',
    customer_name: 'Ananya Sharma',
    transaction_date: '2024-10-29 12:30',
    transaction_amount: 15400,
    merchant_category: 'Food & Dining',
    payment_method: 'UPI',
    device_type: 'Mobile Android',
    country: 'India',
    city: 'Hyderabad',
    transaction_status: 'Completed',
    fraud_status: 'Normal',
    risk_score: 6
  },
  {
    transaction_id: 'TXN-90804',
    customer_id: 'CUST-1007',
    customer_name: 'Vikram Joshi',
    transaction_date: '2024-10-28 23:18',
    transaction_amount: 94000,
    merchant_category: 'Shopping',
    payment_method: 'Credit Card',
    device_type: 'Web Browser',
    country: 'India',
    city: 'Ahmedabad',
    transaction_status: 'Pending',
    fraud_status: 'Under Review',
    risk_score: 64
  }
];

export const SAMPLE_CASES: SupportCase[] = [
  {
    case_id: 'CASE-4401',
    customer_id: 'CUST-1008',
    customer_name: 'Sneha Patel',
    case_type: 'Dispute',
    priority: 'Critical',
    status: 'In Progress',
    created_at: '2024-10-30 20:05',
    assigned_to: 'Devraj Sen (Risk)',
    description: 'Unauthorized overseas card swipe in London POS for ₹1,28,900. Card blocked instantly by risk model.'
  },
  {
    case_id: 'CASE-4398',
    customer_id: 'CUST-1005',
    customer_name: 'Kabir Singhania',
    case_type: 'KYC Verification',
    priority: 'High',
    status: 'Escalated',
    created_at: '2024-10-31 16:30',
    assigned_to: 'Elena Rostova (Compliance)',
    description: 'High-value outward wire transfer flagged due to missing updated beneficial ownership documentation.'
  },
  {
    case_id: 'CASE-4389',
    customer_id: 'CUST-1001',
    customer_name: 'Arjun Verma',
    case_type: 'Limit Increase',
    priority: 'Medium',
    status: 'Resolved',
    created_at: '2024-10-26 10:14',
    assigned_to: 'T. Gopi Chand (Analyst)',
    resolution: 'Approved platinum credit line increase to ₹15,00,000 based on exemplary 795 credit score.',
    description: 'Request for international travel credit limit increase for upcoming Q4 quarterly business travel.'
  },
  {
    case_id: 'CASE-4375',
    customer_id: 'CUST-1002',
    customer_name: 'Priya Sundaram',
    case_type: 'Account Access',
    priority: 'Low',
    status: 'Resolved',
    created_at: '2024-10-22 14:50',
    assigned_to: 'Support Automation',
    resolution: 'Two-factor biometric re-enrollment completed successfully on new iPhone 16 device.',
    description: 'Customer requested device re-registration assistance following device upgrade.'
  }
];

export const SAMPLE_RECOMMENDATIONS: AIRecommendation[] = [
  {
    recommendation_id: 'REC-001',
    category: 'Growth',
    title: 'Target potential high-value customers',
    description: '250 customers show high growth potential based on recent deposit frequency and spending velocity.',
    priority: 'High',
    confidence: 94,
    status: 'Active',
    action_label: 'Launch Campaign',
    icon_type: 'target'
  },
  {
    recommendation_id: 'REC-002',
    category: 'Risk Prevention',
    title: 'Flag unusual transactions',
    description: '15 transactions require review for cross-border geographic anomalies before final settlement.',
    priority: 'High',
    confidence: 91,
    status: 'Active',
    action_label: 'Review Queue',
    icon_type: 'alert'
  },
  {
    recommendation_id: 'REC-003',
    category: 'Engagement',
    title: 'Recommend personalized offers',
    description: 'Increase customer engagement by 18% by offering premium dining cash-back to weekend shoppers.',
    priority: 'Medium',
    confidence: 88,
    status: 'Active',
    action_label: 'Deploy Offers',
    icon_type: 'megaphone'
  },
  {
    recommendation_id: 'REC-004',
    category: 'Credit',
    title: 'Optimize credit risk model',
    description: 'Reduce default risk by 12% by adjusting unsecured credit limits for segment with score < 620.',
    priority: 'Medium',
    confidence: 86,
    status: 'Active',
    action_label: 'Update Parameters',
    icon_type: 'chart'
  }
];

export const SAMPLE_RISK_ALERTS: RiskAlert[] = [
  {
    alert_id: 'ALT-8821',
    transaction_id: 'TXN-90808',
    customer_id: 'CUST-1008',
    customer_name: 'Sneha Patel',
    amount: 128900,
    risk_score: 95,
    risk_type: 'Geographic Anomaly',
    severity: 'High',
    status: 'Blocked',
    created_at: '2024-10-30 19:44',
    location: 'London, UK'
  },
  {
    alert_id: 'ALT-8820',
    transaction_id: 'TXN-90811',
    customer_id: 'CUST-1005',
    customer_name: 'Kabir Singhania',
    amount: 184500,
    risk_score: 88,
    risk_type: 'Unusual Amount',
    severity: 'High',
    status: 'Investigating',
    created_at: '2024-10-31 16:15',
    location: 'Dubai, UAE'
  },
  {
    alert_id: 'ALT-8819',
    transaction_id: 'TXN-90804',
    customer_id: 'CUST-1007',
    customer_name: 'Vikram Joshi',
    amount: 94000,
    risk_score: 64,
    risk_type: 'Rapid Velocity',
    severity: 'Medium',
    status: 'New',
    created_at: '2024-10-28 23:18',
    location: 'Ahmedabad, India'
  },
  {
    alert_id: 'ALT-8815',
    transaction_id: 'TXN-90790',
    customer_id: 'CUST-1002',
    customer_name: 'Priya Sundaram',
    amount: 45000,
    risk_score: 42,
    risk_type: 'High-Risk Merchant',
    severity: 'Low',
    status: 'Cleared',
    created_at: '2024-10-25 11:10',
    location: 'Mumbai, India'
  }
];

export const SPENDING_CATEGORIES: SpendingCategorySummary[] = [
  {
    category: 'Shopping',
    percentage: 28,
    amount: 348200,
    colorClass: 'bg-[#0f4b3a]',
    iconName: 'ShoppingBag'
  },
  {
    category: 'Food & Dining',
    percentage: 18,
    amount: 224500,
    colorClass: 'bg-[#156750]',
    iconName: 'Utensils'
  },
  {
    category: 'Travel',
    percentage: 15,
    amount: 186300,
    colorClass: 'bg-[#1e8568]',
    iconName: 'Plane'
  },
  {
    category: 'Utilities',
    percentage: 12,
    amount: 149230,
    colorClass: 'bg-[#27a380]',
    iconName: 'Lightbulb'
  },
  {
    category: 'Entertainment',
    percentage: 10,
    amount: 124600,
    colorClass: 'bg-[#3bbfa0]',
    iconName: 'Film'
  }
];

export const CUSTOMER_SEGMENTS: SegmentDistribution[] = [
  { name: 'High Value', percentage: 28, count: 2366, color: '#093628' },
  { name: 'Potential', percentage: 32, count: 2704, color: '#16795f' },
  { name: 'Regular', percentage: 25, count: 2113, color: '#dfa634' },
  { name: 'At Risk', percentage: 10, count: 845, color: '#9dcaa8' },
  { name: 'New', percentage: 5, count: 424, color: '#b5c0b9' }
];

export const FRAUD_RISK_DISTRIBUTION = [
  { name: 'High Risk', count: 238, percentage: 1, color: '#ef4444' },
  { name: 'Medium Risk', count: 642, percentage: 2, color: '#f59e0b' },
  { name: 'Low Risk', count: 1120, percentage: 4, color: '#10b981' },
  { name: 'Normal', count: 28000, percentage: 93, color: '#cbd5e1' }
];

export const TRANSACTION_TREND_DATA = [
  { date: 'Oct 1', count: 620, amountLakh: 1.4 },
  { date: 'Oct 3', count: 750, amountLakh: 1.6 },
  { date: 'Oct 5', count: 880, amountLakh: 1.7 },
  { date: 'Oct 7', count: 810, amountLakh: 1.5 },
  { date: 'Oct 9', count: 990, amountLakh: 1.9 },
  { date: 'Oct 10', count: 1150, amountLakh: 2.2 },
  { date: 'Oct 12', count: 920, amountLakh: 1.8 },
  { date: 'Oct 14', count: 1080, amountLakh: 2.1 },
  { date: 'Oct 15', count: 1320, amountLakh: 2.8 },
  { date: 'Oct 17', count: 1040, amountLakh: 2.0 },
  { date: 'Oct 19', count: 960, amountLakh: 1.8 },
  { date: 'Oct 20', count: 1190, amountLakh: 2.3 },
  { date: 'Oct 22', count: 1280, amountLakh: 2.4 },
  { date: 'Oct 24', count: 1390, amountLakh: 2.7 },
  { date: 'Oct 25', count: 1480, amountLakh: 2.9 },
  { date: 'Oct 27', count: 1610, amountLakh: 3.1 },
  { date: 'Oct 29', count: 1820, amountLakh: 3.6 },
  { date: 'Oct 31', count: 1640, amountLakh: 3.2 }
];

export function formatINR(val: number): string {
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0
  }).format(val);
}
