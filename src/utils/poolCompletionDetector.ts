import { supabase } from "@/integrations/supabase/client";

interface PoolStats {
  poolName: string;
  totalMatches: number;
  completedMatches: number;
  isComplete: boolean;
  standings: TeamStanding[];
}

interface TeamStanding {
  teamId: string;
  teamName: string;
  wins: number;
  losses: number;
  setsWon: number;
  setsLost: number;
  setsDifferential: number;
  winPercentage: number;
}

interface PoolCompletionStatus {
  allPoolsComplete: boolean;
  totalPools: number;
  completedPools: number;
  poolStats: PoolStats[];
  readyForBrackets: boolean;
}

export async function checkPoolCompletion(tournamentId: string): Promise<PoolCompletionStatus> {
  try {
    // Get all pool play matches
    const { data: matches, error: matchesError } = await supabase
      .from('matches')
      .select('*')
      .eq('tournament_id', tournamentId)
      .eq('tournament_phase', 'pool_play')
      .order('pool_name');

    if (matchesError) throw matchesError;

    // Get team data for names
    const { data: teams, error: teamsError } = await supabase
      .from('teams')
      .select('id, name')
      .eq('tournament_id', tournamentId);

    if (teamsError) throw teamsError;

    const teamLookup = (teams || []).reduce((acc, team) => {
      acc[team.id] = team.name;
      return acc;
    }, {} as Record<string, string>);

    if (!matches || matches.length === 0) {
      return {
        allPoolsComplete: false,
        totalPools: 0,
        completedPools: 0,
        poolStats: [],
        readyForBrackets: false
      };
    }

    // Group matches by pool
    const poolGroups = matches.reduce((acc, match) => {
      const poolName = match.pool_name || 'Pool';
      if (!acc[poolName]) acc[poolName] = [];
      acc[poolName].push(match);
      return acc;
    }, {} as Record<string, any[]>);

    // Calculate stats for each pool
    const poolStats: PoolStats[] = Object.entries(poolGroups).map(([poolName, poolMatches]) => {
      const completedMatches = poolMatches.filter(m => m.status === 'completed');
      const isComplete = completedMatches.length === poolMatches.length;

      // Calculate standings for completed pools
      const standings = isComplete ? calculatePoolStandings(completedMatches, teamLookup) : [];

      return {
        poolName,
        totalMatches: poolMatches.length,
        completedMatches: completedMatches.length,
        isComplete,
        standings
      };
    });

    const completedPools = poolStats.filter(p => p.isComplete).length;
    const allPoolsComplete = completedPools === poolStats.length;

    return {
      allPoolsComplete,
      totalPools: poolStats.length,
      completedPools,
      poolStats,
      readyForBrackets: allPoolsComplete && poolStats.length > 0
    };

  } catch (error) {
    console.error('Error checking pool completion:', error);
    return {
      allPoolsComplete: false,
      totalPools: 0,
      completedPools: 0,
      poolStats: [],
      readyForBrackets: false
    };
  }
}

function calculatePoolStandings(matches: any[], teamLookup: Record<string, string>): TeamStanding[] {
  const teamStats: Record<string, Omit<TeamStanding, 'teamName' | 'winPercentage' | 'setsDifferential'>> = {};

  // Initialize team stats
  matches.forEach(match => {
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
  matches.forEach(match => {
    if (match.status === 'completed' && match.team1_id && match.team2_id) {
      const team1Stats = teamStats[match.team1_id];
      const team2Stats = teamStats[match.team2_id];

      // Determine winner from set scores
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

  // Convert to standings with calculated fields
  return Object.values(teamStats)
    .map(stats => ({
      ...stats,
      teamName: teamLookup[stats.teamId] || 'Unknown Team',
      winPercentage: stats.wins + stats.losses > 0 ? stats.wins / (stats.wins + stats.losses) : 0,
      setsDifferential: stats.setsWon - stats.setsLost
    }))
    .sort((a, b) => {
      // Sort by win percentage first
      if (a.winPercentage !== b.winPercentage) {
        return b.winPercentage - a.winPercentage;
      }
      // Then by sets differential
      if (a.setsDifferential !== b.setsDifferential) {
        return b.setsDifferential - a.setsDifferential;
      }
      // Finally by sets won
      return b.setsWon - a.setsWon;
    });
}

export function getAdvancementRecommendation(totalTeams: number) {
  if (totalTeams <= 8) {
    return {
      teamsPerPool: 1,
      reasoning: "With 8 or fewer teams, advance top team from each pool for clean bracket",
      bracketSize: Math.min(totalTeams, 8)
    };
  } else if (totalTeams <= 16) {
    return {
      teamsPerPool: 2,
      reasoning: "Advance top 2 from each pool for optimal 8-16 team bracket",
      bracketSize: Math.min(totalTeams, 16)
    };
  } else if (totalTeams <= 24) {
    return {
      teamsPerPool: 2,
      reasoning: "Advance top 2 from each pool for competitive 16+ team bracket",
      bracketSize: Math.min(totalTeams, 24)
    };
  } else {
    return {
      teamsPerPool: 3,
      reasoning: "Large tournament - advance top 3 from each pool",
      bracketSize: Math.min(totalTeams, 32)
    };
  }
}