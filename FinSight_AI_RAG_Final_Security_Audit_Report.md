# FinSight AI — RAG Final Security Audit Report

**Project:** FinSight AI — AI-Powered Financial Customer Insights & Recommendation Platform  
**Target Environment:** Supabase Remote Project `ncfzjltffljconwihvpk` (`https://ncfzjltffljconwihvpk.supabase.co`)  
**Audit Lifecycle:** Phases 5.1 through 5.6  
**Audit Mode:** Read-Only Verification & Lifecycle Documentation  
**Audit Date:** November 2026  
**Final Acceptance Decision:** **ACCEPTED**  

---

## 1. Executive Summary

This final audit report concludes the multi-phase security evaluation and hardening lifecycle for the Retrieval-Augmented Generation (RAG) subsystem of FinSight AI.

Throughout Phases 5.1 to 5.5, the engineering team identified, remediated, verified, and audited the security posture of the platform's vector database, application API endpoints, document-clearance engine, backend secret handling, and cloud storage infrastructure.

### Core Audit Outcomes:
1. **Database RPC Hardening (Phases 5.1–5.3):** Direct execution of the vector similarity function `public.match_rag_chunks` via PostgREST was revoked from `PUBLIC`, `anon`, and `authenticated` roles (`REVOKE EXECUTE`). Execution privileges were restricted exclusively to `service_role`. Empirical tests confirmed that all unprivileged HTTP calls fail with HTTP 401/403 and PostgreSQL error code `42501` (`permission denied for function match_rag_chunks`).
2. **Multi-Tenant Document Clearance (Phases 5.3–5.5):** Tenant and role-based document isolation was verified using standardized test fixtures. Confidential policy AT-06 (`FIN-RAG-AT06-ONLY-RISK-9136`) is accessible solely to authenticated Risk Analysts; Customer and Business Analyst accounts are blocked from receiving citations, inspection details, or confidential answers. Universal policy AT-01 (`FIN-RAG-TEST-4827`) remains accessible according to its multi-role clearance.
3. **Secret Isolation & Zero Client Exposure (Phase 5.4):** Cryptographic verification and bundle AST inspection confirmed that `SUPABASE_SERVICE_ROLE_KEY` and `GEMINI_API_KEY` are isolated to trusted server-side execution. Zero occurrences exist in client bundles, browser storage, or network payloads.
4. **Cloud Storage Privacy (Phase 5.5):** The Supabase Storage bucket `rag-documents` is configured as strictly private (`public: false`) with a 10 MB limit and file MIME type allowlist. Direct downloads via public or authenticated storage URLs fail across all non-service roles with `HTTP 400 NoSuchBucket` / `NoSuchKey`.
5. **Operational Gap Identification (Phase 5.4–5.6):** Persistent database-backed RAG access audit logging is documented as an open enhancement (`LOG-01: GAP`), with runtime console logging currently operational. Transient upstream Gemini free-tier quota exhaustion (`RESOURCE_EXHAUSTED`) is documented separately as an external availability consideration.

---

## 2. Scope & Methodology

### Systems in Scope
- **Database Functions & Catalog:** `public.match_rag_chunks` in Supabase PostgreSQL database `ncfzjltffljconwihvpk`.
- **Database Tables & RLS:** `public.rag_documents`, `public.rag_chunks`.
- **Storage Subsystem:** Supabase Storage bucket `rag-documents` and object hierarchy.
- **Backend Application Layer:** Node.js/Express server (`server.ts`), `src/server/rag/` routing, ingestion, chunking, retrieval, and embedding modules.
- **Frontend Assets:** Client-side React distribution (`dist/assets/`), build configuration (`vite.config.ts`), and Supabase client configuration (`src/lib/supabase.ts`).

### Audit Methodology
- **Empirical Execution:** Controlled HTTP tests using unauthenticated requests, Customer JWTs, Business Analyst JWTs, Risk Analyst JWTs, Administrator JWTs, and backend Service-Role credentials.
- **Static Analysis & Secret Scanning:** Pattern-matching searches for environment variable exposure, API key prefixes, and sensitive method calls across source files and compiled bundles.
- **Catalog Verification:** PostgreSQL system catalog inspection (`information_schema.routine_privileges`) and Supabase Storage administrative metadata queries.
- **Automated Regression Suites:** Execution of isolated test suites targeting authorization, role clearance, document inspection, and end-to-end vector retrieval.

---

## 3. Phase-by-Phase Security History

### Phase 5.1 — Database-Level RPC Authorization Hardening
- **Objective:** Eliminate a HIGH-severity direct PostgREST RPC execution vulnerability where anonymous or low-privilege clients could directly query `match_rag_chunks` and supply arbitrary `caller_role` arguments.
- **Implementation:** Migration `supabase/migrations/20261102_harden_match_rag_chunks_rpc.sql` was drafted and applied.
- **Actions Taken:**
  - `REVOKE EXECUTE ON FUNCTION public.match_rag_chunks(...) FROM PUBLIC;`
  - `REVOKE EXECUTE ON FUNCTION public.match_rag_chunks(...) FROM anon;`
  - `REVOKE EXECUTE ON FUNCTION public.match_rag_chunks(...) FROM authenticated;`
  - `GRANT EXECUTE ON FUNCTION public.match_rag_chunks(...) TO service_role;`
- **Architectural Alignment:** Base migration `supabase/migrations/20261026_rag_vector_foundation.sql` was synchronized to ensure future deployments inherit hardened permissions.

### Phase 5.2 — Live Database Permission Verification
- **Objective:** Verify remote deployment of migration `20261102_harden_match_rag_chunks_rpc.sql` on Supabase project `ncfzjltffljconwihvpk`.
- **Pre-Deployment Findings:** `match_rag_chunks` was callable by `authenticated` and `anon` due to inherited `PUBLIC` execute privileges in PostgreSQL standard defaults.
- **Post-Deployment Verification:**
  - `postgres`: `EXECUTE` (Superuser owner)
  - `service_role`: `EXECUTE` (`service_role_can_execute: true`)
  - `PUBLIC`: Revoked
  - `anon`: Revoked (`anon_can_execute: false`)
  - `authenticated`: Revoked (`authenticated_can_execute: false`)
  - PostgREST schema cache dropped `/rpc/match_rag_chunks` from the anonymous and authenticated OpenAPI surfaces.

### Phase 5.3 — Post-Migration Live Security Acceptance
- **Objective:** Execute live HTTP test requests against the remote PostgREST endpoint across 6 client privilege contexts.
- **Empirical Results:**
  - **Anonymous:** `HTTP 401 Unauthorized` (Code `42501`: `permission denied for function match_rag_chunks`).
  - **Customer JWT:** `HTTP 403 Forbidden` (Code `42501`: `permission denied for function match_rag_chunks`).
  - **Business Analyst JWT:** `HTTP 403 Forbidden` (Code `42501`: `permission denied for function match_rag_chunks`).
  - **Risk Analyst JWT:** `HTTP 403 Forbidden` (Code `42501`: `permission denied for function match_rag_chunks`).
  - **Platform Admin JWT:** `HTTP 403 Forbidden` (Code `42501`: `permission denied for function match_rag_chunks`).
  - **Backend Service-Role:** `HTTP 200 OK` (Executed similarity search scan successfully).
- **Backend Role Isolation:** Tested `/api/chat` RAG pipeline. Verified that client-supplied `{ role: 'risk_analyst' }` payloads from Customer accounts are ignored; the server derives roles strictly from verified server-side session records.

### Phase 5.4 — Production Security Readiness
- **Objective:** Audit secret leakage, endpoint authorization, error sanitization, and regression stability.
- **Findings:**
  - `SUPABASE_SERVICE_ROLE_KEY` and `GEMINI_API_KEY` are completely absent from client bundles (`dist/assets/*.js`) and `src/lib/supabase.ts`.
  - All RAG routes (`/api/rag/documents`, `/api/rag/documents/:id`, `/api/rag/documents/upload`, `/api/rag/documents/:id/reindex`, `DELETE /api/rag/documents/:id`) require authentication.
  - Error sanitization (`sanitizeGeminiError`) strips API key patterns (`AIza...`) and sanitizes database errors.
  - Audit logging limitation identified: runtime stdout logging active, but no persistent database audit table.

### Phase 5.5 — Supabase Storage Security Verification
- **Objective:** Audit live configuration and direct download resistance for the `rag-documents` storage bucket.
- **Findings:**
  - Bucket `rag-documents` is configured with `public: false`, `file_size_limit: 10485760`, and strict MIME restrictions.
  - Direct public URL downloads (`/storage/v1/object/public/...`) fail with `HTTP 400 Bad Request` (`NoSuchBucket`).
  - Direct authenticated URL downloads (`/storage/v1/object/authenticated/...`) fail for Anonymous, Customer, Business Analyst, Risk Analyst, and Admin JWTs with `HTTP 400 Bad Request` (`NoSuchKey`).
  - Backend service-role client successfully performs uploads, downloads, and deletions for document re-indexing.
  - Zero public URL (`getPublicUrl`) or signed URL (`createSignedUrl`) generation exists in application code.

---

## 4. Final Security Architecture & Defense-in-Depth

The FinSight AI RAG subsystem operates under a defense-in-depth architecture where each tier enforces an independent security boundary:

```
[ User Browser / Client Application ]
                 │
                 ▼  1. Bearer Token (Local Session or Supabase JWT)
[ Express Gateway / Middleware (server.ts) ]
  • Enforces valid authenticated session (authenticate)
  • Resolves user identity from secure session store / auth.getUser
                 │
                 ▼  2. Verified Server-Side User Role (req.user.role)
[ Application Authorization Layer (ragRoutes.ts & retrievalService.ts) ]
  • Validates role clearance against document metadata (allowed_roles)
  • Rejects unauthorized document inspection (403 Forbidden)
  • Gates document upload / reindex / delete operations
                 │
                 ▼  3. High-Similarity Query Embedding (Vector 768)
[ Trusted Backend Data Client (supabaseAdmin) ]
  • Authenticates with SUPABASE_SERVICE_ROLE_KEY
  • Exclusively runs in server runtime (never bundled in client)
                 │
                 ▼  4. Protected PostgreSQL RPC Call (caller_role bound to session)
[ PostgreSQL Database Engine (Project ncfzjltffljconwihvpk) ]
  • match_rag_chunks: EXECUTE restricted to service_role
  • Direct PostgREST calls denied (42501 permission denied)
  • Cosine vector similarity calculation (embedding <=> query_embedding)
  • Server-enforced document clearance filter (caller_role = ANY(allowed_roles))
                 │
                 ▼  5. Authorized Document Chunks Only
[ LLM Grounding & Prompt Assembly (server.ts / retrievalService.ts) ]
  • Injects retrieved chunks into untrusted boundary tags
  • Anti-prompt injection directives
  • Grounding requirement: state lack-of-evidence if query unsupported
                 │
                 ▼  6. Grounded Gemini Response + Verified Citations
[ User Receives Filtered, Cited Intelligence ]
```

### Distinction of Security Layers

| Layer | Responsibility | Mechanism | Failure Mode |
| :--- | :--- | :--- | :--- |
| **1. Application Document Clearance** | Enforces document visibility and UI access based on institutional roles (`customer`, `business_analyst`, `risk_analyst`, `admin`). | Evaluated in TypeScript (`retrievalService.ts`, `ragRoutes.ts`) using verified session claims. | Returns HTTP 403 Forbidden or omits document from listings/citations. |
| **2. Database RPC Execution Privileges** | Prevents untrusted actors from executing raw vector queries directly over the PostgREST HTTP gateway. | PostgreSQL catalog privileges (`REVOKE EXECUTE ... FROM PUBLIC, anon, authenticated`). | PostgREST returns HTTP 401/403 with code `42501`. |
| **3. Cloud Storage Access Control** | Prevents direct scraping or downloading of underlying source PDFs, DOCX, and TXT binaries from cloud object storage. | Supabase Storage bucket privacy (`public: false`) and default RLS on `storage.objects`. | Supabase Storage API returns HTTP 400 `NoSuchBucket` or `NoSuchKey`. |
| **4. Administrative Credential Isolation** | Restricts administrative database and storage capabilities to server-side Node.js execution. | Environment variable segregation; `SUPABASE_SERVICE_ROLE_KEY` excluded from client builds. | Bundler omits secret; browser client lacks credentials to call privileged endpoints. |

---

## 5. Consolidated Test Evidence

The following records separate historical test executions conducted during Phases 5.3 and 5.5. In accordance with audit integrity requirements, these distinct test runs are reported individually and not aggregated as a single execution.

### Phase 5.3 Acceptance Execution (Automated Assertions: 282 Passed)
- **Direct RPC Authorization Audit (`tests/rpc_authorization_audit.test.ts`):** 3 passed, 0 failed.
  - Verified service-role execution.
  - Verified anonymous rejection (`42501`).
  - Verified customer rejection (`42501`).
- **AT-06 Role-Isolation Suite (`tests/at06_role_isolation.test.ts`):** 36 passed, 0 failed.
  - Risk Analyst retrieval of AT-06 with 23-day review window.
  - Business Analyst exclusion from AT-06.
  - Customer exclusion from AT-06 with truthful lack-of-evidence response.
  - Customer role-spoofing prevention.
  - Universal retrieval of AT-01 (17-day review interval).
  - Unauthenticated 401 gate.
  - Citation page-number accuracy and threshold validation ($> 0.60$).
- **Document Clearance Suite (`tests/document_clearance_verification.test.ts`):** 32 passed, 0 failed.
  - Multi-role listing visibility and direct inspection clearance gates.
- **RAG Comprehensive Foundation Suite (`tests/rag.test.ts`):** 211 passed, 0 failed.
  - MIME verification, PDF/DOCX parsers, text chunking, 768-dim embeddings, Supabase Storage integration, live RPC invocation.

### Phase 5.5 Storage & Clearance Verification (Relevant Assertions: 35 Passed)
- **Document Clearance Verification (`tests/document_clearance_verification.test.ts`):** 32 passed, 0 failed.
- **RPC Authorization Verification (`tests/rpc_authorization_audit.test.ts`):** 3 passed, 0 failed.
- **Direct Storage Download Matrix (`tests/phase5_5_storage_audit.ts`):** 12 controlled tests across 6 roles; 100% of unprivileged access attempts denied (`NoSuchBucket` / `NoSuchKey`); service-role access verified.
- **Production Asset Compilation (`npm run build`):** Vite production build completed with 0 errors.
- **TypeScript Static Typecheck (`tsc --noEmit`):** Completed with 0 errors.

### External Service Availability Note
During continuous testing in Phase 5.5, downstream Google Gemini API requests encountered upstream Free Tier daily request limit exhaustion (`RESOURCE_EXHAUSTED` / HTTP 503). This represents an external third-party API quota limit, distinct from the internal RAG authorization and storage security architecture, which remained fully verified.

---

## 6. Outstanding Risks & Future Improvements

The following items are documented as open architectural roadmap enhancements:

### A. Persistent Database Audit Logging (`LOG-01: GAP`)
- **Current Limitation:** RAG document retrievals and ingestion events are logged to runtime console stdout (`[CHAT_RAG]`). Access denials return HTTP 403 but are not written to a dedicated database table.
- **Recommended Enhancement:** Implement a dedicated PostgreSQL table `rag_audit_logs` in a future migration:
  - Columns: `id`, `user_id`, `user_email`, `user_role`, `event_type` (`RETRIEVAL_SUCCESS`, `RETRIEVAL_DENIED`, `DOCUMENT_INSPECT_DENIED`, `UPLOAD`, `DELETE`), `document_id`, `query_hash`, `timestamp`, `ip_address`.
  - Privacy Safeguards: Never store raw customer queries, full document contents, embedding floats, or credentials.

### B. LLM Quota & Provider Resilience
- **Current Limitation:** The platform currently relies on Google GenAI free-tier credentials, which are subject to a 20 request/day quota ceiling.
- **Recommended Enhancement:**
  - Transition production deployments to a billed Google Cloud project with higher rate limits.
  - Implement exponential backoff with jitter for transient 429/503 errors.
  - Provide scannable UI banners informing users when AI inference quota is temporarily exhausted.

### C. Continuous Storage Monitoring
- Maintain automated CI/CD checks ensuring `rag-documents` remains private (`public: false`) and that no permissive RLS policies are applied to `storage.objects`.

---

## 7. Final Acceptance Decision

**DECISION: ACCEPTED**

### Justification:
All critical RAG security controls (RPC execution privileges, direct PostgREST access denial, multi-tenant document isolation, secret isolation, and private cloud storage protection) have been empirically verified on the live production environment. The lack of persistent database audit logging is an identified non-blocking operational roadmap item that does not undermine the current cryptographic and access-control perimeter.
