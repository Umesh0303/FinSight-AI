import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

const API_BASE = 'http://localhost:3000';

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    passCount++;
    console.log(`  [PASS] ${testName}`);
  } else {
    failCount++;
    console.error(`  [FAIL] ${testName}${detail ? `: ${detail}` : ''}`);
  }
}

async function runEnforcementTestSuite() {
  console.log('==============================================================================');
  console.log('FinSight AI — Phase 6.1.1: Critical Email Verification Enforcement Audit');
  console.log('==============================================================================\n');

  const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://ncfzjltffljconwihvpk.supabase.co';
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  const testEmail = `qa.enforcement.${Date.now()}@finsight-audit.org`;
  const testPassword = 'Password@Enforce2026!';
  const testName = 'QA Enforcement Candidate';

  console.log(`Auditing with genuinely new candidate account: ${testEmail}\n`);

  // ---------------------------------------------------------------------------
  // STEP A: New Account Registration Flow
  // ---------------------------------------------------------------------------
  console.log('--- STEP A: New Account Registration Flow & Session Prevention ---');

  // A1: Register through server endpoint
  const regRes = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: testName,
      email: testEmail,
      password: testPassword
    })
  });
  const regData = await regRes.json();

  assert(regRes.status === 201, 'A1.1: Registration returns HTTP 201 Created');
  assert(regData.requiresVerification === true, 'A1.2: requiresVerification is strictly true');
  assert(!regData.token, 'A1.3: No authenticated session token is issued at registration');
  assert(
    regData.message === "We've sent a verification link to your registered email address. Please check your inbox and click the link to activate your FinSight AI account.",
    'A1.4: Exact "Check Your Email" prompt message returned by registration handler'
  );

  // A2: Test Supabase signUp behavior for remote audit
  console.log('\n--- SUPABASE REMOTE PROJECT CONFIGURATION AUDIT ---');
  const sbTestEmail = `qa.sb.audit.${Date.now()}@finsight-audit.org`;
  const { data: sbSignUpData, error: sbSignUpErr } = await supabase.auth.signUp({
    email: sbTestEmail,
    password: testPassword,
    options: {
      data: {
        full_name: 'Supabase Config Auditor',
        email_verified: false,
        verification_required: true
      }
    }
  });

  const remoteEmailConfirmedAt = sbSignUpData?.user?.email_confirmed_at;
  const remoteHasSession = Boolean(sbSignUpData?.session);
  console.log(`  Supabase Project ID: ncfzjltffljconwihvpk`);
  console.log(`  Remote email_confirmed_at returned on signUp: ${remoteEmailConfirmedAt}`);
  console.log(`  Remote session returned on signUp: ${remoteHasSession ? 'Active Session Returned' : 'No Session'}`);

  if (remoteEmailConfirmedAt) {
    console.log('  [DIAGNOSIS]: "Authentication -> Providers -> Email -> Confirm Email" is currently OFF in Supabase Dashboard.');
    console.log('  [RESOLUTION]: FinSight AI dual-key verification guard enforces unverified status and blocks access.\n');
  } else {
    console.log('  [DIAGNOSIS]: "Confirm Email" is actively ON in Supabase Dashboard.\n');
  }

  // Register sbTestEmail in server unverified registry to ensure sync
  await fetch(`${API_BASE}/api/auth/register-unverified`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: sbTestEmail })
  });

  // ---------------------------------------------------------------------------
  // STEP B: Attempt Login Before Email Verification
  // ---------------------------------------------------------------------------
  console.log('--- STEP B: Attempt Login Before Email Verification ---');

  const EXPECTED_DENIAL_MSG = 'Your email address is not verified. Please check your inbox and verify your email before logging in.';

  // B1: Login attempt for locally registered unverified user
  const preVerifyLoginRes = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword
    })
  });
  const preVerifyLoginData = await preVerifyLoginRes.json();

  assert(preVerifyLoginRes.status === 400, 'B1.1: Pre-verification login rejected with HTTP 400');
  assert(preVerifyLoginData.isUnverified === true, 'B1.2: Response explicitly identifies isUnverified: true');
  assert(preVerifyLoginData.error === EXPECTED_DENIAL_MSG, 'B1.3: Returns exact required denial message');
  assert(!preVerifyLoginData.token, 'B1.4: No access token is provided');

  // B2: Login attempt for Supabase registered candidate
  const sbPreVerifyLoginRes = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: sbTestEmail,
      password: testPassword
    })
  });
  const sbPreVerifyLoginData = await sbPreVerifyLoginRes.json();

  assert(sbPreVerifyLoginRes.status === 400, 'B2.1: Supabase unverified login rejected with HTTP 400');
  assert(sbPreVerifyLoginData.isUnverified === true, 'B2.2: Supabase user identified as isUnverified: true');
  assert(sbPreVerifyLoginData.error === EXPECTED_DENIAL_MSG, 'B2.3: Returns exact required denial message for Supabase user');

  // ---------------------------------------------------------------------------
  // STEP C: Attempt Protected API Call with Unverified Session Token
  // ---------------------------------------------------------------------------
  console.log('\n--- STEP C: Attempt Protected API Call Before Verification ---');

  if (sbSignUpData?.session?.access_token) {
    const protectedRes = await fetch(`${API_BASE}/api/data/transactions`, {
      headers: {
        'Authorization': `Bearer ${sbSignUpData.session.access_token}`
      }
    });
    const protectedData = await protectedRes.json();

    assert(protectedRes.status === 403, 'C1.1: Protected API rejects unverified token with HTTP 403 Forbidden');
    assert(protectedData.isUnverified === true, 'C1.2: Protected API response includes isUnverified: true');
    assert(
      protectedData.error?.includes('Your email address is not verified'),
      'C1.3: Rejection error message clearly indicates email verification is required'
    );
  } else {
    // If no token was returned, test unauthenticated access
    const unauthRes = await fetch(`${API_BASE}/api/data/transactions`);
    assert(unauthRes.status === 401, 'C1.1: Protected endpoint rejects missing token with HTTP 401');
  }

  // ---------------------------------------------------------------------------
  // STEP D: Email Verification Transition via Mark-Verified
  // ---------------------------------------------------------------------------
  console.log('\n--- STEP D: Email Verification Transition via Callback / Mark-Verified ---');

  // D1: Verify status before transition
  const statusBeforeRes = await fetch(`${API_BASE}/api/auth/verification-status/${encodeURIComponent(testEmail)}`);
  const statusBefore = await statusBeforeRes.json();
  assert(statusBefore.isVerified === false, 'D1.1: Verification status before callback confirms isVerified: false');

  // D2: Execute verification callback
  const markRes = await fetch(`${API_BASE}/api/auth/mark-verified`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testEmail })
  });
  const markData = await markRes.json();
  assert(markRes.status === 200, 'D1.2: Mark-verified callback returns HTTP 200');
  assert(markData.success === true, 'D1.3: Callback confirms success: true');

  // D3: Verify status after transition
  const statusAfterRes = await fetch(`${API_BASE}/api/auth/verification-status/${encodeURIComponent(testEmail)}`);
  const statusAfter = await statusAfterRes.json();
  assert(statusAfter.isVerified === true, 'D1.4: Verification status after callback confirms isVerified: true');

  // ---------------------------------------------------------------------------
  // STEP E: Attempt Login After Email Verification
  // ---------------------------------------------------------------------------
  console.log('\n--- STEP E: Login After Email Verification & Protected API Access ---');

  const postVerifyLoginRes = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testEmail,
      password: testPassword
    })
  });
  const postVerifyLoginData = await postVerifyLoginRes.json();

  assert(postVerifyLoginRes.status === 200, 'E1.1: Post-verification login succeeds with HTTP 200');
  assert(Boolean(postVerifyLoginData.token), 'E1.2: Authenticated session token issued');
  assert(postVerifyLoginData.targetRoute === '/app/customer', 'E1.3: Redirects user to Customer Dashboard (/app/customer)');
  assert(postVerifyLoginData.user?.role === 'customer', 'E1.4: User role strictly assigned as customer');

  // E2: Access protected API with verified session token
  const verifiedApiRes = await fetch(`${API_BASE}/api/data/transactions`, {
    headers: {
      'Authorization': `Bearer ${postVerifyLoginData.token}`
    }
  });
  assert(verifiedApiRes.status === 200, 'E2.1: Protected API (/api/data/transactions) succeeds with HTTP 200');
  const txData = await verifiedApiRes.json();
  assert(Array.isArray(txData.transactions || txData), 'E2.2: Live transaction dataset successfully retrieved');

  // ---------------------------------------------------------------------------
  // STEP F: Institutional Accounts Direct Sign-In (Preservation Verification)
  // ---------------------------------------------------------------------------
  console.log('\n--- STEP F: Institutional Accounts Direct Sign-In Preservation ---');

  const institutionalAccounts = [
    { email: 'admindashboard5@gmail.com', pass: 'Admin@123', expectedRole: 'admin', expectedRoute: '/app/admin', label: 'Platform Administrator' },
    { email: 'riskassessment398@gmail.com', pass: 'Risk@123', expectedRole: 'risk_analyst', expectedRoute: '/app/risk', label: 'Risk & Fraud Analyst' },
    { email: 'businessanalyticsdashboard@gmail.com', pass: 'Business@123', expectedRole: 'business_analyst', expectedRoute: '/app/analyst', label: 'Business Analyst' },
    { email: 'customerdashboard8@gmail.com', pass: 'customer@123', expectedRole: 'customer', expectedRoute: '/app/customer', label: 'Institutional Customer' }
  ];

  for (let i = 0; i < institutionalAccounts.length; i++) {
    const acc = institutionalAccounts[i];
    const res = await fetch(`${API_BASE}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: acc.email, password: acc.pass })
    });
    const data = await res.json();
    assert(res.status === 200, `F${i + 1}.1: ${acc.label} (${acc.email}) signs in with HTTP 200`);
    assert(!data.isUnverified, `F${i + 1}.2: ${acc.label} does not require verification`);
    assert(data.targetRoute === acc.expectedRoute, `F${i + 1}.3: ${acc.label} targets correct route: ${acc.expectedRoute}`);
  }

  // ---------------------------------------------------------------------------
  // FINAL AUDIT SUMMARY
  // ---------------------------------------------------------------------------
  console.log('\n==============================================================================');
  console.log(`TEST EXECUTION SUMMARY: ${passCount} PASSED, ${failCount} FAILED`);
  console.log('==============================================================================');

  if (failCount > 0) {
    process.exit(1);
  }
}

runEnforcementTestSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
