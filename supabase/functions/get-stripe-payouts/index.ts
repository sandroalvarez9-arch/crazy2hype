import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from 'https://esm.sh/stripe@14.21.0';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get the authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('Missing authorization header');
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } }
    });

    // Verify the user is authenticated
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      throw new Error('Unauthorized: Invalid or expired token');
    }

    console.log('Authenticated user:', user.id);

    // Get the user's profile to check if they have a connected Stripe account
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('stripe_account_id, stripe_connected, stripe_charges_enabled')
      .eq('user_id', user.id)
      .single();

    if (profileError) {
      console.error('Profile error:', profileError);
      throw new Error('Failed to fetch user profile');
    }

    if (!profile?.stripe_account_id || !profile?.stripe_connected) {
      console.log('User does not have a connected Stripe account');
      return new Response(
        JSON.stringify({ 
          payouts: [], 
          has_more: false,
          message: 'No connected Stripe account'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    console.log('Fetching payouts for Stripe account:', profile.stripe_account_id);

    const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY');
    if (!stripeSecretKey) {
      throw new Error('STRIPE_SECRET_KEY is not set');
    }

    const stripe = new Stripe(stripeSecretKey, {
      apiVersion: '2023-10-16',
    });

    const { starting_after, limit = 10 } = await req.json();

    // Fetch payouts ONLY for this user's connected Stripe account
    const payouts = await stripe.payouts.list({
      limit,
      ...(starting_after && { starting_after }),
    }, {
      stripeAccount: profile.stripe_account_id // Only fetch this user's payouts
    });

    // Fetch balance transactions for fees
    const payoutsWithDetails = await Promise.all(
      payouts.data.map(async (payout) => {
        const balanceTransactions = await stripe.balanceTransactions.list({
          payout: payout.id,
          limit: 100,
        }, {
          stripeAccount: profile.stripe_account_id
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

    console.log(`Returning ${payoutsWithDetails.length} payouts for user ${user.id}`);

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
        status: error.message.includes('Unauthorized') ? 401 : 500,
      }
    );
  }
});
