import { supabase } from "@/integrations/supabase/client";

export async function advanceWinnerToNextRound(completedMatchId: string): Promise<void> {
  try {
    console.log('🏆 ADVANCING WINNER - Starting advancement for match:', completedMatchId);
    
    // Get the completed match details
    const { data: completedMatch, error } = await supabase
      .from('matches')
      .select('*')
      .eq('id', completedMatchId)
      .eq('tournament_phase', 'playoffs')
      .single();

    if (error || !completedMatch) {
      console.error('❌ Could not find completed match:', error);
      return;
    }

    console.log('✅ Found completed match:', {
      id: completedMatch.id,
      bracket_position: completedMatch.bracket_position,
      winner_id: completedMatch.winner_id,
      status: completedMatch.status,
      round: completedMatch.round_number,
      match: completedMatch.match_number
    });

    if (!completedMatch.winner_id || completedMatch.status !== 'completed') {
      console.log('⚠️ Match not completed or no winner set:', {
        winner_id: completedMatch.winner_id,
        status: completedMatch.status
      });
      return;
    }

    // Find the next round match this winner should advance to
    const nextRoundMatch = await findNextRoundMatch(completedMatch);
    
    if (!nextRoundMatch) {
      console.log('🏁 No next round match found - this might be the final');
      return;
    }

    console.log('🎯 Found next round match:', {
      id: nextRoundMatch.id,
      bracket_position: nextRoundMatch.bracket_position,
      round: nextRoundMatch.round_number,
      match: nextRoundMatch.match_number,
      team1_id: nextRoundMatch.team1_id,
      team2_id: nextRoundMatch.team2_id
    });

    // Determine which team slot the winner should fill
    await updateNextRoundMatch(nextRoundMatch, completedMatch);

    // Check if this was a semi-final and assign referee to final
    await assignRefereeToFinal(completedMatch, nextRoundMatch);

  } catch (error) {
    console.error('💥 Error advancing winner:', error);
  }
}

async function findNextRoundMatch(completedMatch: any): Promise<any> {
  console.log('🔍 Looking for next round match...', {
    tournament_id: completedMatch.tournament_id,
    division: completedMatch.division,
    skill_level: completedMatch.skill_level,
    current_round: completedMatch.round_number,
    next_round: completedMatch.round_number + 1
  });

  // For playoffs, find the next round match in the same bracket
  const { data: nextRoundMatches, error } = await supabase
    .from('matches')
    .select('*')
    .eq('tournament_id', completedMatch.tournament_id)
    .eq('tournament_phase', 'playoffs')
    .eq('division', completedMatch.division)
    .eq('skill_level', completedMatch.skill_level)
    .eq('round_number', completedMatch.round_number + 1)
    .order('match_number');

  if (error) {
    console.error('❌ Error finding next round matches:', error);
    return null;
  }

  if (!nextRoundMatches?.length) {
    console.log('⚠️ No next round matches found');
    return null;
  }

  console.log('📋 Found next round matches:', nextRoundMatches.map(m => ({
    id: m.id,
    bracket_position: m.bracket_position,
    match_number: m.match_number
  })));

  // For single elimination, determine which next match based on current match position
  // Simple logic: match 1,2 go to next match 1, match 3,4 go to next match 2, etc.
  const nextMatchNumber = Math.ceil(completedMatch.match_number / 2);
  const nextMatch = nextRoundMatches.find(m => m.match_number === nextMatchNumber);
  
  console.log('🎯 Calculated next match number:', nextMatchNumber, 'Found match:', nextMatch?.id);
  
  return nextMatch;
}

async function updateNextRoundMatch(nextMatch: any, completedMatch: any): Promise<void> {
  // Determine if winner goes to team1 or team2 slot
  // For seeded brackets: lower match numbers go to team1, higher to team2
  const isTeam1Slot = completedMatch.match_number % 2 === 1;
  
  console.log('🔄 Updating next round match:', {
    nextMatchId: nextMatch.id,
    winnerId: completedMatch.winner_id,
    isTeam1Slot,
    completedMatchNumber: completedMatch.match_number
  });
  
  const updateData: any = {};
  
  if (isTeam1Slot) {
    updateData.team1_id = completedMatch.winner_id;
    console.log('👆 Setting as team1');
  } else {
    updateData.team2_id = completedMatch.winner_id;
    console.log('👇 Setting as team2');
  }

  const { error } = await supabase
    .from('matches')
    .update(updateData)
    .eq('id', nextMatch.id);

  if (error) {
    console.error('❌ Error updating next round match:', error);
  } else {
    console.log('✅ Successfully advanced winner to', nextMatch.bracket_position);
  }
}

async function assignRefereeToFinal(completedMatch: any, nextRoundMatch: any): Promise<void> {
  // Check if the next round match is the final (no further rounds exist)
  const { data: finalRoundCheck, error: finalCheckError } = await supabase
    .from('matches')
    .select('id')
    .eq('tournament_id', completedMatch.tournament_id)
    .eq('tournament_phase', 'playoffs')
    .eq('division', completedMatch.division)
    .eq('skill_level', completedMatch.skill_level)
    .eq('round_number', nextRoundMatch.round_number + 1)
    .limit(1);

  if (finalCheckError) {
    console.error('❌ Error checking for final round:', finalCheckError);
    return;
  }

  // If no matches exist in the next round, then nextRoundMatch is the final
  const isFinal = !finalRoundCheck || finalRoundCheck.length === 0;

  if (isFinal && !nextRoundMatch.referee_team_id) {
    // Get the losing team from this semi-final match
    const losingTeamId = completedMatch.team1_id === completedMatch.winner_id 
      ? completedMatch.team2_id 
      : completedMatch.team1_id;

    console.log('🏁 Assigning referee to final match:', {
      finalMatchId: nextRoundMatch.id,
      refereeTeamId: losingTeamId,
      semiCompletedMatch: completedMatch.id
    });

    const { error: refereeError } = await supabase
      .from('matches')
      .update({ referee_team_id: losingTeamId })
      .eq('id', nextRoundMatch.id);

    if (refereeError) {
      console.error('❌ Error assigning referee to final:', refereeError);
    } else {
      console.log('✅ Successfully assigned referee to final match');
    }
  }
}