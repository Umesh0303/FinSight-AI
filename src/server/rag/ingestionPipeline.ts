/**
 * FinSight AI — Atomic RAG Document Ingestion Pipeline
 * Phase 2: Secure RAG Ingestion, Gemini Embeddings & Supabase Persistence
 *
 * Implements the complete multi-stage ingestion workflow:
 * 1. Validation & MIME/Signature verification (PDF, DOCX, TXT, MD, <= 10MB)
 * 2. SHA-256 deduplication
 * 3. Atomic document registration in 'indexing' status
 * 4. Secure binary upload to private Supabase Storage ('rag-documents')
 * 5. Format-specific parsing & page extraction
 * 6. Semantic chunking with page boundary retention
 * 7. 768-dimensional Gemini vector embedding generation
 * 8. Vector validation & chunk persistence
 * 9. Chunk count verification & promotion to 'indexed'
 * 10. Robust transactional rollback & cleanup on failure
 */

import crypto from 'node:crypto';
import path from 'node:path';
import {
  parseDocument,
  computeFileHash,
  DocumentParseError,
} from './documentParser.js';
import { chunkDocument } from './textChunker.js';
import {
  generateBatchEmbeddings,
  EmbeddingError,
  VECTOR_DIMENSIONS,
  EmbeddingClient,
} from './embeddingService.js';
import {
  findDocumentByHash,
  getDocumentById,
  createDocumentRecord,
  updateDocumentStatus,
  deleteDocumentRecord,
  insertChunks,
  deleteChunksForDocument,
  getChunksCountForDocument,
  uploadBinaryFile,
  downloadBinaryFile,
  deleteBinaryFile,
  sanitizeFilename,
} from './ragRepository.js';
import type {
  RagDocument,
  RagChunk,
  DocumentChunk,
} from '../../types/rag.js';

export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

export interface IngestionOptions {
  title?: string;
  category?: string;
  version?: string;
  description?: string;
  allowedRoles?: string[];
  uploadedBy?: string;
  embeddingClient?: EmbeddingClient;
}

export interface IngestionResult {
  document: RagDocument;
  isDuplicate?: boolean;
}

/**
 * Validates file signature (magic bytes) to prevent MIME spoofing.
 */
export function validateFileSignature(buffer: Buffer, filename: string): { valid: boolean; detectedFormat: string } {
  if (!buffer || buffer.length === 0) {
    return { valid: false, detectedFormat: 'empty' };
  }

  const ext = (path.extname(filename) || '').toLowerCase().replace('.', '');

  // 1. PDF: magic bytes %PDF (0x25 0x50 0x44 0x46)
  if (buffer.length >= 4 && buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) {
    return { valid: ext === 'pdf', detectedFormat: 'pdf' };
  }

  // 2. DOCX: ZIP archive magic bytes PK\x03\x04 (0x50 0x4B 0x03 0x04)
  if (buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b && buffer[2] === 0x03 && buffer[3] === 0x04) {
    return { valid: ext === 'docx', detectedFormat: 'docx' };
  }

  // 3. Plain text / Markdown: check for non-binary UTF-8 content
  // Scan first 1024 bytes: should not contain null bytes or excessive control chars
  const checkLen = Math.min(buffer.length, 1024);
  let isBinary = false;
  for (let i = 0; i < checkLen; i++) {
    const byte = buffer[i];
    if (byte === 0) {
      isBinary = true;
      break;
    }
  }

  if (!isBinary && (ext === 'txt' || ext === 'md' || ext === 'markdown')) {
    return { valid: true, detectedFormat: ext === 'txt' ? 'txt' : 'md' };
  }

  return { valid: false, detectedFormat: ext || 'unknown' };
}

/**
 * Executes full atomic ingestion of a document buffer.
 */
export async function ingestDocument(
  buffer: Buffer,
  rawFilename: string,
  mimeType: string,
  options?: IngestionOptions
): Promise<IngestionResult> {
  // 1. Validation: Size
  if (!buffer || buffer.length === 0) {
    throw new Error('Upload rejected: File buffer is empty or 0 bytes');
  }
  if (buffer.length > MAX_FILE_SIZE_BYTES) {
    throw new Error(`Upload rejected: File size (${(buffer.length / (1024 * 1024)).toFixed(2)} MB) exceeds maximum limit of 10 MB`);
  }

  // 2. Validation: Signature & Format
  const safeFilename = sanitizeFilename(rawFilename);
  const sigCheck = validateFileSignature(buffer, safeFilename);
  if (!sigCheck.valid) {
    throw new Error(
      `Upload rejected: Invalid file format or signature mismatch. FinSight AI RAG strictly accepts PDF, DOCX, TXT, and Markdown files.`
    );
  }

  const ext = (path.extname(safeFilename) || '').toLowerCase().replace('.', '') || sigCheck.detectedFormat;
  const fileHash = computeFileHash(buffer);

  // 3. Duplicate Handling
  const existingDoc = await findDocumentByHash(fileHash);
  if (existingDoc) {
    if (existingDoc.status === 'indexed') {
      return { document: existingDoc, isDuplicate: true };
    }
    // If previous attempt failed, clean up old chunks and retry under existing ID
    await deleteChunksForDocument(existingDoc.id);
  }

  const documentId = existingDoc ? existingDoc.id : crypto.randomUUID();
  const title = options?.title?.trim() || path.basename(safeFilename, path.extname(safeFilename));
  const category = options?.category?.trim() || 'Institutional Policy';
  const version = options?.version?.trim() || '1.0';
  const description = options?.description?.trim() || null;
  const allowedRoles = options?.allowedRoles || ['admin', 'business_analyst', 'risk_analyst', 'customer'];
  const uploadedBy = options?.uploadedBy || null;

  // 4. Register or Update Document in 'indexing' status
  let docRecord: RagDocument;
  if (existingDoc) {
    await updateDocumentStatus(documentId, 'indexing', {
      error_message: null,
      chunk_count: 0,
    });
    docRecord = (await getDocumentById(documentId))!;
  } else {
    docRecord = await createDocumentRecord({
      id: documentId,
      title,
      filename: safeFilename,
      file_extension: ext,
      file_size_bytes: buffer.length,
      file_hash_sha256: fileHash,
      category,
      version,
      description,
      total_pages: 1,
      chunk_count: 0,
      status: 'indexing',
      error_message: null,
      allowed_roles: allowedRoles,
      uploaded_by: uploadedBy,
      indexed_at: null,
    });
  }

  // 5. Secure Binary Storage
  try {
    await uploadBinaryFile(documentId, safeFilename, buffer, mimeType);
  } catch (storageErr) {
    const errorMsg = `Failed to store original document in secure storage: ${storageErr instanceof Error ? storageErr.message : String(storageErr)}`;
    await updateDocumentStatus(documentId, 'failed', { error_message: errorMsg });
    throw new Error(errorMsg);
  }

  // 6. Extraction & Chunking
  let parsedDoc;
  let rawChunks: DocumentChunk[];
  try {
    parsedDoc = await parseDocument(buffer, safeFilename, mimeType);
    rawChunks = chunkDocument(parsedDoc, {
      documentId,
      customMetadata: {
        documentId,
        title,
        category,
        version,
        allowedRoles,
      },
    });

    if (rawChunks.length === 0) {
      throw new Error('Document contained no extractable textual content to index');
    }
  } catch (extractErr) {
    const errorMsg = `Extraction failed: ${extractErr instanceof Error ? extractErr.message : String(extractErr)}`;
    await updateDocumentStatus(documentId, 'failed', { error_message: errorMsg });
    throw new Error(errorMsg);
  }

  // 7. Vector Embedding Generation
  let embeddings: number[][];
  try {
    const chunkTexts = rawChunks.map(c => c.content);
    embeddings = await generateBatchEmbeddings(chunkTexts, 5, options?.embeddingClient);

    if (embeddings.length !== rawChunks.length) {
      throw new Error(`Embedding count mismatch: generated ${embeddings.length} embeddings for ${rawChunks.length} chunks`);
    }
  } catch (embedErr) {
    const errorMsg = `Embedding generation failed: ${embedErr instanceof Error ? embedErr.message : String(embedErr)}`;
    await deleteChunksForDocument(documentId);
    await updateDocumentStatus(documentId, 'failed', { error_message: errorMsg });
    throw new Error(errorMsg);
  }

  // 8. Chunks Persistence
  try {
    const nowIso = new Date().toISOString();
    const ragChunks: RagChunk[] = rawChunks.map((chunk, idx) => ({
      id: crypto.randomUUID(),
      document_id: documentId,
      chunk_index: chunk.chunkIndex,
      page_number: chunk.pageNumber,
      content: chunk.content,
      char_count: chunk.charCount,
      token_estimate: chunk.tokenEstimate,
      embedding: embeddings[idx],
      metadata: chunk.metadata,
      created_at: nowIso,
    }));

    await insertChunks(ragChunks);

    // 9. Verification of Persisted Chunks Count
    const persistedCount = await getChunksCountForDocument(documentId);
    if (persistedCount !== ragChunks.length) {
      throw new Error(
        `Persistence verification failed: expected ${ragChunks.length} chunks, found ${persistedCount} in database`
      );
    }

    // 10. Promotion to 'indexed'
    const indexedAt = new Date().toISOString();
    await updateDocumentStatus(documentId, 'indexed', {
      total_pages: parsedDoc.totalPages,
      chunk_count: ragChunks.length,
      error_message: null,
      indexed_at: indexedAt,
    });

    const finalDoc = (await getDocumentById(documentId))!;
    return { document: finalDoc, isDuplicate: false };
  } catch (persistErr) {
    const errorMsg = `Persistence failed: ${persistErr instanceof Error ? persistErr.message : String(persistErr)}`;
    await deleteChunksForDocument(documentId);
    await updateDocumentStatus(documentId, 'failed', { error_message: errorMsg });
    throw new Error(errorMsg);
  }
}

/**
 * Re-indexes an existing document using its securely retained original file from storage.
 */
export async function reindexDocument(
  documentId: string,
  options?: { embeddingClient?: EmbeddingClient }
): Promise<RagDocument> {
  const existing = await getDocumentById(documentId);
  if (!existing) {
    throw new Error(`Document ${documentId} not found`);
  }

  // Retrieve original binary from storage
  const fileBuffer = await downloadBinaryFile(documentId, existing.filename);
  if (!fileBuffer) {
    const err = `Cannot re-index document: Original file '${existing.filename}' not found in secure storage`;
    await updateDocumentStatus(documentId, 'failed', { error_message: err });
    throw new Error(err);
  }

  // Clear previous chunks and set status to indexing
  await deleteChunksForDocument(documentId);
  await updateDocumentStatus(documentId, 'indexing', { error_message: null });

  // Re-run pipeline
  const result = await ingestDocument(fileBuffer, existing.filename, '', {
    title: existing.title,
    category: existing.category,
    version: existing.version,
    description: existing.description || undefined,
    allowedRoles: existing.allowed_roles,
    uploadedBy: existing.uploaded_by || undefined,
    embeddingClient: options?.embeddingClient,
  });

  return result.document;
}

/**
 * Deletes a document, its dependent chunks, and original binary file.
 */
export async function deleteDocumentCompletely(documentId: string): Promise<boolean> {
  const existing = await getDocumentById(documentId);
  if (!existing) {
    return false;
  }

  // Delete chunks
  await deleteChunksForDocument(documentId);

  // Delete binary file from storage
  await deleteBinaryFile(documentId, existing.filename);

  // Delete document record
  return deleteDocumentRecord(documentId);
}
