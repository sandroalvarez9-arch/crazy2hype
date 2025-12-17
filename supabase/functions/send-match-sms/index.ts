import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const TWILIO_ACCOUNT_SID = Deno.env.get('TWILIO_ACCOUNT_SID');
    const TWILIO_AUTH_TOKEN = Deno.env.get('TWILIO_AUTH_TOKEN');
    const TWILIO_PHONE_NUMBER = Deno.env.get('TWILIO_PHONE_NUMBER');
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY');

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      console.error('Missing Twilio credentials');
      throw new Error('Twilio credentials not configured');
    }

    const { matchId, action } = await req.json();
    console.log(`Processing SMS notification for match ${matchId}, action: ${action}`);

    if (!matchId) {
      throw new Error('Match ID is required');
    }

    const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!);

    // Get match details with team names
    const { data: match, error: matchError } = await supabase
      .from('matches')
      .select(`
        *,
        team1:teams!matches_team1_id_fkey(id, name),
        team2:teams!matches_team2_id_fkey(id, name)
      `)
      .eq('id', matchId)
      .single();

    if (matchError || !match) {
      console.error('Error fetching match:', matchError);
      throw new Error('Match not found');
    }

    console.log('Match details:', match);

    // Get subscribers for both teams
    const teamIds = [match.team1_id, match.team2_id].filter(Boolean);
    
    const { data: subscribers, error: subError } = await supabase
      .from('match_notifications')
      .select('*')
      .eq('tournament_id', match.tournament_id)
      .eq('is_active', true)
      .or(teamIds.map(id => `team_id.eq.${id}`).join(','));

    if (subError) {
      console.error('Error fetching subscribers:', subError);
      throw new Error('Failed to fetch subscribers');
    }

    console.log(`Found ${subscribers?.length || 0} subscribers`);

    if (!subscribers || subscribers.length === 0) {
      return new Response(
        JSON.stringify({ success: true, message: 'No subscribers to notify', sent: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Build message based on action
    let message = '';
    const team1Name = match.team1?.name || 'TBD';
    const team2Name = match.team2?.name || 'TBD';
    
    if (action === 'match_starting') {
      message = `🏐 Your match is starting! ${team1Name} vs ${team2Name} on Court ${match.court_number || 'TBD'}. Head to the court now!`;
    } else if (action === 'match_completed') {
      const winner = match.winner_id === match.team1_id ? team1Name : team2Name;
      message = `🏆 Match completed! ${team1Name} (${match.team1_score}) vs ${team2Name} (${match.team2_score}). Winner: ${winner}`;
    } else if (action === 'score_update') {
      message = `📊 Score update: ${team1Name} ${match.team1_score} - ${match.team2_score} ${team2Name}`;
    } else {
      message = `🏐 Match update: ${team1Name} vs ${team2Name} - Court ${match.court_number || 'TBD'}`;
    }

    // Send SMS to each subscriber
    const sendPromises = subscribers.map(async (sub) => {
      try {
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json`;
        
        const formData = new URLSearchParams();
        formData.append('To', sub.phone_number);
        formData.append('From', TWILIO_PHONE_NUMBER);
        formData.append('Body', message);

        const response = await fetch(twilioUrl, {
          method: 'POST',
          headers: {
            'Authorization': 'Basic ' + btoa(`${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}`),
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: formData.toString(),
        });

        const result = await response.json();
        
        if (!response.ok) {
          console.error(`Failed to send SMS to ${sub.phone_number}:`, result);
          return { success: false, phone: sub.phone_number, error: result.message };
        }

        console.log(`SMS sent successfully to ${sub.phone_number}`);
        return { success: true, phone: sub.phone_number, sid: result.sid };
      } catch (err) {
        console.error(`Error sending SMS to ${sub.phone_number}:`, err);
        return { success: false, phone: sub.phone_number, error: err.message };
      }
    });

    const results = await Promise.all(sendPromises);
    const successCount = results.filter(r => r.success).length;

    console.log(`SMS notifications complete: ${successCount}/${results.length} sent`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Sent ${successCount} of ${results.length} notifications`,
        sent: successCount,
        results 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in send-match-sms function:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
