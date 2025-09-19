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

interface PoolConfiguration {
  numPools: number;
  teamsPerPool: number[];
  totalMatches: number;
}

export function calculateOptimalPoolConfiguration(teamCount: number): PoolConfiguration {
  // Prioritize 4-team pools (6 matches each) over 5-team pools (10 matches each)
  // This significantly reduces tournament duration
  
  console.log(`DEBUG: calculateOptimalPoolConfiguration called with ${teamCount} teams`);
  
  if (teamCount <= 0) {
    console.log(`DEBUG: No teams, returning empty configuration`);
    return { numPools: 0, teamsPerPool: [], totalMatches: 0 };
  }
  
  if (teamCount <= 4) {
    const config = { numPools: 1, teamsPerPool: [teamCount], totalMatches: Math.floor((teamCount * (teamCount - 1)) / 2) };
    console.log(`DEBUG: Small team count (${teamCount}), returning single pool:`, config);
    return config;
  }
  
  // Calculate pools to minimize 5+ team pools
  const numFullPools = Math.floor(teamCount / 4);
  const remainder = teamCount % 4;
  
  let teamsPerPool: number[] = [];
  let numPools: number;
  
  if (remainder === 0) {
    // Perfect division by 4
    numPools = numFullPools;
    teamsPerPool = new Array(numPools).fill(4);
  } else if (remainder === 1) {
    // 1 extra team - distribute to avoid single team pool
    if (numFullPools > 0) {
      numPools = numFullPools;
      teamsPerPool = new Array(numFullPools - 1).fill(4);
      teamsPerPool.push(5); // One pool gets 5 teams
    } else {
      numPools = 1;
      teamsPerPool = [teamCount];
    }
  } else if (remainder === 2) {
    // 2 extra teams - create one pool with 2 teams or distribute
    if (numFullPools >= 2) {
      numPools = numFullPools + 1;
      teamsPerPool = new Array(numFullPools).fill(4);
      teamsPerPool.push(2);
    } else {
      numPools = numFullPools + 1;
      teamsPerPool = new Array(numFullPools).fill(4);
      teamsPerPool.push(2);
    }
  } else { // remainder === 3
    // 3 extra teams - create one pool with 3 teams
    numPools = numFullPools + 1;
    teamsPerPool = new Array(numFullPools).fill(4);
    teamsPerPool.push(3);
  }
  
  // Calculate total matches
  const totalMatches = teamsPerPool.reduce((sum, teamCount) => 
    sum + Math.floor((teamCount * (teamCount - 1)) / 2), 0);
  
  const config = { numPools, teamsPerPool, totalMatches };
  console.log(`DEBUG: Final pool configuration for ${teamCount} teams:`, config);
  
  return config;
}

export function generatePools(teams: Team[], skillLevel?: string): Pool[] {
  const config = calculateOptimalPoolConfiguration(teams.length);
  const pools: Pool[] = [];
  
  console.log(`DEBUG: generatePools called with ${teams.length} teams, skillLevel: ${skillLevel}`);
  console.log('DEBUG: Pool configuration:', config);
  
  // Create pool names (A, B, C, etc. or A1, A2, B1, B2 if skill level provided)
  for (let i = 0; i < config.numPools; i++) {
    const baseName = String.fromCharCode(65 + i);
    const poolName = skillLevel ? `${skillLevel}-${baseName}` : baseName;
    
    pools.push({
      name: poolName,
      teams: []
    });
  }
  
  console.log(`DEBUG: Created ${pools.length} pools:`, pools.map(p => p.name));
  
  // Distribute teams according to optimal configuration
  let teamIndex = 0;
  for (let poolIndex = 0; poolIndex < config.numPools; poolIndex++) {
    const teamsInThisPool = config.teamsPerPool[poolIndex];
    
    for (let i = 0; i < teamsInThisPool && teamIndex < teams.length; i++) {
      pools[poolIndex].teams.push(teams[teamIndex]);
      teamIndex++;
    }
  }
  
  console.log('DEBUG: Final pools with teams:', pools.map(p => ({ name: p.name, teamCount: p.teams.length, teamNames: p.teams.map(t => t.name) })));
  
  return pools;
}

export function generateRoundRobinMatches(pool: Pool): Match[] {
  const matches: Match[] = [];
  const teams = pool.teams;
  const teamCount = teams.length;
  let matchNumber = 1;
  
  if (teamCount < 2) return matches;
  
  // Use simple round-robin algorithm - generates matches in rounds
  // so teams get rest between games instead of playing consecutively
  
  // Create all unique pairings first
  const allPairings: { team1: Team; team2: Team }[] = [];
  for (let i = 0; i < teamCount; i++) {
    for (let j = i + 1; j < teamCount; j++) {
      allPairings.push({
        team1: teams[i],
        team2: teams[j]
      });
    }
  }
  
  // Group pairings into rounds where each team appears at most once per round
  const rounds: { team1: Team; team2: Team }[][] = [];
  const usedPairings = new Set<string>();
  
  while (usedPairings.size < allPairings.length) {
    const currentRound: { team1: Team; team2: Team }[] = [];
    const teamsInThisRound = new Set<string>();
    
    for (const pairing of allPairings) {
      const pairingKey = `${pairing.team1.id}-${pairing.team2.id}`;
      
      if (!usedPairings.has(pairingKey) && 
          !teamsInThisRound.has(pairing.team1.id) && 
          !teamsInThisRound.has(pairing.team2.id)) {
        currentRound.push(pairing);
        usedPairings.add(pairingKey);
        teamsInThisRound.add(pairing.team1.id);
        teamsInThisRound.add(pairing.team2.id);
      }
    }
    
    if (currentRound.length > 0) {
      rounds.push(currentRound);
    } else {
      // Safety break to prevent infinite loop
      break;
    }
  }
  
  // Convert rounds to matches
  rounds.forEach(roundMatches => {
    roundMatches.forEach(roundMatch => {
      matches.push({
        team1_id: roundMatch.team1.id,
        team2_id: roundMatch.team2.id,
        referee_team_id: '', // Will be assigned later
        round_number: 1, // Pool play is considered round 1
        match_number: matchNumber++,
        pool_name: pool.name,
        court_number: 1, // Will be assigned later
        scheduled_time: '', // Will be assigned later
      });
    });
  });
  
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
  numberOfCourts: number,
  warmUpDuration: number = 7
): Match[] {
  console.log(`DEBUG: scheduleMatches called with ${matches.length} matches and ${numberOfCourts} courts`);
  
  const scheduledMatches = [...matches];
  
  // Group matches by pool for pool play scheduling
  const matchesByPool = matches.reduce((acc, match) => {
    if (!acc[match.pool_name]) acc[match.pool_name] = [];
    acc[match.pool_name].push(match);
    return acc;
  }, {} as Record<string, Match[]>);
  
  console.log('DEBUG: Matches grouped by pool:', Object.keys(matchesByPool).map(poolName => ({ 
    pool: poolName, 
    matches: matchesByPool[poolName].length 
  })));
  
  // Assign each pool to a specific court
  const poolCourtAssignment = new Map<string, number>();
  const poolNames = Object.keys(matchesByPool);
  poolNames.forEach((poolName, index) => {
    const courtNumber = (index % numberOfCourts) + 1; // Round-robin assignment to courts
    poolCourtAssignment.set(poolName, courtNumber);
    console.log(`DEBUG: Assigned pool ${poolName} to court ${courtNumber}`);
  });
  
  // Initialize court schedules
  const courtSchedules = new Map<number, Date>();
  for (let court = 1; court <= numberOfCourts; court++) {
    courtSchedules.set(court, new Date(firstGameTime));
  }
  
  // Schedule matches pool by pool
  Object.entries(matchesByPool).forEach(([poolName, poolMatches]) => {
    const assignedCourt = poolCourtAssignment.get(poolName)!;
    const teamLastGameTime = new Map<string, Date>();
    
    console.log(`DEBUG: Scheduling ${poolMatches.length} matches for pool ${poolName} on court ${assignedCourt}`);
    
    poolMatches.forEach((match, index) => {
      const team1LastGame = teamLastGameTime.get(match.team1_id);
      const team2LastGame = teamLastGameTime.get(match.team2_id);
      const refTeamLastGame = match.referee_team_id ? teamLastGameTime.get(match.referee_team_id) : undefined;
      
      let courtTime = courtSchedules.get(assignedCourt)!;
      
      // Ensure teams get proper rest between games
      const minDesiredRest = (estimatedGameDuration + warmUpDuration) * 60000;
      
      if (team1LastGame) {
        const team1Rest = courtTime.getTime() - team1LastGame.getTime();
        if (team1Rest < minDesiredRest) {
          courtTime = new Date(team1LastGame.getTime() + minDesiredRest);
        }
      }
      
      if (team2LastGame) {
        const team2Rest = courtTime.getTime() - team2LastGame.getTime();
        if (team2Rest < minDesiredRest) {
          courtTime = new Date(Math.max(courtTime.getTime(), team2LastGame.getTime() + minDesiredRest));
        }
      }
      
      if (refTeamLastGame) {
        const refRest = courtTime.getTime() - refTeamLastGame.getTime();
        if (refRest < minDesiredRest) {
          courtTime = new Date(Math.max(courtTime.getTime(), refTeamLastGame.getTime() + minDesiredRest));
        }
      }
      
      // Ensure court is available
      const currentCourtTime = courtSchedules.get(assignedCourt)!;
      if (courtTime < currentCourtTime) {
        courtTime = new Date(currentCourtTime);
      }
      
      // Assign court and time
      match.court_number = assignedCourt;
      match.scheduled_time = courtTime.toISOString();
      
      console.log(`DEBUG: Match ${index + 1} in pool ${poolName}: Court ${assignedCourt} at ${courtTime.toLocaleTimeString()}`);
      
      // Update team last game times
      teamLastGameTime.set(match.team1_id, courtTime);
      teamLastGameTime.set(match.team2_id, courtTime);
      if (match.referee_team_id) {
        teamLastGameTime.set(match.referee_team_id, courtTime);
      }
      
      // Update court schedule
      const nextAvailableTime = new Date(courtTime.getTime() + (estimatedGameDuration + warmUpDuration + 5) * 60000);
      courtSchedules.set(assignedCourt, nextAvailableTime);
    });
  });
  
  return scheduledMatches;
}

interface TeamWithSkillLevel extends Team {
  skill_level?: string;
  division?: string;
}

export function generatePoolPlayScheduleBySkillLevel(
  teams: TeamWithSkillLevel[],
  firstGameTime: Date,
  estimatedGameDuration: number,
  warmUpDuration: number = 7
): { pools: Pool[], matches: Match[], requiredCourts: number, skillLevelBreakdown: Record<string, { pools: number, matches: number, teams: number }> } {
  // Group teams by division AND skill level combination
  const teamsByCategory = teams.reduce((acc, team) => {
    const division = team.division || 'open';
    const skillLevel = team.skill_level || 'open';
    const categoryKey = `${division}-${skillLevel}`;
    
    if (!acc[categoryKey]) acc[categoryKey] = [];
    acc[categoryKey].push(team);
    return acc;
  }, {} as Record<string, Team[]>);
  
  console.log('DEBUG: Teams grouped by division and skill level:', teamsByCategory);
  
  let allPools: Pool[] = [];
  let allMatches: Match[] = [];
  let totalCourts = 0;
  const skillLevelBreakdown: Record<string, { pools: number, matches: number, teams: number }> = {};
  
  // Process each division-skill combination separately
  Object.entries(teamsByCategory).forEach(([categoryKey, categoryTeams]) => {
    const [division, skillLevel] = categoryKey.split('-');
    
    // Generate optimal pools for this category
    const pools = generatePools(categoryTeams, categoryKey);
    
    // Generate matches for each pool
    let categoryMatches: Match[] = [];
    pools.forEach(pool => {
      const poolMatches = generateRoundRobinMatches(pool);
      categoryMatches = categoryMatches.concat(poolMatches);
    });
    
    // Track breakdown for this category
    skillLevelBreakdown[categoryKey] = {
      pools: pools.length,
      matches: categoryMatches.length,
      teams: categoryTeams.length
    };
    
    totalCourts += pools.length; // Each pool needs 1 court during pool play
    allPools = allPools.concat(pools);
    allMatches = allMatches.concat(categoryMatches);
  });
  
  // Step 3: Assign referees
  const matchesWithReferees = assignReferees(allMatches, teams);
  
  // Step 4: Schedule matches across calculated courts
  const scheduledMatches = scheduleMatches(
    matchesWithReferees,
    firstGameTime,
    estimatedGameDuration,
    totalCourts,
    warmUpDuration
  );
  
  return { 
    pools: allPools, 
    matches: scheduledMatches, 
    requiredCourts: totalCourts,
    skillLevelBreakdown
  };
}

// Legacy function for backward compatibility
export function generatePoolPlaySchedule(
  teams: Team[],
  firstGameTime: Date,
  estimatedGameDuration: number,
  numberOfCourts: number,
  maxTeamsPerPool: number = 6,
  warmUpDuration: number = 7
): { pools: Pool[], matches: Match[] } {
  // Use new optimal algorithm but maintain old interface
  const pools = generatePools(teams);
  
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
    numberOfCourts || pools.length, // Use pool count if no courts specified
    warmUpDuration
  );
  
  return { pools, matches: scheduledMatches };
}