import { supabase } from "@/integrations/supabase/client";

export async function advanceWinnerToNextRound(completedMatchId: string): Promise<void> {
  try {
    console.log('Advancing winner from match:', completedMatchId);
    
    // Get the completed match details
    const { data: completedMatch, error } = await supabase
      .from('matches')
      .select('*')
      .eq('id', completedMatchId)
      .eq('tournament_phase', 'playoffs')
      .single();

    if (error || !completedMatch) {
      console.error('Could not find completed match:', error);
      return;
    }

    if (!completedMatch.winner_id || completedMatch.status !== 'completed') {
      console.log('Match not completed or no winner set');
      return;
    }

    console.log('Completed match data:', completedMatch);

    // Find the next round match this winner should advance to
    const nextRoundMatch = await findNextRoundMatch(completedMatch);
    
    if (!nextRoundMatch) {
      console.log('No next round match found - this might be the final');
      return;
    }

    console.log('Found next round match:', nextRoundMatch);

    // Determine which team slot the winner should fill
    await updateNextRoundMatch(nextRoundMatch, completedMatch);

  } catch (error) {
    console.error('Error advancing winner:', error);
  }
}

async function findNextRoundMatch(completedMatch: any): Promise<any> {
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

  if (error || !nextRoundMatches?.length) {
    console.log('No next round matches found');
    return null;
  }

  // For single elimination, determine which next match based on current match position
  // Simple logic: match 1,2 go to next match 1, match 3,4 go to next match 2, etc.
  const nextMatchNumber = Math.ceil(completedMatch.match_number / 2);
  const nextMatch = nextRoundMatches.find(m => m.match_number === nextMatchNumber);
  
  return nextMatch;
}

async function updateNextRoundMatch(nextMatch: any, completedMatch: any): Promise<void> {
  // Determine if winner goes to team1 or team2 slot
  // For seeded brackets: lower match numbers go to team1, higher to team2
  const isTeam1Slot = completedMatch.match_number % 2 === 1;
  
  const updateData: any = {};
  
  if (isTeam1Slot) {
    updateData.team1_id = completedMatch.winner_id;
  } else {
    updateData.team2_id = completedMatch.winner_id;
  }

  console.log('Updating next round match with:', updateData);

  const { error } = await supabase
    .from('matches')
    .update(updateData)
    .eq('id', nextMatch.id);

  if (error) {
    console.error('Error updating next round match:', error);
  } else {
    console.log(`Successfully advanced winner to ${nextMatch.bracket_position}`);
  }
}