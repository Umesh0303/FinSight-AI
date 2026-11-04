import dotenv from 'dotenv';
dotenv.config();
import { Pool } from 'pg';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  console.error('DATABASE_URL is not set.');
  process.exit(1);
}

const pool = new Pool({
  connectionString: databaseUrl,
  ssl: { rejectUnauthorized: false }
});

async function run() {
  const client = await pool.connect();
  try {
    console.log('================================================================');
    console.log('FinSight AI — LIVE POSTGRESQL DATABASE RECONCILIATION AUDIT');
    console.log('================================================================\n');

    // 1. Transactions Total Count & Gross Volume
    const grossRes = await client.query(`
      SELECT 
        COUNT(*) AS total_tx_count,
        SUM(amount_inr::numeric) AS gross_volume,
        ROUND(AVG(amount_inr::numeric), 2) AS avg_gross
      FROM transactions;
    `);
    console.log('1. GROSS LEDGER TRANSACTION TOTALS:');
    console.log(grossRes.rows[0]);

    // 2. Status Breakdown (Success / Failed / Reversed)
    const statusRes = await client.query(`
      SELECT 
        status,
        COUNT(*) AS count,
        ROUND((COUNT(*)::numeric / 217818.0) * 100, 2) AS percentage,
        SUM(amount_inr::numeric) AS volume,
        ROUND(AVG(amount_inr::numeric), 2) AS avg_amount
      FROM transactions
      GROUP BY status
      ORDER BY count DESC;
    `);
    console.log('\n2. TRANSACTIONS BREAKDOWN BY STATUS:');
    console.table(statusRes.rows);

    // 3. Settled Transactions Only (status = 'Success')
    const settledRes = await client.query(`
      SELECT 
        COUNT(*) AS settled_count,
        SUM(amount_inr::numeric) AS settled_volume,
        ROUND(AVG(amount_inr::numeric), 2) AS avg_settled_ticket
      FROM transactions
      WHERE status = 'Success';
    `);
    console.log('\n3. SETTLED TRANSACTIONS ONLY (status = "Success"):');
    console.log(settledRes.rows[0]);

    // 4. Duplicate transaction_id check
    const dupRes = await client.query(`
      SELECT transaction_id, COUNT(*) 
      FROM transactions 
      GROUP BY transaction_id 
      HAVING COUNT(*) > 1 
      LIMIT 10;
    `);
    console.log('\n4. DUPLICATE TRANSACTION IDS:');
    console.log(`Found ${dupRes.rows.length} duplicates`);

    // 5. Txn Type Breakdown (Debit / Credit)
    const typeRes = await client.query(`
      SELECT 
        txn_type,
        COUNT(*) AS count,
        ROUND((COUNT(*)::numeric / 217818.0) * 100, 2) AS percentage,
        SUM(amount_inr::numeric) AS volume
      FROM transactions
      GROUP BY txn_type;
    `);
    console.log('\n5. TRANSACTIONS BREAKDOWN BY TYPE:');
    console.table(typeRes.rows);

    // 6. Payment Method Breakdown
    const pmRes = await client.query(`
      SELECT 
        payment_method,
        COUNT(*) AS count,
        ROUND((COUNT(*)::numeric / 217818.0) * 100, 2) AS percentage,
        SUM(amount_inr::numeric) AS volume
      FROM transactions
      GROUP BY payment_method
      ORDER BY count DESC;
    `);
    console.log('\n6. TRANSACTIONS BREAKDOWN BY PAYMENT METHOD:');
    console.table(pmRes.rows);

    // 7. Customers Table
    const custRes = await client.query(`
      SELECT 
        COUNT(*) AS total_customers,
        COUNT(*) FILTER (WHERE is_active = 1) AS active_customers,
        ROUND((COUNT(*) FILTER (WHERE is_active = 1)::numeric / COUNT(*)::numeric) * 100, 2) AS active_rate
      FROM customers;
    `);
    console.log('\n7. CUSTOMERS SUMMARY:');
    console.log(custRes.rows[0]);

    // 8. Accounts Table
    const accRes = await client.query(`
      SELECT 
        account_type,
        COUNT(*) AS count,
        ROUND((COUNT(*)::numeric / 29898.0) * 100, 2) AS percentage
      FROM accounts
      GROUP BY account_type
      ORDER BY count DESC;
    `);
    console.log('\n8. ACCOUNTS SUMMARY:');
    console.table(accRes.rows);

    // 9. Fraud Alerts Table
    const faRes = await client.query(`
      SELECT 
        alert_status,
        COUNT(*) AS count,
        SUM(loss_amount_inr::numeric) AS total_loss
      FROM fraud_alerts
      GROUP BY alert_status
      ORDER BY count DESC;
    `);
    console.log('\n9. FRAUD ALERTS SUMMARY:');
    console.table(faRes.rows);

    // 10. Top Merchants from live join
    const merchRes = await client.query(`
      SELECT 
        m.merchant_id,
        m.merchant_name,
        m.category,
        COUNT(t.transaction_id) AS tx_count,
        SUM(t.amount_inr::numeric) AS total_volume
      FROM transactions t
      JOIN merchants m ON t.merchant_id = m.merchant_id
      GROUP BY m.merchant_id, m.merchant_name, m.category
      ORDER BY total_volume DESC
      LIMIT 10;
    `);
    console.log('\n10. TOP 10 MERCHANTS BY TRANSACTION VOLUME:');
    console.table(merchRes.rows);

  } finally {
    client.release();
    await pool.end();
  }
}

run().catch((err) => {
  console.error('SQL audit failed:', err);
  pool.end();
});
