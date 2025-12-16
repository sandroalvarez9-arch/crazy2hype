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
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authentication required", code: "AUTH_REQUIRED" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    const token = authHeader.replace("Bearer ", "");

    // Use Supabase auth to properly validate the token
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user) {
      console.error("[get-stripe-oauth-url] Auth error:", userError?.message);
      return new Response(JSON.stringify({ error: "Authentication failed", code: "AUTH_FAILED" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    
    const userId = userData.user.id;
    console.log("[get-stripe-oauth-url] User authenticated:", userId);

    const rawClientId = Deno.env.get("STRIPE_CONNECT_CLIENT_ID") || Deno.env.get("STRIPE_CLIENT_ID");
    const clientId = rawClientId?.trim()?.replace(/["'\s]/g, "")?.replace(/\.$/, "");
    if (!clientId) {
      console.error("[get-stripe-oauth-url] Stripe Connect client ID not configured");
      return new Response(JSON.stringify({ error: "Payment service configuration error", code: "CONFIG_ERROR" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }
    
    // Must be a Connect Client ID (starts with 'ca_'), not a secret/public API key
    if (!clientId.startsWith("ca_")) {
      console.error("[get-stripe-oauth-url] Invalid Stripe Connect client ID format");
      return new Response(JSON.stringify({ error: "Payment service configuration error", code: "CONFIG_ERROR" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
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
    console.error("[get-stripe-oauth-url] Unexpected error:", error instanceof Error ? error.message : String(error));
    return new Response(JSON.stringify({ error: "An unexpected error occurred", code: "INTERNAL_ERROR" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});