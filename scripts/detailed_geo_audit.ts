import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function runDetailedGeoAudit() {
  console.log('=== GEOGRAPHIC ANOMALY RADAR DETAILED AUDIT ===');

  // Fetch all 3033 transactions using pagination
  const [b1, b2, b3, b4] = await Promise.all([
    supabase.from('transactions').select('transaction_id, customer_id, account_id, txn_datetime, amount_inr, txn_type, category, merchant_id, payment_method, device_type, city, status, is_international, is_flagged').eq('is_international', 1).range(0, 999),
    supabase.from('transactions').select('transaction_id, customer_id, account_id, txn_datetime, amount_inr, txn_type, category, merchant_id, payment_method, device_type, city, status, is_international, is_flagged').eq('is_international', 1).range(1000, 1999),
    supabase.from('transactions').select('transaction_id, customer_id, account_id, txn_datetime, amount_inr, txn_type, category, merchant_id, payment_method, device_type, city, status, is_international, is_flagged').eq('is_international', 1).range(2000, 2999),
    supabase.from('transactions').select('transaction_id, customer_id, account_id, txn_datetime, amount_inr, txn_type, category, merchant_id, payment_method, device_type, city, status, is_international, is_flagged').eq('is_international', 1).range(3000, 3999)
  ]);

  const allIntl = [...(b1.data || []), ...(b2.data || []), ...(b3.data || []), ...(b4.data || [])];
  console.log('Total fetched records:', allIntl.length);

  // Group by city
  const cityMetrics: Record<string, {
    count: number;
    volumeInr: number;
    minAmount: number;
    maxAmount: number;
    flaggedCount: number;
    paymentMethods: Record<string, number>;
    deviceTypes: Record<string, number>;
    statusBreakdown: Record<string, number>;
    categories: Record<string, number>;
    uniqueCustomers: Set<string>;
    uniqueAccounts: Set<string>;
  }> = {};

  for (const tx of allIntl) {
    const c = tx.city;
    if (!cityMetrics[c]) {
      cityMetrics[c] = {
        count: 0,
        volumeInr: 0,
        minAmount: Infinity,
        maxAmount: -Infinity,
        flaggedCount: 0,
        paymentMethods: {},
        deviceTypes: {},
        statusBreakdown: {},
        categories: {},
        uniqueCustomers: new Set(),
        uniqueAccounts: new Set()
      };
    }
    const m = cityMetrics[c];
    const amt = Number(tx.amount_inr) || 0;
    m.count++;
    m.volumeInr += amt;
    m.minAmount = Math.min(m.minAmount, amt);
    m.maxAmount = Math.max(m.maxAmount, amt);
    if (tx.is_flagged === 1) m.flaggedCount++;
    m.paymentMethods[tx.payment_method] = (m.paymentMethods[tx.payment_method] || 0) + 1;
    m.deviceTypes[tx.device_type] = (m.deviceTypes[tx.device_type] || 0) + 1;
    m.statusBreakdown[tx.status] = (m.statusBreakdown[tx.status] || 0) + 1;
    m.categories[tx.category] = (m.categories[tx.category] || 0) + 1;
    m.uniqueCustomers.add(tx.customer_id);
    m.uniqueAccounts.add(tx.account_id);
  }

  console.log('\n--- CITY BY CITY RECONCILIATION TABLE ---');
  let grandTotal = 0;
  let grandVolume = 0;
  let grandFlagged = 0;

  for (const city of ['London', 'Dubai', 'Bangkok', 'Singapore']) {
    const m = cityMetrics[city];
    grandTotal += m.count;
    grandVolume += m.volumeInr;
    grandFlagged += m.flaggedCount;
    console.log(`\nCity: ${city}`);
    console.log(`  Count: ${m.count} (${((m.count / allIntl.length) * 100).toFixed(2)}%)`);
    console.log(`  Total Volume (INR): ₹${m.volumeInr.toFixed(2)} (₹${(m.volumeInr / 1e7).toFixed(4)} Cr)`);
    console.log(`  Average Ticket: ₹${(m.volumeInr / m.count).toFixed(2)}`);
    console.log(`  Min Ticket: ₹${m.minAmount}, Max Ticket: ₹${m.maxAmount}`);
    console.log(`  Flagged Alerts (is_flagged = 1): ${m.flaggedCount} (${((m.flaggedCount / m.count) * 100).toFixed(2)}%)`);
    console.log(`  Unique Customers: ${m.uniqueCustomers.size}`);
    console.log(`  Unique Accounts: ${m.uniqueAccounts.size}`);
    console.log(`  Payment Methods:`, m.paymentMethods);
    console.log(`  Device Types:`, m.deviceTypes);
    console.log(`  Status Breakdown:`, m.statusBreakdown);
  }

  console.log('\n--- TOTALS ACROSS ALL 4 HUBS ---');
  console.log(`Total Count: ${grandTotal} / 3033`);
  console.log(`Total Volume: ₹${grandVolume.toFixed(2)} (₹${(grandVolume / 1e7).toFixed(4)} Cr)`);
  console.log(`Total Flagged Transactions: ${grandFlagged} / ${grandTotal}`);

  // Check for any other cities where is_international = 1
  const otherCities = Object.keys(cityMetrics).filter(c => !['London', 'Dubai', 'Bangkok', 'Singapore'].includes(c));
  console.log('Any other cities where is_international = 1?:', otherCities);

  // Check if any domestic transaction has is_international = 1
  // We already saw domestic count = 214,785, intl count = 3,033, total = 217,818.
}

runDetailedGeoAudit();
