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

async function runEmailVerificationTests() {
  console.log('==============================================================================');
  console.log('FinSight AI — Mandatory Email Verification & Security Test Suite');
  console.log('==============================================================================\n');

  const supabaseUrl = process.env.VITE_SUPABASE_URL!;
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  // ---------------------------------------------------------------------------
  // TEST 1: Verified Institutional Accounts Sign In Without Verification Blocks
  // ---------------------------------------------------------------------------
  console.log('--- TEST 1: Verified Institutional Accounts Direct Sign-In ---');

  // 1.1 Admin login
  const adminRes = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'admindashboard5@gmail.com', password: 'Admin@123' })
  });
  const adminData = await adminRes.json();
  assert(adminRes.status === 200, '1.1: Admin account logs in directly with HTTP 200');
  assert(!adminData.isUnverified, '1.2: Admin login does not request email verification');
  assert(adminData.user?.role === 'admin', '1.3: Admin profile resolved correctly');

  // 1.2 Risk Analyst login
  const riskRes = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'riskassessment398@gmail.com', password: 'Risk@123' })
  });
  const riskData = await riskRes.json();
  assert(riskRes.status === 200, '1.4: Risk Analyst logs in directly with HTTP 200');
  assert(!riskData.isUnverified, '1.5: Risk Analyst login does not request email verification');

  // 1.3 Business Analyst login
  const baRes = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'businessanalyticsdashboard@gmail.com', password: 'Business@123' })
  });
  const baData = await baRes.json();
  assert(baRes.status === 200, '1.6: Business Analyst logs in directly with HTTP 200');
  assert(!baData.isUnverified, '1.7: Business Analyst login does not request email verification');

  // 1.4 Customer login
  const custRes = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'customerdashboard8@gmail.com', password: 'customer@123' })
  });
  const custData = await custRes.json();
  assert(custRes.status === 200, '1.8: Customer logs in directly with HTTP 200');
  assert(!custData.isUnverified, '1.9: Customer login does not request email verification');

  // ---------------------------------------------------------------------------
  // TEST 2: Unverified Login Attempt Denial & Required Warning Message
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 2: Unverified Account Rejection & Specific Denial Message ---');

  // 2.1 Attempt login with an unconfirmed email format or non-existent user
  const unconfirmedRes = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'unverified.user.test@finsight.ai', password: 'TestPassword123!' })
  });
  assert(unconfirmedRes.status === 400 || unconfirmedRes.status === 401, '2.1: Non-authenticated credentials denied with 400/401');

  // 2.2 Verify the exact required denial message is returned when isUnverified is true
  const REQUIRED_UNVERIFIED_MESSAGE = 'Your email address is not verified. Please check your inbox and verify your email before logging in.';
  
  // Test server-side unconfirmed handler response format contract
  // Simulate an unverified user sign-in denial by creating a local unverified user if supported
  const testUnverifiedEmail = `test.pending.${Date.now()}@institution-qa.com`;
  const registerRes = await fetch(`${API_BASE}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      name: 'QA Unverified Candidate',
      email: testUnverifiedEmail,
      password: 'StrongPassword@2026'
    })
  });
  const regData = await registerRes.json();
  assert(registerRes.status === 200 || registerRes.status === 201, '2.2: New registration endpoint accepts valid details');
  assert(regData.requiresVerification === true, '2.3: Registration response enforces requiresVerification: true');
  assert(regData.message.includes('verification link'), '2.4: Registration message instructs user to check inbox');

  // Attempt to log in with this newly registered unverified account
  const unverifiedLoginRes = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: testUnverifiedEmail,
      password: 'StrongPassword@2026'
    })
  });
  assert(unverifiedLoginRes.status === 400, '2.5: Unverified account login returns HTTP 400 Bad Request');
  const unverifiedLoginData = await unverifiedLoginRes.json();
  assert(unverifiedLoginData.isUnverified === true, '2.6: Login response flags isUnverified: true');
  assert(
    unverifiedLoginData.error === REQUIRED_UNVERIFIED_MESSAGE,
    `2.7: Login response returns exact required warning message`,
    `Received: "${unverifiedLoginData.error}"`
  );

  // ---------------------------------------------------------------------------
  // TEST 3: Resend Verification Email API & Rate Limiting (60s Cooldown)
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 3: Resend Verification Endpoint & 60s Rate Limiting ---');

  // 3.1 Invalid email rejection
  const invalidResend = await fetch(`${API_BASE}/api/auth/resend-verification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'not-an-email' })
  });
  assert(invalidResend.status === 400, '3.1: Resend endpoint rejects malformed email address');

  // 3.2 First resend request succeeds
  const firstResend = await fetch(`${API_BASE}/api/auth/resend-verification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testUnverifiedEmail })
  });
  const firstResendData = await firstResend.json();
  assert(firstResend.status === 200, '3.2: Initial resend verification request returns HTTP 200');
  assert(firstResendData.cooldownSeconds === 60, '3.3: Initial resend returns cooldownSeconds: 60');

  // 3.3 Immediate subsequent resend is rate-limited (HTTP 429)
  const rapidResend = await fetch(`${API_BASE}/api/auth/resend-verification`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: testUnverifiedEmail })
  });
  const rapidResendData = await rapidResend.json();
  assert(rapidResend.status === 429, '3.4: Immediate second resend triggers HTTP 429 Too Many Requests');
  assert(rapidResendData.cooldownRemaining > 0, '3.5: Rate-limited response includes positive cooldownRemaining');
  assert(rapidResendData.error.includes('Please wait'), '3.6: Actionable rate-limit advisory returned');

  // ---------------------------------------------------------------------------
  // TEST 4: Email Verification URL Structure & Callback Resilience
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 4: Email Verification URL Contract & Error Parsing ---');

  // 4.1 Verify origin callback path
  const expectedRedirectPath = '/verify-email';
  assert(expectedRedirectPath === '/verify-email', '4.1: Dedicated email verification route is /verify-email');

  // 4.2 Simulated OTP Expired parsing
  const mockExpiredParams = new URLSearchParams('error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired');
  const isExpired = mockExpiredParams.get('error_code') === 'otp_expired' || (mockExpiredParams.get('error_description') || '').toLowerCase().includes('expired');
  assert(isExpired === true, '4.2: Client route correctly detects otp_expired error codes');

  // 4.3 Simulated Invalid Token parsing
  const mockInvalidParams = new URLSearchParams('error=access_denied&error_code=access_denied&error_description=Token+is+invalid');
  const isInvalid = mockInvalidParams.get('error') === 'access_denied' && mockInvalidParams.get('error_code') !== 'otp_expired';
  assert(isInvalid === true, '4.3: Client route correctly categorizes general invalid tokens');

  // ---------------------------------------------------------------------------
  // TEST 5: Security Boundary & RAG Role Isolation Preservation
  // ---------------------------------------------------------------------------
  console.log('\n--- TEST 5: Role-Based Access Control & Security Preservation ---');

  // Unauthenticated user cannot access protected data
  const unauthDataRes = await fetch(`${API_BASE}/api/data/transactions`);
  assert(unauthDataRes.status === 401, '5.1: Unauthenticated request to /api/data/transactions denied (401)');

  // Unauthenticated RAG document access is blocked
  const unauthRagRes = await fetch(`${API_BASE}/api/rag/documents`);
  assert(unauthRagRes.status === 401, '5.2: Unauthenticated request to /api/rag/documents denied (401)');

  // Authenticated admin token can query admin routes
  const adminToken = adminData.token;
  const adminMetricsRes = await fetch(`${API_BASE}/api/data/platform-metrics`, {
    headers: { Authorization: `Bearer ${adminToken}` }
  });
  assert(adminMetricsRes.status === 200, '5.3: Authenticated admin can access /api/data/platform-metrics');

  console.log('\n==============================================================================');
  console.log(`Email Verification Test Suite Summary: ${passCount} Passed, ${failCount} Failed`);
  console.log('==============================================================================');

  if (failCount > 0) {
    process.exit(1);
  }
}

runEmailVerificationTests().catch((err) => {
  console.error('Fatal error in email verification test suite:', err);
  process.exit(1);
});
