/**
 * FinSight AI — RAG Architecture Types & Interfaces
 * Phase 1: Database Foundation & Core Extraction Engine
 */

export type RagDocumentStatus = 'pending' | 'indexing' | 'indexed' | 'failed';

export interface RagDocument {
  id: string;
  title: string;
  filename: string;
  file_extension: string;
  file_size_bytes: number;
  file_hash_sha256: string;
  category: string;
  version: string;
  description?: string | null;
  total_pages: number;
  chunk_count: number;
  status: RagDocumentStatus;
  error_message?: string | null;
  allowed_roles: string[];
  uploaded_by?: string | null;
  created_at: string;
  updated_at: string;
  indexed_at?: string | null;
}

export interface RagChunk {
  id: string;
  document_id: string;
  chunk_index: number;
  page_number: number;
  content: string;
  char_count: number;
  token_estimate: number;
  embedding?: number[] | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ParsedPage {
  pageNumber: number;
  text: string;
  charCount: number;
}

export interface ParsedDocument {
  totalPages: number;
  pages: ParsedPage[];
  fullText: string;
  metadata?: Record<string, unknown>;
}

export interface DocumentChunk {
  chunkIndex: number;
  pageNumber: number;
  content: string;
  charCount: number;
  tokenEstimate: number;
  metadata: Record<string, unknown>;
}

export interface ChunkingOptions {
  /** Target characters per chunk (default: 650, recommended 500-800) */
  targetChunkSize?: number;
  /** Overlap in characters between adjacent chunks (default: 100) */
  chunkOverlap?: number;
  /** Minimum characters to form a valid chunk (default: 50) */
  minChunkSize?: number;
  /** Optional parent document ID to embed in chunk metadata */
  documentId?: string;
  /** Optional custom metadata to merge into every chunk */
  customMetadata?: Record<string, unknown>;
}

export interface RagCitation {
  documentId: string;
  title: string;
  version: string;
  pageNumber: number | null;
  chunkId: string;
  snippet: string;
  similarity: number;
}

export interface RagRetrievedChunk {
  id: string;
  document_id: string;
  chunk_index: number;
  page_number: number;
  content: string;
  char_count: number;
  token_estimate: number;
  metadata: Record<string, unknown>;
  similarity: number;
  document_title: string;
  document_category: string;
  document_version: string;
  document_allowed_roles: string[];
}

export interface RetrievalResult {
  query: string;
  chunks: RagRetrievedChunk[];
  citations: RagCitation[];
  groundingContextText: string;
  hasSufficientEvidence: boolean;
}

export interface RetrievalOptions {
  topK?: number;
  matchThreshold?: number;
  callerRole: string;
}

