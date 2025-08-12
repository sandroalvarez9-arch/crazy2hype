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
    if (!user?.id) throw new Error("User not authenticated");

    const clientId = Deno.env.get("STRIPE_CLIENT_ID") || Deno.env.get("STRIPE_CONNECT_CLIENT_ID");
    if (!clientId) throw new Error("Stripe Connect client ID is not configured");

    const origin = req.headers.get("origin") || "https://bsthkkljpqzuimkcbcfy.supabase.co";
    const redirectUri = `${origin}/stripe-connect/callback`;

    const params = new URLSearchParams({
      response_type: "code",
      client_id: clientId,
      scope: "read_write",
      redirect_uri: redirectUri,
      state: user.id,
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
