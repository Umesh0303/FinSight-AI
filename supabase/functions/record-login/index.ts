// Supabase Edge Function: record-login
// Validates caller's JWT, verifies active identity status,
// records an immutable login audit event with server timestamp,
// and securely updates the user's last_login_at timestamp in public.profiles.

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (req: Request) => {
  // 1. Handle CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  // 2. Enforce POST only
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed. Only POST is accepted." }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" }
    });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY") ?? "";

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(JSON.stringify({ error: "Service environment not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 3. Initialize caller client with caller's JWT to verify authenticity against Supabase Auth
    const callerClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await callerClient.auth.getUser();
    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Invalid or expired authentication session" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 4. Initialize elevated service client for protected audit log insertion & profile update
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);

    // Retrieve caller's verified profile
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("id, display_name, email, role, account_status, auth_provider")
      .eq("id", user.id)
      .single();

    if (profileError || !profile) {
      return new Response(JSON.stringify({ error: "User profile not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 5. Strict Account Status Verification (Fail Closed)
    // Reject suspended accounts
    if (profile.account_status === "suspended") {
      return new Response(
        JSON.stringify({
          error: "Account has been suspended. Authentication prohibited."
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // Reject pending approval accounts: Only active verified users may establish a login session
    if (profile.account_status === "pending approval" || profile.account_status !== "active") {
      return new Response(
        JSON.stringify({
          error: "Account is pending administrator approval and role assignment. Access denied."
        }),
        {
          status: 403,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // 6. Derive authentication provider exclusively from trusted Supabase user identity metadata.
    // Client request-body overrides are ignored to prevent provider spoofing.
    const trustedProvider =
      user.app_metadata?.provider ||
      (Array.isArray(user.identities) && user.identities[0]?.provider) ||
      profile.auth_provider ||
      "email";

    // Parse optional request payload for event categorization
    let reqBody: any = {};
    try {
      reqBody = await req.json();
    } catch {
      reqBody = {};
    }

    const eventType = reqBody?.event_type || reqBody?.eventType || "login";
    const isSuccess = reqBody?.success !== undefined ? Boolean(reqBody.success) : true;
    const errorCategory = reqBody?.error_category || reqBody?.errorCategory || null;

    // Server-generated metadata
    const serverTimestamp = new Date().toISOString();
    const clientIp =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
      req.headers.get("cf-connecting-ip") ||
      "unknown";
    const userAgent = req.headers.get("user-agent") || "unknown";

    // 6.5 Audit Deduplication Guard:
    // Prevent duplicate audit events caused by rapid token refresh or component remounts (15-second window)
    const fifteenSecondsAgo = new Date(Date.now() - 15000).toISOString();
    const { data: recentEvents } = await adminClient
      .from("login_history")
      .select("id, created_at")
      .eq("user_id", user.id)
      .eq("provider", trustedProvider)
      .eq("event_type", eventType)
      .gte("created_at", fifteenSecondsAgo)
      .limit(1);

    if (recentEvents && recentEvents.length > 0) {
      return new Response(
        JSON.stringify({
          success: true,
          deduplicated: true,
          recorded_at: recentEvents[0].created_at,
          user_id: user.id,
          role: profile.role,
          provider: trustedProvider,
          event_type: eventType
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" }
        }
      );
    }

    // 7. Insert immutable login audit record into public.login_history
    const { error: insertError } = await adminClient
      .from("login_history")
      .insert({
        user_id: user.id,
        email: profile.email,
        display_name: profile.display_name,
        role: profile.role,
        provider: trustedProvider,
        event_type: eventType,
        success: isSuccess,
        error_category: errorCategory,
        ip_address: clientIp,
        user_agent: userAgent,
        status: isSuccess ? "success" : "failed",
        created_at: serverTimestamp
      });

    if (insertError) {
      console.error("Failed to insert login history record:", insertError);
      return new Response(JSON.stringify({ error: "Failed to record audit login event" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      });
    }

    // 8. Update profile last_login_at and updated_at timestamp
    const { error: updateError } = await adminClient
      .from("profiles")
      .update({
        last_login_at: serverTimestamp,
        updated_at: serverTimestamp
      })
      .eq("id", user.id);

    if (updateError) {
      console.error("Failed to update last_login_at / updated_at:", updateError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        recorded_at: serverTimestamp,
        user_id: user.id,
        role: profile.role,
        provider: trustedProvider,
        event_type: eventType
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: "An unexpected internal error occurred" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" }
      }
    );
  }
});
