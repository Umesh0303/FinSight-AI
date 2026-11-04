-- ==============================================================================
-- FinSight AI: Hardening match_rag_chunks RPC Execution Privileges
-- Target Supabase Project: ncfzjltffljconwihvpk
-- Migration Reference: 20261102_harden_match_rag_chunks_rpc.sql
--
-- SECURITY ADVISORY RESOLUTION:
-- HIGH-Severity Direct PostgREST RPC Execution Vulnerability.
--
-- VULNERABILITY ROOT CAUSE:
-- In 20261026_rag_vector_foundation.sql, EXECUTE was granted to authenticated and
-- service_role, while PostgreSQL default PUBLIC execute permission was retained.
-- This allowed anonymous (anon) and authenticated customer clients to call
-- /rest/v1/rpc/match_rag_chunks directly over PostgREST and pass caller_role='admin'.
--
-- REMEDIATION:
-- 1. Revoke EXECUTE on public.match_rag_chunks from PUBLIC, anon, and authenticated.
-- 2. Grant EXECUTE on public.match_rag_chunks strictly to service_role.
-- 3. PostgREST immediately excludes match_rag_chunks from the API schema cache
--    for anon and authenticated roles (returning PGRST202 / 403 Forbidden).
-- 4. Server-side retrieval (which exclusively authenticates via SUPABASE_SERVICE_ROLE_KEY)
--    retains full functionality without code modification.
-- ==============================================================================

BEGIN;

-- 1. Revoke all execution privileges from PUBLIC (pseudo-role for all users)
REVOKE EXECUTE ON FUNCTION public.match_rag_chunks(extensions.vector(768), double precision, integer, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.match_rag_chunks(extensions.vector(768), double precision, integer, text) FROM PUBLIC;

-- 2. Revoke execute privileges from anonymous clients
REVOKE EXECUTE ON FUNCTION public.match_rag_chunks(extensions.vector(768), double precision, integer, text) FROM anon;
REVOKE ALL ON FUNCTION public.match_rag_chunks(extensions.vector(768), double precision, integer, text) FROM anon;

-- 3. Revoke execute privileges from authenticated clients (preventing direct PostgREST calls by customers/analysts)
REVOKE EXECUTE ON FUNCTION public.match_rag_chunks(extensions.vector(768), double precision, integer, text) FROM authenticated;
REVOKE ALL ON FUNCTION public.match_rag_chunks(extensions.vector(768), double precision, integer, text) FROM authenticated;

-- 4. Grant execute privileges exclusively to service_role (server-side administrative Supabase client)
GRANT EXECUTE ON FUNCTION public.match_rag_chunks(extensions.vector(768), double precision, integer, text) TO service_role;

-- 5. Update function comment to document least-privilege service-role-only contract
COMMENT ON FUNCTION public.match_rag_chunks IS 
'Secure cosine vector similarity search across indexed document chunks with role-based access filtering. Restricted strictly to service_role execution; unprivileged direct PostgREST calls are denied.';

COMMIT;
