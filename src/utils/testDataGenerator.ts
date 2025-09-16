import { supabase } from "@/integrations/supabase/client";

interface TestTeamData {
  name: string;
  skill_level: string;
  division?: string;
  players_count: number;
  captain_email: string;
}

const TEST_TEAMS: TestTeamData[] = [
  // Advanced Teams
  { name: "Thunder Spikes", skill_level: "advanced", players_count: 6, captain_email: "thunder@test.com" },
  { name: "Lightning Bolts", skill_level: "advanced", players_count: 6, captain_email: "lightning@test.com" },
  { name: "Storm Chasers", skill_level: "advanced", players_count: 5, captain_email: "storm@test.com" },
  { name: "Power Hitters", skill_level: "advanced", players_count: 6, captain_email: "power@test.com" },
  
  // Intermediate Teams
  { name: "Net Ninjas", skill_level: "intermediate", players_count: 5, captain_email: "ninjas@test.com" },
  { name: "Spike Masters", skill_level: "intermediate", players_count: 6, captain_email: "spike@test.com" },
  { name: "Court Kings", skill_level: "intermediate", players_count: 5, captain_email: "kings@test.com" },
  { name: "Volleyball Vipers", skill_level: "intermediate", players_count: 6, captain_email: "vipers@test.com" },
  { name: "Beach Bombers", skill_level: "intermediate", players_count: 5, captain_email: "bombers@test.com" },
  { name: "Sand Sharks", skill_level: "intermediate", players_count: 6, captain_email: "sharks@test.com" },
  
  // Beginner Teams
  { name: "Rookie Rockets", skill_level: "beginner", players_count: 4, captain_email: "rockets@test.com" },
  { name: "New Nets", skill_level: "beginner", players_count: 5, captain_email: "newnets@test.com" },
  { name: "First Timers", skill_level: "beginner", players_count: 4, captain_email: "first@test.com" },
  { name: "Learning Legends", skill_level: "beginner", players_count: 5, captain_email: "legends@test.com" },
  { name: "Practice Players", skill_level: "beginner", players_count: 4, captain_email: "practice@test.com" },
  { name: "Starter Squad", skill_level: "beginner", players_count: 5, captain_email: "starters@test.com" },
];

export async function generateTestTeams(tournamentId: string, teamCount: number = 12, skillLevels: string[] = []) {
  try {
    const currentUser = (await supabase.auth.getUser()).data.user;
    if (!currentUser) throw new Error("Not authenticated");

    // Get tournament info to use the correct skill levels and divisions
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('skill_levels, divisions, skill_levels_by_division')
      .eq('id', tournamentId)
      .single();

    const divisions = tournament?.divisions || [];
    const skillLevelsByDivision = tournament?.skill_levels_by_division || {};

    console.log('Tournament divisions:', divisions);
    console.log('Skill levels by division:', skillLevelsByDivision);

    // Check for existing test teams first
    const { data: existingTestTeams } = await supabase
      .from('teams')
      .select('name')
      .eq('tournament_id', tournamentId)
      .eq('is_test_data', true);

    const existingNames = new Set(existingTestTeams?.map(team => team.name) || []);
    
    // Create teams for each division and skill level combination
    const teamsData: any[] = [];
    
    divisions.forEach((division) => {
      const divisionSkillLevels = skillLevelsByDivision[division] || tournament?.skill_levels || ['open', 'a', 'bb'];
      
      divisionSkillLevels.forEach((skillLevel, skillIndex) => {
        for (let i = 0; i < teamCount; i++) {
          // Cycle through TEST_TEAMS to get different names
          const teamIndex = (skillIndex * teamCount + i) % TEST_TEAMS.length;
          const baseTeam = TEST_TEAMS[teamIndex];
          
          // Create team name that includes both division and skill level
          const divisionAbbrev = division.charAt(0).toUpperCase(); // M for men, W for women
          const skillAbbrev = skillLevel.toUpperCase();
          const teamName = `${baseTeam.name} (${divisionAbbrev}-${skillAbbrev})`;
          
          // Skip if team with this name already exists
          if (existingNames.has(teamName)) {
            console.log('Skipping existing team:', teamName);
            continue;
          }
          
          teamsData.push({
            tournament_id: tournamentId,
            name: teamName,
            skill_level: skillLevel, 
            division: division, // Assign the division
            players_count: baseTeam.players_count,
            captain_id: currentUser.id,
            contact_email: baseTeam.captain_email,
            check_in_status: 'pending',
            payment_status: 'pending',
            is_registered: true,
            is_backup: false,
            is_test_data: true
          });
        }
      });
    });

    // If no divisions, fall back to skill levels only
    if (divisions.length === 0) {
      const availableSkillLevels = skillLevels.length > 0 
        ? skillLevels 
        : tournament?.skill_levels || ['open', 'a', 'bb'];

      availableSkillLevels.forEach((skillLevel, skillIndex) => {
        for (let i = 0; i < teamCount; i++) {
          const teamIndex = (skillIndex * teamCount + i) % TEST_TEAMS.length;
          const baseTeam = TEST_TEAMS[teamIndex];
          const teamName = `${baseTeam.name} (${skillLevel.toUpperCase()})`;
          
          if (existingNames.has(teamName)) {
            continue;
          }
          
          teamsData.push({
            tournament_id: tournamentId,
            name: teamName,
            skill_level: skillLevel,
            division: null,
            players_count: baseTeam.players_count,
            captain_id: currentUser.id,
            contact_email: baseTeam.captain_email,
            check_in_status: 'pending',
            payment_status: 'pending',
            is_registered: true,
            is_backup: false,
            is_test_data: true
          });
        }
      });
    }

    // If no new teams to create, return early
    if (teamsData.length === 0) {
      return { success: true, teams: [], count: 0, message: 'All test teams already exist' };
    }

    console.log('Creating teams with divisions and skill levels:', 
      teamsData.map(t => `${t.name}: ${t.division}-${t.skill_level}`));

    const { data, error } = await supabase
      .from('teams')
      .insert(teamsData)
      .select();

    if (error) throw error;

    console.log('Successfully created teams:', 
      data?.map(t => `${t.name} (${t.division}-${t.skill_level})`));

    return { success: true, teams: data, count: data?.length || 0 };
  } catch (error) {
    console.error('Error generating test teams:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function simulateCheckins(tournamentId: string, checkinPercentage: number = 0.8) {
  try {
    const { data: teams, error } = await supabase
      .from('teams')
      .select('*')
      .eq('tournament_id', tournamentId)
      .eq('check_in_status', 'pending')
      .eq('is_test_data', true); // Only simulate checkins for test teams

    if (error) throw error;
    if (!teams) return { success: false, error: 'No pending teams found' };

    // Randomly select teams to check in based on percentage
    const teamsToCheckIn = teams
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.floor(teams.length * checkinPercentage));

    const updates = teamsToCheckIn.map(team => ({
      id: team.id,
      check_in_status: 'checked_in',
      check_in_time: new Date().toISOString()
    }));

    for (const update of updates) {
      await supabase
        .from('teams')
        .update({
          check_in_status: update.check_in_status,
          check_in_time: update.check_in_time
        })
        .eq('id', update.id);
    }

    return { success: true, checkedInCount: updates.length };
  } catch (error) {
    console.error('Error simulating check-ins:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function simulatePayments(tournamentId: string, paymentPercentage: number = 0.9) {
  try {
    const { data: teams, error } = await supabase
      .from('teams')
      .select('*')
      .eq('tournament_id', tournamentId)
      .eq('payment_status', 'pending')
      .eq('is_test_data', true); // Only simulate payments for test teams

    if (error) throw error;
    if (!teams) return { success: false, error: 'No pending payments found' };

    const teamsToPayment = teams
      .sort(() => Math.random() - 0.5)
      .slice(0, Math.floor(teams.length * paymentPercentage));

    const paymentMethods = ['venmo', 'paypal', 'cash', 'zelle'];

    for (const team of teamsToPayment) {
      await supabase
        .from('teams')
        .update({
          payment_status: 'paid',
          payment_date: new Date().toISOString(),
          payment_method: paymentMethods[Math.floor(Math.random() * paymentMethods.length)],
          payment_notes: 'Test payment simulation'
        })
        .eq('id', team.id);
    }

    return { success: true, paidCount: teamsToPayment.length };
  } catch (error) {
    console.error('Error simulating payments:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function simulatePoolPlayResults(tournamentId: string) {
  try {
    // Get tournament settings for scoring
    const { data: tournament, error: tournamentError } = await supabase
      .from('tournaments')
      .select('sets_per_game, points_per_set, must_win_by, deciding_set_points, uses_phase_formats, pool_play_format')
      .eq('id', tournamentId)
      .single();

    if (tournamentError) throw tournamentError;

    // Get all pool play matches that haven't been completed yet
    const { data: matches, error: matchesError } = await supabase
      .from('matches')
      .select('*')
      .eq('tournament_id', tournamentId)
      .in('tournament_phase', ['pool_play', null]) // Handle both explicit pool_play and null values
      .neq('status', 'completed');

    if (matchesError) throw matchesError;
    if (!matches || matches.length === 0) {
      return { success: false, error: 'No pool play matches found to simulate' };
    }

    const updates = [];
    for (const match of matches) {
      // Generate realistic volleyball scores
      const simulatedResult = generateRealisticVolleyballScore(tournament, match);
      
      updates.push({
        id: match.id,
        ...simulatedResult,
        status: 'completed',
        completed_at: new Date().toISOString()
      });
    }

    // Update all matches with simulated results
    for (const update of updates) {
      await supabase
        .from('matches')
        .update(update)
        .eq('id', update.id);
    }

    // Update team statistics after simulating matches
    await updateTeamStatsFromMatches(tournamentId);

    return { success: true, matchesSimulated: updates.length };
  } catch (error) {
    console.error('Error simulating pool play results:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

function generateRealisticVolleyballScore(tournament: any, match: any) {
  const setsPerGame = tournament.sets_per_game || 3;
  const pointsPerSet = tournament.points_per_set || 25;
  const mustWinBy = tournament.must_win_by || 2;
  const decidingSetPoints = tournament.deciding_set_points || 15;

  const setScores: Record<string, any> = {};
  let setsWonTeam1 = 0;
  let setsWonTeam2 = 0;
  let totalPointsTeam1 = 0;
  let totalPointsTeam2 = 0;

  // Determine match outcome (60% chance for close match, 40% for blowout)
  const isCloseMatch = Math.random() < 0.6;
  const team1IsStronger = Math.random() < 0.5;

  for (let set = 1; set <= setsPerGame; set++) {
    // Stop if someone already won majority of sets
    const setsNeededToWin = Math.ceil(setsPerGame / 2);
    if (setsWonTeam1 >= setsNeededToWin || setsWonTeam2 >= setsNeededToWin) break;

    const isDecidingSet = set === setsPerGame;
    const targetPoints = isDecidingSet ? decidingSetPoints : pointsPerSet;
    
    let team1Points, team2Points;
    
    if (isCloseMatch) {
      // Close match - scores within 3-5 points
      const margin = Math.floor(Math.random() * 3) + mustWinBy;
      const baseScore = Math.max(targetPoints - 5, targetPoints - 3);
      
      if ((team1IsStronger && Math.random() < 0.7) || (!team1IsStronger && Math.random() < 0.3)) {
        team1Points = targetPoints;
        team2Points = Math.max(baseScore, targetPoints - margin);
      } else {
        team2Points = targetPoints;
        team1Points = Math.max(baseScore, targetPoints - margin);
      }
    } else {
      // Blowout - larger margin
      const margin = Math.floor(Math.random() * 8) + 5;
      
      if ((team1IsStronger && Math.random() < 0.8) || (!team1IsStronger && Math.random() < 0.2)) {
        team1Points = targetPoints;
        team2Points = Math.max(10, targetPoints - margin);
      } else {
        team2Points = targetPoints;
        team1Points = Math.max(10, targetPoints - margin);
      }
    }

    // Handle deuce situations (must win by required margin)
    if (Math.abs(team1Points - team2Points) < mustWinBy && Math.max(team1Points, team2Points) >= targetPoints) {
      const extraPoints = Math.floor(Math.random() * 4) + mustWinBy;
      if (team1Points > team2Points) {
        team1Points = targetPoints + extraPoints;
        team2Points = team1Points - mustWinBy;
      } else {
        team2Points = targetPoints + extraPoints;
        team1Points = team2Points - mustWinBy;
      }
    }

    setScores[`set${set}`] = { team1: team1Points, team2: team2Points };
    totalPointsTeam1 += team1Points;
    totalPointsTeam2 += team2Points;

    if (team1Points > team2Points) setsWonTeam1++;
    else setsWonTeam2++;
  }

  // Determine the actual winner using the match's team IDs
  const winnerId = setsWonTeam1 > setsWonTeam2 ? match.team1_id : match.team2_id;

  return {
    set_scores: setScores,
    sets_won_team1: setsWonTeam1,
    sets_won_team2: setsWonTeam2,
    team1_score: totalPointsTeam1,
    team2_score: totalPointsTeam2,
    winner_id: winnerId,
  };
}

async function updateTeamStatsFromMatches(tournamentId: string) {
  // Get all completed matches for this tournament
  const { data: matches } = await supabase
    .from('matches')
    .select('*')
    .eq('tournament_id', tournamentId)
    .eq('status', 'completed');

  if (!matches) return;

  // Calculate stats for each team
  const teamStats: Record<string, any> = {};

  matches.forEach(match => {
    const { team1_id, team2_id, sets_won_team1, sets_won_team2, team1_score, team2_score } = match;
    
    if (team1_id && team2_id) {
      // Initialize team stats if not exists
      if (!teamStats[team1_id]) {
        teamStats[team1_id] = { matches_played: 0, matches_won: 0, matches_lost: 0, points_for: 0, points_against: 0 };
      }
      if (!teamStats[team2_id]) {
        teamStats[team2_id] = { matches_played: 0, matches_won: 0, matches_lost: 0, points_for: 0, points_against: 0 };
      }

      // Update stats
      teamStats[team1_id].matches_played++;
      teamStats[team2_id].matches_played++;
      teamStats[team1_id].points_for += team1_score;
      teamStats[team1_id].points_against += team2_score;
      teamStats[team2_id].points_for += team2_score;
      teamStats[team2_id].points_against += team1_score;

      if (sets_won_team1 > sets_won_team2) {
        teamStats[team1_id].matches_won++;
        teamStats[team2_id].matches_lost++;
      } else {
        teamStats[team2_id].matches_won++;
        teamStats[team1_id].matches_lost++;
      }
    }
  });

  // Upsert team stats
  const statsUpdates = Object.entries(teamStats).map(([teamId, stats]) => ({
    team_id: teamId,
    tournament_id: tournamentId,
    ...stats,
    win_percentage: stats.matches_played > 0 ? stats.matches_won / stats.matches_played : 0
  }));

  for (const statUpdate of statsUpdates) {
    await supabase
      .from('team_stats')
      .upsert(statUpdate, { onConflict: 'team_id,tournament_id' });
  }
}

export async function clearTestData(tournamentId: string) {
  try {
    // Get test team IDs first
    const { data: testTeams, error: testTeamsError } = await supabase
      .from('teams')
      .select('id')
      .eq('tournament_id', tournamentId)
      .eq('is_test_data', true);

    if (testTeamsError) throw testTeamsError;
    if (!testTeams || testTeams.length === 0) {
      return { success: true, message: 'No test teams found to clear' };
    }

    const testTeamIds = testTeams.map(team => team.id);

    // Get test player IDs for contact cleanup
    const { data: testPlayers } = await supabase
      .from('players')
      .select('id')
      .in('team_id', testTeamIds);

    const testPlayerIds = testPlayers?.map(player => player.id) || [];

    // Delete player contacts for test teams
    if (testPlayerIds.length > 0) {
      await supabase
        .from('player_contacts')
        .delete()
        .in('player_id', testPlayerIds);
    }

    // Delete ALL matches for the tournament (not just test team matches)
    // This ensures we can regenerate everything cleanly
    await supabase
      .from('matches')
      .delete()
      .eq('tournament_id', tournamentId);

    // Delete ALL team stats for the tournament
    await supabase
      .from('team_stats')
      .delete()
      .eq('tournament_id', tournamentId);

    // Delete players for test teams
    await supabase
      .from('players')
      .delete()
      .in('team_id', testTeamIds);

    // Delete test teams only
    const { error } = await supabase
      .from('teams')
      .delete()
      .eq('tournament_id', tournamentId)
      .eq('is_test_data', true);

    if (error) throw error;

    // Comprehensive tournament reset for fresh testing
    await supabase
      .from('tournaments')
      .update({
        brackets_generated: false,
        calculated_courts: null,
        pools_per_skill_level: null,
        bracket_version: 1,
        pool_play_format: null,
        playoff_format: null
      })
      .eq('id', tournamentId);

    return { success: true, message: 'All test data cleared successfully - tournament reset for fresh testing' };
  } catch (error) {
    console.error('Error clearing test data:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}