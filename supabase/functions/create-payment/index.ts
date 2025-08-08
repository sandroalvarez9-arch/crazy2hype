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

  // Create Supabase client using the anon key to verify the user and read public data
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_ANON_KEY") ?? ""
  );

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");
    const token = authHeader.replace("Bearer ", "");

    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email missing");

    const { tournamentId } = await req.json();
    if (!tournamentId) throw new Error("tournamentId is required");

    // Read tournament to get entry fee and title
    const { data: tournament, error: tErr } = await supabaseClient
      .from("tournaments")
      .select("id, title, entry_fee")
      .eq("id", tournamentId)
      .single();

    if (tErr || !tournament) throw new Error(tErr?.message || "Tournament not found");

    // Convert entry_fee (numeric) to integer cents safely
    const entryFeeNumber = typeof tournament.entry_fee === "string"
      ? parseFloat(tournament.entry_fee)
      : Number(tournament.entry_fee || 0);

    if (!entryFeeNumber || entryFeeNumber <= 0) {
      throw new Error("This tournament has no entry fee to pay");
    }

    const unitAmount = Math.round(entryFeeNumber * 100);

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("Stripe secret key is not configured");

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Find or attach customer by email
    const customers = await stripe.customers.list({ email: user.email!, limit: 1 });
    const customerId = customers.data[0]?.id;

    const origin = req.headers.get("origin") || "https://bsthkkljpqzuimkcbcfy.supabase.co";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email!,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: `Tournament Entry Fee — ${tournament.title}` },
            unit_amount: unitAmount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/payment-success`,
      cancel_url: `${origin}/payment-canceled`,
      metadata: {
        tournament_id: tournament.id,
        user_id: user.id,
      },
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("[create-payment] Error:", message);
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
