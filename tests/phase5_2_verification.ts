import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const API_BASE = 'http://localhost:3000';
const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
const anonKey = process.env.VITE_SUPABASE_ANON_KEY || '';

const dummyVector = new Array(768).fill(0.005);

async function loginUser(email: string, pass: string): Promise<string> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: pass })
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Login failed for ${email}: ${res.status} ${text}`);
  }
  const data = await res.json();
  return data.token;
}

async function testDirectRpc(name: string, token: string | null, keyToUse: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'apikey': keyToUse
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const endpoint = `${supabaseUrl}/rest/v1/rpc/match_rag_chunks`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      query_embedding: dummyVector,
      match_threshold: 0.1,
      match_count: 2,
      caller_role: 'admin' // Attempting to forge admin privileges
    })
  });

  let body: any = null;
  const rawText = await res.text();
  try {
    body = JSON.parse(rawText);
  } catch {
    body = rawText;
  }

  return {
    client: name,
    status: res.status,
    statusText: res.statusText,
    code: body?.code,
    message: body?.message || (Array.isArray(body) ? `Returned ${body.length} rows` : typeof body === 'object' ? JSON.stringify(body) : body),
    isDenied: res.status === 401 || res.status === 403 || res.status === 404 || body?.code === 'PGRST202' || body?.code === '42501'
  };
}

async function runAudit() {
  console.log('==============================================================================');
  console.log('FinSight AI — Phase 5.2 Live Supabase Production RPC Security Audit');
  console.log('==============================================================================\n');

  console.log('Target URL:', supabaseUrl ? new URL(supabaseUrl).origin : 'NOT CONFIGURED');

  // Check PostgREST Schema Cache
  console.log('\n--- STEP 1: PostgREST Schema Inspection ---');
  const specRes = await fetch(`${supabaseUrl}/rest/v1/`, {
    headers: { 'apikey': anonKey }
  });
  const spec = await specRes.json().catch(() => ({}));
  const paths = Object.keys(spec?.paths || {});
  const isMatchRagChunksExposedToAnon = paths.includes('/rpc/match_rag_chunks');
  console.log('Anonymous OpenAPI Schema Cache exposes /rpc/match_rag_chunks:', isMatchRagChunksExposedToAnon);

  // Authenticate the 4 institutional accounts
  console.log('\n--- Logging in Institutional Accounts ---');
  const customerToken = await loginUser('customerdashboard8@gmail.com', 'customer@123');
  console.log('Customer JWT acquired.');
  const businessToken = await loginUser('businessanalyticsdashboard@gmail.com', 'Business@123');
  console.log('Business Analyst JWT acquired.');
  const riskToken = await loginUser('riskassessment398@gmail.com', 'Risk@123');
  console.log('Risk Analyst JWT acquired.');
  const adminToken = await loginUser('admindashboard5@gmail.com', 'Admin@123');
  console.log('Platform Admin JWT acquired.');

  console.log('\n--- STEP 3: Live Direct RPC Execution Attempts ---');
  // 1. Anon
  const r1 = await testDirectRpc('1. Anonymous Client', null, anonKey);
  console.log(r1);

  // 2. Customer
  const r2 = await testDirectRpc('2. Authenticated Customer', customerToken, anonKey);
  console.log(r2);

  // 3. Business Analyst
  const r3 = await testDirectRpc('3. Business Analyst', businessToken, anonKey);
  console.log(r3);

  // 4. Risk Analyst
  const r4 = await testDirectRpc('4. Risk Analyst', riskToken, anonKey);
  console.log(r4);

  // 5. Admin (Direct over PostgREST with user JWT)
  const r5 = await testDirectRpc('5. Platform Admin (User JWT over PostgREST)', adminToken, anonKey);
  console.log(r5);

  // 6. Service Role Client
  const r6 = await testDirectRpc('6. Backend Service-Role Client', serviceRoleKey, serviceRoleKey);
  console.log(r6);

  console.log('\n==============================================================================');
  console.log('SUMMARY TABLE:');
  console.table([r1, r2, r3, r4, r5, r6]);
}

runAudit().catch(console.error);
