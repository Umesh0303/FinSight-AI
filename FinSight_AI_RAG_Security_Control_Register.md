# FinSight AI — RAG Security Control Register

**Project:** FinSight AI — Financial Customer Insights & Recommendation Platform  
**Target Environment:** Supabase Remote Project `ncfzjltffljconwihvpk`  
**Audit Lifecycle:** Phases 5.1 through 5.6  
**Last Updated:** November 2026  

---

## 1. Consolidated Security Control Register

| Control ID | Description | Verification Evidence | Final Status |
| :--- | :--- | :--- | :---: |
| **RPC-01** | **RPC execution permissions**<br>Execution of `public.match_rag_chunks` is revoked from `PUBLIC`, `anon`, and `authenticated`, and granted strictly to `service_role`. | Query of `information_schema.routine_privileges` and PostgreSQL catalog confirms only `postgres` (owner) and `service_role` possess `EXECUTE` privileges. Anon and authenticated privileges are `false`. | **PASS** |
| **RPC-02** | **Unauthorized direct RPC denial**<br>Direct PostgREST HTTP calls to `/rest/v1/rpc/match_rag_chunks` are blocked across all unprivileged caller contexts. | HTTP POST calls from Anonymous (`401`), Customer JWT (`403`), Business Analyst JWT (`403`), Risk Analyst JWT (`403`), and Admin JWT (`403`) are denied with PostgreSQL error code `42501`. Service-role calls succeed (`200`). | **PASS** |
| **API-01** | **Authenticated RAG endpoints**<br>All protected RAG routes (`/api/chat`, `/api/rag/documents`, `/api/rag/documents/upload`, `/api/rag/documents/:id/reindex`, `DELETE /api/rag/documents/:id`) require active authenticated sessions. | Route inspection in `server.ts` confirms `app.use('/api/rag', authenticate, ragRouter)`. Unauthenticated HTTP requests return `401 Unauthorized` (`tests/document_clearance_verification.test.ts: Test 1`). | **PASS** |
| **API-02** | **Server-derived user roles**<br>Client-supplied role parameters cannot override verified server-side session role claims. | Anti-spoofing test (`tests/at06_role_isolation.test.ts: Test Scenario 4`): Customer client passing `{ role: 'risk_analyst' }` is evaluated strictly as `customer`, blocking confidential AT-06 retrieval. | **PASS** |
| **RAG-01** | **AT-01 universal clearance**<br>Harmless universal policy document AT-01 (`FIN-RAG-TEST-4827`) is accessible to all authorized application roles according to configured clearance. | Customer and analyst queries successfully retrieve AT-01 with accurate 17-day review interval and valid Page 1 citation references (`tests/at06_role_isolation.test.ts: Test Scenario 5`). | **PASS** |
| **RAG-02** | **AT-06 Risk-only clearance**<br>Confidential policy document AT-06 (`FIN-RAG-AT06-ONLY-RISK-9136`) is restricted strictly to Risk Analysts. | Risk Analyst retrieves 23-day review window. Customer and Business Analyst are strictly excluded from citations and receive truthful lack-of-evidence responses without data disclosure (`tests/at06_role_isolation.test.ts: Scenarios 1–3`). | **PASS** |
| **SEC-01** | **Service-role key isolation**<br>`SUPABASE_SERVICE_ROLE_KEY` exists exclusively in server-side configuration and is never bundled in frontend assets. | Static regex and AST analysis of production bundle `dist/assets/*.js` returned zero occurrences of the key, variable name, or `service_role` string. Excluded from `vite.config.ts` and `src/lib/supabase.ts`. | **PASS** |
| **SEC-02** | **Gemini API key isolation**<br>`GEMINI_API_KEY` exists exclusively in server runtime and is never exposed to browser clients or API responses. | Bundle scan of `dist/assets/*.js` returned zero matches for `GEMINI_API_KEY` or Google key signatures (`AIzaSy...`). `server.ts` proxies all model requests. | **PASS** |
| **ERR-01** | **Error sanitization**<br>API error handlers sanitize database errors, API keys, stack traces, and internal embeddings from client responses. | Code inspection of `sanitizeGeminiError` in `server.ts` confirms automated regex redaction of `AIza...` key patterns and mapping of raw exceptions to high-level error types without stack dumps. | **PASS** |
| **STR-01** | **Private storage bucket**<br>The Supabase Storage bucket `rag-documents` is configured with `public: false` and strict file size / MIME restrictions. | Live API query of bucket configuration confirms `public: false`, `file_size_limit: 10485760` bytes (10 MB), and allowlist restricted to PDF, DOCX, TXT, and Markdown. | **PASS** |
| **STR-02** | **Direct storage access protection**<br>Direct object downloads through public or authenticated storage URLs are blocked for unprivileged callers. | Controlled tests against `/storage/v1/object/public/...` return `400 Bad Request` (`NoSuchBucket`). Authenticated requests from Anonymous, Customer, and Analyst roles return `400 Bad Request` (`NoSuchKey`). | **PASS** |
| **STR-03** | **Backend storage operations**<br>Backend operations (upload, retrieval for re-indexing, deletion) remain operational using server-side service credentials. | `ragRepository.ts` verified using `supabaseAdmin.storage` (`tests/rag.test.ts: Test Groups 6 & 8`). Ingestion, storage, and re-indexing tests succeed with zero client-side storage exposure. | **PASS** |
| **LOG-01** | **Persistent security audit trail**<br>A dedicated database audit log records all RAG document queries, retrievals, and clearance denials for compliance auditing. | Runtime stdout console logging is active (`[CHAT_RAG]`), but no persistent database table (`rag_audit_logs`) currently records individual RAG access events. Documented as an open roadmap gap. | **GAP** |

---

## 2. Detailed Evidence & Verification Summaries

### RPC-01 & RPC-02: PostgreSQL RPC Authorization
- **Target Function:** `public.match_rag_chunks(query_embedding extensions.vector(768), match_threshold float8, match_count int4, caller_role text)`
- **Migration:** `supabase/migrations/20261102_harden_match_rag_chunks_rpc.sql`
- **Catalog State:**
  ```sql
  SELECT grantee, privilege_type 
  FROM information_schema.routine_privileges 
  WHERE routine_name = 'match_rag_chunks';
  -- Result: postgres (EXECUTE), service_role (EXECUTE). PUBLIC, anon, authenticated are absent.
  ```
- **PostgREST Response:**
  - Anonymous: HTTP 401 (`42501 permission denied for function match_rag_chunks`)
  - Authenticated Customer/Analyst/Admin: HTTP 403 (`42501 permission denied for function match_rag_chunks`)

### API-01 & API-02: Endpoint Authentication & Role Derivation
- **Middleware:** `authenticate` middleware in `server.ts` resolves Bearer tokens against the authoritative session store (`authStore`) or Supabase Auth (`getUser`).
- **Role Verification:** `req.user.role` is extracted directly from the verified database profile.
- **Anti-Spoofing Evidence:** Request payloads containing `{ role: 'risk_analyst' }` submitted by customer accounts are ignored by `server.ts`, preventing elevation of privilege.

### RAG-01 & RAG-02: Document Clearance & Isolation
- **Test Fixtures:**
  - AT-01 (`248ed4f5-9c3f-41d2-8220-2e2d56bd4066`): Configured for `["admin", "business_analyst", "risk_analyst", "customer"]`.
  - AT-06 (`5a5abdb9-c88c-4ac0-9e02-ec65223dcb3d`): Configured strictly for `["risk_analyst"]`.
- **Isolation Evidence:**
  - Customer querying AT-06: 0 citations returned; model outputs standard lack-of-evidence statement: *"The authorized institutional policy documents do not provide sufficient information on this topic."*
  - Business Analyst querying AT-06: 0 citations returned; confidential review window not disclosed.
  - Risk Analyst querying AT-06: Returns AT-06 citation, Page 1, confirming the 23-day review window.

### SEC-01 & SEC-02: Secret Isolation
- **Server Environment:** `SUPABASE_SERVICE_ROLE_KEY` and `GEMINI_API_KEY` are defined in `.env`.
- **Client Bundles:** `dist/assets/index-*.js` scanned using case-insensitive regex for `service_role`, `SUPABASE_SERVICE_ROLE_KEY`, `GEMINI_API_KEY`, and `AIzaSy`. Zero occurrences detected.
- **Vite Config:** `vite.config.ts` does not define `define` aliases or expose non-`VITE_` variables to the client.

### STR-01, STR-02, STR-03: Cloud Storage Security
- **Bucket Metadata:**
  - `public: false`
  - `file_size_limit: 10485760`
  - `allowed_mime_types`: PDF, DOCX, TXT, MD
- **RLS Configuration:** Row-Level Security is active on `storage.objects` with zero client-facing `SELECT` policies.
- **Direct Access Matrix:**
  - Public endpoint: `HTTP 400 Bad Request` (`NoSuchBucket`)
  - Authenticated endpoint: `HTTP 400 Bad Request` (`NoSuchKey`)
  - Backend service-role: `HTTP 200 OK` (27,411 bytes for AT-01, 27,658 bytes for AT-06)

### LOG-01: Audit Trail Gap Analysis
- **Current Capability:** Runtime console logging captures queries, user IDs, roles, and chunk retrieval counts via stdout (`[CHAT_RAG]`).
- **Identified Gap:** Access denials and historical retrieval associations are not stored in a persistent relational table. Documented as roadmap enhancement.
