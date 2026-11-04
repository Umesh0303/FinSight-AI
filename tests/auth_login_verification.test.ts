import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const API_BASE = 'http://localhost:3000';
const AT06_DOC_ID = '5a5abdb9-c88c-4ac0-9e02-ec65223dcb3d';

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

async function runAuthTests() {
  console.log('==============================================================================');
  console.log('FinSight AI — Auth & Existing Account Acceptance Test Suite');
  console.log('==============================================================================\n');

  const supabaseUrl = process.env.VITE_SUPABASE_URL!;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // ---------------------------------------------------------------------------
  // TEST 1: Existing Valid Account Sign-In (Supabase Client & API Endpoint)
  // ---------------------------------------------------------------------------
  console.log('--- TEST 1: Existing Valid Account Sign-In ---');

  // 1.1 Existing Admin Gmail account via Supabase
  const { data: adminAuth, error: adminAuthErr } = await supabase.auth.signInWithPassword({
    email: 'admindashboard5@gmail.com',
    password: 'Admin@123'
  });
  assert(!adminAuthErr && Boolean(adminAuth?.session?.access_token), '1.1: Existing admin Gmail account signs in via Supabase Auth');
  const adminToken = adminAuth?.session?.access_token || '';

  // 1.2 Existing Admin Gmail account via /api/auth/login endpoint
  const adminLoginRes = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admindashboard5@gmail.com', password: 'Admin@123' })
  });
  assert(adminLoginRes.status === 200, '1.2: POST /api/auth/login returns 200 OK for valid admin credentials');
  const adminLoginData = await adminLoginRes.json();
  assert(adminLoginData.user?.role === 'admin', '1.3: Admin account resolves role="admin"');
  assert(adminLoginData.targetRoute === '/app/admin', '1.4: Admin account targets /app/admin route');
  assert(Boolean(adminLoginData.token), '1.5: Valid JWT session token returned');

  // 1.3 Existing Risk Analyst account via Supabase
  const { data: riskAuth, error: riskAuthErr } = await supabase.auth.signInWithPassword({
    email: 'riskassessment398@gmail.com',
    password: 'Risk@123'
  });
  assert(!riskAuthErr && Boolean(riskAuth?.session?.access_token), '1.6: Existing risk analyst Gmail account signs in via Supabase Auth');

  // 1.4 Demo accounts sign in
  const demoRiskRes = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'risk@finsight.ai', password: 'FinSight@Demo123' })
  });
  assert(demoRiskRes.status === 200, '1.7: POST /api/auth/login returns 200 for risk@finsight.ai');
  const demoRiskData = await demoRiskRes.json();
  assert(demoRiskData.user?.role === 'risk_analyst', '1.8: Risk role correctly resolved');

  // ---------------------------------------------------------------------------
  // TEST 2: Incorrect Password Rejection
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 2: Incorrect Password Rejection ---');

  // 2.1 Supabase client rejects wrong password
  const { data: wrongAuth, error: wrongAuthErr } = await supabase.auth.signInWithPassword({
    email: 'admindashboard5@gmail.com',
    password: 'CompletelyWrongPassword!999'
  });
  assert(Boolean(wrongAuthErr) && !wrongAuth?.session, '2.1: Supabase client rejects wrong password');

  // 2.2 Server endpoint rejects wrong password with 401 and safe message
  const wrongLoginRes = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admindashboard5@gmail.com', password: 'CompletelyWrongPassword!999' })
  });
  assert(wrongLoginRes.status === 401, '2.2: POST /api/auth/login returns 401 for wrong password');
  const wrongLoginData = await wrongLoginRes.json();
  assert(
    wrongLoginData.error === 'Invalid email address or password.' ||
    wrongLoginData.error === 'Invalid email address or password. Please verify your credentials.',
    '2.3: Safe credential error message returned (no internal errors leaked)',
    wrongLoginData.error
  );

  // 2.3 Wrong password for demo account rejected
  const wrongDemoRes = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'risk@finsight.ai', password: 'WrongPassword!123' })
  });
  assert(wrongDemoRes.status === 401, '2.4: POST /api/auth/login returns 401 for wrong demo password');

  // ---------------------------------------------------------------------------
  // TEST 3: Nonexistent Account Rejection
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 3: Nonexistent Account Rejection ---');

  const nonexistentRes = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'nonexistent.ghost.account@example.com', password: 'SomePassword!123' })
  });
  assert(nonexistentRes.status === 401, '3.1: POST /api/auth/login returns 401 for nonexistent account');
  const nonexistentData = await nonexistentRes.json();
  assert(
    nonexistentData.error === 'Invalid email address or password.' ||
    nonexistentData.error === 'Invalid email address or password. Please verify your credentials.',
    '3.2: Generic rejection message protects user enumeration',
    nonexistentData.error
  );

  // ---------------------------------------------------------------------------
  // TEST 4: Session Validity and Authorized Route Access
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 4: Session Validity and Authorized Route Access ---');

  // 4.1 Admin access token verifies session
  const sessionRes = await fetch(`${API_BASE}/api/auth/session`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(sessionRes.status === 200, '4.1: GET /api/auth/session returns 200 for authenticated admin');
  const sessionData = await sessionRes.json();
  assert(sessionData.user?.role === 'admin', '4.2: Session user role is verified as admin');

  // 4.2 Admin can access protected /api/admin/users
  const adminUsersRes = await fetch(`${API_BASE}/api/admin/users`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(adminUsersRes.status === 200, '4.3: GET /api/admin/users accessible by admin');
  const adminUsersData = await adminUsersRes.json();
  assert(Array.isArray(adminUsersData.users) && adminUsersData.users.length > 0, '4.4: User list populated');

  // 4.3 Admin can access knowledge base documents
  const adminDocsRes = await fetch(`${API_BASE}/api/rag/documents`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(adminDocsRes.status === 200, '4.5: GET /api/rag/documents accessible by authenticated session');

  // ---------------------------------------------------------------------------
  // TEST 5: Role Isolation & AT-06 Restriction
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 5: Role Isolation & AT-06 Restriction ---');

  const riskToken = demoRiskData.token;

  // 5.1 Risk Analyst can see AT-06
  const riskDocsRes = await fetch(`${API_BASE}/api/rag/documents`, {
    headers: { Authorization: `Bearer ${riskToken}` }
  });
  assert(riskDocsRes.status === 200, '5.1: Risk Analyst loads documents successfully');
  const riskDocsData = await riskDocsRes.json();
  const hasAt06ForRisk = riskDocsData.documents?.some((d: any) => d.id === AT06_DOC_ID);
  assert(hasAt06ForRisk, '5.2: Risk Analyst CAN see AT-06 risk-only document');

  // 5.2 Customer login and AT-06 exclusion
  const customerLoginRes = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'customer@finsight.ai', password: 'FinSight@Demo123' })
  });
  const customerLoginData = await customerLoginRes.json();
  const customerToken = customerLoginData.token;

  const customerDocsRes = await fetch(`${API_BASE}/api/rag/documents`, {
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  assert(customerDocsRes.status === 200, '5.3: Customer loads documents successfully');
  const customerDocsData = await customerDocsRes.json();
  const hasAt06ForCustomer = customerDocsData.documents?.some((d: any) => d.id === AT06_DOC_ID);
  assert(!hasAt06ForCustomer, '5.4: AT-06 is strictly EXCLUDED from Customer documents');

  // 5.3 Customer direct inspection of AT-06 returns 403 Forbidden
  const inspectRes = await fetch(`${API_BASE}/api/rag/documents/${AT06_DOC_ID}`, {
    headers: { Authorization: `Bearer ${customerToken}` }
  });
  assert(inspectRes.status === 403, '5.5: Direct inspection of AT-06 by Customer returns 403 Forbidden');

  // ---------------------------------------------------------------------------
  // SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n==============================================================================');
  console.log(`Auth Acceptance Suite: ${passCount} PASSED, ${failCount} FAILED.`);
  console.log('==============================================================================');

  if (failCount > 0) {
    process.exit(1);
  }
}

runAuthTests().catch((err) => {
  console.error('Test runner exception:', err);
  process.exit(1);
});
