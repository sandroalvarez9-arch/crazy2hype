interface Team {
  id: string;
  name: string;
}

interface Match {
  team1_id: string;
  team2_id: string;
  referee_team_id: string;
  round_number: number;
  match_number: number;
  pool_name: string;
  court_number: number;
  scheduled_time: string;
}

interface Pool {
  name: string;
  teams: Team[];
}

export function generatePools(teams: Team[], maxTeamsPerPool: number = 6): Pool[] {
  const numPools = Math.ceil(teams.length / maxTeamsPerPool);
  const pools: Pool[] = [];
  
  // Create pool names (A, B, C, etc.)
  for (let i = 0; i < numPools; i++) {
    pools.push({
      name: String.fromCharCode(65 + i), // A, B, C, etc.
      teams: []
    });
  }
  
  // Distribute teams evenly across pools using snake draft
  for (let i = 0; i < teams.length; i++) {
    const poolIndex = i % numPools;
    pools[poolIndex].teams.push(teams[i]);
  }
  
  return pools;
}

export function generateRoundRobinMatches(pool: Pool): Match[] {
  const matches: Match[] = [];
  const teams = pool.teams;
  let matchNumber = 1;
  
  // Generate all possible matches within the pool (round robin)
  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      matches.push({
        team1_id: teams[i].id,
        team2_id: teams[j].id,
        referee_team_id: '', // Will be assigned later
        round_number: 1, // Pool play is considered round 1
        match_number: matchNumber++,
        pool_name: pool.name,
        court_number: 1, // Will be assigned later
        scheduled_time: '', // Will be assigned later
      });
    }
  }
  
  return matches;
}

export function assignReferees(matches: Match[], allTeams: Team[]): Match[] {
  const assignedMatches = [...matches];
  const teamRefereeDuties = new Map<string, number>();
  
  // Initialize referee duty count for all teams
  allTeams.forEach(team => {
    teamRefereeDuties.set(team.id, 0);
  });
  
  assignedMatches.forEach(match => {
    // Find teams that are not playing in this match
    const availableReferees = allTeams.filter(team => 
      team.id !== match.team1_id && team.id !== match.team2_id
    );
    
    // Sort by least number of referee duties assigned
    availableReferees.sort((a, b) => 
      (teamRefereeDuties.get(a.id) || 0) - (teamRefereeDuties.get(b.id) || 0)
    );
    
    if (availableReferees.length > 0) {
      const refereeTeam = availableReferees[0];
      match.referee_team_id = refereeTeam.id;
      teamRefereeDuties.set(refereeTeam.id, (teamRefereeDuties.get(refereeTeam.id) || 0) + 1);
    }
  });
  
  return assignedMatches;
}

export function scheduleMatches(
  matches: Match[],
  firstGameTime: Date,
  estimatedGameDuration: number,
  numberOfCourts: number
): Match[] {
  const scheduledMatches = [...matches];
  const courtSchedules = new Map<number, Date>();
  
  // Initialize court schedules
  for (let court = 1; court <= numberOfCourts; court++) {
    courtSchedules.set(court, new Date(firstGameTime));
  }
  
  scheduledMatches.forEach((match, index) => {
    // Find the court that's available earliest
    let earliestCourt = 1;
    let earliestTime = courtSchedules.get(1)!;
    
    for (let court = 2; court <= numberOfCourts; court++) {
      const courtTime = courtSchedules.get(court)!;
      if (courtTime < earliestTime) {
        earliestTime = courtTime;
        earliestCourt = court;
      }
    }
    
    // Assign court and time
    match.court_number = earliestCourt;
    match.scheduled_time = earliestTime.toISOString();
    
    // Update court schedule (add game duration + 10 minute break)
    const nextGameTime = new Date(earliestTime.getTime() + (estimatedGameDuration + 10) * 60000);
    courtSchedules.set(earliestCourt, nextGameTime);
  });
  
  return scheduledMatches;
}

export function generatePoolPlaySchedule(
  teams: Team[],
  firstGameTime: Date,
  estimatedGameDuration: number,
  numberOfCourts: number,
  maxTeamsPerPool: number = 6
): { pools: Pool[], matches: Match[] } {
  // Step 1: Generate pools
  const pools = generatePools(teams, maxTeamsPerPool);
  
  // Step 2: Generate matches for each pool
  let allMatches: Match[] = [];
  pools.forEach(pool => {
    const poolMatches = generateRoundRobinMatches(pool);
    allMatches = allMatches.concat(poolMatches);
  });
  
  // Step 3: Assign referees
  const matchesWithReferees = assignReferees(allMatches, teams);
  
  // Step 4: Schedule matches across courts
  const scheduledMatches = scheduleMatches(
    matchesWithReferees,
    firstGameTime,
    estimatedGameDuration,
    numberOfCourts
  );
  
  return { pools, matches: scheduledMatches };
}