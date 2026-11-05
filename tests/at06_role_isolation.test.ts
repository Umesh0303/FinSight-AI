/**
 * FinSight AI — Acceptance Test AT-06 Role-Isolation Verification Suite
 *
 * Verifies:
 * 1. Authenticated risk_analyst retrieves AT-06 (FIN-RAG-AT06-ONLY-RISK-9136) and answers 23 days.
 * 2. Authenticated business_analyst cannot retrieve AT-06 content.
 * 3. Authenticated customer cannot retrieve AT-06 content.
 * 4. Anti-spoofing: Client sending role: 'risk_analyst' while authenticated as customer is blocked from AT-06.
 * 5. All authorized roles can still retrieve AT-01 (FIN-RAG-TEST-4827).
 * 6. Unsupported questions yield clear lack-of-evidence responses without hallucination.
 * 7. Unauthenticated requests are rejected with 401.
 * 8. Citations strictly match retrieved chunks and preserve page numbers.
 */

import dotenv from 'dotenv';
dotenv.config();

const API_BASE = 'http://localhost:3000';

const AT01_DOC_ID = '248ed4f5-9c3f-41d2-8220-2e2d56bd4066';
const AT06_DOC_ID = '5a5abdb9-c88c-4ac0-9e02-ec65223dcb3d';
const AT06_TEST_QUERY = 'What fictional review window is associated with test code FIN-RAG-AT06-ONLY-RISK-9136?';
const AT01_TEST_QUERY = 'What is the review interval for FIN-RAG-TEST-4827?';

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

async function loginUser(email: string, pass = 'FinSight@Demo123'): Promise<{ token: string; user: any }> {
  const res = await fetch(`${API_BASE}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: pass }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(`Login failed for ${email}: ${err.error || res.status}`);
  }
  return res.json();
}

async function callChat(token: string | null, messages: { role: string; content: string }[], extraBody?: Record<string, any>, retries = 2) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        messages,
        ...(extraBody || {}),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if ((res.status === 429 || res.status === 503) && attempt < retries) {
      console.log(`[TEST_RETRY] Chat rate limited (${res.status}), waiting 3s before retry...`);
      await new Promise(r => setTimeout(r, 3000));
      continue;
    }
    return { status: res.status, data };
  }
  return { status: 500, data: { error: 'Exhausted retries' } };
}

async function runAt06Tests() {
  console.log('==============================================================================');
  console.log('FinSight AI — Complete 8-Combination RAG Role-Isolation & Grounding Suite');
  console.log('==============================================================================\n');

  // Authenticate all 4 pre-provisioned role accounts
  console.log('--- PRE-FLIGHT: Authenticating Pre-provisioned Role Accounts ---');
  const adminSession = await loginUser('admin@finsight.ai');
  assert(adminSession.user.role === 'admin', '0.1: Admin account authenticated (admin@finsight.ai)');

  const riskSession = await loginUser('risk@finsight.ai');
  assert(riskSession.user.role === 'risk_analyst', '0.2: Risk Analyst account authenticated (risk@finsight.ai)');

  const analystSession = await loginUser('analyst@finsight.ai');
  assert(analystSession.user.role === 'business_analyst', '0.3: Business Analyst account authenticated (analyst@finsight.ai)');

  const customerSession = await loginUser('customer@finsight.ai');
  assert(customerSession.user.role === 'customer', '0.4: Customer account authenticated (customer@finsight.ai)');

  // =========================================================================
  // COMBINATION 1: Admin -> Universal Document AT-01 (ALLOWED, 17 days)
  // =========================================================================
  console.log('\n--- COMBINATION 1: Admin Access to AT-01 (Universal Policy) ---');
  const adminAt01 = await callChat(adminSession.token, [{ role: 'user', content: AT01_TEST_QUERY }]);
  assert(adminAt01.status === 200, '1.1: Admin Chat API returns 200 OK for AT-01');
  const adminHasAt01 = adminAt01.data.citations?.some((c: any) => c.documentId === AT01_DOC_ID);
  assert(adminHasAt01, '1.2: Admin receives valid AT-01 citation');
  assert(/17\s*days/i.test(adminAt01.data.text || ''), '1.3: Admin correctly answers 17 days for AT-01');

  // =========================================================================
  // COMBINATION 2: Admin -> Restricted Document AT-06 (ALLOWED, 23 days)
  // =========================================================================
  console.log('\n--- COMBINATION 2: Admin Access to AT-06 (Restricted Risk Policy) ---');
  const adminAt06 = await callChat(adminSession.token, [{ role: 'user', content: AT06_TEST_QUERY }]);
  assert(adminAt06.status === 200, '2.1: Admin Chat API returns 200 OK for AT-06');
  const adminHasAt06 = adminAt06.data.citations?.some((c: any) => c.documentId === AT06_DOC_ID);
  assert(adminHasAt06, '2.2: Admin receives valid AT-06 citation');
  assert(/23\s*days/i.test(adminAt06.data.text || ''), '2.3: Admin correctly answers 23 days for AT-06');

  // =========================================================================
  // COMBINATION 3: Risk Analyst -> Universal Document AT-01 (ALLOWED, 17 days)
  // =========================================================================
  console.log('\n--- COMBINATION 3: Risk Analyst Access to AT-01 (Universal Policy) ---');
  const riskAt01 = await callChat(riskSession.token, [{ role: 'user', content: AT01_TEST_QUERY }]);
  assert(riskAt01.status === 200, '3.1: Risk Analyst Chat API returns 200 OK for AT-01');
  const riskHasAt01 = riskAt01.data.citations?.some((c: any) => c.documentId === AT01_DOC_ID);
  assert(riskHasAt01, '3.2: Risk Analyst receives valid AT-01 citation');
  assert(/17\s*days/i.test(riskAt01.data.text || ''), '3.3: Risk Analyst correctly answers 17 days for AT-01');

  // =========================================================================
  // COMBINATION 4: Risk Analyst -> Restricted Document AT-06 (ALLOWED, 23 days)
  // =========================================================================
  console.log('\n--- COMBINATION 4: Risk Analyst Access to AT-06 (Restricted Risk Policy) ---');
  const riskAt06 = await callChat(riskSession.token, [{ role: 'user', content: AT06_TEST_QUERY }]);
  assert(riskAt06.status === 200, '4.1: Risk Analyst Chat API returns 200 OK for AT-06');
  const riskHasAt06 = riskAt06.data.citations?.some((c: any) => c.documentId === AT06_DOC_ID);
  assert(riskHasAt06, '4.2: Risk Analyst receives valid AT-06 citation');
  assert(/23\s*days/i.test(riskAt06.data.text || ''), '4.3: Risk Analyst correctly answers 23 days for AT-06');

  // =========================================================================
  // COMBINATION 5: Business Analyst -> Universal Document AT-01 (ALLOWED, 17 days)
  // =========================================================================
  console.log('\n--- COMBINATION 5: Business Analyst Access to AT-01 (Universal Policy) ---');
  const analystAt01 = await callChat(analystSession.token, [{ role: 'user', content: AT01_TEST_QUERY }]);
  assert(analystAt01.status === 200, '5.1: Business Analyst Chat API returns 200 OK for AT-01');
  const analystHasAt01 = analystAt01.data.citations?.some((c: any) => c.documentId === AT01_DOC_ID);
  assert(analystHasAt01, '5.2: Business Analyst receives valid AT-01 citation');
  assert(/17\s*days/i.test(analystAt01.data.text || ''), '5.3: Business Analyst correctly answers 17 days for AT-01');

  // =========================================================================
  // COMBINATION 6: Business Analyst -> Restricted Document AT-06 (BLOCKED)
  // =========================================================================
  console.log('\n--- COMBINATION 6: Business Analyst Access to AT-06 (BLOCKED) ---');
  const analystAt06 = await callChat(analystSession.token, [{ role: 'user', content: AT06_TEST_QUERY }]);
  assert(analystAt06.status === 200, '6.1: Business Analyst Chat API returns 200 OK');
  const analystHasAt06 = analystAt06.data.citations?.some((c: any) => c.documentId === AT06_DOC_ID);
  assert(!analystHasAt06, '6.2: AT-06 citation strictly EXCLUDED for Business Analyst');
  assert(!/23\s*days/i.test(analystAt06.data.text || ''), '6.3: Business Analyst does not receive 23-day secret answer');
  const analystLacksEvidence = (analystAt06.data.text || '').includes('authorized institutional policy documents do not provide sufficient information');
  assert(analystLacksEvidence, '6.4: Business Analyst receives standardized lack-of-evidence response');

  // =========================================================================
  // COMBINATION 7: Customer -> Universal Document AT-01 (ALLOWED, 17 days)
  // =========================================================================
  console.log('\n--- COMBINATION 7: Customer Access to AT-01 (Universal Policy) ---');
  const customerAt01 = await callChat(customerSession.token, [{ role: 'user', content: AT01_TEST_QUERY }]);
  assert(customerAt01.status === 200, '7.1: Customer Chat API returns 200 OK for AT-01');
  const customerHasAt01 = customerAt01.data.citations?.some((c: any) => c.documentId === AT01_DOC_ID);
  assert(customerHasAt01, '7.2: Customer receives valid AT-01 citation');
  assert(/17\s*days/i.test(customerAt01.data.text || ''), '7.3: Customer correctly answers 17 days for AT-01');

  // =========================================================================
  // COMBINATION 8: Customer -> Restricted Document AT-06 (BLOCKED)
  // =========================================================================
  console.log('\n--- COMBINATION 8: Customer Access to AT-06 (BLOCKED) ---');
  const customerAt06 = await callChat(customerSession.token, [{ role: 'user', content: AT06_TEST_QUERY }]);
  assert(customerAt06.status === 200, '8.1: Customer Chat API returns 200 OK');
  const customerHasAt06 = customerAt06.data.citations?.some((c: any) => c.documentId === AT06_DOC_ID);
  assert(!customerHasAt06, '8.2: AT-06 citation strictly EXCLUDED for Customer');
  assert(!/23\s*days/i.test(customerAt06.data.text || ''), '8.3: Customer does not receive 23-day secret answer');
  const customerLacksEvidence = (customerAt06.data.text || '').includes('authorized institutional policy documents do not provide sufficient information');
  assert(customerLacksEvidence, '8.4: Customer receives standardized lack-of-evidence response');

  // =========================================================================
  // SECURITY GUARDS: Spoofing & Authentication Gate
  // =========================================================================
  console.log('\n--- SECURITY GUARD 1: Client-Side Role Spoofing Prevention ---');
  const spoofAttempt = await callChat(
    customerSession.token,
    [{ role: 'user', content: AT06_TEST_QUERY }],
    { role: 'admin' }
  );
  const spoofHasAt06 = spoofAttempt.data.citations?.some((c: any) => c.documentId === AT06_DOC_ID);
  assert(!spoofHasAt06, '9.1: Role spoofing payload cannot bypass server session role');
  assert(!/23\s*days/i.test(spoofAttempt.data.text || ''), '9.2: Spoofed request does not leak AT-06 answer');

  console.log('\n--- SECURITY GUARD 2: Unauthenticated Request Gate ---');
  const unauthChat = await callChat(null, [{ role: 'user', content: AT06_TEST_QUERY }]);
  assert(unauthChat.status === 401, '10.1: Unauthenticated request is rejected with 401 Unauthorized');

  // =========================================================================
  // CITATION PRECISION VERIFICATION
  // =========================================================================
  console.log('\n--- CITATION PRECISION: Verification of Citations ---');
  const riskAt06Citations = riskAt06.data.citations || [];
  for (const c of riskAt06Citations) {
    assert(typeof c.documentId === 'string' && c.documentId.length > 0, '11.1: Citation has valid documentId');
    assert(typeof c.title === 'string' && c.title.length > 0, '11.2: Citation has valid title');
    assert(typeof c.similarity === 'number' && c.similarity > 0.60, '11.3: Citation similarity exceeds threshold (0.60)');
    assert(c.pageNumber === 1, '11.4: Citation accurately identifies Page 1');
  }

  // Summary
  console.log('\n==============================================================================');
  console.log(`AT-06 Acceptance Test Suite: ${passCount} PASSED, ${failCount} FAILED.`);
  console.log('==============================================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runAt06Tests().catch((err) => {
  console.error('Test execution failed with unhandled error:', err);
  process.exit(1);
});
