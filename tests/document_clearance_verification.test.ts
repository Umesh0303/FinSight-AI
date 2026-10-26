/**
 * FinSight AI — RAG Document Clearance & Role-Based Listing Verification Suite
 *
 * Verifies:
 * 1. AT-06 exists in Supabase with status = 'indexed' and allowed_roles = ["risk_analyst"].
 * 2. Risk & Fraud Specialist (risk@finsight.ai) sees AT-06 with risk_analyst clearance badge.
 * 3. Business Analyst (analyst@finsight.ai) does NOT see AT-06.
 * 4. Customer (customer@finsight.ai) does NOT see AT-06.
 * 5. Admin (admin@finsight.ai) sees all documents including AT-01 and AT-06.
 * 6. AT-01 retains its four clearance badges (admin, business_analyst, risk_analyst, customer).
 * 7. Count of documents matches array length.
 * 8. Direct GET /api/rag/documents/:id for unauthorized roles returns HTTP 403 Forbidden.
 * 9. Unauthenticated requests to /api/rag/documents are rejected with HTTP 401.
 */

import dotenv from 'dotenv';
dotenv.config();

const API_BASE = 'http://localhost:3000';
const AT01_DOC_ID = '248ed4f5-9c3f-41d2-8220-2e2d56bd4066';
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

async function fetchDocuments(token: string | null) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/api/rag/documents`, {
    method: 'GET',
    headers,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function fetchDocumentDetails(token: string | null, docId: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/api/rag/documents/${encodeURIComponent(docId)}`, {
    method: 'GET',
    headers,
  });
  const data = await res.json().catch(() => ({}));
  return { status: res.status, data };
}

async function runDocumentClearanceTests() {
  console.log('==============================================================================');
  console.log('FinSight AI — RAG Document Clearance & Listing Acceptance Suite');
  console.log('==============================================================================\n');

  // 1. Unauthenticated Request Gate
  console.log('--- TEST 1: Unauthenticated Protection ---');
  const unauthRes = await fetchDocuments(null);
  assert(unauthRes.status === 401, '1.1: Unauthenticated /api/rag/documents request returns 401');

  // 2. Admin Document Visibility
  console.log('\n--- TEST 2: Platform Administrator Document Visibility ---');
  const adminSession = await loginUser('admin@finsight.ai');
  assert(adminSession.user.role === 'admin', '2.1: Admin session authenticated');

  const adminList = await fetchDocuments(adminSession.token);
  assert(adminList.status === 200, '2.2: Admin documents API returns 200 OK');
  assert(Array.isArray(adminList.data.documents), '2.3: Documents returned as array');
  assert(adminList.data.count === adminList.data.documents.length, '2.4: Reported count matches documents length');

  const adminDocs = adminList.data.documents;
  const adminHasAt01 = adminDocs.find((d: any) => d.id === AT01_DOC_ID);
  const adminHasAt06 = adminDocs.find((d: any) => d.id === AT06_DOC_ID);

  assert(Boolean(adminHasAt01), '2.5: Admin sees AT-01 document');
  assert(Boolean(adminHasAt06), '2.6: Admin sees AT-06 document');

  // Verify AT-06 metadata in Supabase
  assert(adminHasAt06?.status === 'indexed', '2.7: AT-06 document has status = "indexed"');
  assert(
    Array.isArray(adminHasAt06?.allowed_roles) &&
      adminHasAt06.allowed_roles.length === 1 &&
      adminHasAt06.allowed_roles[0] === 'risk_analyst',
    '2.8: AT-06 document has allowed_roles = ["risk_analyst"]'
  );

  // Verify AT-01 metadata and 4 clearance badges
  assert(
    Array.isArray(adminHasAt01?.allowed_roles) &&
      adminHasAt01.allowed_roles.length === 4 &&
      ['admin', 'business_analyst', 'risk_analyst', 'customer'].every((r) =>
        adminHasAt01.allowed_roles.includes(r)
      ),
    '2.9: AT-01 document has all 4 clearance roles configured'
  );

  // 3. Risk & Fraud Specialist Visibility (risk@finsight.ai)
  console.log('\n--- TEST 3: Risk & Fraud Specialist Visibility ---');
  const riskSession = await loginUser('risk@finsight.ai');
  assert(riskSession.user.role === 'risk_analyst', '3.1: Risk Analyst session authenticated');

  const riskList = await fetchDocuments(riskSession.token);
  assert(riskList.status === 200, '3.2: Risk documents API returns 200 OK');
  assert(riskList.data.count === riskList.data.documents.length, '3.3: Risk count matches document array length');

  const riskDocs = riskList.data.documents;
  const riskHasAt06 = riskDocs.find((d: any) => d.id === AT06_DOC_ID);
  const riskHasAt01 = riskDocs.find((d: any) => d.id === AT01_DOC_ID);

  assert(Boolean(riskHasAt06), '3.4: Risk Analyst CAN see AT-06 document');
  assert(
    Array.isArray(riskHasAt06?.allowed_roles) &&
      riskHasAt06.allowed_roles.length === 1 &&
      riskHasAt06.allowed_roles[0] === 'risk_analyst',
    '3.5: AT-06 appears with ONLY the risk_analyst clearance badge'
  );
  assert(Boolean(riskHasAt01), '3.6: Risk Analyst CAN see universal AT-01 document');

  // Verify Risk Analyst can inspect AT-06
  const riskInspectAt06 = await fetchDocumentDetails(riskSession.token, AT06_DOC_ID);
  assert(riskInspectAt06.status === 200, '3.7: Risk Analyst can inspect AT-06 policy details');
  assert(riskInspectAt06.data.document.id === AT06_DOC_ID, '3.8: Inspection details match AT-06');

  // 4. Business Analyst Isolation (analyst@finsight.ai)
  console.log('\n--- TEST 4: Business Analyst Role Isolation ---');
  const analystSession = await loginUser('analyst@finsight.ai');
  assert(analystSession.user.role === 'business_analyst', '4.1: Business Analyst session authenticated');

  const analystList = await fetchDocuments(analystSession.token);
  assert(analystList.status === 200, '4.2: Business Analyst documents API returns 200 OK');
  assert(analystList.data.count === analystList.data.documents.length, '4.3: Analyst count matches documents length');

  const analystDocs = analystList.data.documents;
  const analystHasAt06 = analystDocs.find((d: any) => d.id === AT06_DOC_ID);
  const analystHasAt01 = analystDocs.find((d: any) => d.id === AT01_DOC_ID);

  assert(!analystHasAt06, '4.4: AT-06 is strictly EXCLUDED from Business Analyst documents list');
  assert(Boolean(analystHasAt01), '4.5: Business Analyst CAN see permitted AT-01 document');

  for (const doc of analystDocs) {
    assert(
      doc.allowed_roles.includes('business_analyst'),
      `4.6: Document "${doc.title}" includes "business_analyst" in allowed_roles`
    );
  }

  // Direct inspection of restricted AT-06 should return 403 Forbidden
  const analystInspectAt06 = await fetchDocumentDetails(analystSession.token, AT06_DOC_ID);
  assert(
    analystInspectAt06.status === 403,
    '4.7: Direct inspection of AT-06 by Business Analyst returns HTTP 403 Forbidden'
  );

  // 5. Customer Account Isolation (customer@finsight.ai)
  console.log('\n--- TEST 5: Customer Role Isolation ---');
  const customerSession = await loginUser('customer@finsight.ai');
  assert(customerSession.user.role === 'customer', '5.1: Customer session authenticated');

  const customerList = await fetchDocuments(customerSession.token);
  assert(customerList.status === 200, '5.2: Customer documents API returns 200 OK');
  assert(customerList.data.count === customerList.data.documents.length, '5.3: Customer count matches documents length');

  const customerDocs = customerList.data.documents;
  const customerHasAt06 = customerDocs.find((d: any) => d.id === AT06_DOC_ID);
  const customerHasAt01 = customerDocs.find((d: any) => d.id === AT01_DOC_ID);

  assert(!customerHasAt06, '5.4: AT-06 is strictly EXCLUDED from Customer documents list');
  assert(Boolean(customerHasAt01), '5.5: Customer CAN see permitted AT-01 document');

  for (const doc of customerDocs) {
    assert(
      doc.allowed_roles.includes('customer') && doc.status === 'indexed',
      `5.6: Document "${doc.title}" is indexed and includes "customer" in allowed_roles`
    );
  }

  // Direct inspection of restricted AT-06 should return 403 Forbidden
  const customerInspectAt06 = await fetchDocumentDetails(customerSession.token, AT06_DOC_ID);
  assert(
    customerInspectAt06.status === 403,
    '5.7: Direct inspection of AT-06 by Customer returns HTTP 403 Forbidden'
  );

  // Summary
  console.log('\n==============================================================================');
  console.log(`Document Clearance Suite: ${passCount} PASSED, ${failCount} FAILED.`);
  console.log('==============================================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runDocumentClearanceTests().catch((err) => {
  console.error('Test execution failed with unhandled error:', err);
  process.exit(1);
});
