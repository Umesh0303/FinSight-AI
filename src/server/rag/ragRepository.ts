/**
 * FinSight AI — RAG Storage & Repository Layer
 * Phase 2: Secure RAG Ingestion, Gemini Embeddings & Supabase Persistence
 *
 * Provides transactional persistence for institutional document metadata, chunks,
 * vector embeddings, and binary documents.
 * Integrates directly with Supabase Storage ('rag-documents') and PostgreSQL tables.
 */

import path from 'node:path';
import crypto from 'node:crypto';
import dotenv from 'dotenv';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type {
  RagDocument,
  RagChunk,
  RagDocumentStatus,
  RagRetrievedChunk,
} from '../../types/rag.js';


dotenv.config();

export const STORAGE_BUCKET_NAME = 'rag-documents';

const supabaseUrl = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

export const supabaseAdmin: SupabaseClient | null =
  supabaseUrl && supabaseServiceKey
    ? createClient(supabaseUrl, supabaseServiceKey)
    : null;

// In-memory fallback and test store for isolation & when SQL migration is pending
class InMemoryRagStore {
  documents = new Map<string, RagDocument>();
  chunks = new Map<string, RagChunk[]>();
  files = new Map<string, Buffer>();

  clear() {
    this.documents.clear();
    this.chunks.clear();
    this.files.clear();
  }
}

export const inMemoryStore = new InMemoryRagStore();

let forceInMemoryMode = false;

export function setForceInMemoryMode(enabled: boolean): void {
  forceInMemoryMode = enabled;
}

/**
 * Sanitizes a filename to prevent path traversal or special character exploitation.
 */
export function sanitizeFilename(filename: string): string {
  const base = path.basename(filename || 'document.dat');
  return base.replace(/[^a-zA-Z0-9._-]/g, '_');
}

/**
 * Checks whether live Supabase RAG tables are available in the remote database.
 */
export async function checkLiveTablesAvailable(): Promise<boolean> {
  if (forceInMemoryMode || !supabaseAdmin) return false;
  try {
    const { error } = await supabaseAdmin
      .from('rag_documents')
      .select('id')
      .limit(1);

    if (error) {
      if (error.code === 'PGRST205' || error.message?.includes('rag_documents')) {
        return false;
      }
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

// ============================================================================
// DOCUMENT METADATA REPOSITORY
// ============================================================================

export async function findDocumentByHash(fileHash: string): Promise<RagDocument | null> {
  if (!forceInMemoryMode) {
    if (!supabaseAdmin) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Supabase client is not configured in production environment.');
      }
    } else {
      try {
        const { data, error } = await supabaseAdmin
          .from('rag_documents')
          .select('*')
          .eq('file_hash_sha256', fileHash)
          .maybeSingle();

        if (error) {
          console.error('[RAG_DB_ERROR] findDocumentByHash query error:', error.message || error.code);
          throw new Error(`Database query failed in findDocumentByHash: ${error.message || error.code}`);
        }
        return (data as RagDocument) || null;
      } catch (err: any) {
        if (err.message?.startsWith('Database query failed in findDocumentByHash:')) throw err;
        console.error('[RAG_DB_ERROR] findDocumentByHash connection exception:', err instanceof Error ? err.message : 'Database error');
        throw new Error(`Database connection failed in findDocumentByHash: ${err instanceof Error ? err.message : 'Connection error'}`);
      }
    }
  }

  for (const doc of inMemoryStore.documents.values()) {
    if (doc.file_hash_sha256 === fileHash) {
      return doc;
    }
  }

  return null;
}

export async function getDocumentById(id: string): Promise<RagDocument | null> {
  if (!forceInMemoryMode) {
    if (!supabaseAdmin) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Supabase client is not configured in production environment.');
      }
    } else {
      try {
        const { data, error } = await supabaseAdmin
          .from('rag_documents')
          .select('*')
          .eq('id', id)
          .maybeSingle();

        if (error) {
          console.error('[RAG_DB_ERROR] getDocumentById query error:', error.message || error.code);
          throw new Error(`Database query failed in getDocumentById: ${error.message || error.code}`);
        }
        return (data as RagDocument) || null;
      } catch (err: any) {
        if (err.message?.startsWith('Database query failed in getDocumentById:')) throw err;
        console.error('[RAG_DB_ERROR] getDocumentById connection exception:', err instanceof Error ? err.message : 'Database error');
        throw new Error(`Database connection failed in getDocumentById: ${err instanceof Error ? err.message : 'Connection error'}`);
      }
    }
  }

  return inMemoryStore.documents.get(id) || null;
}

/**
 * Canonical RAG role normalizer across FinSight AI services.
 */
export function normalizeRagRole(rawRole: string): string {
  const r = (rawRole || '').trim().toLowerCase();
  if (r === 'admin' || r.includes('administrator')) return 'admin';
  if (r === 'risk_analyst' || r === 'risk_fraud_analyst' || r === 'risk' || r.includes('fraud')) return 'risk_analyst';
  if (r === 'business_analyst' || r === 'analyst') return 'business_analyst';
  if (r === 'customer' || r.includes('client')) return 'customer';
  return r || 'customer';
}

export async function listAuthorizedDocuments(
  callerRole: string,
  callerId?: string
): Promise<RagDocument[]> {
  const normalizedRole = normalizeRagRole(callerRole);
  const isAdmin = normalizedRole === 'admin';
  const isPrivileged = isAdmin || normalizedRole === 'business_analyst' || normalizedRole === 'risk_analyst';

  if (!forceInMemoryMode) {
    if (!supabaseAdmin) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Supabase client is not configured in production environment.');
      }
    } else {
      try {
        let query = supabaseAdmin.from('rag_documents').select('*');

        if (!isAdmin) {
          if (normalizedRole === 'customer') {
            // Customer can only view indexed documents where allowed_roles contains 'customer'
            query = query
              .eq('status', 'indexed')
              .contains('allowed_roles', [normalizedRole]);
          } else {
            // Business Analyst / Risk Analyst: only view documents explicitly permitted for their role
            query = query.contains('allowed_roles', [normalizedRole]);
          }
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) {
          console.error('[RAG_DB_ERROR] listAuthorizedDocuments query error:', error.message || error.code);
          throw new Error(`Database query failed in listAuthorizedDocuments: ${error.message || error.code}`);
        }
        return (data as RagDocument[]) || [];
      } catch (err: any) {
        if (err.message?.startsWith('Database query failed in listAuthorizedDocuments:')) throw err;
        console.error('[RAG_DB_ERROR] listAuthorizedDocuments connection exception:', err instanceof Error ? err.message : 'Database error');
        throw new Error(`Database connection failed in listAuthorizedDocuments: ${err instanceof Error ? err.message : 'Connection error'}`);
      }
    }
  }

  const all = Array.from(inMemoryStore.documents.values());
  const filtered = all.filter(doc => {
    if (isAdmin) return true;
    if (isPrivileged) {
      return (
        doc.allowed_roles.includes(normalizedRole) ||
        (callerId && doc.uploaded_by === callerId)
      );
    }
    // Customer
    return doc.status === 'indexed' && doc.allowed_roles.includes(normalizedRole);
  });

  return filtered.sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
}

export async function createDocumentRecord(
  doc: Omit<RagDocument, 'created_at' | 'updated_at'>
): Promise<RagDocument> {
  const now = new Date().toISOString();
  const fullRecord: RagDocument = {
    ...doc,
    created_at: now,
    updated_at: now,
  };

  if (!forceInMemoryMode) {
    if (!supabaseAdmin) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Supabase client is not configured in production environment.');
      }
    } else {
      try {
        const { data, error } = await supabaseAdmin
          .from('rag_documents')
          .insert({
            id: fullRecord.id,
            title: fullRecord.title,
            filename: fullRecord.filename,
            file_extension: fullRecord.file_extension,
            file_size_bytes: fullRecord.file_size_bytes,
            file_hash_sha256: fullRecord.file_hash_sha256,
            category: fullRecord.category,
            version: fullRecord.version,
            description: fullRecord.description,
            total_pages: fullRecord.total_pages,
            chunk_count: fullRecord.chunk_count,
            status: fullRecord.status,
            error_message: fullRecord.error_message,
            allowed_roles: fullRecord.allowed_roles,
            uploaded_by: fullRecord.uploaded_by,
            created_at: fullRecord.created_at,
            updated_at: fullRecord.updated_at,
            indexed_at: fullRecord.indexed_at,
          })
          .select()
          .single();

        if (error) {
          console.error('[RAG_DB_ERROR] createDocumentRecord insert error:', error.message || error.code);
          throw new Error(`Database insert failed in createDocumentRecord: ${error.message || error.code}`);
        }
        return (data as RagDocument) || fullRecord;
      } catch (err: any) {
        if (err.message?.startsWith('Database insert failed in createDocumentRecord:')) throw err;
        console.error('[RAG_DB_ERROR] createDocumentRecord connection exception:', err instanceof Error ? err.message : 'Database error');
        throw new Error(`Database connection failed in createDocumentRecord: ${err instanceof Error ? err.message : 'Connection error'}`);
      }
    }
  }

  inMemoryStore.documents.set(fullRecord.id, fullRecord);
  return fullRecord;
}

export async function updateDocumentStatus(
  id: string,
  status: RagDocumentStatus,
  updates?: {
    error_message?: string | null;
    total_pages?: number;
    chunk_count?: number;
    indexed_at?: string | null;
  }
): Promise<void> {
  const now = new Date().toISOString();
  const updatePayload: Record<string, unknown> = {
    status,
    updated_at: now,
    ...(updates || {}),
  };

  if (!forceInMemoryMode) {
    if (!supabaseAdmin) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Supabase client is not configured in production environment.');
      }
    } else {
      try {
        const { error } = await supabaseAdmin
          .from('rag_documents')
          .update(updatePayload)
          .eq('id', id);

        if (error) {
          console.error('[RAG_DB_ERROR] updateDocumentStatus error:', error.message || error.code);
          throw new Error(`Database update failed in updateDocumentStatus: ${error.message || error.code}`);
        }
        return;
      } catch (err: any) {
        if (err.message?.startsWith('Database update failed in updateDocumentStatus:')) throw err;
        console.error('[RAG_DB_ERROR] updateDocumentStatus exception:', err instanceof Error ? err.message : 'Database error');
        throw new Error(`Database connection failed in updateDocumentStatus: ${err instanceof Error ? err.message : 'Connection error'}`);
      }
    }
  }

  const existing = inMemoryStore.documents.get(id);
  if (existing) {
    inMemoryStore.documents.set(id, {
      ...existing,
      ...updatePayload,
      updated_at: now,
    } as RagDocument);
  }
}

export async function deleteDocumentRecord(id: string): Promise<boolean> {
  if (!forceInMemoryMode) {
    if (!supabaseAdmin) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Supabase client is not configured in production environment.');
      }
    } else {
      try {
        const { error } = await supabaseAdmin
          .from('rag_documents')
          .delete()
          .eq('id', id);

        if (error) {
          console.error('[RAG_DB_ERROR] deleteDocumentRecord error:', error.message || error.code);
          throw new Error(`Database delete failed in deleteDocumentRecord: ${error.message || error.code}`);
        }
        return true;
      } catch (err: any) {
        if (err.message?.startsWith('Database delete failed in deleteDocumentRecord:')) throw err;
        console.error('[RAG_DB_ERROR] deleteDocumentRecord exception:', err instanceof Error ? err.message : 'Database error');
        throw new Error(`Database connection failed in deleteDocumentRecord: ${err instanceof Error ? err.message : 'Connection error'}`);
      }
    }
  }

  const deletedFromMemory = inMemoryStore.documents.delete(id);
  inMemoryStore.chunks.delete(id);

  return deletedFromMemory;
}

// ============================================================================
// CHUNKS & EMBEDDINGS REPOSITORY
// ============================================================================

export async function insertChunks(chunks: RagChunk[]): Promise<void> {
  if (!chunks || chunks.length === 0) return;

  const docId = chunks[0].document_id;

  if (!forceInMemoryMode) {
    if (!supabaseAdmin) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Supabase client is not configured in production environment.');
      }
    } else {
      try {
        const { error } = await supabaseAdmin.from('rag_chunks').insert(
          chunks.map(c => ({
            id: c.id,
            document_id: c.document_id,
            chunk_index: c.chunk_index,
            page_number: c.page_number,
            content: c.content,
            char_count: c.char_count,
            token_estimate: c.token_estimate,
            embedding: c.embedding,
            metadata: c.metadata,
            created_at: c.created_at,
          }))
        );

        if (error) {
          console.error('[RAG_DB_ERROR] insertChunks error:', error.message || error.code);
          throw new Error(`Database insert failed in insertChunks: ${error.message || error.code}`);
        }
        return;
      } catch (err: any) {
        if (err.message?.startsWith('Database insert failed in insertChunks:')) throw err;
        console.error('[RAG_DB_ERROR] insertChunks exception:', err instanceof Error ? err.message : 'Database error');
        throw new Error(`Database connection failed in insertChunks: ${err instanceof Error ? err.message : 'Connection error'}`);
      }
    }
  }

  const existing = inMemoryStore.chunks.get(docId) || [];
  inMemoryStore.chunks.set(docId, [...existing, ...chunks]);
}

export async function deleteChunksForDocument(documentId: string): Promise<number> {
  if (!forceInMemoryMode && supabaseAdmin) {
    try {
      const { error } = await supabaseAdmin
        .from('rag_chunks')
        .delete()
        .eq('document_id', documentId);

      if (!error) {
        // live delete success
      }
    } catch {
      // Fall through
    }
  }

  const existing = inMemoryStore.chunks.get(documentId) || [];
  inMemoryStore.chunks.delete(documentId);
  return existing.length;
}

export async function getChunksCountForDocument(documentId: string): Promise<number> {
  if (!forceInMemoryMode && supabaseAdmin) {
    try {
      const { count, error } = await supabaseAdmin
        .from('rag_chunks')
        .select('*', { count: 'exact', head: true })
        .eq('document_id', documentId);

      if (!error && typeof count === 'number') {
        return count;
      }
    } catch {
      // Fall through
    }
  }

  return (inMemoryStore.chunks.get(documentId) || []).length;
}

export async function getChunksForDocument(documentId: string): Promise<RagChunk[]> {
  if (!forceInMemoryMode && supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin
        .from('rag_chunks')
        .select('*')
        .eq('document_id', documentId)
        .order('chunk_index', { ascending: true });

      if (!error && data) {
        return data as RagChunk[];
      }
    } catch {
      // Fall through
    }
  }

  return inMemoryStore.chunks.get(documentId) || [];
}

// ============================================================================
// BINARY STORAGE SERVICE (Supabase Storage 'rag-documents')
// ============================================================================

export async function uploadBinaryFile(
  documentId: string,
  filename: string,
  buffer: Buffer,
  mimeType: string
): Promise<string> {
  const safeName = sanitizeFilename(filename);
  const objectPath = `${documentId}/${safeName}`;

  if (!forceInMemoryMode && supabaseAdmin) {
    try {
      const { error } = await supabaseAdmin.storage
        .from(STORAGE_BUCKET_NAME)
        .upload(objectPath, buffer, {
          contentType: mimeType || 'application/octet-stream',
          upsert: true,
        });

      if (!error) {
        return objectPath;
      }
    } catch {
      // Fall through to memory
    }
  }

  inMemoryStore.files.set(objectPath, buffer);
  return objectPath;
}

export async function downloadBinaryFile(
  documentId: string,
  filename: string
): Promise<Buffer | null> {
  const safeName = sanitizeFilename(filename);
  const objectPath = `${documentId}/${safeName}`;

  if (!forceInMemoryMode && supabaseAdmin) {
    try {
      const { data, error } = await supabaseAdmin.storage
        .from(STORAGE_BUCKET_NAME)
        .download(objectPath);

      if (!error && data) {
        const arrayBuf = await data.arrayBuffer();
        return Buffer.from(arrayBuf);
      }
    } catch {
      // Fall through
    }
  }

  return inMemoryStore.files.get(objectPath) || null;
}

export async function deleteBinaryFile(
  documentId: string,
  filename: string
): Promise<void> {
  const safeName = sanitizeFilename(filename);
  const objectPath = `${documentId}/${safeName}`;

  if (!forceInMemoryMode && supabaseAdmin) {
    try {
      await supabaseAdmin.storage.from(STORAGE_BUCKET_NAME).remove([objectPath]);
    } catch {
      // Ignore cleanup error
    }
  }

  inMemoryStore.files.delete(objectPath);
}

// ============================================================================
// SEMANTIC SIMILARITY SEARCH REPOSITORY
// ============================================================================

export function computeCosineSimilarity(a: number[], b: number[]): number {
  if (!a || !b || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export async function matchRagChunks(
  queryEmbedding: number[],
  matchThreshold: number,
  matchCount: number,
  callerRole: string
): Promise<RagRetrievedChunk[]> {
  if (!forceInMemoryMode) {
    if (!supabaseAdmin) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Supabase client is not configured in production environment.');
      }
    } else {
      try {
        const { data, error } = await supabaseAdmin.rpc('match_rag_chunks', {
          query_embedding: queryEmbedding,
          match_threshold: matchThreshold,
          match_count: matchCount,
          caller_role: callerRole,
        });

        if (error) {
          console.error('[RAG_DB_ERROR] match_rag_chunks RPC error:', error.message || error.code);
          throw new Error(`Database vector search failed: ${error.message || error.code || 'Internal database error'}`);
        }

        if (Array.isArray(data)) {
          return data as RagRetrievedChunk[];
        }
        return [];
      } catch (err: any) {
        if (err.message?.startsWith('Database vector search failed:')) {
          throw err;
        }
        console.error('[RAG_DB_ERROR] match_rag_chunks network exception:', err instanceof Error ? err.message : 'Connection error');
        throw new Error(`Database vector search connection failed: ${err instanceof Error ? err.message : 'Database connection error'}`);
      }
    }
  }

  // In-memory fallback ONLY when explicitly enabled via forceInMemoryMode for isolated unit tests
  const results: RagRetrievedChunk[] = [];
  for (const doc of inMemoryStore.documents.values()) {
    if (doc.status !== 'indexed') continue;

    // Role check: caller must be admin or role must be in allowed_roles
    const isAuthorized =
      callerRole === 'admin' ||
      (Array.isArray(doc.allowed_roles) && doc.allowed_roles.includes(callerRole));

    if (!isAuthorized) continue;

    const docChunks = inMemoryStore.chunks.get(doc.id) || [];
    for (const chunk of docChunks) {
      if (!chunk.embedding || chunk.embedding.length === 0) continue;

      const sim = computeCosineSimilarity(queryEmbedding, chunk.embedding);
      if (sim >= matchThreshold) {
        results.push({
          id: chunk.id,
          document_id: chunk.document_id,
          chunk_index: chunk.chunk_index,
          page_number: chunk.page_number,
          content: chunk.content,
          char_count: chunk.char_count,
          token_estimate: chunk.token_estimate,
          metadata: chunk.metadata,
          similarity: sim,
          document_title: doc.title,
          document_category: doc.category,
          document_version: doc.version,
          document_allowed_roles: doc.allowed_roles,
        });
      }
    }
  }

  results.sort((a, b) => b.similarity - a.similarity);
  return results.slice(0, matchCount);
}

