import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Missing Supabase credentials in environment.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function runAudit() {
  console.log('====================================================');
  console.log('FinSight AI — LIVE SUPABASE DATABASE AUDIT');
  console.log('====================================================\n');

  // 1. Table Counts
  const tables = [
    'customers',
    'accounts',
    'transactions',
    'merchants',
    'balance_snapshots',
    'credit_score_history',
    'fraud_alerts',
    'support_cases',
    'app_users'
  ];

  console.log('--- 1. EXACT TABLE RECORD COUNTS ---');
  for (const table of tables) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    if (error) {
      console.error(`Error querying count for ${table}:`, error.message);
    } else {
      console.log(`Table "${table}": ${count} records`);
    }
  }

  // 2. Active Customers
  const { count: activeCustCount } = await supabase.from('customers').select('*', { count: 'exact', head: true }).eq('is_active', 1);
  console.log(`\nActive Customers (is_active=1): ${activeCustCount}`);

  // 3. Customer Segments
  const { data: customerSegments } = await supabase.from('customers').select('segment');
  if (customerSegments) {
    const segCounts: Record<string, number> = {};
    for (const c of customerSegments) {
      const s = c.segment || 'Unknown';
      segCounts[s] = (segCounts[s] || 0) + 1;
    }
    console.log('Customer Segments:', segCounts);
  }

  // 4. Accounts by type
  const { data: accounts } = await supabase.from('accounts').select('account_type');
  if (accounts) {
    const accCounts: Record<string, number> = {};
    for (const a of accounts) {
      const t = a.account_type || 'Unknown';
      accCounts[t] = (accCounts[t] || 0) + 1;
    }
    console.log('\nAccounts by Type:', accCounts);
  }

  // 5. Fraud Alerts by status and loss
  const { data: fraudAlerts } = await supabase.from('fraud_alerts').select('alert_status, loss_amount_inr');
  if (fraudAlerts) {
    const statusCounts: Record<string, number> = {};
    let totalConfirmedLoss = 0;
    let totalAllLoss = 0;
    for (const fa of fraudAlerts) {
      const st = fa.alert_status || 'Unknown';
      statusCounts[st] = (statusCounts[st] || 0) + 1;
      const loss = Number(fa.loss_amount_inr) || 0;
      totalAllLoss += loss;
      if (st === 'Confirmed Fraud') {
        totalConfirmedLoss += loss;
      }
    }
    console.log('\nFraud Alerts by Status:', statusCounts);
    console.log(`Total Confirmed Fraud Loss: ₹ ${totalConfirmedLoss}`);
    console.log(`Total Loss across all alerts: ₹ ${totalAllLoss}`);
  }

  // 6. Transactions Aggregations: Status, Counts, Volumes
  console.log('\n--- 2. TRANSACTIONS LEDGER AGGREGATION AUDIT ---');
  // Check transaction statuses present
  const { data: statusSamples } = await supabase.from('transactions').select('status, amount_inr, txn_type').limit(10);
  console.log('Sample transaction rows:', statusSamples);

  // We can query counts for each status using exact head queries
  const statuses = ['Success', 'Failed', 'Reversed', 'Pending', 'Flagged'];
  for (const st of statuses) {
    const { count } = await supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('status', st);
    console.log(`Status "${st}" count: ${count}`);
  }

  // Also query counts by txn_type
  for (const tt of ['Debit', 'Credit']) {
    const { count } = await supabase.from('transactions').select('*', { count: 'exact', head: true }).eq('txn_type', tt);
    console.log(`Txn Type "${tt}" count: ${count}`);
  }

  // Query RPC or SQL if available or check whether there's a stored procedure or direct query for sums
  // Let's test if rpc exists or execute sql
  console.log('\n--- 3. VERIFYING AGGREGATE VOLUMES ---');
  // Check if we can run an RPC or fetch chunked sums
  // Let's test if there is an RPC for transaction stats
  const { data: rpcData, error: rpcErr } = await supabase.rpc('get_financial_summary');
  if (!rpcErr) {
    console.log('RPC get_financial_summary result:', rpcData);
  } else {
    console.log('RPC get_financial_summary not found:', rpcErr.message);
  }
}

runAudit().catch(console.error);
