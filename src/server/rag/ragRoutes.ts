/**
 * FinSight AI — RAG Document Management & Ingestion Routes
 * Phase 2: Secure RAG Ingestion, Gemini Embeddings & Supabase Persistence
 *
 * Implements endpoints:
 * - GET    /api/rag/documents
 * - POST   /api/rag/documents/upload
 * - POST   /api/rag/documents/:id/reindex
 * - DELETE /api/rag/documents/:id
 */

import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'node:path';
import {
  ingestDocument,
  reindexDocument,
  deleteDocumentCompletely,
  MAX_FILE_SIZE_BYTES,
} from './ingestionPipeline.js';
import {
  listAuthorizedDocuments,
  getDocumentById,
  getChunksForDocument,
  normalizeRagRole,
} from './ragRepository.js';

export const ragRouter = Router();

// Configure memory storage with 10 MB limit
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 1,
  },
});

// Middleware for handling Multer errors cleanly
function handleUploadErrors(err: unknown, req: Request, res: Response, next: NextFunction) {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        error: `File exceeds maximum allowed size of 10 MB`,
        code: 'FILE_TOO_LARGE',
      });
    }
    return res.status(400).json({
      error: `Upload error: ${err.message}`,
      code: 'MULTER_ERROR',
    });
  } else if (err) {
    return res.status(400).json({
      error: err instanceof Error ? err.message : String(err),
      code: 'UPLOAD_ERROR',
    });
  }
  next();
}

/**
 * GET /api/rag/documents
 * Returns authorized document metadata and indexing status.
 * Never exposes raw chunk contents or embeddings.
 */
ragRouter.get('/documents', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const callerRole = normalizeRagRole(user.role);
    const docs = await listAuthorizedDocuments(callerRole, user.id);
    return res.json({
      documents: docs,
      count: docs.length,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to retrieve documents';
    return res.status(500).json({ error: msg });
  }
});

/**
 * GET /api/rag/documents/:id
 * Retrieve single document details and chunk summary for inspection.
 * Never exposes raw embeddings or private storage paths.
 */
ragRouter.get('/documents/:id', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const { id } = req.params;
    const doc = await getDocumentById(id);
    if (!doc) {
      return res.status(404).json({ error: `Document ${id} not found`, code: 'NOT_FOUND' });
    }

    // Role-based visibility check with normalized role
    const callerRole = normalizeRagRole(user.role);
    const isAdmin = callerRole === 'admin';
    const isPrivileged = isAdmin || callerRole === 'business_analyst' || callerRole === 'risk_analyst';

    if (!isPrivileged) {
      if (doc.status !== 'indexed' || !doc.allowed_roles.includes(callerRole)) {
        return res.status(403).json({ error: 'Access Denied: You do not have clearance to view this document.' });
      }
    } else if (!isAdmin) {
      const isAllowed = doc.allowed_roles.includes(callerRole) || (doc.uploaded_by && doc.uploaded_by === user.id);
      if (!isAllowed) {
        return res.status(403).json({ error: 'Access Denied: You do not have clearance to view this document.' });
      }
    }

    const chunks = await getChunksForDocument(id);
    const chunkSummaries = chunks.map(c => ({
      id: c.id,
      chunk_index: c.chunk_index,
      page_number: c.page_number,
      char_count: c.char_count,
      token_estimate: c.token_estimate,
      snippet: c.content ? c.content.slice(0, 160) + (c.content.length > 160 ? '...' : '') : ''
    }));

    return res.json({
      document: doc,
      chunks: chunkSummaries,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to retrieve document details';
    return res.status(500).json({ error: msg });
  }
});

/**
 * POST /api/rag/documents/upload
 * Multi-stage atomic ingestion pipeline.
 * Authorized roles: admin, business_analyst, risk_analyst
 */
ragRouter.post(
  '/documents/upload',
  (req: Request, res: Response, next: NextFunction) => {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const callerRole = normalizeRagRole(user.role);
    if (callerRole === 'customer' || callerRole === 'unassigned') {
      return res.status(403).json({
        error: 'Access Denied: Customer accounts do not have permission to upload institutional policy documents.',
      });
    }
    next();
  },
  upload.single('file'),
  handleUploadErrors,
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const file = req.file;

      if (!file) {
        return res.status(400).json({
          error: 'No document file provided. Please attach a PDF, DOCX, TXT, or Markdown file.',
          code: 'MISSING_FILE',
        });
      }

      // Parse metadata from request body
      const { title, category, version, description } = req.body;
      let allowedRoles: string[] | undefined;

      if (req.body.allowedRoles) {
        if (typeof req.body.allowedRoles === 'string') {
          try {
            allowedRoles = JSON.parse(req.body.allowedRoles);
          } catch {
            allowedRoles = req.body.allowedRoles
              .split(',')
              .map((r: string) => r.trim().toLowerCase())
              .filter(Boolean);
          }
        } else if (Array.isArray(req.body.allowedRoles)) {
          allowedRoles = req.body.allowedRoles;
        }
      }

      const result = await ingestDocument(file.buffer, file.originalname, file.mimetype, {
        title,
        category,
        version,
        description,
        allowedRoles,
        uploadedBy: user.id,
      });

      if (result.isDuplicate) {
        return res.status(409).json({
          message: 'Document already exists and is indexed.',
          code: 'DUPLICATE_DOCUMENT',
          document: result.document,
        });
      }

      return res.status(201).json({
        message: 'Document uploaded, parsed, embedded, and indexed successfully.',
        document: result.document,
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Ingestion pipeline failed';
      const isValidationError =
        msg.includes('rejected') ||
        msg.includes('format') ||
        msg.includes('signature') ||
        msg.includes('empty');

      const statusCode = isValidationError ? 400 : 500;
      return res.status(statusCode).json({
        error: msg,
        code: isValidationError ? 'VALIDATION_ERROR' : 'INGESTION_ERROR',
      });
    }
  }
);

/**
 * POST /api/rag/documents/:id/reindex
 * Reprocess an authorized document using its securely retained original file.
 */
ragRouter.post('/documents/:id/reindex', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const callerRole = normalizeRagRole(user.role);
    if (callerRole === 'customer' || callerRole === 'unassigned') {
      return res.status(403).json({
        error: 'Access Denied: Clearance required to re-index institutional policy documents.',
      });
    }

    const { id } = req.params;
    const existing = await getDocumentById(id);
    if (!existing) {
      return res.status(404).json({ error: `Document ${id} not found`, code: 'NOT_FOUND' });
    }

    // Role check: non-admin can only reindex documents they have clearance for
    if (callerRole !== 'admin' && !existing.allowed_roles.includes(callerRole)) {
      return res.status(403).json({
        error: 'Access Denied: You do not have clearance to re-index this document.',
      });
    }

    const updatedDoc = await reindexDocument(id);
    return res.json({
      message: 'Document re-indexed successfully.',
      document: updatedDoc,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Re-indexing failed';
    return res.status(500).json({ error: msg });
  }
});

/**
 * DELETE /api/rag/documents/:id
 * Delete an authorized document, its chunks, and binary storage.
 */
ragRouter.delete('/documents/:id', async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;
    if (!user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    const callerRole = normalizeRagRole(user.role);
    if (callerRole === 'customer' || callerRole === 'unassigned') {
      return res.status(403).json({
        error: 'Access Denied: Clearance required to delete institutional documents.',
      });
    }

    const { id } = req.params;
    const existing = await getDocumentById(id);
    if (!existing) {
      return res.status(404).json({ error: `Document ${id} not found`, code: 'NOT_FOUND' });
    }

    // Role check: non-admin can only delete if uploader or admin
    if (callerRole !== 'admin' && existing.uploaded_by && existing.uploaded_by !== user.id) {
      return res.status(403).json({
        error: 'Access Denied: Only platform administrators or the original document uploader can delete this policy.',
      });
    }

    const deleted = await deleteDocumentCompletely(id);
    if (!deleted) {
      return res.status(404).json({ error: 'Document could not be deleted or not found' });
    }

    return res.json({
      message: 'Document and associated vector chunks deleted successfully.',
      id,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Deletion failed';
    return res.status(500).json({ error: msg });
  }
});
