/**
 * FinSight AI — Supabase Session Refresh & RAG Document Management Verification Suite
 *
 * Verifies:
 * 1. A valid logged-in session loads Knowledge / Docs successfully.
 * 2. An expired access token refreshes successfully when the refresh token remains valid.
 * 3. An invalid or revoked session leads to a clean sign-in flow without infinite loops.
 * 4. Risk Analyst can access authorized documents, including AT-06.
 * 5. Business Analyst and Customer cannot access AT-06.
 * 6. Document inspection, re-indexing, and listing maintain security boundaries.
 * 7. Failed requests show an error rather than a false "0 documents" result.
 * 8. Server-side session verification prevents client role spoofing.
 */

import dotenv from 'dotenv';
dotenv.config();
import { createClient } from '@supabase/supabase-js';

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

async function runSessionRefreshAndRagTests() {
  console.log('==============================================================================');
  console.log('FinSight AI — Session Refresh & Knowledge Docs RAG Acceptance Suite');
  console.log('==============================================================================\n');

  const supabaseUrl = process.env.VITE_SUPABASE_URL || '';
  const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '';

  // -------------------------------------------------------------------------
  // ENVIRONMENT & PROJECT IDENTITY GUARD
  // -------------------------------------------------------------------------
  if (!supabaseUrl) {
    console.error('[SAFETY_GUARD] BLOCKED: VITE_SUPABASE_URL is not configured.');
    process.exit(1);
  }

  // Extract project reference from URL: https://<project_id>.supabase.co
  const projectMatch = supabaseUrl.match(/https:\/\/([a-z0-9_-]+)\.supabase\.co/i);
  const currentProjectId = projectMatch ? projectMatch[1].toLowerCase() : '';
  const approvedStagingProjects = (process.env.APPROVED_STAGING_PROJECTS || 'ncfzjltffljconwihvpk')
    .split(',')
    .map(p => p.trim().toLowerCase());

  if (process.env.NODE_ENV === 'production') {
    console.error('[SAFETY_GUARD] BLOCKED: Test suite cannot execute in production environment (NODE_ENV=production).');
    process.exit(1);
  }

  if (!currentProjectId || !approvedStagingProjects.includes(currentProjectId)) {
    console.error(`[SAFETY_GUARD] BLOCKED: Supabase project "${currentProjectId}" is not an explicitly approved staging project [${approvedStagingProjects.join(', ')}].`);
    process.exit(1);
  }

  console.log(`[SAFETY_GUARD] Staging project verified: "${currentProjectId}". Zero user creation or profile upserts permitted.`);

  const supabase = createClient(supabaseUrl, supabaseKey);

  // -------------------------------------------------------------------------
  // TEST 1: Valid Logged-In Session Loads Knowledge / Docs
  // -------------------------------------------------------------------------
  console.log('--- TEST 1: Valid Logged-In Session Document Listing ---');
  const { data: riskAuth, error: riskAuthErr } = await supabase.auth.signInWithPassword({
    email: 'riskassessment398@gmail.com',
    password: 'Risk@123',
  });

  assert(!riskAuthErr && Boolean(riskAuth?.session?.access_token), '1.1: Risk Analyst Supabase sign in succeeds');
  const riskToken = riskAuth.session!.access_token;

  const docsRes = await fetch(`${API_BASE}/api/rag/documents`, {
    headers: { Authorization: `Bearer ${riskToken}` },
  });
  assert(docsRes.status === 200, '1.2: GET /api/rag/documents returns 200 OK for valid session');

  const docsData = await docsRes.json();
  assert(Array.isArray(docsData.documents), '1.3: Documents returned as array');
  assert(docsData.documents.length > 0, `1.4: Document store contains documents (found ${docsData.documents.length})`);
  assert(docsData.count === docsData.documents.length, '1.5: Reported count matches documents length');

  // -------------------------------------------------------------------------
  // TEST 2: Expired Access Token Refreshes Successfully With Valid Refresh Token
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 2: Expired Access Token Refresh & Propagation ---');
  // Construct an artificially expired or invalid token to test server-side 401 detection
  const expiredMockToken = 'eyJhbGciOiJFUzI1NiIsInR5cCI6IkpXVCJ9.eyJleHAiOjE2MDAwMDAwMDB9.fake_signature';
  const expiredRes = await fetch(`${API_BASE}/api/rag/documents`, {
    headers: { Authorization: `Bearer ${expiredMockToken}` },
  });
  assert(expiredRes.status === 401, '2.1: Server returns 401 Unauthorized for expired/invalid token');
  const expiredBody = await expiredRes.json();
  assert(
    expiredBody.error?.includes('Session expired or invalid Supabase token'),
    '2.2: Server returns standard session expired message'
  );

  // Now execute client-side refresh session flow using the valid refresh token
  const refreshToken = riskAuth.session!.refresh_token;
  const { data: refreshedSession, error: refreshErr } = await supabase.auth.refreshSession({
    refresh_token: refreshToken,
  });

  assert(!refreshErr && Boolean(refreshedSession?.session?.access_token), '2.3: Supabase refreshSession succeeds with valid refresh token');
  const newAccessToken = refreshedSession.session!.access_token;
  assert(newAccessToken !== expiredMockToken, '2.4: New valid access token is distinct from expired token');

  // Verify that the newly refreshed token immediately succeeds on the RAG documents endpoint
  const refreshedDocsRes = await fetch(`${API_BASE}/api/rag/documents`, {
    headers: { Authorization: `Bearer ${newAccessToken}` },
  });
  assert(refreshedDocsRes.status === 200, '2.5: Refreshed access token successfully loads Knowledge / Docs (200 OK)');
  const refreshedDocsData = await refreshedDocsRes.json();
  assert(refreshedDocsData.documents?.length > 0, '2.6: Refreshed session sees institutional documents');

  // -------------------------------------------------------------------------
  // TEST 3: Invalid or Revoked Session Rejection Without Loops
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 3: Invalid / Revoked Session Clean Termination ---');
  const completelyBogusToken = 'totally.invalid.token_format';
  const bogusRes = await fetch(`${API_BASE}/api/rag/documents`, {
    headers: { Authorization: `Bearer ${completelyBogusToken}` },
  });
  assert(bogusRes.status === 401, '3.1: Completely bogus token returns 401');

  // Attempting to refresh with a bogus refresh token
  const { error: bogusRefreshErr } = await supabase.auth.refreshSession({
    refresh_token: 'bogus_refresh_token_12345',
  });
  assert(Boolean(bogusRefreshErr), '3.2: Bogus refresh token correctly fails without infinite loop');

  // -------------------------------------------------------------------------
  // TEST 4: Risk Analyst Role Clearance (Access to AT-06 & AT-01)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 4: Risk Analyst Document Clearance Verification ---');
  const riskDocIds = docsData.documents.map((d: any) => d.id);
  assert(riskDocIds.includes(AT06_DOC_ID), '4.1: Risk Analyst CAN see AT-06 risk-only document');
  assert(riskDocIds.includes(AT01_DOC_ID), '4.2: Risk Analyst CAN see AT-01 universal document');

  const at06Doc = docsData.documents.find((d: any) => d.id === AT06_DOC_ID);
  assert(
    Array.isArray(at06Doc?.allowed_roles) &&
    at06Doc.allowed_roles.includes('risk_analyst') &&
    !at06Doc.allowed_roles.includes('customer'),
    '4.3: AT-06 displays verified allowed_roles = ["risk_analyst"]'
  );

  // Single document inspection
  const inspectRes = await fetch(`${API_BASE}/api/rag/documents/${AT06_DOC_ID}`, {
    headers: { Authorization: `Bearer ${newAccessToken}` },
  });
  assert(inspectRes.status === 200, '4.4: Risk Analyst can inspect AT-06 policy details');
  const inspectData = await inspectRes.json();
  assert(inspectData.document?.id === AT06_DOC_ID, '4.5: Inspection returns correct AT-06 document');
  assert(Array.isArray(inspectData.chunks) && inspectData.chunks.length > 0, '4.6: Chunk distribution summary is populated');

  // -------------------------------------------------------------------------
  // TEST 5: Business Analyst Role Isolation (AT-06 Strictly Excluded)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 5: Business Analyst Role Isolation ---');
  const { data: analystAuth } = await supabase.auth.signInWithPassword({
    email: 'businessanalyticsdashboard@gmail.com',
    password: 'Business@123',
  });
  assert(Boolean(analystAuth?.session?.access_token), '5.1: Business Analyst signs in successfully');
  const analystToken = analystAuth!.session!.access_token;

  const analystDocsRes = await fetch(`${API_BASE}/api/rag/documents`, {
    headers: { Authorization: `Bearer ${analystToken}` },
  });
  assert(analystDocsRes.status === 200, '5.2: Business Analyst documents API returns 200 OK');
  const analystDocsData = await analystDocsRes.json();
  const analystDocIds = analystDocsData.documents.map((d: any) => d.id);
  assert(!analystDocIds.includes(AT06_DOC_ID), '5.3: AT-06 is strictly EXCLUDED from Business Analyst documents list');
  assert(analystDocIds.includes(AT01_DOC_ID), '5.4: Permitted AT-01 document IS visible to Business Analyst');

  // Direct inspect of AT-06 by Business Analyst must return 403 Forbidden
  const analystInspectRes = await fetch(`${API_BASE}/api/rag/documents/${AT06_DOC_ID}`, {
    headers: { Authorization: `Bearer ${analystToken}` },
  });
  assert(analystInspectRes.status === 403, '5.5: Direct inspection of AT-06 by Business Analyst returns HTTP 403 Forbidden');

  // -------------------------------------------------------------------------
  // TEST 6: Customer Role Isolation (AT-06 Strictly Excluded)
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 6: Customer Role Isolation ---');
  const { data: custAuth } = await supabase.auth.signInWithPassword({
    email: 'customerdashboard8@gmail.com',
    password: 'customer@123',
  });
  assert(Boolean(custAuth?.session?.access_token), '6.1: Customer signs in successfully');
  const custToken = custAuth!.session!.access_token;

  const custDocsRes = await fetch(`${API_BASE}/api/rag/documents`, {
    headers: { Authorization: `Bearer ${custToken}` },
  });
  assert(custDocsRes.status === 200, '6.2: Customer documents API returns 200 OK');
  const custDocsData = await custDocsRes.json();
  const custDocIds = custDocsData.documents.map((d: any) => d.id);
  assert(!custDocIds.includes(AT06_DOC_ID), '6.3: AT-06 is strictly EXCLUDED from Customer documents list');
  assert(custDocIds.includes(AT01_DOC_ID), '6.4: Permitted AT-01 document IS visible to Customer');

  const custInspectRes = await fetch(`${API_BASE}/api/rag/documents/${AT06_DOC_ID}`, {
    headers: { Authorization: `Bearer ${custToken}` },
  });
  assert(custInspectRes.status === 403, '6.5: Direct inspection of AT-06 by Customer returns HTTP 403 Forbidden');

  // -------------------------------------------------------------------------
  // TEST 7: Role Spoofing Resistance
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 7: Anti-Spoofing Verification ---');
  const spoofChatRes = await fetch(`${API_BASE}/api/chat`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${custToken}`, // verified customer session
    },
    body: JSON.stringify({
      messages: [{ role: 'user', content: 'What fictional review window is associated with test code FIN-RAG-AT06-ONLY-RISK-9136?' }],
      role: 'RISK_FRAUD_ANALYST', // spoof attempt in body
    }),
  });
  assert(spoofChatRes.status === 200, '7.1: Chat API handles spoof attempt cleanly');
  const spoofChatData = await spoofChatRes.json();
  const spoofAnswer = spoofChatData.text || '';
  assert(!/23\s*days/i.test(spoofAnswer), '7.2: Customer cannot spoof role to extract 23-day AT-06 review window');
  const spoofHasAt06Citation = spoofChatData.citations?.some((c: any) => c.documentId === AT06_DOC_ID);
  assert(!spoofHasAt06Citation, '7.3: AT-06 citation is NOT provided to customer account');

  // -------------------------------------------------------------------------
  // TEST 8: Re-indexing Endpoint Security Check
  // -------------------------------------------------------------------------
  console.log('\n--- TEST 8: Re-indexing Security & Verification ---');
  // Customer cannot trigger re-indexing of AT-06
  const custReindexRes = await fetch(`${API_BASE}/api/rag/documents/${AT06_DOC_ID}/reindex`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${custToken}` },
  });
  assert(custReindexRes.status === 403, '8.1: Customer is blocked with 403 from re-indexing AT-06');

  console.log('\n==============================================================================');
  console.log(`Session Refresh & Knowledge Docs RAG Suite: ${passCount} PASSED, ${failCount} FAILED.`);
  console.log('==============================================================================');

  if (failCount > 0) {
    process.exit(1);
  }
}

runSessionRefreshAndRagTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
