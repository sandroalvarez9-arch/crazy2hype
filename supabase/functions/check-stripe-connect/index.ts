import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("[check-stripe-connect] Function called");

  try {
    // Initialize Supabase clients
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    const supabaseService = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get authenticated user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw userError;
    
    const user = userData.user;
    if (!user?.email) {
      throw new Error("User not authenticated or email not available");
    }

    console.log("[check-stripe-connect] User authenticated:", user.id, user.email);

    // Get Stripe secret key
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }

    // Get user's profile
    const { data: profile } = await supabaseService
      .from("profiles")
      .select("stripe_account_id, stripe_connected, stripe_charges_enabled, stripe_details_submitted")
      .eq("user_id", user.id)
      .maybeSingle();

    console.log("[check-stripe-connect] Profile data:", profile);

    // If no Stripe account ID, return not connected
    if (!profile?.stripe_account_id) {
      console.log("[check-stripe-connect] No Stripe account ID found");
      return new Response(JSON.stringify({ 
        connected: false, 
        message: "No Stripe account connected" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Verify account with Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    
    try {
      const account = await stripe.accounts.retrieve(profile.stripe_account_id);
      console.log("[check-stripe-connect] Stripe account retrieved:", {
        id: account.id,
        charges_enabled: account.charges_enabled,
        details_submitted: account.details_submitted
      });

      // Update profile with current Stripe status
      await supabaseService
        .from("profiles")
        .update({
          stripe_charges_enabled: account.charges_enabled ?? false,
          stripe_details_submitted: account.details_submitted ?? false,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      return new Response(JSON.stringify({ 
        connected: true,
        charges_enabled: account.charges_enabled,
        details_submitted: account.details_submitted,
        account_id: account.id,
        message: "Stripe account verified and connected"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });

    } catch (stripeError) {
      console.log("[check-stripe-connect] Stripe error:", stripeError);
      
      // If account doesn't exist in Stripe anymore, clear the profile
      await supabaseService
        .from("profiles")
        .update({
          stripe_account_id: null,
          stripe_connected: false,
          stripe_charges_enabled: false,
          stripe_details_submitted: false,
          updated_at: new Date().toISOString(),
        })
        .eq("user_id", user.id);

      return new Response(JSON.stringify({ 
        connected: false, 
        message: "Stripe account no longer valid, connection cleared" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

  } catch (error) {
    console.error("[check-stripe-connect] Error:", error);
    return new Response(JSON.stringify({ 
      error: error.message,
      connected: false 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});