import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY is not set');
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    const { starting_after, limit = 10 } = await req.json();

    // Fetch payouts from Stripe
    const payouts = await stripe.payouts.list({
      limit,
      ...(starting_after && { starting_after }),
    });

    // Fetch balance transactions for fees
    const payoutsWithDetails = await Promise.all(
      payouts.data.map(async (payout) => {
        const balanceTransactions = await stripe.balanceTransactions.list({
          payout: payout.id,
          limit: 100,
        });

        const totalFees = balanceTransactions.data.reduce((sum, txn) => sum + txn.fee, 0);

        return {
          id: payout.id,
          amount: payout.amount / 100, // Convert from cents
          currency: payout.currency.toUpperCase(),
          status: payout.status,
          arrival_date: payout.arrival_date,
          created: payout.created,
          fees: totalFees / 100, // Convert from cents
          net: (payout.amount - totalFees) / 100,
          description: payout.description || '',
        };
      })
    );

    return new Response(
      JSON.stringify({
        payouts: payoutsWithDetails,
        has_more: payouts.has_more,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );
  } catch (error) {
    console.error('Error fetching Stripe payouts:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});