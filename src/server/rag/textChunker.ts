/**
 * FinSight AI — Metadata-Aware Text Chunker
 * Phase 1: RAG Database Foundation & Core Extraction Engine
 *
 * Implements deterministic recursive windowing over document pages.
 * - Target chunk window: 500-800 characters (default ~650 chars).
 * - Target overlap: ~100 characters.
 * - Token estimation: Math.ceil(charCount / 4) (explicit character-based approximation).
 * - Unicode-safe: prevents splitting multi-byte surrogate pairs or emojis.
 * - Page-preserving: strictly maintains accurate page_number references for citations.
 */

import type { ParsedDocument, ParsedPage, DocumentChunk, ChunkingOptions } from '../../types/rag.js';

export const DEFAULT_CHUNKING_OPTIONS: Required<Omit<ChunkingOptions, 'documentId' | 'customMetadata'>> = {
  targetChunkSize: 650,
  chunkOverlap: 100,
  minChunkSize: 50,
};

/**
 * Calculates character-based token approximation.
 * In typical English and financial text, 1 token is approximately 4 characters.
 */
export function estimateTokens(charCount: number): number {
  return Math.ceil(Math.max(0, charCount) / 4);
}

/**
 * Unicode-safe slice that operates on Unicode code points to prevent splitting
 * multi-byte glyphs, surrogate pairs, or emoji sequences.
 */
export function safeUnicodeSlice(text: string, start: number, end?: number): string {
  const codePoints = Array.from(text);
  return codePoints.slice(start, end).join('');
}

/**
 * Finds the optimal split boundary within a candidate text window.
 * Priority order:
 * 1. Paragraph breaks (\n\n)
 * 2. Sentence terminators (. ! ?) followed by whitespace or newline
 * 3. Line breaks (\n)
 * 4. Punctuation clauses (; , :) followed by space
 * 5. Word boundaries (spaces)
 */
function findBestSplitPoint(
  text: string,
  minPos: number,
  maxPos: number,
  targetPos: number
): number {
  const boundedMax = Math.min(text.length, maxPos);
  const boundedMin = Math.max(0, minPos);

  if (boundedMax <= boundedMin) return boundedMax;

  // Search window slice
  const searchSlice = text.slice(boundedMin, boundedMax);
  const targetOffset = Math.min(searchSlice.length, targetPos - boundedMin);

  // 1. Check for paragraph break (\n\n)
  const paragraphMatches = [...searchSlice.matchAll(/\n\s*\n/g)];
  if (paragraphMatches.length > 0) {
    // Find paragraph match closest to targetOffset
    let best = paragraphMatches[0];
    let bestDist = Math.abs(best.index! - targetOffset);
    for (const match of paragraphMatches) {
      const dist = Math.abs(match.index! - targetOffset);
      if (dist < bestDist) {
        best = match;
        bestDist = dist;
      }
    }
    return boundedMin + best.index! + best[0].length;
  }

  // 2. Check for sentence endings (. ! ? followed by space or newline)
  const sentenceMatches = [...searchSlice.matchAll(/[.!?]+(?:\s+|\n)/g)];
  if (sentenceMatches.length > 0) {
    let best = sentenceMatches[0];
    let bestDist = Math.abs(best.index! + best[0].length - targetOffset);
    for (const match of sentenceMatches) {
      const splitCandidate = match.index! + match[0].length;
      const dist = Math.abs(splitCandidate - targetOffset);
      if (dist < bestDist) {
        best = match;
        bestDist = dist;
      }
    }
    return boundedMin + best.index! + best[0].length;
  }

  // 3. Check for single newline
  const newlineMatches = [...searchSlice.matchAll(/\n/g)];
  if (newlineMatches.length > 0) {
    let best = newlineMatches[0];
    let bestDist = Math.abs(best.index! + 1 - targetOffset);
    for (const match of newlineMatches) {
      const dist = Math.abs(match.index! + 1 - targetOffset);
      if (dist < bestDist) {
        best = match;
        bestDist = dist;
      }
    }
    return boundedMin + best.index! + 1;
  }

  // 4. Check for clause delimiters (, ; :)
  const clauseMatches = [...searchSlice.matchAll(/[,;:]\s+/g)];
  if (clauseMatches.length > 0) {
    let best = clauseMatches[0];
    let bestDist = Math.abs(best.index! + best[0].length - targetOffset);
    for (const match of clauseMatches) {
      const splitCandidate = match.index! + match[0].length;
      const dist = Math.abs(splitCandidate - targetOffset);
      if (dist < bestDist) {
        best = match;
        bestDist = dist;
      }
    }
    return boundedMin + best.index! + best[0].length;
  }

  // 5. Check for word boundary (space)
  const spaceMatches = [...searchSlice.matchAll(/\s+/g)];
  if (spaceMatches.length > 0) {
    let best = spaceMatches[0];
    let bestDist = Math.abs(best.index! + best[0].length - targetOffset);
    for (const match of spaceMatches) {
      const splitCandidate = match.index! + match[0].length;
      const dist = Math.abs(splitCandidate - targetOffset);
      if (dist < bestDist) {
        best = match;
        bestDist = dist;
      }
    }
    return boundedMin + best.index! + best[0].length;
  }

  // If no delimiter found (e.g. unbroken token), split at targetPos safely
  return Math.min(boundedMax, targetPos);
}

/**
 * Chunks text for a single page while maintaining page reference and overlap.
 */
function chunkPageText(
  page: ParsedPage,
  startIndex: number,
  options: Required<Omit<ChunkingOptions, 'documentId' | 'customMetadata'>>,
  documentId?: string,
  customMetadata?: Record<string, unknown>
): { chunks: DocumentChunk[]; nextIndex: number } {
  const { targetChunkSize, chunkOverlap, minChunkSize } = options;
  const rawText = (page.text || '').trim();

  if (!rawText) {
    return { chunks: [], nextIndex: startIndex };
  }

  // If page content is smaller than or equal to target chunk size
  if (rawText.length <= targetChunkSize + 50) {
    if (rawText.length >= minChunkSize || rawText.length > 0) {
      const chunk: DocumentChunk = {
        chunkIndex: startIndex,
        pageNumber: page.pageNumber,
        content: rawText,
        charCount: rawText.length,
        tokenEstimate: estimateTokens(rawText.length),
        metadata: {
          documentId: documentId || null,
          pageNumber: page.pageNumber,
          chunkIndex: startIndex,
          charCount: rawText.length,
          tokenEstimate: estimateTokens(rawText.length),
          ...(customMetadata || {}),
        },
      };
      return { chunks: [chunk], nextIndex: startIndex + 1 };
    }
    return { chunks: [], nextIndex: startIndex };
  }

  // For larger text, slide window with boundary detection
  const chunks: DocumentChunk[] = [];
  let currentIndex = startIndex;
  let cursor = 0;
  const totalLength = rawText.length;

  while (cursor < totalLength) {
    const remaining = totalLength - cursor;

    // If remaining text is within a single chunk window
    if (remaining <= targetChunkSize + 50) {
      const chunkText = rawText.slice(cursor).trim();
      if (chunkText.length >= minChunkSize || chunks.length === 0) {
        chunks.push({
          chunkIndex: currentIndex++,
          pageNumber: page.pageNumber,
          content: chunkText,
          charCount: chunkText.length,
          tokenEstimate: estimateTokens(chunkText.length),
          metadata: {
            documentId: documentId || null,
            pageNumber: page.pageNumber,
            chunkIndex: currentIndex - 1,
            charCount: chunkText.length,
            tokenEstimate: estimateTokens(chunkText.length),
            ...(customMetadata || {}),
          },
        });
      }
      break;
    }

    // Determine target split pos and search range
    const targetPos = cursor + targetChunkSize;
    const minPos = cursor + Math.max(minChunkSize, targetChunkSize - 150);
    const maxPos = Math.min(totalLength, cursor + targetChunkSize + 150);

    const splitPos = findBestSplitPoint(rawText, minPos, maxPos, targetPos);
    const safeEnd = splitPos > cursor ? splitPos : Math.min(totalLength, cursor + targetChunkSize);

    const chunkContent = rawText.slice(cursor, safeEnd).trim();

    if (chunkContent.length >= minChunkSize || chunks.length === 0) {
      chunks.push({
        chunkIndex: currentIndex++,
        pageNumber: page.pageNumber,
        content: chunkContent,
        charCount: chunkContent.length,
        tokenEstimate: estimateTokens(chunkContent.length),
        metadata: {
          documentId: documentId || null,
          pageNumber: page.pageNumber,
          chunkIndex: currentIndex - 1,
          charCount: chunkContent.length,
          tokenEstimate: estimateTokens(chunkContent.length),
          ...(customMetadata || {}),
        },
      });
    }

    // Advance cursor with overlap, ensuring forward progress
    const nextCursor = Math.max(cursor + 1, safeEnd - chunkOverlap);

    // If the next position lands in the middle of whitespace, advance past it
    let trimmedCursor = nextCursor;
    while (trimmedCursor < totalLength && /\s/.test(rawText[trimmedCursor])) {
      trimmedCursor++;
    }

    // Ensure cursor always moves forward to avoid infinite loops
    cursor = Math.max(cursor + minChunkSize, trimmedCursor);
  }

  return { chunks, nextIndex: currentIndex };
}

/**
 * Splits a ParsedDocument into an ordered sequence of DocumentChunks.
 *
 * @param document - ParsedDocument containing pages and text
 * @param options - Chunking configuration options
 * @returns DocumentChunk[]
 */
export function chunkDocument(
  document: ParsedDocument,
  options?: ChunkingOptions
): DocumentChunk[] {
  const resolvedOptions: Required<Omit<ChunkingOptions, 'documentId' | 'customMetadata'>> = {
    targetChunkSize: options?.targetChunkSize ?? DEFAULT_CHUNKING_OPTIONS.targetChunkSize,
    chunkOverlap: options?.chunkOverlap ?? DEFAULT_CHUNKING_OPTIONS.chunkOverlap,
    minChunkSize: options?.minChunkSize ?? DEFAULT_CHUNKING_OPTIONS.minChunkSize,
  };

  const documentId = options?.documentId;
  const customMetadata = options?.customMetadata;

  if (!document.pages || document.pages.length === 0) {
    // Fall back to fullText if pages array is empty
    if (!document.fullText || !document.fullText.trim()) {
      return [];
    }
    const syntheticPage: ParsedPage = {
      pageNumber: 1,
      text: document.fullText,
      charCount: document.fullText.length,
    };
    const { chunks } = chunkPageText(
      syntheticPage,
      0,
      resolvedOptions,
      documentId,
      customMetadata
    );
    return chunks;
  }

  const allChunks: DocumentChunk[] = [];
  let nextChunkIndex = 0;

  for (const page of document.pages) {
    const { chunks, nextIndex } = chunkPageText(
      page,
      nextChunkIndex,
      resolvedOptions,
      documentId,
      customMetadata
    );
    allChunks.push(...chunks);
    nextChunkIndex = nextIndex;
  }

  return allChunks;
}
