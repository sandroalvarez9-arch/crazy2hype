import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  console.log("[finish-stripe-connect] Function called");

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Use anon to identify the user, and service role to write profile
  const supabaseAnon = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );
  const supabaseService = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    console.log("[finish-stripe-connect] Processing request...");
    
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authentication required", code: "AUTH_REQUIRED" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    const token = authHeader.replace("Bearer ", "");
    console.log("[finish-stripe-connect] Auth header found");

    // Properly authenticate user using Supabase auth
    const { data: userData, error: userError } = await supabaseAnon.auth.getUser(token);
    if (userError || !userData.user) {
      console.error("[finish-stripe-connect] Auth error:", userError?.message);
      return new Response(JSON.stringify({ error: "Authentication failed", code: "AUTH_FAILED" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }

    const userId = userData.user.id;
    const userEmail = userData.user.email;
    console.log("[finish-stripe-connect] User authenticated:", userId);

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      console.error("[finish-stripe-connect] STRIPE_SECRET_KEY not set");
      return new Response(JSON.stringify({ error: "Payment service configuration error", code: "CONFIG_ERROR" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const { code } = await req.json();
    if (!code) {
      return new Response(JSON.stringify({ error: "Missing authorization code", code: "MISSING_CODE" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    console.log("[finish-stripe-connect] OAuth code received");

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Exchange the code for a connected account token
    console.log("[finish-stripe-connect] Exchanging OAuth code...");
    let tokenResponse;
    try {
      tokenResponse = await stripe.oauth.token({
        grant_type: "authorization_code",
        code,
      });
    } catch (stripeError) {
      console.error("[finish-stripe-connect] Stripe OAuth error:", stripeError);
      return new Response(JSON.stringify({ error: "Failed to connect Stripe account", code: "STRIPE_OAUTH_ERROR" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    console.log("[finish-stripe-connect] Token exchange successful");

    const accountId = tokenResponse.stripe_user_id;
    if (!accountId) {
      console.error("[finish-stripe-connect] No account ID returned from Stripe");
      return new Response(JSON.stringify({ error: "Failed to connect Stripe account", code: "NO_ACCOUNT_ID" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    console.log("[finish-stripe-connect] Account ID:", accountId);

    let account;
    try {
      account = await stripe.accounts.retrieve(accountId);
    } catch (stripeError) {
      console.error("[finish-stripe-connect] Failed to retrieve account:", stripeError);
      return new Response(JSON.stringify({ error: "Failed to verify Stripe account", code: "ACCOUNT_VERIFY_ERROR" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    console.log("[finish-stripe-connect] Account details retrieved");

    // Verify profile exists before updating (prevents race condition)
    const { data: existingProfile, error: profileCheckError } = await supabaseService
      .from("profiles")
      .select("user_id, stripe_account_id")
      .eq("user_id", userId)
      .maybeSingle();

    if (profileCheckError) {
      console.error("[finish-stripe-connect] Profile check error:", profileCheckError);
      return new Response(JSON.stringify({ error: "Failed to verify user profile", code: "PROFILE_CHECK_ERROR" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    // If profile doesn't exist, create it; if it exists, update it
    console.log("[finish-stripe-connect] Updating profile in database...");
    let updateResult;
    
    if (!existingProfile) {
      // Profile doesn't exist - create it
      updateResult = await supabaseService
        .from("profiles")
        .insert({
          user_id: userId,
          username: userEmail?.split('@')[0] || `user_${userId.slice(0, 8)}`,
          email: userEmail || '',
          stripe_account_id: accountId,
          stripe_connected: true,
          stripe_charges_enabled: account.charges_enabled ?? false,
          stripe_details_submitted: account.details_submitted ?? false,
        })
        .select();
    } else {
      // Profile exists - only update Stripe fields (prevents race condition)
      updateResult = await supabaseService
        .from("profiles")
        .update({
          stripe_account_id: accountId,
          stripe_connected: true,
          stripe_charges_enabled: account.charges_enabled ?? false,
          stripe_details_submitted: account.details_submitted ?? false,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", userId)
        .select();
    }

    if (updateResult.error) {
      console.error("[finish-stripe-connect] Database update error:", updateResult.error);
      return new Response(JSON.stringify({ error: "Failed to save account connection", code: "DB_UPDATE_ERROR" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }
    
    console.log("[finish-stripe-connect] Database update successful");

    return new Response(JSON.stringify({
      account_id: accountId,
      charges_enabled: account.charges_enabled ?? false,
      details_submitted: account.details_submitted ?? false,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[finish-stripe-connect] Unexpected error:", error instanceof Error ? error.message : String(error));
    return new Response(JSON.stringify({ error: "An unexpected error occurred", code: "INTERNAL_ERROR" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});