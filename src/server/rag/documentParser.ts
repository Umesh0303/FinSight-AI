/**
 * FinSight AI — Core Document Extraction Engine
 * Phase 1: RAG Database Foundation & Core Extraction Engine
 *
 * Provides robust, format-specific text extraction for PDF, DOCX, TXT, and Markdown files.
 * Preserves page boundaries and outputs structured ParsedDocument representations.
 */

import crypto from 'node:crypto';
import { PDFParse } from 'pdf-parse';
import mammoth from 'mammoth';
import type { ParsedDocument, ParsedPage } from '../../types/rag.js';

/**
 * Dedicated error class for document extraction failures.
 */
export class DocumentParseError extends Error {
  constructor(message: string, public readonly originalError?: unknown) {
    super(message);
    this.name = 'DocumentParseError';
  }
}

/**
 * Computes deterministic SHA-256 hash of a file buffer for deduplication.
 */
export function computeFileHash(buffer: Buffer): string {
  return crypto.createHash('sha256').update(buffer).digest('hex');
}

/**
 * Normalizes text content:
 * - Unifies line endings (\r\n -> \n)
 * - Removes binary null bytes
 * - Strips trailing whitespace on each line
 * - Collapses excessive blank lines (> 2 newlines into 2)
 */
export function normalizeText(text: string): string {
  if (!text) return '';
  return text
    .replace(/\0/g, '')
    .replace(/\r\n|\r/g, '\n')
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Detects file extension from filename or mimeType.
 */
export function detectExtension(filename: string, mimeType?: string): string {
  const cleanName = (filename || '').trim().toLowerCase();
  const lastDotIndex = cleanName.lastIndexOf('.');
  if (lastDotIndex !== -1 && lastDotIndex < cleanName.length - 1) {
    return cleanName.slice(lastDotIndex + 1);
  }

  if (mimeType) {
    const mime = mimeType.toLowerCase();
    if (mime.includes('pdf')) return 'pdf';
    if (mime.includes('wordprocessingml') || mime.includes('docx')) return 'docx';
    if (mime.includes('markdown')) return 'md';
    if (mime.includes('text/plain')) return 'txt';
  }

  return '';
}

/**
 * Parses raw document bytes into a structured ParsedDocument object.
 *
 * @param buffer - Raw document file buffer
 * @param filename - Document filename including extension
 * @param mimeType - Optional MIME type string
 * @returns Promise<ParsedDocument>
 * @throws DocumentParseError on empty input, unsupported format, or corrupt data
 */
export async function parseDocument(
  buffer: Buffer,
  filename: string,
  mimeType?: string
): Promise<ParsedDocument> {
  if (!buffer || buffer.length === 0) {
    throw new DocumentParseError('Document buffer is empty or 0 bytes');
  }

  const extension = detectExtension(filename, mimeType);

  switch (extension) {
    case 'pdf':
      return parsePdfDocument(buffer);

    case 'docx':
      return parseDocxDocument(buffer);

    case 'txt':
    case 'text':
      return parsePlainTextDocument(buffer, 'txt');

    case 'md':
    case 'markdown':
      return parsePlainTextDocument(buffer, 'md');

    default:
      throw new DocumentParseError(
        `Unsupported document format: ${extension ? `.${extension}` : 'unknown'}. FinSight AI RAG supports PDF, DOCX, TXT, and MD files.`
      );
  }
}

/**
 * Extracts page-by-page text from a PDF buffer.
 */
async function parsePdfDocument(buffer: Buffer): Promise<ParsedDocument> {
  let parser: PDFParse | null = null;
  try {
    parser = new PDFParse({ data: buffer });
    const result = await parser.getText();

    const totalPages = Math.max(1, result.total || result.pages.length);
    const pages: ParsedPage[] = [];

    if (result.pages && result.pages.length > 0) {
      for (const p of result.pages) {
        const cleaned = normalizeText(p.text || '');
        pages.push({
          pageNumber: p.num,
          text: cleaned,
          charCount: cleaned.length,
        });
      }
    } else {
      const cleaned = normalizeText(result.text || '');
      pages.push({
        pageNumber: 1,
        text: cleaned,
        charCount: cleaned.length,
      });
    }

    const fullText = pages
      .map(p => p.text)
      .filter(t => t.length > 0)
      .join('\n\n');

    return {
      totalPages,
      pages,
      fullText,
      metadata: {
        fileExtension: 'pdf',
        format: 'PDF',
        pageCount: totalPages,
      },
    };
  } catch (err: unknown) {
    if (err instanceof DocumentParseError) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    throw new DocumentParseError(`Failed to parse PDF: ${msg}`, err);
  } finally {
    if (parser) {
      try {
        await parser.destroy();
      } catch {
        // Silently ignore cleanup warnings
      }
    }
  }
}

/**
 * Extracts raw text from a DOCX buffer using mammoth.
 */
async function parseDocxDocument(buffer: Buffer): Promise<ParsedDocument> {
  try {
    const result = await mammoth.extractRawText({ buffer });
    const rawText = result.value || '';

    // Split on form-feed characters if present to support simulated pages
    const rawSections = rawText.split('\f');
    const pages: ParsedPage[] = [];

    for (let i = 0; i < rawSections.length; i++) {
      const cleaned = normalizeText(rawSections[i]);
      pages.push({
        pageNumber: i + 1,
        text: cleaned,
        charCount: cleaned.length,
      });
    }

    const fullText = pages
      .map(p => p.text)
      .filter(t => t.length > 0)
      .join('\n\n');

    return {
      totalPages: pages.length,
      pages,
      fullText,
      metadata: {
        fileExtension: 'docx',
        format: 'DOCX',
        pageCount: pages.length,
        messagesCount: result.messages?.length || 0,
      },
    };
  } catch (err: unknown) {
    if (err instanceof DocumentParseError) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    throw new DocumentParseError(`Failed to parse DOCX: ${msg}`, err);
  }
}

/**
 * Extracts text from plain text or Markdown files, respecting form-feed pagination.
 */
function parsePlainTextDocument(buffer: Buffer, ext: 'txt' | 'md'): ParsedDocument {
  try {
    const rawText = buffer.toString('utf-8');
    const rawSections = rawText.split('\f');
    const pages: ParsedPage[] = [];

    for (let i = 0; i < rawSections.length; i++) {
      const cleaned = normalizeText(rawSections[i]);
      pages.push({
        pageNumber: i + 1,
        text: cleaned,
        charCount: cleaned.length,
      });
    }

    const fullText = pages
      .map(p => p.text)
      .filter(t => t.length > 0)
      .join('\n\n');

    return {
      totalPages: pages.length,
      pages,
      fullText,
      metadata: {
        fileExtension: ext,
        format: ext === 'md' ? 'Markdown' : 'PlainText',
        pageCount: pages.length,
      },
    };
  } catch (err: unknown) {
    if (err instanceof DocumentParseError) throw err;
    const msg = err instanceof Error ? err.message : String(err);
    throw new DocumentParseError(`Failed to parse ${ext.toUpperCase()}: ${msg}`, err);
  }
}
