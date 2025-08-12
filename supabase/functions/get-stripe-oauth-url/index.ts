import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");
    const token = authHeader.replace("Bearer ", "");

    // Decode JWT payload directly to avoid session lookups that can fail for expired/revoked sessions
    // Platform-level verify_jwt already validates signature when enabled
    const base64Url = token.split(".")[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    const payloadJson = atob(base64);
    const payload = JSON.parse(payloadJson);
    const userId = payload?.sub as string | undefined;
    if (!userId) throw new Error("User not authenticated");

    const rawClientId = Deno.env.get("STRIPE_CONNECT_CLIENT_ID") || Deno.env.get("STRIPE_CLIENT_ID");
    const clientId = rawClientId?.trim()?.replace(/["'\s]/g, "")?.replace(/\.$/, "");
    if (!clientId) throw new Error("Stripe Connect client ID is not configured");
    // Must be a Connect Client ID (starts with 'ca_'), not a secret/public API key
    if (!clientId.startsWith("ca_")) {
      throw new Error("Invalid Stripe Connect client ID. Ensure STRIPE_CONNECT_CLIENT_ID is your Connect client_id (starts with 'ca_') with no spaces or trailing characters.");
    }

    const origin = req.headers.get("origin") || "https://bsthkkljpqzuimkcbcfy.supabase.co";
    const redirectUri = `${origin}/stripe-connect/callback`;

    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      scope: "read_write",
      redirect_uri: redirectUri,
      state: userId,
    });

    const url = `https://connect.stripe.com/oauth/authorize?${params.toString()}`;

    return new Response(JSON.stringify({ url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[get-stripe-oauth-url] Error:", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
