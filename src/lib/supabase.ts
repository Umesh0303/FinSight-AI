import { createClient, SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('http')
);

// Frontend Supabase Client with persistent browser sessions and automatic token refresh
export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: 'finsight_supabase_auth',
      },
    })
  : null;

export interface AuditEventPayload {
  email: string;
  eventType: 'login_success' | 'login_failure' | 'logout' | 'password_reset_requested' | 'email_verified' | string;
  success: boolean;
  errorCategory?: 'invalid_credentials' | 'account_suspended' | 'pending_approval' | 'unconfirmed_email' | 'network_error' | string | null;
  provider?: string;
  userId?: string;
  correlationId?: string;
}

let lastRecordedKey = '';
let lastRecordedTimestamp = 0;

/**
 * Dispatches an audit event to the secure server-side audit endpoint.
 * Protects against tampering: the server verifies caller authentication and JWT claims
 * for authenticated events and attaches lawful client IP, user-agent, and UTC timestamps.
 */
export async function recordAuditEvent(
  payload: AuditEventPayload,
  accessToken?: string | null
): Promise<{ success: boolean; recorded_at?: string; error?: string }> {
  const now = Date.now();
  const dedupKey = `${payload.email}_${payload.eventType}_${payload.success}`;

  // Deduplicate identical audit calls firing within 3 seconds (e.g. concurrent state triggers)
  if (lastRecordedKey === dedupKey && (now - lastRecordedTimestamp) < 3000) {
    return { success: true, recorded_at: new Date(lastRecordedTimestamp).toISOString() };
  }

  lastRecordedKey = dedupKey;
  lastRecordedTimestamp = now;

  try {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (accessToken) {
      headers['Authorization'] = `Bearer ${accessToken}`;
    }

    const res = await fetch('/api/auth/record-audit', {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email: payload.email,
        eventType: payload.eventType,
        success: payload.success,
        errorCategory: payload.errorCategory || null,
        provider: payload.provider || 'email',
        userId: payload.userId,
        correlationId: payload.correlationId,
      }),
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { success: false, error: data?.error || `HTTP ${res.status}` };
    }
    return { success: true, recorded_at: data?.recorded_at || new Date().toISOString() };
  } catch (err: any) {
    console.warn('Audit record dispatch notice:', err?.message || err);
    return { success: false, error: err?.message || 'Network error' };
  }
}
