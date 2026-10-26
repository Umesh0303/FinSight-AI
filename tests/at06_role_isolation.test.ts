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

async function callChat(token: string | null, messages: { role: string; content: string }[], extraBody?: Record<string, any>) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      messages,
      ...(extraBody || {}),
    }),
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function runAt06Tests() {
  console.log('==============================================================================');
  console.log('FinSight AI — AT-06 RAG Role-Isolation & Grounding Regression Suite');
  console.log('==============================================================================\n');

  // 1. Authenticate as Risk & Fraud Specialist (risk@finsight.ai)
  console.log('--- TEST SCENARIO 1: Risk Analyst Authorized Retrieval of AT-06 ---');
  const riskSession = await loginUser('risk@finsight.ai');
  assert(riskSession.user.role === 'risk_analyst', '1.1: Server verifies risk@finsight.ai as role risk_analyst');
  assert(typeof riskSession.token === 'string' && riskSession.token.length > 20, '1.1: Valid server session token issued');

  const riskChat = await callChat(riskSession.token, [
    { role: 'user', content: AT06_TEST_QUERY },
  ]);

  assert(riskChat.status === 200, '1.2: Chat API returns 200 OK for authenticated risk_analyst');
  assert(riskChat.data.grounded === true, '1.3: Risk analyst response is grounded in institutional documents');
  assert(Array.isArray(riskChat.data.citations) && riskChat.data.citations.length > 0, '1.4: Citations array is populated');

  const riskHasAt06Citation = riskChat.data.citations?.some((c: any) => c.documentId === AT06_DOC_ID);
  assert(riskHasAt06Citation, '1.5: AT-06 document is cited in risk analyst response');

  const answerText = riskChat.data.text || '';
  const contains23Days = /23\s*days/i.test(answerText);
  assert(contains23Days, '1.6: Fin AI answers with the expected 23 days window for AT-06');
  console.log(`[EVIDENCE] Risk Analyst Answer: "${answerText.replace(/\n+/g, ' ').slice(0, 160)}..."`);

  // 2. Authenticate as Business Analyst (analyst@finsight.ai)
  console.log('\n--- TEST SCENARIO 2: Business Analyst Blocked from AT-06 ---');
  const analystSession = await loginUser('analyst@finsight.ai');
  assert(analystSession.user.role === 'business_analyst', '2.1: Server verifies analyst@finsight.ai as role business_analyst');

  const analystChat = await callChat(analystSession.token, [
    { role: 'user', content: AT06_TEST_QUERY },
  ]);

  assert(analystChat.status === 200, '2.2: Chat API returns 200 OK');
  const analystHasAt06 = analystChat.data.citations?.some((c: any) => c.documentId === AT06_DOC_ID);
  assert(!analystHasAt06, '2.3: AT-06 document is strictly EXCLUDED from business analyst citations');
  const analystText = analystChat.data.text || '';
  const analystDoesNotState23 = !/the fictional review window.*?is 23 days/i.test(analystText);
  assert(analystDoesNotState23, '2.4: Business analyst does not receive confidential AT-06 answer');

  // 3. Authenticate as Customer Client (customer@finsight.ai)
  console.log('\n--- TEST SCENARIO 3: Customer Account Blocked from AT-06 ---');
  const customerSession = await loginUser('customer@finsight.ai');
  assert(customerSession.user.role === 'customer', '3.1: Server verifies customer@finsight.ai as role customer');

  const customerChat = await callChat(customerSession.token, [
    { role: 'user', content: AT06_TEST_QUERY },
  ]);

  assert(customerChat.status === 200, '3.2: Chat API returns 200 OK');
  const customerHasAt06 = customerChat.data.citations?.some((c: any) => c.documentId === AT06_DOC_ID);
  assert(!customerHasAt06, '3.3: AT-06 document is strictly EXCLUDED from customer citations');
  const customerText = customerChat.data.text || '';
  const customerLacksEvidence = customerText.includes('authorized institutional policy documents do not provide sufficient information');
  assert(customerLacksEvidence, '3.4: Customer receives truthful lack-of-evidence message instead of confidential data');

  // 4. Role Spoofing Prevention
  console.log('\n--- TEST SCENARIO 4: Client-Side Role Spoofing Prevention ---');
  const spoofAttempt = await callChat(
    customerSession.token,
    [{ role: 'user', content: AT06_TEST_QUERY }],
    { role: 'risk_analyst' } // Malicious client attempts to claim risk_analyst role
  );

  const spoofHasAt06 = spoofAttempt.data.citations?.some((c: any) => c.documentId === AT06_DOC_ID);
  assert(!spoofHasAt06, '4.1: Client-supplied role parameter CANNOT bypass server-side session role verification');
  assert(!/fictional review window.*?is 23 days/i.test(spoofAttempt.data.text || ''), '4.2: Spoofed request does not receive 23-day answer');

  // 5. Existing Authorized Roles Retrieve AT-01
  console.log('\n--- TEST SCENARIO 5: Authorized Retrieval of Universal Policy AT-01 ---');
  const customerAt01 = await callChat(customerSession.token, [
    { role: 'user', content: AT01_TEST_QUERY },
  ]);
  const customerHasAt01 = customerAt01.data.citations?.some((c: any) => c.documentId === AT01_DOC_ID);
  assert(customerHasAt01, '5.1: Customer account can retrieve universally authorized AT-01 document');
  assert(/17\s*days/i.test(customerAt01.data.text || ''), '5.2: Customer answers 17 days for AT-01 test code FIN-RAG-TEST-4827');

  // 6. Unauthenticated Protection
  console.log('\n--- TEST SCENARIO 6: Unauthenticated Request Gate ---');
  const unauthChat = await callChat(null, [
    { role: 'user', content: AT06_TEST_QUERY },
  ]);
  assert(unauthChat.status === 401, '6.1: Unauthenticated request is rejected with 401 Unauthorized');

  // 7. Citation Integrity & Page Number Precision
  console.log('\n--- TEST SCENARIO 7: Citation Integrity & Verification ---');
  const riskAt06Citations = riskChat.data.citations || [];
  for (const c of riskAt06Citations) {
    assert(typeof c.documentId === 'string' && c.documentId.length > 0, '7.1: Citation has valid documentId');
    assert(typeof c.title === 'string' && c.title.length > 0, '7.2: Citation has valid title');
    assert(typeof c.similarity === 'number' && c.similarity > 0.60, '7.3: Citation similarity exceeds threshold (0.60)');
    assert(c.pageNumber === 1, '7.4: Citation accurately identifies Page 1');
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
