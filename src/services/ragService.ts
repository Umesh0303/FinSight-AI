/**
 * FinSight AI — Client-Side RAG Document Management Service
 * Phase 4: Live RAG Knowledge Base Management
 *
 * Connects the UI to authenticated server-side endpoints for:
 * - Listing authorized documents
 * - Detailed document inspection
 * - Multi-stage document upload
 * - Secure document re-indexing
 * - Complete document deletion
 */

import { RagDocument } from '../types/rag';

export interface ChunkInspectionSummary {
  id: string;
  chunk_index: number;
  page_number: number;
  char_count: number;
  token_estimate: number;
  snippet: string;
}

export interface DocumentInspectionDetails {
  document: RagDocument;
  chunks: ChunkInspectionSummary[];
}

function getAuthHeaders(isJson = true): Record<string, string> {
  const token = typeof window !== 'undefined' ? localStorage.getItem('finsight_token') : null;
  const headers: Record<string, string> = {};
  if (isJson) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export const ragService = {
  /**
   * Fetches all documents authorized for the current user session.
   */
  async listDocuments(): Promise<RagDocument[]> {
    const res = await fetch('/api/rag/documents', {
      headers: getAuthHeaders(true),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || `Failed to fetch documents (${res.status})`);
    }

    const data = await res.json();
    return data.documents || [];
  },

  /**
   * Retrieves single document inspection details, including chunk distribution.
   */
  async getDocumentDetails(id: string): Promise<DocumentInspectionDetails> {
    const res = await fetch(`/api/rag/documents/${encodeURIComponent(id)}`, {
      headers: getAuthHeaders(true),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || `Failed to fetch document details (${res.status})`);
    }

    return res.json();
  },

  /**
   * Uploads a financial institutional document with metadata.
   */
  async uploadDocument(formData: FormData): Promise<{ message: string; document: RagDocument }> {
    const headers = getAuthHeaders(false); // multipart/form-data boundary set by browser

    const res = await fetch('/api/rag/documents/upload', {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data?.error || `Upload failed with status ${res.status}`);
    }

    return data;
  },

  /**
   * Triggers server-side re-indexing for an existing document.
   */
  async reindexDocument(id: string): Promise<{ message: string; document: RagDocument }> {
    const res = await fetch(`/api/rag/documents/${encodeURIComponent(id)}/reindex`, {
      method: 'POST',
      headers: getAuthHeaders(true),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data?.error || `Re-indexing failed (${res.status})`);
    }

    return data;
  },

  /**
   * Deletes an authorized document, associated vector chunks, and binary storage.
   */
  async deleteDocument(id: string): Promise<{ message: string; id: string }> {
    const res = await fetch(`/api/rag/documents/${encodeURIComponent(id)}`, {
      method: 'DELETE',
      headers: getAuthHeaders(true),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data?.error || `Deletion failed (${res.status})`);
    }

    return data;
  },
};
