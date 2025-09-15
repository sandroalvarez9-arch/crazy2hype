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

    // Use tournament skill levels or fallback to test data skill levels
    const availableSkillLevels = skillLevels.length > 0 ? skillLevels : ['advanced', 'intermediate', 'beginner'];
    
    // Create teamCount teams for EACH skill level
    const teamsData: any[] = [];
    
    availableSkillLevels.forEach((skillLevel, skillIndex) => {
      for (let i = 0; i < teamCount; i++) {
        // Cycle through TEST_TEAMS to get different names
        const teamIndex = (skillIndex * teamCount + i) % TEST_TEAMS.length;
        const baseTeam = TEST_TEAMS[teamIndex];
        
        teamsData.push({
          tournament_id: tournamentId,
          name: `${baseTeam.name} (${skillLevel.toUpperCase()})`,
          skill_level: skillLevel,
          division: baseTeam.division || null,
          players_count: baseTeam.players_count,
          captain_id: currentUser.id, // Use current user as captain for testing
          contact_email: baseTeam.captain_email,
          check_in_status: 'pending',
          payment_status: 'pending',
          is_registered: true,
          is_backup: false,
          is_test_data: true // Mark as test data for safe deletion
        });
      }
    });

    const { data, error } = await supabase
      .from('teams')
      .insert(teamsData)
      .select();

    if (error) throw error;

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

    // Delete matches involving test teams
    await supabase
      .from('matches')
      .delete()
      .eq('tournament_id', tournamentId)
      .or(`team1_id.in.(${testTeamIds.join(',')}),team2_id.in.(${testTeamIds.join(',')})`);

    // Delete team stats for test teams
    await supabase
      .from('team_stats')
      .delete()
      .in('team_id', testTeamIds);

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

    // Reset tournament brackets
    await supabase
      .from('tournaments')
      .update({
        brackets_generated: false,
        calculated_courts: null,
        pools_per_skill_level: null
      })
      .eq('id', tournamentId);

    return { success: true };
  } catch (error) {
    console.error('Error clearing test data:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}