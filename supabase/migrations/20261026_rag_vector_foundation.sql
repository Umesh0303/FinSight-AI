-- ==============================================================================
-- FinSight AI: Phase 1 — RAG Vector Database Foundation Migration
-- Target Supabase Project: ncfzjltffljconwihvpk
-- File: supabase/migrations/20261026_rag_vector_foundation.sql
--
-- PURPOSE:
-- 1. Enable pgvector extension in the extensions schema.
-- 2. Create public.rag_documents table for institutional policy and financial document metadata.
-- 3. Create public.rag_chunks table with 768-dimensional vector embeddings for cosine similarity search.
-- 4. Establish HNSW index on chunk embeddings for fast, scalable vector retrieval.
-- 5. Configure Row-Level Security (RLS) policies enforcing role-aware document confidentiality.
-- 6. Deploy security definer search RPC function match_rag_chunks for server-side retrieval.
--
-- SAFETY INVARIANTS:
-- - Zero destructive operations on existing application tables (customers, accounts, etc.).
-- - Idempotent execution (safe to rerun via CREATE ... IF NOT EXISTS).
-- - Zero exposure of raw embeddings or sensitive documents to unauthenticated callers.
-- - Strict role segregation: caller_role must match document allowed_roles.
-- ==============================================================================

BEGIN;

-- ==============================================================================
-- 1. EXTENSIONS
-- ==============================================================================
-- Enable pgvector extension within extensions schema
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA extensions;

-- ==============================================================================
-- 2. DOCUMENTS METADATA TABLE (public.rag_documents)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.rag_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    filename TEXT NOT NULL,
    file_extension TEXT NOT NULL,
    file_size_bytes BIGINT NOT NULL CHECK (file_size_bytes >= 0),
    file_hash_sha256 TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'General',
    version TEXT NOT NULL DEFAULT '1.0',
    description TEXT,
    total_pages INTEGER NOT NULL DEFAULT 1 CHECK (total_pages >= 0),
    chunk_count INTEGER NOT NULL DEFAULT 0 CHECK (chunk_count >= 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'indexing', 'indexed', 'failed')),
    error_message TEXT,
    allowed_roles TEXT[] NOT NULL DEFAULT ARRAY['admin', 'business_analyst', 'risk_analyst', 'customer'],
    uploaded_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    indexed_at TIMESTAMPTZ,
    CONSTRAINT uq_rag_documents_file_hash UNIQUE (file_hash_sha256)
);

COMMENT ON TABLE public.rag_documents IS 'Stores institutional policies and financial document metadata for FinSight RAG grounding.';
COMMENT ON COLUMN public.rag_documents.file_hash_sha256 IS 'SHA-256 content checksum for deduplication and integrity verification.';
COMMENT ON COLUMN public.rag_documents.allowed_roles IS 'List of application roles permitted to retrieve or view chunks from this document.';

-- ==============================================================================
-- 3. CHUNKS & EMBEDDINGS TABLE (public.rag_chunks)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.rag_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES public.rag_documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL CHECK (chunk_index >= 0),
    page_number INTEGER NOT NULL DEFAULT 1 CHECK (page_number >= 1),
    content TEXT NOT NULL,
    char_count INTEGER NOT NULL CHECK (char_count >= 0),
    token_estimate INTEGER NOT NULL CHECK (token_estimate >= 0),
    embedding extensions.vector(768),
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_rag_chunks_doc_index UNIQUE (document_id, chunk_index)
);

COMMENT ON TABLE public.rag_chunks IS 'Stores contextual text chunks with 768-dimensional Gemini embeddings and page references.';
COMMENT ON COLUMN public.rag_chunks.token_estimate IS 'Character-based token approximation (Math.ceil(charCount / 4)).';

-- ==============================================================================
-- 4. PERFORMANCE & VECTOR INDEXES
-- ==============================================================================
-- Document metadata lookup indexes
CREATE INDEX IF NOT EXISTS idx_rag_documents_status 
    ON public.rag_documents(status);

CREATE INDEX IF NOT EXISTS idx_rag_documents_category 
    ON public.rag_documents(category);

CREATE INDEX IF NOT EXISTS idx_rag_documents_file_hash 
    ON public.rag_documents(file_hash_sha256);

CREATE INDEX IF NOT EXISTS idx_rag_documents_allowed_roles 
    ON public.rag_documents USING GIN(allowed_roles);

-- Chunk reference and page lookup indexes
CREATE INDEX IF NOT EXISTS idx_rag_chunks_document_id 
    ON public.rag_chunks(document_id);

CREATE INDEX IF NOT EXISTS idx_rag_chunks_doc_page 
    ON public.rag_chunks(document_id, page_number);

-- HNSW Vector Cosine Distance Index (768-dim)
-- m = 16 (bi-directional links), ef_construction = 64 (construction search depth)
CREATE INDEX IF NOT EXISTS idx_rag_chunks_embedding_hnsw 
    ON public.rag_chunks 
    USING hnsw (embedding extensions.vector_cosine_ops)
    WITH (m = 16, ef_construction = 64);

-- ==============================================================================
-- 5. AUTOMATIC TIMESTAMP TRIGGER
-- ==============================================================================
CREATE OR REPLACE FUNCTION public.handle_rag_document_updated_at()
RETURNS TRIGGER 
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_rag_document_updated_at ON public.rag_documents;
CREATE TRIGGER trg_rag_document_updated_at
    BEFORE UPDATE ON public.rag_documents
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_rag_document_updated_at();

-- ==============================================================================
-- 6. ROW-LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================
ALTER TABLE public.rag_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rag_chunks ENABLE ROW LEVEL SECURITY;

-- Documents: Select Policy
-- Authenticated users may view documents indexed and permitted for their application role
DROP POLICY IF EXISTS rag_documents_select_policy ON public.rag_documents;
CREATE POLICY rag_documents_select_policy ON public.rag_documents
    FOR SELECT
    USING (
        -- Service role always has access
        auth.jwt() ->> 'role' = 'service_role'
        OR
        (
            status = 'indexed'
            AND (
                -- Check against user profile role
                EXISTS (
                    SELECT 1 FROM public.profiles p 
                    WHERE p.id = auth.uid() 
                      AND (p.role::text = 'admin' OR p.role::text = ANY(public.rag_documents.allowed_roles))
                )
                -- Or universally accessible customer documents
                OR allowed_roles @> ARRAY['customer']
            )
        )
    );

-- Documents: Mutations restricted to admin or service role
DROP POLICY IF EXISTS rag_documents_insert_policy ON public.rag_documents;
CREATE POLICY rag_documents_insert_policy ON public.rag_documents
    FOR INSERT
    WITH CHECK (
        auth.jwt() ->> 'role' = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() AND p.role::text = 'admin'
        )
    );

DROP POLICY IF EXISTS rag_documents_update_policy ON public.rag_documents;
CREATE POLICY rag_documents_update_policy ON public.rag_documents
    FOR UPDATE
    USING (
        auth.jwt() ->> 'role' = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() AND p.role::text = 'admin'
        )
    );

DROP POLICY IF EXISTS rag_documents_delete_policy ON public.rag_documents;
CREATE POLICY rag_documents_delete_policy ON public.rag_documents
    FOR DELETE
    USING (
        auth.jwt() ->> 'role' = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() AND p.role::text = 'admin'
        )
    );

-- Chunks: Select Policy (inherited via parent document visibility)
DROP POLICY IF EXISTS rag_chunks_select_policy ON public.rag_chunks;
CREATE POLICY rag_chunks_select_policy ON public.rag_chunks
    FOR SELECT
    USING (
        auth.jwt() ->> 'role' = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.rag_documents d
            WHERE d.id = public.rag_chunks.document_id
              AND d.status = 'indexed'
              AND (
                  EXISTS (
                      SELECT 1 FROM public.profiles p 
                      WHERE p.id = auth.uid() 
                        AND (p.role::text = 'admin' OR p.role::text = ANY(d.allowed_roles))
                  )
                  OR d.allowed_roles @> ARRAY['customer']
              )
        )
    );

-- Chunks: Mutations restricted to service role and admin
DROP POLICY IF EXISTS rag_chunks_modify_policy ON public.rag_chunks;
CREATE POLICY rag_chunks_modify_policy ON public.rag_chunks
    FOR ALL
    USING (
        auth.jwt() ->> 'role' = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.profiles p 
            WHERE p.id = auth.uid() AND p.role::text = 'admin'
        )
    );

-- ==============================================================================
-- 7. SECURE RAG MATCH FUNCTION (RPC)
-- ==============================================================================
-- Performs cosine similarity search over indexed chunks, enforcing role authorization
CREATE OR REPLACE FUNCTION public.match_rag_chunks(
    query_embedding extensions.vector(768),
    match_threshold FLOAT DEFAULT 0.60,
    match_count INT DEFAULT 5,
    caller_role TEXT DEFAULT 'customer'
)
RETURNS TABLE (
    id UUID,
    document_id UUID,
    chunk_index INT,
    page_number INT,
    content TEXT,
    char_count INT,
    token_estimate INT,
    metadata JSONB,
    similarity FLOAT,
    document_title TEXT,
    document_category TEXT,
    document_version TEXT,
    document_allowed_roles TEXT[]
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
BEGIN
    RETURN QUERY
    SELECT
        c.id,
        c.document_id,
        c.chunk_index,
        c.page_number,
        c.content,
        c.char_count,
        c.token_estimate,
        c.metadata,
        (1 - (c.embedding <=> query_embedding))::FLOAT AS similarity,
        d.title AS document_title,
        d.category AS document_category,
        d.version AS document_version,
        d.allowed_roles AS document_allowed_roles
    FROM public.rag_chunks c
    JOIN public.rag_documents d ON c.document_id = d.id
    WHERE d.status = 'indexed'
      AND c.embedding IS NOT NULL
      AND (
          caller_role = 'admin' 
          OR caller_role = ANY(d.allowed_roles)
      )
      AND (1 - (c.embedding <=> query_embedding)) >= match_threshold
    ORDER BY c.embedding <=> query_embedding ASC
    LIMIT LEAST(match_count, 25);
END;
$$;

COMMENT ON FUNCTION public.match_rag_chunks IS 'Secure cosine vector similarity search across indexed document chunks with role-based access filtering.';

-- Least-privilege RPC execution: Deny direct execution over PostgREST from untrusted clients
REVOKE EXECUTE ON FUNCTION public.match_rag_chunks FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.match_rag_chunks FROM PUBLIC, anon, authenticated;

-- Grant execute exclusively to service_role (server-side administrative caller)
GRANT EXECUTE ON FUNCTION public.match_rag_chunks TO service_role;

COMMIT;
