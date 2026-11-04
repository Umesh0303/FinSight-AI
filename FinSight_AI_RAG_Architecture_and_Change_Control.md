# FinSight AI — RAG Architecture & Change Control Specification

**Document:** FinSight AI RAG Architecture Baseline & Protected Change Control  
**Audience:** Platform Architects, Security Engineers, and Core Developers  
**Target Environment:** Supabase Remote Project `ncfzjltffljconwihvpk`  
**Classification:** Institutional Engineering Standard  
**Last Updated:** November 2026  

---

## 1. RAG Architecture & Security Flow

The FinSight AI Retrieval-Augmented Generation (RAG) architecture provides semantic grounding over institutional wealth policies, regulatory compliance guidelines, and private portfolio intelligence while enforcing multi-tenant isolation.

### End-to-End Data Flow

```
User (Browser Client)
  │
  ▼ [1] Authenticated Application Session
Express Authentication Middleware (server.ts: authenticate)
  │
  ▼ [2] Server-Derived User Role (req.user.role)
RAG Retrieval Service (retrievalService.ts: retrieveGroundedDocuments)
  │
  ▼ [3] In-Memory Document Clearance Filtering & Query Embedding
Trusted Service-Role Supabase Client (ragRepository.ts: supabaseAdmin)
  │
  ▼ [4] Protected RPC Call (SUPABASE_SERVICE_ROLE_KEY)
PostgreSQL Vector Engine (match_rag_chunks RPC)
  │
  ▼ [5] Authorized Document Chunks Only (Cosine Similarity >= 0.60)
LLM Grounding & Prompt Assembler (server.ts / retrievalService.ts)
  │
  ▼ [6] Grounded Prompt with Untrusted Reference Boundaries
Gemini LLM (ai.models.generateContent)
  │
  ▼ [7] Grounded Answer + Strict Page Citations
User (Browser Client)
```

### Detailed Layer Breakdown & Security Boundaries

1. **User (Browser Client):**
   - Transmits HTTP requests accompanied by an authentication Bearer token stored in browser session storage (`finsight_token`).
   - Has zero access to administrative database secrets, direct vector search endpoints, or raw storage URLs.

2. **Express Authentication Middleware (`server.ts: authenticate`):**
   - **Security Boundary:** Perimeter Authentication Gate.
   - Intercepts all `/api/chat` and `/api/rag/*` requests.
   - Verifies the cryptographic token signature against the authoritative user store or Supabase Auth.
   - Rejects unauthenticated requests with `HTTP 401 Unauthorized`.

3. **Server-Derived User Role:**
   - **Security Boundary:** Anti-Spoofing & Privilege Escalation Barrier.
   - The user's role (`customer`, `business_analyst`, `risk_analyst`, `admin`) is derived solely from the server's verified session context.
   - Client-supplied role attributes in JSON bodies or query parameters are ignored.

4. **RAG Retrieval Service (`src/server/rag/retrievalService.ts`):**
   - **Security Boundary:** Semantic Clearance & Input Validation.
   - Converts the user query into a 768-dimensional float embedding vector via the Gemini Text Embedding model.
   - Binds the verified caller role to the retrieval context and limits results to top-K chunks above the similarity threshold ($\ge 0.60$).

5. **Trusted Service-Role Supabase Client (`src/server/rag/ragRepository.ts`):**
   - **Security Boundary:** Credential Isolation Boundary.
   - Holds `SUPABASE_SERVICE_ROLE_KEY`, which is never exposed to the client.
   - Executes authorized queries against `rag_documents`, `rag_chunks`, and `match_rag_chunks`.

6. **PostgreSQL RPC Function (`public.match_rag_chunks`):**
   - **Security Boundary:** Database-Level Authorization & Row Filtering.
   - Execution privileges are revoked from `PUBLIC`, `anon`, and `authenticated` roles.
   - Direct PostgREST invocation from untrusted callers fails with PostgreSQL error `42501`.
   - Filters candidate chunks: `caller_role = 'admin' OR caller_role = ANY(d.allowed_roles)`.

7. **Authorized Document Chunks & Prompt Framing:**
   - **Security Boundary:** Anti-Prompt Injection & Grounding Directive.
   - Retrieved chunks are wrapped inside strict demarcation boundaries (`<<<BEGIN UNTRUSTED REFERENCE PASSAGES>>>`).
   - The system prompt instructs the model to treat reference passages as factual data, never as override commands.
   - When no authorized passages match the query, the model is directed to state: *"The authorized institutional policy documents do not provide sufficient information on this topic."*

8. **Verified Citations Assembly:**
   - Extracts document IDs, titles, versions, and page numbers directly from retrieved chunks.
   - Prevents hallucinated sources by validating that every citation corresponds to an authorized chunk.

---

## 2. Four Independent Security Layers

FinSight AI employs four orthogonal security layers. A compromise or misconfiguration at any single tier does not breach the system:

```
┌────────────────────────────────────────────────────────────────────────┐
│  Tier 1: Application-Level Document Clearance                         │
│  - Evaluated in TypeScript (ragRoutes.ts, retrievalService.ts)         │
│  - Filters UI document listings and inspection views by session role   │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────┐
│  Tier 2: PostgreSQL RPC Execution Permissions (Database Boundary)     │
│  - match_rag_chunks restricted to service_role                        │
│  - Direct PostgREST calls rejected with 42501 permission denied        │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────┐
│  Tier 3: Supabase Storage Private-Bucket Authorization                 │
│  - rag-documents bucket configured with public: false                  │
│  - RLS active on storage.objects; zero client-facing SELECT policies   │
└──────────────────────────────────┬─────────────────────────────────────┘
                                   │
┌──────────────────────────────────▼─────────────────────────────────────┐
│  Tier 4: Server-Side Service-Role Access (Secret Isolation)           │
│  - SUPABASE_SERVICE_ROLE_KEY isolated strictly to server runtime       │
│  - Zero occurrence in frontend bundles (dist/assets/*.js)              │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Protected RAG Architecture — Change Control Requirements

### Non-Negotiable Protected Components

To ensure production security, future developers and automated workflows **MUST NOT** modify the following components without formal change-control approval:

1. **`match_rag_chunks` Execution Privileges:**
   - Must remain restricted exclusively to `service_role`.
   - Never grant `EXECUTE` on `match_rag_chunks` to `PUBLIC`, `anon`, or `authenticated`.
2. **Server-Side Service-Role Key Isolation:**
   - `SUPABASE_SERVICE_ROLE_KEY` must never be given a `VITE_` prefix or imported into files compiled by Vite into client bundles.
3. **Server-Derived User Role Enforcement:**
   - Caller roles in `/api/chat` and `/api/rag/*` must always be extracted from `req.user.role`. Never trust client-supplied role parameters.
4. **Document Clearance Rules:**
   - Role isolation (e.g. AT-01 universal, AT-06 risk-only) must remain enforced at both application and database levels.
5. **Private Storage Configuration:**
   - The `rag-documents` bucket must remain `public: false`.
   - Never create permissive `SELECT` policies on `storage.objects` for `anon` or `authenticated`.
6. **Zero Public URL Generation:**
   - Do not call `getPublicUrl` or expose raw binary download URLs to end-user clients.
7. **Citation and Anti-Fabrication Safeguards:**
   - Retain the prompt injection boundaries and the lack-of-evidence response contract when queries lack authorized supporting chunks.
8. **Institutional Account Integrity:**
   - Never delete or modify credentials for protected institutional accounts (`customerdashboard8@gmail.com`, `businessanalyticsdashboard@gmail.com`, `riskassessment398@gmail.com`, `admindashboard5@gmail.com`).

---

## 4. Mandatory 5-Step Change Control Protocol

Any proposed modification to the RAG subsystem must follow this strict change control protocol:

```
[ Step 1: Explicit Scope & Justification ]
  • Document business necessity, affected files, and target components.
                  │
                  ▼
[ Step 2: Security Impact Analysis ]
  • Evaluate impact on RLS, RPC permissions, secret isolation, and tenant boundaries.
                  │
                  ▼
[ Step 3: Automated Regression Testing ]
  • Execute:
    - tests/rpc_authorization_audit.test.ts
    - tests/at06_role_isolation.test.ts
    - tests/document_clearance_verification.test.ts
    - tests/rag.test.ts
    - compile_applet & lint_applet
                  │
                  ▼
[ Step 4: Authorization Verification ]
  • Perform empirical multi-role verification across Anonymous, Customer, Analyst, and Admin contexts.
                  │
                  ▼
[ Step 5: Documented Signoff ]
  • Record test evidence in the Security Control Register before deployment to production.
```

---

## 5. Outstanding Risks & Roadmap Improvements

### Roadmap Item 1: Persistent RAG Audit Logging (`LOG-01`)
- **Status:** Documented Gap.
- **Current Mitigation:** Runtime console logging captures all retrieval operations via stdout.
- **Target Architecture:** Add a PostgreSQL table `public.rag_audit_logs` storing user ID, role, document ID, event type, and timestamp, with no raw customer query text or embedding data.

### Roadmap Item 2: Gemini API Quota Management
- **Status:** Operational Dependency.
- **Current Mitigation:** Upstream Google GenAI Free Tier limit (20 requests/day) can trigger transient HTTP 503 / 429 (`RESOURCE_EXHAUSTED`).
- **Target Architecture:** Transition production to a Google Cloud project with standard billing limits and implement exponential backoff with user-facing quota notifications.

### Roadmap Item 3: Storage Configuration Drift Detection
- **Status:** Maintenance Item.
- **Target Architecture:** Add an automated periodic health check verifying that `rag-documents` maintains `public: false` and that `storage.objects` retains zero unprivileged `SELECT` policies.
