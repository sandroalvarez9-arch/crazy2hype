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
  
  if (teamCount <= 0) {
    return { numPools: 0, teamsPerPool: [], totalMatches: 0 };
  }
  
  if (teamCount <= 4) {
    return { numPools: 1, teamsPerPool: [teamCount], totalMatches: Math.floor((teamCount * (teamCount - 1)) / 2) };
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
  
  return { numPools, teamsPerPool, totalMatches };
}

export function generatePools(teams: Team[], skillLevel?: string): Pool[] {
  const config = calculateOptimalPoolConfiguration(teams.length);
  const pools: Pool[] = [];
  
  // Create pool names (A, B, C, etc. or A1, A2, B1, B2 if skill level provided)
  for (let i = 0; i < config.numPools; i++) {
    const baseName = String.fromCharCode(65 + i);
    const poolName = skillLevel ? `${skillLevel}-${baseName}` : baseName;
    
    pools.push({
      name: poolName,
      teams: []
    });
  }
  
  // Distribute teams according to optimal configuration
  let teamIndex = 0;
  for (let poolIndex = 0; poolIndex < config.numPools; poolIndex++) {
    const teamsInThisPool = config.teamsPerPool[poolIndex];
    
    for (let i = 0; i < teamsInThisPool && teamIndex < teams.length; i++) {
      pools[poolIndex].teams.push(teams[teamIndex]);
      teamIndex++;
    }
  }
  
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
  const scheduledMatches = [...matches];
  const courtSchedules = new Map<number, Date>();
  const teamLastGameTime = new Map<string, Date>();
  
  // Initialize court schedules
  for (let court = 1; court <= numberOfCourts; court++) {
    courtSchedules.set(court, new Date(firstGameTime));
  }
  
  scheduledMatches.forEach((match, index) => {
    const team1LastGame = teamLastGameTime.get(match.team1_id);
    const team2LastGame = teamLastGameTime.get(match.team2_id);
    const refTeamLastGame = match.referee_team_id ? teamLastGameTime.get(match.referee_team_id) : undefined;
    
    // Find the best court considering back-to-back matches
    let bestCourt = 1;
    let bestTime = courtSchedules.get(1)!;
    let minRestTime = Infinity;
    
    // Check all courts to find the one that gives the most rest time for teams
    for (let court = 1; court <= numberOfCourts; court++) {
      const courtTime = courtSchedules.get(court)!;
      
      // Calculate rest time for each team
      let team1Rest = team1LastGame ? courtTime.getTime() - team1LastGame.getTime() : Infinity;
      let team2Rest = team2LastGame ? courtTime.getTime() - team2LastGame.getTime() : Infinity;
      let refRest = refTeamLastGame ? courtTime.getTime() - refTeamLastGame.getTime() : Infinity;
      
      // We want at least one game duration + warmup as rest time to avoid back-to-back
      const minDesiredRest = (estimatedGameDuration + warmUpDuration) * 60000;
      
      // Calculate how much we're violating the desired rest time
      const team1Violation = Math.max(0, minDesiredRest - team1Rest);
      const team2Violation = Math.max(0, minDesiredRest - team2Rest);
      const refViolation = refTeamLastGame ? Math.max(0, minDesiredRest - refRest) : 0;
      
      const totalViolation = team1Violation + team2Violation + refViolation;
      
      // Prefer courts with less violation, and if equal, prefer earlier time
      if (totalViolation < minRestTime || (totalViolation === minRestTime && courtTime < bestTime)) {
        minRestTime = totalViolation;
        bestTime = courtTime;
        bestCourt = court;
      }
    }
    
    // Assign court and time
    match.court_number = bestCourt;
    match.scheduled_time = bestTime.toISOString();
    
    // Update team last game times
    teamLastGameTime.set(match.team1_id, bestTime);
    teamLastGameTime.set(match.team2_id, bestTime);
    if (match.referee_team_id) {
      teamLastGameTime.set(match.referee_team_id, bestTime);
    }
    
    // Update court schedule (add game duration + warm-up + 5 minute transition)
    const nextGameTime = new Date(bestTime.getTime() + (estimatedGameDuration + warmUpDuration + 5) * 60000);
    courtSchedules.set(bestCourt, nextGameTime);
  });
  
  return scheduledMatches;
}

interface TeamWithSkillLevel extends Team {
  skill_level?: string;
}

export function generatePoolPlayScheduleBySkillLevel(
  teams: TeamWithSkillLevel[],
  firstGameTime: Date,
  estimatedGameDuration: number,
  warmUpDuration: number = 7
): { pools: Pool[], matches: Match[], requiredCourts: number, skillLevelBreakdown: Record<string, { pools: number, matches: number, teams: number }> } {
  // Group teams by skill level
  const teamsBySkillLevel = teams.reduce((acc, team) => {
    const level = team.skill_level || 'open';
    if (!acc[level]) acc[level] = [];
    acc[level].push(team);
    return acc;
  }, {} as Record<string, Team[]>);
  
  let allPools: Pool[] = [];
  let allMatches: Match[] = [];
  let totalCourts = 0;
  const skillLevelBreakdown: Record<string, { pools: number, matches: number, teams: number }> = {};
  
  // Process each skill level separately
  Object.entries(teamsBySkillLevel).forEach(([skillLevel, skillTeams]) => {
    // Generate optimal pools for this skill level
    const pools = generatePools(skillTeams, skillLevel);
    
    // Generate matches for each pool
    let skillMatches: Match[] = [];
    pools.forEach(pool => {
      const poolMatches = generateRoundRobinMatches(pool);
      skillMatches = skillMatches.concat(poolMatches);
    });
    
    // Track breakdown for this skill level
    skillLevelBreakdown[skillLevel] = {
      pools: pools.length,
      matches: skillMatches.length,
      teams: skillTeams.length
    };
    
    totalCourts += pools.length; // Each pool needs 1 court during pool play
    allPools = allPools.concat(pools);
    allMatches = allMatches.concat(skillMatches);
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