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
    if (!authHeader) throw new Error("Missing Authorization header");
    const token = authHeader.replace("Bearer ", "");
    console.log("[finish-stripe-connect] Auth header found");

    // Authenticate user: try JWT decode first (platform verifies signature), fallback to Supabase auth
    let userId: string | undefined;
    let userEmail: string | undefined;

    try {
      const base64Url = token.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const payloadJson = atob(base64);
      const payload = JSON.parse(payloadJson);
      userId = payload?.sub;
      userEmail = payload?.email;
      console.log("[finish-stripe-connect] JWT decoded user:", { userId, userEmail });
    } catch (e) {
      console.log("[finish-stripe-connect] JWT decode failed, will fallback to auth.getUser");
    }

    if (!userId) {
      const { data: userData, error: userError } = await supabaseAnon.auth.getUser(token);
      if (userError) throw new Error(`Authentication error: ${userError.message}`);
      userId = userData.user?.id;
      userEmail = userData.user?.email || undefined;
    }

    if (!userId) throw new Error("User not authenticated");
    console.log("[finish-stripe-connect] User authenticated:", userId, userEmail);

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    console.log("[finish-stripe-connect] Stripe key found");

    const { code } = await req.json();
    if (!code) throw new Error("Missing OAuth code");
    console.log("[finish-stripe-connect] OAuth code received");

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Exchange the code for a connected account token
    console.log("[finish-stripe-connect] Exchanging OAuth code...");
    const tokenResponse = await stripe.oauth.token({
      grant_type: "authorization_code",
      code,
    });
    console.log("[finish-stripe-connect] Token exchange successful");

    const accountId = tokenResponse.stripe_user_id;
    if (!accountId) throw new Error("Stripe did not return an account id");
    console.log("[finish-stripe-connect] Account ID:", accountId);

    const account = await stripe.accounts.retrieve(accountId);
    console.log("[finish-stripe-connect] Account details:", {
      id: account.id,
      charges_enabled: account.charges_enabled,
      details_submitted: account.details_submitted
    });

    // Store on the profile using UPSERT to ensure profile exists
    console.log("[finish-stripe-connect] Upserting profile in database...");
    const { data: updateData, error: updateError } = await supabaseService
      .from("profiles")
      .upsert({
        user_id: userId,
        username: userEmail?.split('@')[0] || `user_${userId.slice(0, 8)}`,
        email: userEmail || '',
        stripe_account_id: accountId,
        stripe_connected: true,
        stripe_charges_enabled: account.charges_enabled ?? false,
        stripe_details_submitted: account.details_submitted ?? false,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      })
      .select();

    if (updateError) {
      console.error("[finish-stripe-connect] Database update error:", updateError);
      throw new Error(`Database update failed: ${updateError.message}`);
    }
    
    console.log("[finish-stripe-connect] Database update successful:", updateData);

    return new Response(JSON.stringify({
      account_id: accountId,
      charges_enabled: account.charges_enabled ?? false,
      details_submitted: account.details_submitted ?? false,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[finish-stripe-connect] Error:", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
