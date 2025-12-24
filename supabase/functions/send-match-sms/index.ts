import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Server-side input sanitization
function sanitizeString(input: string, maxLength: number = 500): string {
  if (!input || typeof input !== 'string') return '';
  return input
    .replace(/[<>'"&]/g, '') // Remove potentially dangerous characters
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .slice(0, maxLength)
    .trim();
}

function isValidUUID(str: string): boolean {
  if (!str || typeof str !== 'string') return false;
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(str);
}

const VALID_ACTIONS = ['match_starting', 'match_completed', 'score_update', 'match_update'] as const;
type ValidAction = typeof VALID_ACTIONS[number];

function isValidAction(action: string): action is ValidAction {
  return VALID_ACTIONS.includes(action as ValidAction);
}

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
    const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !TWILIO_PHONE_NUMBER) {
      console.error('Missing Twilio credentials');
      throw new Error('Twilio credentials not configured');
    }

    // SECURITY: Verify the authenticated user
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseAuth = createClient(SUPABASE_URL!, SERVICE_ROLE_KEY!);
    const { data: { user }, error: authError } = await supabaseAuth.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const body = await req.json();
    const matchId = body.matchId;
    const action = body.action;
    
    // Server-side validation of matchId
    if (!matchId || !isValidUUID(matchId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing match ID' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate action parameter
    if (action && !isValidAction(action)) {
      return new Response(
        JSON.stringify({ error: 'Invalid action parameter' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing SMS notification for match ${matchId}, action: ${action || 'default'}, user: ${user.id}`);

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

    // SECURITY: Verify user is the tournament organizer
    const { data: tournament, error: tournamentError } = await supabaseAuth
      .from('tournaments')
      .select('organizer_id')
      .eq('id', match.tournament_id)
      .single();

    if (tournamentError || !tournament) {
      return new Response(
        JSON.stringify({ error: 'Tournament not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (tournament.organizer_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Only tournament organizers can send SMS notifications' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
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

    // Build message based on action - sanitize team names from database
    let message = '';
    const team1Name = sanitizeString(match.team1?.name || 'TBD', 100);
    const team2Name = sanitizeString(match.team2?.name || 'TBD', 100);
    const courtNumber = match.court_number ? String(match.court_number) : 'TBD';
    const team1Score = match.team1_score ?? 0;
    const team2Score = match.team2_score ?? 0;
    
    if (action === 'match_starting') {
      message = `🏐 Your match is starting! ${team1Name} vs ${team2Name} on Court ${courtNumber}. Head to the court now!`;
    } else if (action === 'match_completed') {
      const winner = match.winner_id === match.team1_id ? team1Name : team2Name;
      message = `🏆 Match completed! ${team1Name} (${team1Score}) vs ${team2Name} (${team2Score}). Winner: ${winner}`;
    } else if (action === 'score_update') {
      message = `📊 Score update: ${team1Name} ${team1Score} - ${team2Score} ${team2Name}`;
    } else {
      message = `🏐 Match update: ${team1Name} vs ${team2Name} - Court ${courtNumber}`;
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
