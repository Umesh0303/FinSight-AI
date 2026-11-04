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

// Concurrent refresh promise singleton to prevent multiple competing refresh calls
let activeRefreshPromise: Promise<string | null> | null = null;

/**
 * Retrieves an active, unexpired authentication token.
 * If the current Supabase session is expired or expiring in < 60s,
 * coordinates a single, safe session refresh using Supabase Auth.
 * Automatically propagates refreshed access tokens to localStorage and custom events.
 */
export async function getValidAuthToken(forceRefresh = false): Promise<string | null> {
  if (activeRefreshPromise) {
    return activeRefreshPromise;
  }

  // If Supabase client is not initialized, return the local storage token
  if (!supabase) {
    return typeof window !== 'undefined' ? localStorage.getItem('finsight_token') : null;
  }

  activeRefreshPromise = (async () => {
    try {
      if (forceRefresh) {
        const { data, error } = await supabase.auth.refreshSession();
        if (!error && data?.session?.access_token) {
          const newToken = data.session.access_token;
          if (typeof window !== 'undefined') {
            localStorage.setItem('finsight_token', newToken);
            window.dispatchEvent(new CustomEvent('finsight:token_refreshed', { detail: { token: newToken } }));
          }
          return newToken;
        }
        if (error) {
          console.warn('[AUTH_REFRESH] Forced refresh failed:', error.message);
          return null;
        }
      }

      // Check current session
      const { data: { session }, error: sessionErr } = await supabase.auth.getSession();
      if (sessionErr) {
        console.warn('[AUTH_REFRESH] Error checking current session:', sessionErr.message);
      }

      if (session && session.access_token) {
        const expiresAt = session.expires_at ? session.expires_at * 1000 : 0;
        const now = Date.now();

        // If token expires in less than 60 seconds (or is already expired), refresh it proactively
        if (expiresAt && expiresAt - now < 60000) {
          const { data: refreshData, error: refreshErr } = await supabase.auth.refreshSession();
          if (!refreshErr && refreshData?.session?.access_token) {
            const refreshedToken = refreshData.session.access_token;
            if (typeof window !== 'undefined') {
              localStorage.setItem('finsight_token', refreshedToken);
              window.dispatchEvent(new CustomEvent('finsight:token_refreshed', { detail: { token: refreshedToken } }));
            }
            return refreshedToken;
          }
          if (refreshErr) {
            console.warn('[AUTH_REFRESH] Proactive token refresh failed:', refreshErr.message);
            // If the refresh token was revoked or invalid, return null to trigger re-auth
            return null;
          }
        }

        // Token is valid
        if (typeof window !== 'undefined') {
          localStorage.setItem('finsight_token', session.access_token);
        }
        return session.access_token;
      }

      // Fallback to local storage (for demo sessions or offline state)
      return typeof window !== 'undefined' ? localStorage.getItem('finsight_token') : null;
    } catch (err: any) {
      console.warn('[AUTH_REFRESH] Unexpected error during token verification:', err?.message || err);
      return typeof window !== 'undefined' ? localStorage.getItem('finsight_token') : null;
    } finally {
      activeRefreshPromise = null;
    }
  })();

  return activeRefreshPromise;
}

/**
 * Standard authenticated fetch wrapper for client-side API requests.
 * Automatically attaches valid Bearer tokens, proactively refreshes near-expiry sessions,
 * handles 401 token expiration by performing a single safe refresh, and cleans up revoked sessions.
 */
export async function fetchWithAuth(
  url: string,
  options: RequestInit = {},
  isJson = true,
  hasRetried = false
): Promise<Response> {
  const token = await getValidAuthToken(false);
  const headers = new Headers(options.headers || {});

  if (isJson && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(url, { ...options, headers });

  // On 401 Unauthorized, perform a single safe session refresh and retry
  if (response.status === 401 && !hasRetried) {
    console.warn(`[AUTH] 401 received from ${url}, attempting session refresh...`);
    const refreshedToken = await getValidAuthToken(true);

    if (refreshedToken && refreshedToken !== token) {
      console.log(`[AUTH] Refreshed token acquired, retrying request to ${url}...`);
      return fetchWithAuth(url, options, isJson, true);
    }

    // Refresh failed or session is revoked; clear stale token and notify app cleanly
    if (typeof window !== 'undefined') {
      localStorage.removeItem('finsight_token');
      window.dispatchEvent(new CustomEvent('finsight:session_expired'));
    }
  }

  return response;
}

