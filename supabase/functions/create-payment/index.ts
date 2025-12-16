import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Create Supabase client using the anon key to verify the user
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  // Create admin client with service role key to bypass RLS for reading organizer data
  const supabaseAdmin = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Authentication required", code: "AUTH_REQUIRED" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    const token = authHeader.replace("Bearer ", "");

    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError || !userData.user?.email) {
      console.error("[create-payment] Auth error:", userError?.message);
      return new Response(JSON.stringify({ error: "Authentication failed", code: "AUTH_FAILED" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 401,
      });
    }
    const user = userData.user;

    const { tournamentId, priceId } = await req.json();
    if (!tournamentId) {
      return new Response(JSON.stringify({ error: "Tournament ID is required", code: "MISSING_TOURNAMENT_ID" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Read tournament to get entry fee and title (use admin to bypass RLS)
    const { data: tournament, error: tErr } = await supabaseAdmin
      .from("tournaments")
      .select("id, title, entry_fee, organizer_id")
      .eq("id", tournamentId)
      .single();

    if (tErr || !tournament) {
      console.error("[create-payment] Tournament fetch error:", tErr?.message);
      return new Response(JSON.stringify({ error: "Tournament not found", code: "TOURNAMENT_NOT_FOUND" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 404,
      });
    }

    // Ensure organizer has connected Stripe (use admin to bypass RLS)
    const { data: organizerProfile, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("stripe_account_id, stripe_connected, stripe_charges_enabled")
      .eq("user_id", tournament.organizer_id)
      .maybeSingle();
    
    if (pErr) {
      console.error("[create-payment] Organizer profile error:", pErr.message);
      return new Response(JSON.stringify({ 
        error: "Unable to process payment at this time",
        code: "ORGANIZER_PROFILE_ERROR"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    if (!organizerProfile) {
      return new Response(JSON.stringify({ 
        error: "Tournament organizer profile not found",
        code: "ORGANIZER_PROFILE_NOT_FOUND"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }
    if (!organizerProfile?.stripe_account_id || organizerProfile.stripe_connected !== true) {
      return new Response(JSON.stringify({ 
        error: "The tournament organizer has not set up online payments yet. Please use an alternative payment method.",
        code: "ORGANIZER_NO_STRIPE"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    // Convert entry_fee (numeric) to integer cents safely
    const entryFeeNumber = typeof tournament.entry_fee === "string"
      ? parseFloat(tournament.entry_fee)
      : Number(tournament.entry_fee || 0);

    if (!entryFeeNumber || entryFeeNumber <= 0) {
      return new Response(JSON.stringify({ 
        error: "This tournament has no entry fee to pay",
        code: "NO_ENTRY_FEE"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    const unitAmount = Math.round(entryFeeNumber * 100);

    const lineItems = priceId
      ? [{ price: priceId as string, quantity: 1 }]
      : [{
          price_data: {
            currency: "usd",
            product_data: { name: `Tournament Entry Fee — ${tournament.title}` },
            unit_amount: unitAmount,
          },
          quantity: 1,
        }];

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      console.error("[create-payment] STRIPE_SECRET_KEY not configured");
      return new Response(JSON.stringify({ error: "Payment service configuration error", code: "CONFIG_ERROR" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Find or attach customer by email
    let customerId: string | undefined;
    try {
      const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
      customerId = customers.data[0]?.id;
    } catch (stripeError) {
      console.error("[create-payment] Customer lookup error:", stripeError);
      // Continue without customer ID - Stripe will create one
    }

    const origin = req.headers.get("origin") || "https://bsthkkljpqzuimkcbcfy.supabase.co";

    const platformFee = Math.floor(unitAmount * 0.05);

    let session;
    try {
      session = await stripe.checkout.sessions.create({
        customer: customerId,
        customer_email: customerId ? undefined : user.email!,
        line_items: lineItems,
        mode: "payment",
        payment_intent_data: {
          application_fee_amount: platformFee,
        },
        success_url: `${origin}/payment-success`,
        cancel_url: `${origin}/payment-canceled`,
        metadata: {
          tournament_id: tournament.id,
          user_id: user.id,
        },
      }, { stripeAccount: organizerProfile.stripe_account_id });
    } catch (stripeError) {
      console.error("[create-payment] Stripe session creation error:", stripeError);
      return new Response(JSON.stringify({ error: "Failed to create payment session", code: "STRIPE_SESSION_ERROR" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      });
    }

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    console.error("[create-payment] Unexpected error:", error instanceof Error ? error.message : String(error));
    return new Response(JSON.stringify({ error: "An unexpected error occurred", code: "INTERNAL_ERROR" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});