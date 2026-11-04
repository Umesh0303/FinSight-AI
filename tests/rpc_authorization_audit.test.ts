import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const API_BASE = 'http://localhost:3000';
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

console.log('Target Supabase URL:', supabaseUrl ? new URL(supabaseUrl).origin : 'NOT CONFIGURED');

const dummyVector = new Array(768).fill(0.01);

async function runRpcAudit() {
  console.log('==============================================================================');
  console.log('FinSight AI — Step 1 & Step 4: Database-Level RPC Authorization Audit');
  console.log('==============================================================================\n');

  // 1. Service Role Client
  console.log('--- 1. Testing match_rag_chunks with Service Role Client ---');
  if (supabaseUrl && serviceRoleKey) {
    const adminClient = createClient(supabaseUrl, serviceRoleKey);
    const { data: adminData, error: adminErr } = await adminClient.rpc('match_rag_chunks', {
      query_embedding: dummyVector,
      match_threshold: 0.1,
      match_count: 5,
      caller_role: 'admin'
    });
    console.log('Service Role RPC Execution:', {
      success: !adminErr,
      error: adminErr?.message || null,
      rowCount: adminData?.length
    });
  } else {
    console.log('Service role credentials missing');
  }

  // 2. Anonymous Client
  console.log('\n--- 2. Testing match_rag_chunks with Anonymous Client ---');
  if (supabaseUrl && anonKey) {
    const anonClient = createClient(supabaseUrl, anonKey);
    const { data: anonData, error: anonErr } = await anonClient.rpc('match_rag_chunks', {
      query_embedding: dummyVector,
      match_threshold: 0.1,
      match_count: 5,
      caller_role: 'admin'
    });
    console.log('Anonymous Client RPC Execution:', {
      success: !anonErr,
      error: anonErr?.message || null,
      code: anonErr?.code,
      denied: Boolean(anonErr)
    });
  } else {
    console.log('Anon key missing');
  }

  // 3. Authenticated Customer Client
  console.log('\n--- 3. Testing match_rag_chunks with Authenticated Customer JWT ---');
  const loginRes = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'customerdashboard8@gmail.com', password: 'customer@123' })
  });
  const loginData = await loginRes.json();
  const customerToken = loginData.token;
  console.log('Customer JWT acquired:', !!customerToken);

  if (customerToken && supabaseUrl && anonKey) {
    const customerClient = createClient(supabaseUrl, anonKey, {
      global: {
        headers: { Authorization: `Bearer ${customerToken}` }
      }
    });

    const { data: custData, error: custErr } = await customerClient.rpc('match_rag_chunks', {
      query_embedding: dummyVector,
      match_threshold: 0.1,
      match_count: 5,
      caller_role: 'admin' // Attempting to forge admin role directly on PostgREST
    });

    console.log('Customer Direct RPC Execution:', {
      success: !custErr,
      error: custErr?.message || null,
      code: custErr?.code,
      denied: Boolean(custErr),
      data: custData
    });

    // Also direct raw fetch
    const rawPostgrestRes = await fetch(`${supabaseUrl}/rest/v1/rpc/match_rag_chunks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey,
        'Authorization': `Bearer ${customerToken}`
      },
      body: JSON.stringify({
        query_embedding: dummyVector,
        match_threshold: 0.1,
        match_count: 5,
        caller_role: 'admin'
      })
    });
    const rawJson = await rawPostgrestRes.json().catch(() => ({}));
    console.log('Raw PostgREST HTTP Status:', rawPostgrestRes.status);
    console.log('Raw PostgREST Response:', rawJson);
  }
}

runRpcAudit();
