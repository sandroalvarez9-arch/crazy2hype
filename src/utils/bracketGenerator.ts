import { supabase } from "@/integrations/supabase/client";

interface TeamStanding {
  teamId: string;
  teamName: string;
  poolName: string;
  wins: number;
  losses: number;
  setsWon: number;
  setsLost: number;
  setsDifferential: number;
  winPercentage: number;
}

interface BracketMatch {
  tournament_id: string;
  round_number: number;
  match_number: number;
  team1_id: string | null;
  team2_id: string | null;
  referee_team_id: string | null;
  scheduled_time: string | null;
  court_number: number;
  tournament_phase: 'playoffs';
  bracket_position: string;
  status: 'scheduled';
  division?: string;
  skill_level?: string;
}

export async function generatePlayoffBrackets(
  tournamentId: string, 
  teamsPerPool: number
): Promise<{ success: boolean; message?: string; error?: string }> {
  try {
    // Get pool completion status first
    const { data: poolCompletionData } = await supabase
      .from('matches')
      .select('*')
      .eq('tournament_id', tournamentId)
      .eq('tournament_phase', 'pool_play')
      .order('pool_name');

    if (!poolCompletionData) {
      return { success: false, error: 'No pool play matches found' };
    }

    // Get team data with skill level and division info
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('id, name, skill_level, division')
      .eq('tournament_id', tournamentId)
      .eq('check_in_status', 'checked_in');

    if (teamsError) throw teamsError;

    const teamLookup = (teams || []).reduce((acc, team) => {
      acc[team.id] = { name: team.name, skill_level: team.skill_level, division: team.division };
      return acc;
    }, {} as Record<string, { name: string; skill_level: string; division: string }>);

    // Calculate advancement from each pool, grouped by division/skill level
    const poolStandings = calculateAllPoolStandings(poolCompletionData, teamLookup);
    
    // Group advancing teams by division and skill level
    const advancingTeamsByCategory = getAdvancingTeamsByCategory(poolStandings, teamsPerPool, teamLookup);

    if (Object.keys(advancingTeamsByCategory).length === 0) {
      return { success: false, error: 'No teams available to advance' };
    }

    // Get all teams for referee assignment (including non-advancing teams)
    const { data: allTeams } = await supabase
      .from('teams')
      .select('id, name, skill_level, division')
      .eq('tournament_id', tournamentId)
      .eq('check_in_status', 'checked_in');

    const allTeamLookup = (allTeams || []).reduce((acc, team) => {
      acc[team.id] = { name: team.name, skill_level: team.skill_level, division: team.division };
      return acc;
    }, {} as Record<string, { name: string; skill_level: string; division: string }>);

    // Generate bracket matches for each category
    let allBracketMatches: BracketMatch[] = [];
    const bracketSummary: Array<{ category: string; matches: number; teams: number }> = [];

    for (const [category, advancingTeams] of Object.entries(advancingTeamsByCategory)) {
      const [division, skillLevel] = category.split('_');
      
      const categoryMatches = generateBracketMatchesForCategory(
        advancingTeams, 
        tournamentId, 
        poolStandings, 
        allTeamLookup,
        division,
        skillLevel
      );
      
      allBracketMatches.push(...categoryMatches);
      bracketSummary.push({
        category: `${division} ${skillLevel.toUpperCase()}`,
        matches: categoryMatches.length,
        teams: advancingTeams.length
      });
    }

    // Insert bracket matches
    const { error: insertError } = await supabase
      .from('matches')
      .insert(allBracketMatches);

    if (insertError) throw insertError;

    // Update tournament to mark brackets as generated
    const { error: updateError } = await supabase
      .from('tournaments')
      .update({ 
        brackets_generated: true,
        playoff_format: {
          advancement_per_pool: teamsPerPool,
          categories: bracketSummary,
          generated_at: new Date().toISOString()
        }
      })
      .eq('id', tournamentId);

    if (updateError) throw updateError;

    // Log the action
    await supabase.rpc('log_tournament_action', {
      tournament_id: tournamentId,
      action: 'brackets_generated',
      details: {
        advancement_per_pool: teamsPerPool,
        categories: bracketSummary,
        total_matches: allBracketMatches.length
      }
    });

    const categoryDetails = bracketSummary.map(s => `${s.category} (${s.teams} teams, ${s.matches} matches)`).join(', ');
    
    return { 
      success: true, 
      message: `Generated ${allBracketMatches.length} playoff matches across ${bracketSummary.length} categories: ${categoryDetails}` 
    };

  } catch (error) {
    console.error('Error generating playoff brackets:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Unknown error' 
    };
  }
}

function calculateAllPoolStandings(matches: any[], teamLookup: Record<string, { name: string; skill_level: string; division: string }>): Record<string, TeamStanding[]> {
  const poolGroups = matches.reduce((acc, match) => {
    const poolName = match.pool_name || 'Pool';
    if (!acc[poolName]) acc[poolName] = [];
    acc[poolName].push(match);
    return acc;
  }, {} as Record<string, any[]>);

  const poolStandings: Record<string, TeamStanding[]> = {};

  Object.entries(poolGroups).forEach(([poolName, poolMatches]) => {
    const teamStats: Record<string, Omit<TeamStanding, 'teamName' | 'poolName' | 'winPercentage' | 'setsDifferential'>> = {};

    // Initialize team stats
    (poolMatches as any[]).forEach(match => {
      [match.team1_id, match.team2_id].forEach(teamId => {
        if (teamId && !teamStats[teamId]) {
          teamStats[teamId] = {
            teamId,
            wins: 0,
            losses: 0,
            setsWon: 0,
            setsLost: 0
          };
        }
      });
    });

    // Calculate stats from completed matches
    (poolMatches as any[]).forEach(match => {
      if (match.status === 'completed' && match.team1_id && match.team2_id) {
        const team1Stats = teamStats[match.team1_id];
        const team2Stats = teamStats[match.team2_id];

        const sets1 = match.sets_won_team1 || 0;
        const sets2 = match.sets_won_team2 || 0;

        team1Stats.setsWon += sets1;
        team1Stats.setsLost += sets2;
        team2Stats.setsWon += sets2;
        team2Stats.setsLost += sets1;

        if (sets1 > sets2) {
          team1Stats.wins++;
          team2Stats.losses++;
        } else if (sets2 > sets1) {
          team2Stats.wins++;
          team1Stats.losses++;
        }
      }
    });

    // Convert to standings
    poolStandings[poolName] = Object.values(teamStats)
      .map(stats => ({
        ...stats,
        teamName: teamLookup[stats.teamId]?.name || 'Unknown Team',
        poolName,
        winPercentage: stats.wins + stats.losses > 0 ? stats.wins / (stats.wins + stats.losses) : 0,
        setsDifferential: stats.setsWon - stats.setsLost
      }))
      .sort((a, b) => {
        if (a.winPercentage !== b.winPercentage) {
          return b.winPercentage - a.winPercentage;
        }
        if (a.setsDifferential !== b.setsDifferential) {
          return b.setsDifferential - a.setsDifferential;
        }
        return b.setsWon - a.setsWon;
      });
  });

  return poolStandings;
}

function getAdvancingTeamsByCategory(
  poolStandings: Record<string, TeamStanding[]>, 
  teamsPerPool: number,
  teamLookup: Record<string, { name: string; skill_level: string; division: string }>
): Record<string, TeamStanding[]> {
  const advancingTeamsByCategory: Record<string, TeamStanding[]> = {};

  Object.values(poolStandings).forEach(standings => {
    const poolAdvancers = teamsPerPool === 999 ? standings : standings.slice(0, teamsPerPool);
    
    // Group advancing teams by division and skill level
    poolAdvancers.forEach(team => {
      const teamInfo = teamLookup[team.teamId];
      if (teamInfo?.division && teamInfo?.skill_level) {
        const categoryKey = `${teamInfo.division}_${teamInfo.skill_level}`;
        
        if (!advancingTeamsByCategory[categoryKey]) {
          advancingTeamsByCategory[categoryKey] = [];
        }
        
        advancingTeamsByCategory[categoryKey].push(team);
      }
    });
  });

  // Sort teams within each category for seeding
  Object.keys(advancingTeamsByCategory).forEach(category => {
    advancingTeamsByCategory[category] = advancingTeamsByCategory[category].sort((a, b) => {
      // Pool winners first, then second place, etc.
      const aPoolPosition = Object.values(poolStandings).find(pool => 
        pool.some(team => team.teamId === a.teamId)
      )?.findIndex(team => team.teamId === a.teamId) || 0;
      
      const bPoolPosition = Object.values(poolStandings).find(pool => 
        pool.some(team => team.teamId === b.teamId)
      )?.findIndex(team => team.teamId === b.teamId) || 0;

      if (aPoolPosition !== bPoolPosition) {
        return aPoolPosition - bPoolPosition;
      }

      // Then by overall record
      if (a.winPercentage !== b.winPercentage) {
        return b.winPercentage - a.winPercentage;
      }
      if (a.setsDifferential !== b.setsDifferential) {
        return b.setsDifferential - a.setsDifferential;
      }
      return b.setsWon - a.setsWon;
    });
  });

  return advancingTeamsByCategory;
}

function generateBracketMatchesForCategory(
  advancingTeams: TeamStanding[], 
  tournamentId: string, 
  poolStandings: Record<string, TeamStanding[]>,
  allTeamLookup: Record<string, { name: string; skill_level: string; division: string }>,
  division: string,
  skillLevel: string
): BracketMatch[] {
  const numTeams = advancingTeams.length;
  
  // Find the next power of 2 that fits all teams
  const bracketSize = Math.pow(2, Math.ceil(Math.log2(numTeams)));
  const matches: BracketMatch[] = [];

  // Calculate number of rounds
  const totalRounds = Math.log2(bracketSize);

  // Find the 3rd place team (first non-advancing team) to referee first round
  const thirdPlaceTeam = findThirdPlaceTeamForCategory(poolStandings, advancingTeams, division, skillLevel, allTeamLookup);

  // Generate first round matches with seeding and referee assignment
  const firstRoundMatches = generateFirstRoundMatchesForCategory(advancingTeams, bracketSize, tournamentId, thirdPlaceTeam?.teamId || null, division, skillLevel);
  matches.push(...firstRoundMatches);

  // Generate subsequent rounds (empty matches that will be filled as previous rounds complete)
  for (let round = 2; round <= totalRounds; round++) {
    const matchesInRound = Math.pow(2, totalRounds - round);
    
    for (let matchNum = 1; matchNum <= matchesInRound; matchNum++) {
      const bracketPosition = getBracketPositionName(round, matchNum, totalRounds, division, skillLevel);
      
      matches.push({
        tournament_id: tournamentId,
        round_number: round,
        match_number: matchNum,
        team1_id: null, // Will be filled when previous round completes
        team2_id: null,
        referee_team_id: null, // Will be assigned based on previous round losers
        scheduled_time: null, // Will be scheduled when teams are determined
        court_number: 1, // Default court, can be updated
        tournament_phase: 'playoffs',
        bracket_position: bracketPosition,
        status: 'scheduled',
        division: division,
        skill_level: skillLevel
      });
    }
  }

  return matches;
}

function generateFirstRoundMatchesForCategory(teams: TeamStanding[], bracketSize: number, tournamentId: string, refereeTeamId: string | null, division: string, skillLevel: string): BracketMatch[] {
  const matches: BracketMatch[] = [];
  const numFirstRoundMatches = bracketSize / 2;
  
  // Create seeded matchups (1 vs lowest seed, 2 vs 2nd lowest, etc.)
  for (let i = 0; i < numFirstRoundMatches; i++) {
    const higherSeed = teams[i] || null;
    const lowerSeed = teams[teams.length - 1 - i] || null;
    
    // Only create match if we have at least one team
    if (higherSeed || lowerSeed) {
      matches.push({
        tournament_id: tournamentId,
        round_number: 1,
        match_number: i + 1,
        team1_id: higherSeed?.teamId || null,
        team2_id: lowerSeed?.teamId || null,
        referee_team_id: refereeTeamId, // 3rd place team refs first round
        scheduled_time: null, // Will be scheduled
        court_number: (i % 4) + 1, // Distribute across 4 courts
        tournament_phase: 'playoffs',
        bracket_position: `${division} ${skillLevel.toUpperCase()} - Round 1 - Match ${i + 1}`,
        status: 'scheduled',
        division: division,
        skill_level: skillLevel
      });
    }
  }

  return matches;
}

function findThirdPlaceTeamForCategory(
  poolStandings: Record<string, TeamStanding[]>, 
  advancingTeams: TeamStanding[], 
  division: string, 
  skillLevel: string,
  allTeamLookup: Record<string, { name: string; skill_level: string; division: string }>
): TeamStanding | null {
  // Get all teams from pools that match this category, sorted by their overall standing
  const categoryTeams: TeamStanding[] = [];
  
  Object.values(poolStandings).forEach(standings => {
    standings.forEach(team => {
      const teamInfo = allTeamLookup[team.teamId];
      if (teamInfo?.division === division && teamInfo?.skill_level === skillLevel) {
        categoryTeams.push(team);
      }
    });
  });

  // Sort all teams by their pool position and overall record
  categoryTeams.sort((a, b) => {
    // Find pool position for each team
    const aPoolPosition = Object.values(poolStandings).find(pool => 
      pool.some(team => team.teamId === a.teamId)
    )?.findIndex(team => team.teamId === a.teamId) || 0;
    
    const bPoolPosition = Object.values(poolStandings).find(pool => 
      pool.some(team => team.teamId === b.teamId)
    )?.findIndex(team => team.teamId === b.teamId) || 0;

    if (aPoolPosition !== bPoolPosition) {
      return aPoolPosition - bPoolPosition;
    }

    // Then by overall record
    if (a.winPercentage !== b.winPercentage) {
      return b.winPercentage - a.winPercentage;
    }
    if (a.setsDifferential !== b.setsDifferential) {
      return b.setsDifferential - a.setsDifferential;
    }
    return b.setsWon - a.setsWon;
  });

  // Find the first team that didn't advance (3rd place in this category)
  const advancingTeamIds = new Set(advancingTeams.map(team => team.teamId));
  return categoryTeams.find(team => !advancingTeamIds.has(team.teamId)) || null;
}

function getBracketPositionName(round: number, matchNumber: number, totalRounds: number, division?: string, skillLevel?: string): string {
  const prefix = division && skillLevel ? `${division} ${skillLevel.toUpperCase()} - ` : '';
  
  if (round === totalRounds) {
    return `${prefix}Final`;
  } else if (round === totalRounds - 1) {
    return `${prefix}${matchNumber === 1 ? 'Semifinal A' : 'Semifinal B'}`;
  } else if (round === totalRounds - 2) {
    return `${prefix}Quarterfinal ${matchNumber}`;
  } else {
    return `${prefix}Round ${round} - Match ${matchNumber}`;
  }
}