import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';
import { RECONCILED_FINANCIAL_TOTALS } from '../src/utils/financialReconciliation';

const API_BASE = 'http://localhost:3000';
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const supabaseAdmin = (supabaseUrl && serviceRoleKey) ? createClient(supabaseUrl, serviceRoleKey) : null;

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passCount++;
    console.log(`[PASS] ${testName}`);
  } else {
    failCount++;
    console.error(`[FAIL] ${testName}${detail ? `: ${detail}` : ''}`);
  }
}

async function runTests() {
  console.log('==============================================================================');
  console.log('FinSight AI — Complete Supabase Live Data & Dashboard Reconciliation Suite');
  console.log('==============================================================================\n');

  // --- SECTION 1: SUPABASE 9 OPERATIONAL TABLES RECORD COUNT VERIFICATION ---
  console.log('--- SECTION 1: Authoritative Database Tables Verification ---');
  if (supabaseAdmin) {
    const expectedTables = [
      { name: 'customers', expected: 25000 },
      { name: 'accounts', expected: 29898 },
      { name: 'transactions', expected: 217818 },
      { name: 'merchants', expected: 526 },
      { name: 'balance_snapshots', expected: 355025 },
      { name: 'credit_score_history', expected: 99081 },
      { name: 'fraud_alerts', expected: 3500 },
      { name: 'support_cases', expected: 0 },
      { name: 'app_users', expected: 25056 }
    ];

    for (const t of expectedTables) {
      const { count, error } = await supabaseAdmin.from(t.name).select('*', { count: 'exact', head: true });
      assert(!error && count === t.expected, `1.${expectedTables.indexOf(t) + 1}: Table "${t.name}" matches live database count (${count} === ${t.expected})`, error?.message);
    }
  } else {
    console.log('[SKIP] Live Supabase service-role credentials not in environment; skipping direct PostgreSQL catalog assertion.');
  }

  // --- SECTION 2: ACTIVE CUSTOMERS & TRANSACTION STATUS LEDGER BREAKDOWN ---
  console.log('\n--- SECTION 2: Transaction Status & Ledger Integrity ---');
  if (supabaseAdmin) {
    const { count: activeCust } = await supabaseAdmin.from('customers').select('*', { count: 'exact', head: true }).eq('is_active', 1);
    assert(activeCust === 21781, `2.1: Active customers count is verified (${activeCust} === 21781)`);

    const { count: successTxns } = await supabaseAdmin.from('transactions').select('*', { count: 'exact', head: true }).eq('status', 'Success');
    assert(successTxns === 210284, `2.2: Settled successful transactions count is verified (${successTxns} === 210284)`);

    const { count: failedTxns } = await supabaseAdmin.from('transactions').select('*', { count: 'exact', head: true }).eq('status', 'Failed');
    assert(failedTxns === 5898, `2.3: Failed transactions count is verified (${failedTxns} === 5898)`);

    const { count: reversedTxns } = await supabaseAdmin.from('transactions').select('*', { count: 'exact', head: true }).eq('status', 'Reversed');
    assert(reversedTxns === 1636, `2.4: Reversed transactions count is verified (${reversedTxns} === 1636)`);

    const totalSummed = (successTxns || 0) + (failedTxns || 0) + (reversedTxns || 0);
    assert(totalSummed === 217818, `2.5: All status counts sum exactly to 217,818 ledger transactions (${totalSummed} === 217818)`);
  } else {
    console.log('[SKIP] Live Supabase service-role credentials not in environment; skipping direct table breakdown assertion.');
  }

  // --- SECTION 3: DASHBOARD METRICS API RECONCILIATION ---
  console.log('\n--- SECTION 3: Admin & Business Analyst Dashboard API Reconciliation ---');

  // Login as admin
  const adminLoginRes = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admin@finsight.ai', password: 'FinSight@Demo123' })
  });
  const adminLoginData = await adminLoginRes.json();
  const adminToken = adminLoginData.token;
  assert(adminLoginRes.ok && !!adminToken, '3.1: Admin login succeeds');

  // Login as analyst
  const analystLoginRes = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'analyst@finsight.ai', password: 'FinSight@Demo123' })
  });
  const analystLoginData = await analystLoginRes.json();
  const analystToken = analystLoginData.token;
  assert(analystLoginRes.ok && !!analystToken, '3.2: Business Analyst login succeeds');

  // Fetch Platform Metrics (Admin)
  const platformRes = await fetch(`${API_BASE}/api/data/platform-metrics`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const platformData = await platformRes.json();
  assert(platformRes.ok, '3.3: GET /api/data/platform-metrics returns 200 OK');

  // Fetch Analyst Metrics (Business Analyst)
  const analystRes = await fetch(`${API_BASE}/api/data/analyst-metrics`, {
    headers: { Authorization: `Bearer ${analystToken}` }
  });
  const analystData = await analystRes.json();
  assert(analystRes.ok, '3.4: GET /api/data/analyst-metrics returns 200 OK');

  // Fetch Financial Summary
  const summaryRes = await fetch(`${API_BASE}/api/data/financial-summary`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  const summaryData = await summaryRes.json();
  assert(summaryRes.ok, '3.5: GET /api/data/financial-summary returns 200 OK');

  // --- SECTION 4: RECONCILIATION INTEGRITY CHECKS ---
  console.log('\n--- SECTION 4: Cross-Dashboard Reconciliation Assertions ---');

  // 1. Settled Transaction Volume (Total Volume INR)
  assert(
    platformData.totalVolumeInr === analystData.totalVolumeInr,
    `4.1: Settled Volume matches between Admin & Analyst (${platformData.totalVolumeInr} === ${analystData.totalVolumeInr})`
  );
  assert(
    platformData.totalVolumeInr === RECONCILED_FINANCIAL_TOTALS.settledVolumeInrExact,
    `4.2: Settled Volume matches canonical ₹1,081,149,862.46 (₹108.11 Cr)`
  );

  // 2. Gross Ledger Volume
  assert(
    platformData.grossVolumeInr === analystData.grossVolumeInr,
    `4.3: Gross Volume matches between Admin & Analyst (${platformData.grossVolumeInr} === ${analystData.grossVolumeInr})`
  );
  assert(
    platformData.grossVolumeInr === RECONCILED_FINANCIAL_TOTALS.grossVolumeInrExact,
    `4.4: Gross Volume matches canonical ₹1,123,391,729.99 (₹112.34 Cr)`
  );

  // 3. Settled Transaction Count
  assert(
    platformData.settledTransactions === analystData.settledTransactions,
    `4.5: Settled Transaction Count matches between Admin & Analyst (${platformData.settledTransactions} === ${analystData.settledTransactions})`
  );
  assert(
    platformData.settledTransactions === 210284,
    `4.6: Settled Transaction Count matches verified 210,284`
  );

  // 4. Total Transaction Count
  assert(
    platformData.totalTransactions === analystData.totalTransactions,
    `4.7: Total Transaction Count matches between Admin & Analyst (${platformData.totalTransactions} === ${analystData.totalTransactions})`
  );
  assert(
    platformData.totalTransactions === 217818,
    `4.8: Total Transaction Count matches verified 217,818`
  );

  // 5. Average Settled Transaction Value
  assert(
    analystData.avgTransactionInr === 5141.38,
    `4.9: Average Settled Transaction Value is verified at ₹5,141.38`
  );

  // 6. Failed & Reversed counts
  assert(
    platformData.failedTransactions === analystData.failedTransactions && platformData.failedTransactions === 5898,
    `4.10: Failed transaction counts reconciled (5,898)`
  );
  assert(
    platformData.reversedTransactions === analystData.reversedTransactions && platformData.reversedTransactions === 1636,
    `4.11: Reversed transaction counts reconciled (1,636)`
  );

  // --- SECTION 5: CUSTOMER ISOLATION & PRIVACY VERIFICATION ---
  console.log('\n--- SECTION 5: Customer Privacy & Data Isolation ---');
  // Login as Customer
  const custLoginRes = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'customer@finsight.ai', password: 'FinSight@Demo123' })
  });
  const custLoginData = await custLoginRes.json();
  const custToken = custLoginData.token;
  assert(custLoginRes.ok && !!custToken, '5.1: Customer login succeeds');

  // Customer dossier loads only own records
  const dossierRes = await fetch(`${API_BASE}/api/data/customer-dossier`, {
    headers: { Authorization: `Bearer ${custToken}` }
  });
  const dossierData = await dossierRes.json();
  assert(dossierRes.ok && !!dossierData.customer, '5.2: Customer dossier loads authenticated client data');
  assert(Array.isArray(dossierData.accounts) && dossierData.accounts.length > 0, '5.3: Customer linked institutional accounts retrieved');
  assert(Array.isArray(dossierData.recentTransactions), '5.4: Customer recent transactions list retrieved');

  // Customer cannot query administrative metrics
  const blockedAdminRes = await fetch(`${API_BASE}/api/admin/users`, {
    headers: { Authorization: `Bearer ${custToken}` }
  });
  assert(blockedAdminRes.status === 403, '5.5: Customer blocked from /api/admin/users with 403 Forbidden');

  // --- SECTION 6: RISK & FRAUD DASHBOARD VERIFICATION ---
  console.log('\n--- SECTION 6: Risk & Fraud Intelligence Verification ---');
  // Login as Risk Analyst
  const riskLoginRes = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'risk@finsight.ai', password: 'FinSight@Demo123' })
  });
  const riskLoginData = await riskLoginRes.json();
  const riskToken = riskLoginData.token;
  assert(riskLoginRes.ok && !!riskToken, '6.1: Risk Analyst login succeeds');

  const riskRes = await fetch(`${API_BASE}/api/data/risk-metrics`, {
    headers: { Authorization: `Bearer ${riskToken}` }
  });
  const riskData = await riskRes.json();
  assert(riskRes.ok, '6.2: GET /api/data/risk-metrics returns 200 OK');
  assert(riskData.totalAlerts === 3500, `6.3: Total fraud alerts verified (${riskData.totalAlerts} === 3500)`);
  assert(Array.isArray(riskData.fraudTypeBreakdown) && riskData.fraudTypeBreakdown.length > 0, '6.4: Live fraud type breakdown populated');
  assert(Array.isArray(riskData.allAlertsSummary) && riskData.allAlertsSummary.length === 3500, '6.5: Live alert queue contains all 3,500 records');

  console.log('\n==============================================================================');
  console.log(`RECONCILIATION AUDIT TEST RESULTS: ${passCount} PASSED, ${failCount} FAILED.`);
  console.log('==============================================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
