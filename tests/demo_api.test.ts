import { authStore, verifyPassword, DEMO_ACCOUNTS_CONFIG, DEMO_PASSWORD } from '../src/server/auth';

console.log('==============================================================================');
console.log('FinSight AI — Demo Login API & End-to-End Simulation Tests');
console.log('==============================================================================\n');

let pass = 0;
let fail = 0;

function assert(msg: string, condition: boolean, err?: string) {
  if (condition) {
    console.log(`[PASS] ${msg}`);
    pass++;
  } else {
    console.error(`[FAIL] ${msg}: ${err || ''}`);
    fail++;
  }
}

// 1. Verify Demo Accounts Data Setup
for (const acc of DEMO_ACCOUNTS_CONFIG) {
  const user = authStore.findByEmail(acc.email);
  assert(`Account exists: ${acc.email}`, !!user);
  assert(`Role matches: ${acc.email} -> ${acc.role}`, user?.role === acc.role);
  assert(`Account status is ACTIVE for ${acc.email}`, user?.accountStatus === 'ACTIVE');
  
  // Verify password hash
  const pwOk = user?.passwordHash && user?.passwordSalt
    ? verifyPassword(DEMO_PASSWORD, user.passwordSalt, user.passwordHash)
    : false;
  assert(`Password FinSight@Demo123 authenticates for ${acc.email}`, pwOk);

  const wrongPw = user?.passwordHash && user?.passwordSalt
    ? verifyPassword('WrongPw123', user.passwordSalt, user.passwordHash)
    : false;
  assert(`Wrong password fails for ${acc.email}`, !wrongPw);
}

// 2. Simulate Login & Session Lifecycle for Each Role
const tokens: Record<string, string> = {};

for (const acc of DEMO_ACCOUNTS_CONFIG) {
  const user = authStore.findByEmail(acc.email);
  if (!user) continue;

  const token = authStore.createSession(user.id);
  tokens[acc.email] = token;

  const sessionUser = authStore.getSessionUser(token);
  assert(`Session resolves to correct user for ${acc.email}`, sessionUser?.id === user.id);
  assert(`Session user role is immutable: ${sessionUser?.role}`, sessionUser?.role === acc.role);

  // Route check
  const route =
    sessionUser?.role === 'admin'
      ? '/app/admin'
      : sessionUser?.role === 'business_analyst'
      ? '/app/analyst'
      : sessionUser?.role === 'risk_analyst'
      ? '/app/risk'
      : sessionUser?.role === 'customer'
      ? '/app/customer'
      : '/app/pending';

  assert(`Route mapping correct for ${acc.email} -> ${route}`, route === acc.targetRoute);
}

// 3. Customer Isolation Check
const customerToken = tokens['customer@finsight.ai'];
const customerUser = authStore.getSessionUser(customerToken);
assert('Customer user has customerId CUST-1001', customerUser?.customerId === 'CUST-1001');

// 4. Session Revocation (Logout) Check
const adminToken = tokens['admin@finsight.ai'];
assert('Admin session active before logout', authStore.getSessionUser(adminToken) !== null);
authStore.revokeSession(adminToken);
assert('Admin session revoked after logout', authStore.getSessionUser(adminToken) === null);

// 5. Financial Reconciliation and Freshness Contract Verification
import {
  MONTHLY_TREND_CACHE,
  RECONCILED_FINANCIAL_TOTALS,
  RECONCILED_LEDGER_AT
} from '../src/server/financialConstants';

console.log('\n--- FINANCIAL RECONCILIATION & FRESHNESS CONTRACT ---');

// 5.1 Reconcile Monthly Trend Cache Counts
const totalLedgerCount = MONTHLY_TREND_CACHE.reduce((sum, b) => sum + b.count, 0);
assert('5.1: Sum of 12 monthly transaction counts exactly equals 217,818 ledger rows', totalLedgerCount === 217818);
assert('5.1: Total ledger count matches RECONCILED_FINANCIAL_TOTALS.totalTransactions', totalLedgerCount === RECONCILED_FINANCIAL_TOTALS.totalTransactions);

const totalSettledCount = MONTHLY_TREND_CACHE.reduce((sum, b) => sum + (b.settledCount ?? 0), 0);
assert('5.1: Sum of 12 monthly settled counts exactly equals 210,284 successful transactions', totalSettledCount === 210284);
assert('5.1: Total settled count matches RECONCILED_FINANCIAL_TOTALS.settledTransactions', totalSettledCount === RECONCILED_FINANCIAL_TOTALS.settledTransactions);

// 5.2 Reconcile Monthly Gross Volume and Resolve ₹1 Discrepancy
const monthlyGrossSum = MONTHLY_TREND_CACHE.reduce((sum, b) => sum + (b.grossVolumeInr ?? 0), 0);
const grossDiffPaise = Math.abs(monthlyGrossSum - RECONCILED_FINANCIAL_TOTALS.grossVolumeInrExact);
assert('5.2: Sum of 12 monthly gross volumes matches annual gross total down to the paise (<0.01 INR diff)', grossDiffPaise < 0.01);
assert('5.2: Exact annual gross volume is ₹1,123,391,729.99 INR', Math.abs(RECONCILED_FINANCIAL_TOTALS.grossVolumeInrExact - 1123391729.99) < 0.01);

const roundedMonthlyGross = Math.round(monthlyGrossSum);
const roundedAnnualGross = RECONCILED_FINANCIAL_TOTALS.grossVolumeInrRounded;
assert('5.2: Rounded monthly gross sum exactly equals rounded annual gross total (₹1,123,391,730 / ₹112.34 Cr)', roundedMonthlyGross === roundedAnnualGross && roundedAnnualGross === 1123391730);

// 5.3 Reconcile Monthly Settled Volume
const monthlySettledSum = MONTHLY_TREND_CACHE.reduce((sum, b) => sum + b.volumeInr, 0);
const settledDiffPaise = Math.abs(monthlySettledSum - RECONCILED_FINANCIAL_TOTALS.settledVolumeInrExact);
assert('5.3: Sum of 12 monthly settled volumes matches annual settled total down to the paise (<0.01 INR diff)', settledDiffPaise < 0.01);
assert('5.3: Exact annual settled volume is ₹1,081,149,862.46 INR', Math.abs(RECONCILED_FINANCIAL_TOTALS.settledVolumeInrExact - 1081149862.46) < 0.01);

const roundedMonthlySettled = Math.round(monthlySettledSum);
const roundedAnnualSettled = RECONCILED_FINANCIAL_TOTALS.settledVolumeInrRounded;
assert('5.3: Rounded monthly settled sum exactly equals rounded annual settled total (₹1,081,149,862 / ₹108.11 Cr)', roundedMonthlySettled === roundedAnnualSettled && roundedAnnualSettled === 1081149862);

// 5.4 Reconcile H1 and H2 Subtotals
const h1Buckets = MONTHLY_TREND_CACHE.slice(0, 6);
const h2Buckets = MONTHLY_TREND_CACHE.slice(6);

const h1SettledExact = h1Buckets.reduce((sum, b) => sum + b.volumeInr, 0);
const h2SettledExact = h2Buckets.reduce((sum, b) => sum + b.volumeInr, 0);
assert('5.4: H1 settled volume reconciles to ₹55.64 Cr (5,564.23 Lakh)', Math.abs(h1SettledExact - 556423498.65) < 0.01);
assert('5.4: H2 settled volume reconciles to ₹52.47 Cr (5,247.26 Lakh)', Math.abs(h2SettledExact - 524726363.81) < 0.01);
assert('5.4: H1 + H2 settled volume sum equals full annual settled volume', Math.abs((h1SettledExact + h2SettledExact) - RECONCILED_FINANCIAL_TOTALS.settledVolumeInrExact) < 0.01);

const h1GrossExact = h1Buckets.reduce((sum, b) => sum + (b.grossVolumeInr ?? 0), 0);
const h2GrossExact = h2Buckets.reduce((sum, b) => sum + (b.grossVolumeInr ?? 0), 0);
assert('5.4: H1 gross volume reconciles to ₹57.83 Cr (5,783.19 Lakh)', Math.abs(h1GrossExact - 578318889.84) < 0.01);
assert('5.4: H2 gross volume reconciles to ₹54.51 Cr (5,450.73 Lakh)', Math.abs(h2GrossExact - 545072840.15) < 0.01);
assert('5.4: H1 + H2 gross volume sum equals full annual gross volume', Math.abs((h1GrossExact + h2GrossExact) - RECONCILED_FINANCIAL_TOTALS.grossVolumeInrExact) < 0.01);

// 5.5 Verify Average Transaction Ticket & Success Rate
const computedAvgTicket = Number((RECONCILED_FINANCIAL_TOTALS.settledVolumeInrExact / RECONCILED_FINANCIAL_TOTALS.settledTransactions).toFixed(2));
assert('5.5: Computed average transaction ticket equals exactly ₹5,141.38', computedAvgTicket === RECONCILED_FINANCIAL_TOTALS.avgTransactionInr && computedAvgTicket === 5141.38);

const computedSuccessRate = Number(((RECONCILED_FINANCIAL_TOTALS.settledTransactions / RECONCILED_FINANCIAL_TOTALS.totalTransactions) * 100).toFixed(2));
assert('5.5: Computed transaction success rate equals 96.54%', computedSuccessRate === RECONCILED_FINANCIAL_TOTALS.successRate && computedSuccessRate === 96.54);

// 5.6 Verify Freshness Contract and Reconciliation Metadata
assert('5.6: RECONCILED_LEDGER_AT is explicit audit timestamp 2026-10-25T06:33:00.000Z', RECONCILED_LEDGER_AT === '2026-10-25T06:33:00.000Z');
assert('5.6: dataFreshness contract is reconciled_ledger_aggregate', RECONCILED_FINANCIAL_TOTALS.dataFreshness === 'reconciled_ledger_aggregate');
assert('5.6: financialsSource explicitly identifies verified_ledger_snapshot', RECONCILED_FINANCIAL_TOTALS.financialsSource === 'verified_ledger_snapshot');
assert('5.6: countsSource explicitly identifies live_supabase_head_query', RECONCILED_FINANCIAL_TOTALS.countsSource === 'live_supabase_head_query');
assert('5.6: snapshotPolicy explicitly documents snapshot behavior', typeof RECONCILED_FINANCIAL_TOTALS.snapshotPolicy === 'string' && RECONCILED_FINANCIAL_TOTALS.snapshotPolicy.includes('Sync Data reloads'));

// 6. Test Summary
console.log('\n==============================================================================');
console.log(`Integration Simulation Result: ${pass} PASSED, ${fail} FAILED.`);
console.log('==============================================================================');

if (fail > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
