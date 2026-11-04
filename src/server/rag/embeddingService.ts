/**
 * FinSight AI — Gemini Vector Embedding Service
 * Phase 2: Secure RAG Ingestion, Gemini Embeddings & Supabase Persistence
 *
 * Generates 768-dimensional vector embeddings for document text chunks using
 * Google GenAI 'gemini-embedding-2-preview'.
 * Features:
 * - Bounded retries with exponential backoff and jitter for transient 429/5xx errors.
 * - Strict vector validation (dimension 768, all finite numeric values).
 * - Bounded batch concurrency to prevent rate-limit starvation.
 * - Zero logging of sensitive text, secrets, or embeddings.
 */

import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';

dotenv.config();

export const EMBEDDING_MODEL = 'gemini-embedding-2-preview';
export const VECTOR_DIMENSIONS = 768;
export const DEFAULT_BATCH_CONCURRENCY = 5;
export const MAX_RETRIES = 3;
export const BASE_RETRY_DELAY_MS = 500;

/**
 * Dedicated error class for embedding service failures.
 */
export class EmbeddingError extends Error {
  constructor(message: string, public readonly code?: string, public readonly originalError?: unknown) {
    super(message);
    this.name = 'EmbeddingError';
  }
}

/**
 * Client provider interface for dependency injection in unit tests.
 */
export interface EmbeddingClient {
  models: {
    embedContent: (params: {
      model: string;
      contents: string;
      config?: { outputDimensionality?: number };
    }) => Promise<{
      embedding?: { values?: number[] };
      embeddings?: Array<{ values?: number[] }>;
    }>;
  };
}

let defaultGenAiClient: EmbeddingClient | null = null;

export function getGenAiClient(): EmbeddingClient {
  if (defaultGenAiClient) return defaultGenAiClient;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new EmbeddingError('GEMINI_API_KEY environment variable is missing on server', 'MISSING_API_KEY');
  }

  defaultGenAiClient = new GoogleGenAI({ apiKey }) as unknown as EmbeddingClient;
  return defaultGenAiClient;
}

/**
 * Overrides the GenAI client for isolated testing.
 */
export function setGenAiClientForTesting(client: EmbeddingClient | null): void {
  defaultGenAiClient = client;
}

/**
 * Validates that an embedding vector strictly matches the 768-dimensional finite float contract.
 */
export function validateEmbeddingVector(vector: unknown, expectedDimensions = VECTOR_DIMENSIONS): number[] {
  if (!Array.isArray(vector)) {
    throw new EmbeddingError('Embedding output is not a valid array', 'INVALID_VECTOR_TYPE');
  }

  if (vector.length !== expectedDimensions) {
    throw new EmbeddingError(
      `Embedding dimensionality mismatch: expected ${expectedDimensions}, received ${vector.length}`,
      'DIMENSIONALITY_MISMATCH'
    );
  }

  for (let i = 0; i < vector.length; i++) {
    const val = vector[i];
    if (typeof val !== 'number' || !Number.isFinite(val)) {
      throw new EmbeddingError(
        `Embedding vector contains non-finite numeric value at index ${i}`,
        'NON_FINITE_VALUE'
      );
    }
  }

  return vector as number[];
}

/**
 * Computes a single embedding with bounded exponential backoff and jitter.
 */
export async function generateSingleEmbedding(
  text: string,
  options?: {
    client?: EmbeddingClient;
    maxRetries?: number;
    baseDelayMs?: number;
    timeoutMs?: number;
  }
): Promise<number[]> {
  if (!text || text.trim().length === 0) {
    throw new EmbeddingError('Cannot generate embedding for empty text content', 'EMPTY_CONTENT');
  }

  const client = options?.client || getGenAiClient();
  const maxRetries = options?.maxRetries ?? MAX_RETRIES;
  const baseDelay = options?.baseDelayMs ?? BASE_RETRY_DELAY_MS;
  const timeoutMs = options?.timeoutMs ?? 15000;

  let attempt = 0;
  while (attempt <= maxRetries) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const responsePromise = client.models.embedContent({
        model: EMBEDDING_MODEL,
        contents: text,
        config: {
          outputDimensionality: VECTOR_DIMENSIONS,
        },
      });

      const response = await Promise.race([
        responsePromise,
        new Promise<never>((_, reject) => {
          controller.signal.addEventListener('abort', () =>
            reject(new EmbeddingError(`Embedding request timed out after ${timeoutMs}ms`, 'TIMEOUT'))
          );
        }),
      ]);

      clearTimeout(timer);

      const rawValues = response.embedding?.values || response.embeddings?.[0]?.values;
      if (!rawValues) {
        throw new EmbeddingError('Gemini API response did not contain embedding values', 'EMPTY_EMBEDDING_RESPONSE');
      }

      return validateEmbeddingVector(rawValues, VECTOR_DIMENSIONS);
    } catch (err: unknown) {
      attempt++;
      const isLastAttempt = attempt > maxRetries;
      const errorMsg = err instanceof Error ? err.message : String(err);
      const isRateLimitOrTransient =
        errorMsg.includes('429') ||
        errorMsg.includes('RESOURCE_EXHAUSTED') ||
        errorMsg.includes('503') ||
        errorMsg.includes('500') ||
        errorMsg.includes('TIMEOUT') ||
        errorMsg.includes('fetch failed');

      if (isLastAttempt || !isRateLimitOrTransient) {
        if (err instanceof EmbeddingError) throw err;
        throw new EmbeddingError(
          `Embedding generation failed after ${attempt} attempt(s): ${errorMsg}`,
          'API_FAILURE',
          err
        );
      }

      // Exponential backoff with jitter
      const jitter = Math.random() * 200;
      const delay = Math.min(3000, baseDelay * Math.pow(2, attempt - 1) + jitter);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw new EmbeddingError('Exhausted maximum embedding retries', 'RETRIES_EXHAUSTED');
}

/**
 * Generates embeddings for an array of text chunks with bounded concurrency.
 *
 * @param texts - Array of chunk text strings
 * @param concurrency - Concurrency limit (default: 5)
 * @param client - Optional custom client for testing
 * @returns Array of validated 768-dimensional vectors
 */
export async function generateBatchEmbeddings(
  texts: string[],
  concurrency = DEFAULT_BATCH_CONCURRENCY,
  client?: EmbeddingClient
): Promise<number[][]> {
  if (!texts || texts.length === 0) {
    return [];
  }

  const results: number[][] = new Array(texts.length);
  let currentIndex = 0;

  async function worker() {
    while (currentIndex < texts.length) {
      const idx = currentIndex++;
      results[idx] = await generateSingleEmbedding(texts[idx], { client });
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, texts.length) },
    () => worker()
  );

  await Promise.all(workers);
  return results;
}
