import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { generatePoolPlayScheduleBySkillLevel } from "@/utils/poolPlayGenerator";
import { OptimalPoolPreview } from "@/components/OptimalPoolPreview";
import { format } from "date-fns";
import { Trophy, Users, Clock, AlertTriangle, MapPin } from "lucide-react";

interface Team {
  id: string;
  name: string;
  check_in_status: string;
  skill_level?: string;
  division?: string;
}

interface Tournament {
  id: string;
  title: string;
  first_game_time?: string;
  start_date: string;
  estimated_game_duration: number;
  warm_up_duration?: number;
  number_of_courts?: number;
  calculated_courts?: number;
  skill_levels: string[];
  tournament_format: string;
  brackets_generated: boolean;
}

interface PoolPlayManagerProps {
  tournament: Tournament;
  teams: Team[];
  onBracketsGenerated: () => void;
}

interface GeneratedPool {
  name: string;
  teams: Team[];
  court_number?: number;
  matches_count?: number;
}

export function PoolPlayManager({ tournament, teams, onBracketsGenerated }: PoolPlayManagerProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedPools, setGeneratedPools] = useState<GeneratedPool[]>([]);
  const [selectedDivision, setSelectedDivision] = useState<string | null>(null);
  const { toast } = useToast();

  const checkedInTeams = teams.filter(team => team.check_in_status === 'checked_in');
  const canGenerateBrackets = checkedInTeams.length >= 4 && !tournament.brackets_generated;

  // Fetch generated pools data when brackets are already generated
  useEffect(() => {
    if (tournament.brackets_generated) {
      fetchGeneratedPools();
    }
  }, [tournament.brackets_generated, tournament.id]);

  const fetchGeneratedPools = async () => {
    try {
      // Fetch matches to reconstruct pool information
      const { data: matches, error } = await supabase
        .from('matches')
        .select(`
          pool_name,
          court_number,
          team1_id,
          team2_id,
          teams!matches_team1_id_fkey(id, name, skill_level),
          teams_team2:teams!matches_team2_id_fkey(id, name, skill_level)
        `)
        .eq('tournament_id', tournament.id)
        .eq('tournament_phase', 'pool_play');

      if (error) throw error;

      // Group matches by pool and reconstruct pool data
      const poolsMap = new Map<string, { teams: Set<string>, teamData: Team[], court_number: number, matches_count: number }>();

      matches?.forEach(match => {
        if (!match.pool_name) return;
        
        if (!poolsMap.has(match.pool_name)) {
          poolsMap.set(match.pool_name, {
            teams: new Set(),
            teamData: [],
            court_number: match.court_number || 1,
            matches_count: 0
          });
        }

        const poolData = poolsMap.get(match.pool_name)!;
        poolData.matches_count++;

        // Add teams to the pool
        if (match.teams && !poolData.teams.has(match.team1_id)) {
          poolData.teams.add(match.team1_id);
          poolData.teamData.push(match.teams as any);
        }
        if (match.teams_team2 && !poolData.teams.has(match.team2_id)) {
          poolData.teams.add(match.team2_id);
          poolData.teamData.push(match.teams_team2 as any);
        }
      });

      // Convert to GeneratedPool format
      const pools: GeneratedPool[] = Array.from(poolsMap.entries()).map(([name, data]) => ({
        name,
        teams: data.teamData,
        court_number: data.court_number,
        matches_count: data.matches_count
      }));

      setGeneratedPools(pools);
    } catch (error) {
      console.error('Error fetching generated pools:', error);
    }
  };

  const firstGameDate = (() => {
    const t = tournament.first_game_time;
    
    console.log("DEBUG: tournament.first_game_time:", t);
    console.log("DEBUG: tournament.start_date:", tournament.start_date);
    
    // If first_game_time is set and it's a time format (e.g., "09:00" or "09:00:00"), combine with start date
    if (t && t.match(/^\d{2}:\d{2}(:\d{2})?$/)) {
      const startDate = new Date(tournament.start_date);
      const timeParts = t.split(':').map(Number);
      const hours = timeParts[0];
      const minutes = timeParts[1];
      const seconds = timeParts[2] || 0; // Default to 0 if no seconds provided
      startDate.setHours(hours, minutes, seconds, 0);
      console.log("DEBUG: Parsed time format result:", startDate);
      return startDate;
    }
    
    // If first_game_time is a full date/time, use it
    if (t) {
      const d = new Date(t);
      console.log("DEBUG: Parsed full date format result:", d);
      if (!isNaN(d.getTime())) return d;
    }
    
    // Fall back to tournament start_date
    const startDate = new Date(tournament.start_date);
    console.log("DEBUG: Fallback to start_date result:", startDate);
    return isNaN(startDate.getTime()) ? null : startDate;
  })();

  const handleGeneratePoolPlay = async () => {
    if (!canGenerateBrackets) return;

    setIsGenerating(true);
    try {
      let firstGameTime: Date;
      
      console.log("DEBUG: Generation - tournament.first_game_time:", tournament.first_game_time);
      console.log("DEBUG: Generation - tournament.start_date:", tournament.start_date);
      
      // Handle time format (e.g., "09:00" or "09:00:00")
      if (tournament.first_game_time?.match(/^\d{2}:\d{2}(:\d{2})?$/)) {
        const startDate = new Date(tournament.start_date);
        const timeParts = tournament.first_game_time.split(':').map(Number);
        const hours = timeParts[0];
        const minutes = timeParts[1];
        const seconds = timeParts[2] || 0; // Default to 0 if no seconds provided
        firstGameTime = new Date(startDate);
        firstGameTime.setHours(hours, minutes, seconds, 0);
        console.log("DEBUG: Generated firstGameTime from time format:", firstGameTime);
      } else if (tournament.first_game_time) {
        firstGameTime = new Date(tournament.first_game_time);
        console.log("DEBUG: Generated firstGameTime from full date:", firstGameTime);
      } else {
        // Use tournament start date as fallback
        firstGameTime = new Date(tournament.start_date);
        console.log("DEBUG: Generated firstGameTime from start_date fallback:", firstGameTime);
      }
      
      if (isNaN(firstGameTime.getTime())) {
        toast({
          title: "Invalid tournament date",
          description: "Tournament start date is invalid. Please check tournament settings.",
          variant: "destructive",
        });
        setIsGenerating(false);
        return;
      }
      
      // Generate pools and matches using new optimal algorithm
      const { pools, matches, requiredCourts, skillLevelBreakdown } = generatePoolPlayScheduleBySkillLevel(
        checkedInTeams as any,
        firstGameTime,
        tournament.estimated_game_duration,
        tournament.warm_up_duration || 7
      );

      // Insert all matches into the database
      const matchInserts = matches.map(match => ({
        tournament_id: tournament.id,
        team1_id: match.team1_id,
        team2_id: match.team2_id,
        referee_team_id: match.referee_team_id || null,
        round_number: match.round_number,
        match_number: match.match_number,
        pool_name: match.pool_name,
        court_number: match.court_number,
        scheduled_time: match.scheduled_time,
        tournament_phase: 'pool_play',
        status: 'scheduled'
      }));

      const { error: matchError } = await supabase
        .from('matches')
        .insert(matchInserts);

      if (matchError) throw matchError;

      // Update tournament with calculated courts and pool breakdown
      const { error: tournamentError } = await supabase
        .from('tournaments')
        .update({ 
          brackets_generated: true,
          calculated_courts: requiredCourts,
          pools_per_skill_level: skillLevelBreakdown
        })
        .eq('id', tournament.id);

      if (tournamentError) throw tournamentError;

      // Log the action
      await supabase.rpc('log_tournament_action', {
        tournament_id: tournament.id,
        action: 'Pool play generated',
        details: {
          num_pools: pools.length,
          num_matches: matches.length,
          num_teams: checkedInTeams.length,
          required_courts: requiredCourts,
          skill_level_breakdown: skillLevelBreakdown
        }
      });

      toast({
        title: "Pool play generated successfully!",
        description: `Created ${pools.length} pools with ${matches.length} matches across ${requiredCourts} courts.`,
      });

      // Refresh the pools display
      await fetchGeneratedPools();
      
      onBracketsGenerated();
    } catch (error) {
      console.error('Error generating pool play:', error);
      toast({
        title: "Error generating pool play",
        description: "There was an error creating the tournament schedule. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };


  return (
    <div className="space-y-6">
      {!tournament.brackets_generated ? (
        <>
          <OptimalPoolPreview 
            checkedInTeams={checkedInTeams}
            skillLevels={tournament.skill_levels}
            estimatedGameDuration={tournament.estimated_game_duration}
          />
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Generate Pool Play
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{checkedInTeams.length} Teams Checked In</div>
                    <div className="text-sm text-muted-foreground">Ready for pool play</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">
                      {firstGameDate ? format(firstGameDate, "MMM dd, h:mm a") : "First game time not set"}
                    </div>
                    <div className="text-sm text-muted-foreground">First game starts</div>
                  </div>
                </div>
              </div>

              <Button
                onClick={handleGeneratePoolPlay}
                disabled={!canGenerateBrackets || isGenerating}
                className="w-full"
                size="lg"
              >
                {isGenerating ? 'Generating Optimal Pool Play...' : 'Generate Pool Play with Optimal Courts'}
              </Button>

              {!canGenerateBrackets && checkedInTeams.length < 4 && (
                <div className="p-4 border border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950 rounded-lg flex items-start gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-orange-800 dark:text-orange-200">Cannot Generate Pool Play</h4>
                    <p className="text-sm text-orange-700 dark:text-orange-300">
                      At least 4 teams must be checked in before pool play can be generated. 
                      Currently {checkedInTeams.length} teams are checked in.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Pool Play Generated
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {tournament.calculated_courts && (
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-green-600" />
                    <div>
                      <div className="font-medium">{tournament.calculated_courts} Courts</div>
                      <div className="text-sm text-muted-foreground">Calculated optimally</div>
                    </div>
                  </div>
                )}
                
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{checkedInTeams.length} Teams</div>
                    <div className="text-sm text-muted-foreground">In tournament</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">
                      {firstGameDate ? format(firstGameDate, "h:mm a") : "Time not set"}
                    </div>
                    <div className="text-sm text-muted-foreground">Started</div>
                  </div>
                </div>
              </div>
              
              <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                <h4 className="font-medium text-green-800 dark:text-green-200 mb-1">Pool Play Active</h4>
                <p className="text-sm text-green-700 dark:text-green-300">
                  Pool play has been generated with optimal court allocation and referee assignments. 
                  View the matches tab to see the complete schedule.
                </p>
              </div>

              {/* Display Generated Pools with Division-Skill Level Tabs */}
              {generatedPools.length > 0 && (() => {
                // Group pools by division-skill level combination
                const poolsByCategory = generatedPools.reduce((acc, pool) => {
                  // Extract division and skill from pool name (e.g., "men-a-A" -> "men-a", "women-bb-B" -> "women-bb")
                  const poolNameParts = pool.name.split('-');
                  let categoryKey = 'open';
                  
                  if (poolNameParts.length >= 2) {
                    const division = poolNameParts[0];
                    const skillLevel = poolNameParts[1];
                    categoryKey = `${division}-${skillLevel}`;
                  }
                  
                  if (!acc[categoryKey]) acc[categoryKey] = [];
                  acc[categoryKey].push(pool);
                  return acc;
                }, {} as Record<string, GeneratedPool[]>);

                const categories = Object.keys(poolsByCategory).sort();
                
                // Auto-select first category if none selected
                if (!selectedDivision && categories.length > 0) {
                  setSelectedDivision(categories[0]);
                }

                // Format category names for display
                const formatCategoryName = (category: string) => {
                  if (category === 'open') return 'Open';
                  
                  const [division, skillLevel] = category.split('-');
                  const divisionName = division.charAt(0).toUpperCase() + division.slice(1);
                  const skillName = skillLevel.toUpperCase();
                  
                  return `${divisionName} ${skillName}`;
                };

                return (
                  <div className="space-y-4">
                    <h4 className="font-medium flex items-center gap-2">
                      <Trophy className="h-4 w-4" />
                      Pool Breakdown by Division & Skill Level
                    </h4>
                    
                    {categories.length > 1 ? (
                      <Tabs value={selectedDivision || categories[0]} onValueChange={setSelectedDivision} className="w-full">
                        <div className="w-full overflow-x-auto pb-1">
                          <TabsList className="flex justify-start w-max min-w-full h-10 p-1 gap-1 bg-muted rounded-md">
                            {categories.map((category) => {
                              const poolCount = poolsByCategory[category].length;
                              const teamCount = poolsByCategory[category].reduce((sum, pool) => sum + pool.teams.length, 0);
                              
                              return (
                                <TabsTrigger 
                                  key={category} 
                                  value={category}
                                  className="flex-shrink-0 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3"
                                >
                                  {formatCategoryName(category)}
                                  <div className="ml-2 flex gap-1">
                                    <Badge variant="secondary" className="text-xs">
                                      {poolCount} pool{poolCount !== 1 ? 's' : ''}
                                    </Badge>
                                    <Badge variant="outline" className="text-xs">
                                      {teamCount} team{teamCount !== 1 ? 's' : ''}
                                    </Badge>
                                  </div>
                                </TabsTrigger>
                              );
                            })}
                          </TabsList>
                        </div>
                        
                        {categories.map((category) => (
                          <TabsContent key={category} value={category} className="space-y-4">
                            <div className="mb-4 p-4 bg-muted/50 rounded-lg">
                              <h5 className="font-semibold text-lg mb-2">{formatCategoryName(category)} Division</h5>
                              <div className="flex gap-4 text-sm text-muted-foreground">
                                <span>{poolsByCategory[category].length} pool{poolsByCategory[category].length !== 1 ? 's' : ''}</span>
                                <span>{poolsByCategory[category].reduce((sum, pool) => sum + pool.teams.length, 0)} teams</span>
                                <span>{poolsByCategory[category].reduce((sum, pool) => sum + (pool.matches_count || 0), 0)} matches</span>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              {poolsByCategory[category].map((pool) => {
                                // Extract just the pool letter from the full name
                                const poolLetter = pool.name.split('-').slice(-1)[0];
                                
                                return (
                                  <Card key={pool.name} className="border-l-4 border-l-primary">
                                    <CardHeader className="pb-3">
                                      <CardTitle className="text-base flex items-center justify-between">
                                        <span className="flex items-center gap-2">
                                          Pool {poolLetter}
                                          {pool.court_number && (
                                            <Badge variant="outline" className="flex items-center gap-1">
                                              <MapPin className="h-3 w-3" />
                                              Court {pool.court_number}
                                            </Badge>
                                          )}
                                        </span>
                                        {pool.matches_count && (
                                          <Badge variant="secondary">
                                            {pool.matches_count} matches
                                          </Badge>
                                        )}
                                      </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                      <div className="space-y-2">
                                        <div className="text-sm font-medium text-muted-foreground">
                                          Teams ({pool.teams.length}):
                                        </div>
                                        <div className="space-y-1">
                                          {pool.teams.map((team) => (
                                            <div key={team.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                                              <span className="font-medium">{team.name}</span>
                                              <div className="flex gap-1">
                                                {team.division && (
                                                  <Badge variant="outline" className="text-xs capitalize">
                                                    {team.division}
                                                  </Badge>
                                                )}
                                                {team.skill_level && (
                                                  <Badge variant="outline" className="text-xs uppercase">
                                                    {team.skill_level}
                                                  </Badge>
                                                )}
                                              </div>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    </CardContent>
                                  </Card>
                                );
                              })}
                            </div>
                          </TabsContent>
                        ))}
                      </Tabs>
                    ) : (
                      // Single category - no tabs needed
                      <div className="space-y-4">
                        <div className="mb-4 p-4 bg-muted/50 rounded-lg">
                          <h5 className="font-semibold text-lg mb-2">{formatCategoryName(categories[0])} Division</h5>
                          <div className="flex gap-4 text-sm text-muted-foreground">
                            <span>{generatedPools.length} pool{generatedPools.length !== 1 ? 's' : ''}</span>
                            <span>{generatedPools.reduce((sum, pool) => sum + pool.teams.length, 0)} teams</span>
                            <span>{generatedPools.reduce((sum, pool) => sum + (pool.matches_count || 0), 0)} matches</span>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {generatedPools.map((pool) => (
                            <Card key={pool.name} className="border-l-4 border-l-primary">
                              <CardHeader className="pb-3">
                                <CardTitle className="text-base flex items-center justify-between">
                                  <span className="flex items-center gap-2">
                                    Pool {pool.name}
                                    {pool.court_number && (
                                      <Badge variant="outline" className="flex items-center gap-1">
                                        <MapPin className="h-3 w-3" />
                                        Court {pool.court_number}
                                      </Badge>
                                    )}
                                  </span>
                                  {pool.matches_count && (
                                    <Badge variant="secondary">
                                      {pool.matches_count} matches
                                    </Badge>
                                  )}
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="space-y-2">
                                  <div className="text-sm font-medium text-muted-foreground">
                                    Teams ({pool.teams.length}):
                                  </div>
                                  <div className="space-y-1">
                                    {pool.teams.map((team) => (
                                      <div key={team.id} className="flex items-center justify-between p-2 bg-muted/50 rounded">
                                        <span className="font-medium">{team.name}</span>
                                        <div className="flex gap-1">
                                          {team.division && (
                                            <Badge variant="outline" className="text-xs capitalize">
                                              {team.division}
                                            </Badge>
                                          )}
                                          {team.skill_level && (
                                            <Badge variant="outline" className="text-xs uppercase">
                                              {team.skill_level}
                                            </Badge>
                                          )}
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Checked-In Teams</CardTitle>
        </CardHeader>
        <CardContent>
          {checkedInTeams.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No teams have checked in yet.
            </p>
          ) : (
            <div className="max-h-96 overflow-y-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team Name</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {checkedInTeams.map((team) => (
                    <TableRow key={team.id}>
                      <TableCell className="font-medium">{team.name}</TableCell>
                      <TableCell>
                        <Badge variant="secondary">Checked In</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}