import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MatchScoringInterface } from "@/components/MatchScoringInterface";
import { MatchScoringDialog } from "@/components/MatchScoringDialog";
import { TeamScheduleView } from "@/components/TeamScheduleView";
import { PoolDetailsView } from "@/components/PoolDetailsView";
import { AdvancementConfigurationDialog } from "@/components/AdvancementConfigurationDialog";
import BracketVisualization from './BracketVisualization';
import EnhancedBracketView from './EnhancedBracketView';
import { format } from "date-fns";
import { Trophy, Clock, Users, Play, Pause, CheckCircle, Target } from "lucide-react";
import { checkPoolCompletion } from "@/utils/poolCompletionDetector";
import { generatePlayoffBrackets } from "@/utils/bracketGenerator";

interface Match {
  id: string;
  tournament_id: string;
  team1_id: string | null;
  team2_id: string | null;
  team1_name?: string;
  team2_name?: string;
  referee_team_name?: string;
  scheduled_time: string | null;
  court_number: number | null;
  status: string;
  pool_name: string | null;
  round_number: number;
  match_number: number;
  sets_won_team1: number | null;
  sets_won_team2: number | null;
  winner_id: string | null;
  team1_score: number | null;
  team2_score: number | null;
  set_scores: any;
  current_set: number | null;
  completed_at: string | null;
  referee_team_id: string | null;
  tournament_phase?: string;
  bracket_position?: string;
}

interface Team {
  id: string;
  name: string;
  check_in_status: string;
  skill_level?: string;
}

interface Tournament {
  id: string;
  title: string;
  brackets_generated: boolean;
  sets_per_game: number;
  points_per_set: number;
  must_win_by: number;
  deciding_set_points: number;
}

interface TournamentDayDashboardProps {
  tournament: Tournament;
  teams: Team[];
}

export function TournamentDayDashboard({ tournament, teams }: TournamentDayDashboardProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(null);
  const [matchScoringDialogOpen, setMatchScoringDialogOpen] = useState(false);
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedPool, setSelectedPool] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAdvancementDialog, setShowAdvancementDialog] = useState(false);
  const [poolCompletion, setPoolCompletion] = useState<any>(null);
  const [generatingBrackets, setGeneratingBrackets] = useState(false);
  const [playoffBracketsExist, setPlayoffBracketsExist] = useState(false);
  const [bracketFormat, setBracketFormat] = useState<'simple' | 'detailed'>('simple');
  const [selectedBracketCategory, setSelectedBracketCategory] = useState<string | null>(null);
  const [selectedPoolForBrackets, setSelectedPoolForBrackets] = useState<string | null>(null);
  const { toast } = useToast();

  // Debug selectedMatch state changes
  console.log('TournamentDayDashboard render - selectedMatch:', selectedMatch);

  useEffect(() => {
    if (tournament.brackets_generated) {
      fetchMatches();
    }
  }, [tournament.id, tournament.brackets_generated]);

  // Subscribe to real-time match updates
  useEffect(() => {
    console.log('Setting up real-time updates for tournament matches');

    const channel = supabase
      .channel('tournament-match-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
          filter: `tournament_id=eq.${tournament.id}`
        },
        (payload) => {
          console.log('Real-time tournament match update:', payload);
          fetchMatches(); // Refresh all matches to get updated team names
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up real-time tournament updates');
      supabase.removeChannel(channel);
    };
  }, [tournament.id]);

  // Check pool completion periodically
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (tournament.brackets_generated) {
      checkForPoolCompletion();
      interval = setInterval(checkForPoolCompletion, 30000); // Check every 30 seconds
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [tournament.id, tournament.brackets_generated]);

  const checkForPoolCompletion = async () => {
    const completionStatus = await checkPoolCompletion(tournament.id);
    setPoolCompletion(completionStatus);
    
    // Check directly in the database for playoff matches instead of relying on state
    const { data: playoffMatches } = await supabase
      .from('matches')
      .select('id')
      .eq('tournament_id', tournament.id)
      .in('tournament_phase', ['playoffs', 'bracket']);
    
    const hasPlayoffs = playoffMatches && playoffMatches.length > 0;
    
    // Auto-show advancement dialog when pools are complete and no playoffs exist yet
    // Check database directly to avoid race conditions with state
    if (completionStatus.readyForBrackets && !hasPlayoffs && !showAdvancementDialog) {
      setShowAdvancementDialog(true);
    }
  };

  const fetchMatches = async () => {
    try {
      // First get matches
      const { data: matchesData, error: matchesError } = await supabase
        .from('matches')
        .select('*')
        .eq('tournament_id', tournament.id)
        .order('scheduled_time', { ascending: true });

      if (matchesError) throw matchesError;

      // Then get team names
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams')
        .select('id, name')
        .eq('tournament_id', tournament.id);

      if (teamsError) throw teamsError;

      // Create team lookup
      const teamLookup = (teamsData || []).reduce((acc, team) => {
        acc[team.id] = team.name;
        return acc;
      }, {} as Record<string, string>);

      const formattedMatches = (matchesData || []).map(match => ({
        ...match,
        team1_name: match.team1_id ? teamLookup[match.team1_id] || 'TBD' : 'TBD',
        team2_name: match.team2_id ? teamLookup[match.team2_id] || 'TBD' : 'TBD',
        referee_team_name: match.referee_team_id ? teamLookup[match.referee_team_id] || 'TBD' : 'TBD'
      }));

      setMatches(formattedMatches);
      
      // Check if playoff brackets exist with actual teams assigned
      const hasPlayoffsWithTeams = formattedMatches.some(m => 
        (m.tournament_phase === 'playoffs' || m.tournament_phase === 'bracket') && 
        m.team1_id && m.team2_id
      );
      console.log('DEBUG: Playoff bracket check:', { 
        hasPlayoffsWithTeams, 
        totalMatches: formattedMatches.length, 
        playoffMatches: formattedMatches.filter(m => m.tournament_phase === 'playoffs' || m.tournament_phase === 'bracket'),
        playoffMatchesWithTeams: formattedMatches.filter(m => 
          (m.tournament_phase === 'playoffs' || m.tournament_phase === 'bracket') && 
          m.team1_id && m.team2_id
        ),
        allPhases: [...new Set(formattedMatches.map(m => m.tournament_phase))]
      });
      setPlayoffBracketsExist(hasPlayoffsWithTeams);
      
    } catch (error) {
      console.error('Error fetching matches:', error);
      toast({
        title: "Error",
        description: "Failed to load matches",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleMatchSelect = async (match: Match) => {
    console.log('Match selected for scoring:', match);
    
    // If match is scheduled, automatically start it when opening the dialog
    if (match.status === 'scheduled') {
      console.log('Auto-starting scheduled match...');
      try {
        const { error } = await supabase
          .from('matches')
          .update({ 
            status: 'in_progress',
            updated_at: new Date().toISOString()
          })
          .eq('id', match.id);

        if (error) {
          console.error('Error starting match:', error);
          toast({
            title: "Error",
            description: "Failed to start match",
            variant: "destructive",
          });
          return;
        }

        // Update the match object with new status before setting it
        const updatedMatch = { ...match, status: 'in_progress' };
        setSelectedMatch(updatedMatch);
        console.log('Match auto-started successfully');
      } catch (error) {
        console.error('Error starting match:', error);
        return;
      }
    } else {
      setSelectedMatch(match);
    }
    
    setMatchScoringDialogOpen(true);
  };

  const handleMatchUpdate = () => {
    fetchMatches();
    // Re-check pool completion after match update
    setTimeout(checkForPoolCompletion, 1000);
  };

  const handleGenerateBrackets = async (advancementConfig: { teamsPerPool: number }) => {
    setGeneratingBrackets(true);
    try {
      const result = await generatePlayoffBrackets(tournament.id, advancementConfig.teamsPerPool);
      
      if (result.success) {
        toast({
          title: "Brackets Generated!",
          description: result.message,
        });
        setShowAdvancementDialog(false);
        setPlayoffBracketsExist(true); // Mark that brackets now exist
        // Refresh matches to show new bracket matches
        await fetchMatches();
      } else {
        toast({
          title: "Error",
          description: result.error || "Failed to generate brackets",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to generate playoff brackets",
        variant: "destructive",
      });
    } finally {
      setGeneratingBrackets(false);
    }
  };

  const getMatchStatusBadge = (match: Match) => {
    switch (match.status) {
      case 'completed':
        return <Badge className="bg-green-100 text-green-800">Completed</Badge>;
      case 'in_progress':
        return <Badge className="bg-blue-100 text-blue-800">In Progress</Badge>;
      case 'scheduled':
        return <Badge variant="outline">Scheduled</Badge>;
      default:
        return <Badge variant="secondary">{match.status}</Badge>;
    }
  };

  // Separate matches by phase
  const poolPlayMatches = matches.filter(m => m.tournament_phase === 'pool_play' || !m.tournament_phase);
  const playoffMatches = matches.filter(m => m.tournament_phase === 'playoffs' || m.tournament_phase === 'bracket');

  // Extract bracket categories from playoff matches
  const getBracketCategories = () => {
    const categories = new Map<string, { name: string; matchCount: number; completedCount: number }>();
    
    playoffMatches.forEach(match => {
      if (match.bracket_position) {
        const parts = match.bracket_position.split(' - ');
        if (parts.length >= 2) {
          const categoryName = parts[0];
          const existing = categories.get(categoryName) || { name: categoryName, matchCount: 0, completedCount: 0 };
          existing.matchCount++;
          if (match.status === 'completed') {
            existing.completedCount++;
          }
          categories.set(categoryName, existing);
        }
      }
    });
    
    return Array.from(categories.values()).sort((a, b) => a.name.localeCompare(b.name));
  };

  const bracketCategories = getBracketCategories();

  // Auto-select first bracket category when playoff matches are loaded
  useEffect(() => {
    if (bracketCategories.length > 0 && !selectedBracketCategory) {
      setSelectedBracketCategory(bracketCategories[0].name);
    }
  }, [bracketCategories.length, selectedBracketCategory]);

  // Filter playoff matches by selected category and pool
  const getFilteredPlayoffMatches = () => {
    let filtered = playoffMatches;
    
    if (selectedBracketCategory) {
      filtered = filtered.filter(match => 
        match.bracket_position && match.bracket_position.startsWith(selectedBracketCategory)
      );
    }
    
    if (selectedPoolForBrackets) {
      // Filter playoff matches to only show those involving teams from the selected pool
      // We need to fetch which teams advanced from the selected pool
      const poolTeamIds = new Set<string>();
      
      // Get all teams that played in the selected pool
      poolPlayMatches
        .filter(m => m.pool_name === selectedPoolForBrackets)
        .forEach(match => {
          if (match.team1_id) poolTeamIds.add(match.team1_id);
          if (match.team2_id) poolTeamIds.add(match.team2_id);
        });
      
      // Filter playoff matches to only include those with teams from the selected pool
      filtered = filtered.filter(match => 
        (match.team1_id && poolTeamIds.has(match.team1_id)) ||
        (match.team2_id && poolTeamIds.has(match.team2_id))
      );
    }
    
    return filtered;
  };

  const filteredPlayoffMatches = getFilteredPlayoffMatches();

  const stats = {
    totalMatches: matches.length,
    completed: matches.filter(m => m.status === 'completed').length,
    inProgress: matches.filter(m => m.status === 'in_progress').length,
    scheduled: matches.filter(m => m.status === 'scheduled').length,
    poolPlayTotal: poolPlayMatches.length,
    playoffTotal: playoffMatches.length
  };

  const checkedInTeams = teams.filter(team => team.check_in_status === 'checked_in');
  
  // Get unique pools from pool play matches only
  const pools = Array.from(new Set(poolPlayMatches.map(match => match.pool_name).filter(Boolean)));
  
  // If a pool is selected, show pool details
  if (selectedPool) {
    return (
      <PoolDetailsView
        poolName={selectedPool}
        matches={matches}
        onBack={() => setSelectedPool(null)}
      />
    );
  }

  if (!tournament.brackets_generated) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">Tournament Day Dashboard</h3>
            <p className="text-muted-foreground mb-4">
              Brackets must be generated before the tournament day dashboard is available.
            </p>
            <p className="text-sm text-muted-foreground">
              Go to the Pool Play tab to generate brackets first.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground mt-4">Loading tournament data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Pool Completion Alert */}
      {poolCompletion?.readyForBrackets && !playoffBracketsExist && (
        <Card className="border-green-200 bg-green-50">
          <CardContent className="pt-4">
            <div className="flex items-center gap-3">
              <Target className="h-6 w-6 text-green-600" />
              <div className="flex-1">
                <h3 className="font-semibold text-green-800">Pool Play Complete!</h3>
                <p className="text-sm text-green-700">
                  All {poolCompletion.totalPools} pools have finished. Ready to generate playoff brackets.
                </p>
              </div>
              <Button 
                onClick={() => setShowAdvancementDialog(true)}
                className="bg-green-600 hover:bg-green-700"
              >
                Generate Brackets
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tournament Day Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">{stats.totalMatches}</div>
              <div className="text-sm text-muted-foreground">Total Matches</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
              <div className="text-sm text-muted-foreground">Completed</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
              <div className="text-sm text-muted-foreground">In Progress</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{stats.scheduled}</div>
              <div className="text-sm text-muted-foreground">Scheduled</div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="matches" className="w-full">
        <TabsList className="grid w-full grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-1">
          <TabsTrigger value="matches" className="text-xs md:text-sm">
            <span className="hidden sm:inline">Live Matches</span>
            <span className="sm:hidden">Live</span>
          </TabsTrigger>
          <TabsTrigger value="pools" className="relative text-xs md:text-sm">
            <span className="hidden sm:inline">Pool Play</span>
            <span className="sm:hidden">Pools</span>
            {poolCompletion?.readyForBrackets && !playoffBracketsExist && (
              <Badge className="ml-1 md:ml-2 bg-green-600 text-white text-xs hidden md:inline-flex">Complete</Badge>
            )}
          </TabsTrigger>
          {playoffBracketsExist && (
            <TabsTrigger value="brackets" className="relative text-xs md:text-sm">
              <span className="hidden sm:inline">Playoff Bracket</span>
              <span className="sm:hidden">Bracket</span>
              <Badge className="ml-1 md:ml-2 bg-blue-600 text-white text-xs hidden md:inline-flex">Active</Badge>
            </TabsTrigger>
          )}
          <TabsTrigger value="schedule" className="text-xs md:text-sm">
            <span className="hidden sm:inline">Full Schedule</span>
            <span className="sm:hidden">Schedule</span>
          </TabsTrigger>
          <TabsTrigger value="teams" className="text-xs md:text-sm">
            <span className="hidden sm:inline">Team Schedules</span>
            <span className="sm:hidden">Teams</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="matches" className="space-y-4 pt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 flex-wrap">
                <Play className="h-5 w-5" />
                <span className="break-words">Active &amp; Upcoming Matches</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {matches.filter(m => m.status !== 'completed').length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 mx-auto text-green-500 mb-4" />
                  <p className="text-lg font-semibold">All matches completed!</p>
                  <p className="text-muted-foreground">Tournament is finished.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {matches
                    .filter(match => match.status !== 'completed')
                    .slice(0, 3)
                    .map(match => (
                      <div key={match.id} className="border rounded-lg p-4">
                        <div className="flex flex-col gap-2 sm:flex-row sm:justify-between sm:items-start mb-4">
                          <div className="flex-1 min-w-0">
                             <h4 className="font-semibold break-words">
                               {match.team1_name} vs {match.team2_name}
                             </h4>
                             <p className="text-sm text-muted-foreground">
                               Court {match.court_number} • {match.pool_name || (match.tournament_phase === 'playoffs' ? 'Playoffs' : 'Pool Play')} • Round {match.round_number}
                             </p>
                            {match.scheduled_time && (
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(match.scheduled_time), 'h:mm a')}
                              </p>
                            )}
                          </div>
                          <div className="shrink-0">
                            {getMatchStatusBadge(match)}
                          </div>
                        </div>
                        
                        {match.status === 'in_progress' && (
                          <Button
                            onClick={() => {
                              console.log('Continue Scoring clicked for match:', match.id, match);
                              handleMatchSelect(match);
                            }}
                            size="sm"
                            className="mb-2 min-h-[44px] sm:min-h-0"
                          >
                            Continue Scoring
                          </Button>
                        )}
                        
                        {match.status === 'scheduled' && (
                          <Button
                            onClick={() => {
                              console.log('Start Match clicked for match:', match.id, match);
                              console.log('Setting selectedMatch to:', match);
                              handleMatchSelect(match);
                            }}
                            size="sm"
                            variant="outline"
                            className="min-h-[44px] sm:min-h-0"
                          >
                            Start Match
                          </Button>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </CardContent>
          </Card>

        </TabsContent>

        <TabsContent value="pools" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Pool Play Overview
                {poolCompletion && (
                  <Badge variant={poolCompletion.readyForBrackets ? "default" : "secondary"}>
                    {poolCompletion.completedPools}/{poolCompletion.totalPools} Complete
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {poolCompletion?.readyForBrackets && !playoffBracketsExist && (
                <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-green-800">🎉 All Pools Complete!</h4>
                      <p className="text-sm text-green-700">Ready to generate playoff brackets with team advancement.</p>
                    </div>
                    <Button 
                      onClick={() => setShowAdvancementDialog(true)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Configure Brackets
                    </Button>
                  </div>
                </div>
              )}
              
              {pools.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No pools found</p>
                </div>
              ) : (
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                   {pools.map(pool => {
                      const poolMatches = poolPlayMatches.filter(m => m.pool_name === pool);
                      const completedMatches = poolMatches.filter(m => m.status === 'completed');
                      const inProgressMatches = poolMatches.filter(m => m.status === 'in_progress');
                      const scheduledMatches = poolMatches.filter(m => m.status === 'scheduled');
                      const poolComplete = completedMatches.length === poolMatches.length;
                      
                      return (
                         <Card 
                           key={pool} 
                           className={`cursor-pointer hover:bg-accent/50 transition-colors ${poolComplete ? 'border-green-200 bg-green-50' : ''}`}
                           onClick={() => {
                             setSelectedPool(pool);
                             setSelectedPoolForBrackets(pool);
                           }}
                         >
                          <CardContent className="pt-6">
                            <div className="text-center space-y-2">
                              <div className="flex items-center justify-center gap-2">
                                <h3 className="font-semibold text-lg">{pool}</h3>
                                {poolComplete && <Badge className="bg-green-600 text-white text-xs">Complete</Badge>}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {poolMatches.length} matches • Court {poolMatches[0]?.court_number}
                              </div>
                              <div className="flex justify-center gap-4 text-xs">
                                <span className="text-green-600">{completedMatches.length} done</span>
                                <span className="text-blue-600">{inProgressMatches.length} live</span>
                                <span className="text-yellow-600">{scheduledMatches.length} pending</span>
                              </div>
                              <div className="pt-2">
                                <Badge variant="outline" className="text-xs">
                                  Click to view details
                                </Badge>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="brackets" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  Playoff Brackets
                  {selectedPoolForBrackets && (
                    <Badge variant="outline" className="ml-2">
                      {selectedPoolForBrackets} Pool Teams
                    </Badge>
                  )}
                </CardTitle>
                {selectedPoolForBrackets && (
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => setSelectedPoolForBrackets(null)}
                  >
                    Show All Pools
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              {playoffMatches.length === 0 ? (
                <div className="text-center py-8">
                  <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-semibold mb-2">No Bracket Matches Yet</p>
                  <p className="text-muted-foreground mb-4">
                    Playoff brackets will appear here once pool play is completed.
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Complete pool play matches to generate playoff brackets.
                  </p>
                </div>
              ) : filteredPlayoffMatches.length === 0 && selectedPoolForBrackets ? (
                <div className="text-center py-8">
                  <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-lg font-semibold mb-2">No Brackets for {selectedPoolForBrackets}</p>
                  <p className="text-muted-foreground mb-4">
                    No teams from {selectedPoolForBrackets} advanced to the playoff brackets yet.
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => setSelectedPoolForBrackets(null)}
                  >
                    View All Brackets
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Enhanced Category Overview */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-muted-foreground">
                      Tournament Brackets
                      {selectedPoolForBrackets && (
                        <span className="ml-2 text-primary">- {selectedPoolForBrackets} Pool Teams</span>
                      )}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {bracketCategories.map((category) => {
                        const categoryMatches = filteredPlayoffMatches.filter(match => 
                          match.bracket_position?.startsWith(category.name + ' - ')
                        );
                        const inProgress = categoryMatches.filter(m => m.status === 'in_progress').length;
                        const isActive = inProgress > 0;
                        const isComplete = category.completedCount === category.matchCount;
                        
                        return (
                          <Card 
                            key={category.name} 
                            className={`cursor-pointer transition-all hover:shadow-md ${
                              selectedBracketCategory === category.name 
                                ? 'ring-2 ring-primary shadow-md' 
                                : ''
                            }`}
                            onClick={() => setSelectedBracketCategory(category.name)}
                          >
                            <CardContent className="p-4">
                              <div className="space-y-3">
                                <div className="flex justify-between items-start">
                                  <div>
                                    <h4 className="font-semibold text-sm">{category.name}</h4>
                                    <p className="text-xs text-muted-foreground">
                                      {category.matchCount} matches total
                                    </p>
                                  </div>
                                  <div className="flex flex-col gap-1">
                                    {isActive && (
                                      <Badge className="bg-blue-600 text-white text-xs">
                                        {inProgress} Live
                                      </Badge>
                                    )}
                                    <Badge 
                                      variant={isComplete ? 'default' : 'secondary'}
                                      className="text-xs"
                                    >
                                      {category.completedCount}/{category.matchCount}
                                    </Badge>
                                  </div>
                                </div>
                                
                                <div className="w-full bg-muted rounded-full h-2">
                                  <div 
                                    className="bg-primary h-2 rounded-full transition-all"
                                    style={{ width: `${(category.completedCount / category.matchCount) * 100}%` }}
                                  />
                                </div>
                                
                                <Button
                                  variant={selectedBracketCategory === category.name ? 'default' : 'outline'}
                                  size="sm"
                                  className="w-full"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedBracketCategory(category.name);
                                  }}
                                >
                                  {selectedBracketCategory === category.name ? 'Viewing' : 'View Bracket'}
                                </Button>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>

                  {/* Selected Category Bracket */}
                  {selectedBracketCategory && (() => {
                    const categoryMatches = filteredPlayoffMatches.filter(match => 
                      match.bracket_position?.startsWith(selectedBracketCategory + ' - ')
                    );

                    if (categoryMatches.length === 0) {
                      return (
                        <Card>
                          <CardContent className="pt-6">
                            <div className="text-center py-8">
                              <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                              <p className="text-muted-foreground">
                                No matches found for {selectedBracketCategory}.
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    }

                    return (
                      <Card>
                        <CardHeader>
                          <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
                            <div>
                              <CardTitle className="text-lg">{selectedBracketCategory} Bracket</CardTitle>
                              <p className="text-sm text-muted-foreground">
                                {categoryMatches.length} matches in this category
                              </p>
                            </div>
                            
                            <div className="flex gap-2">
                              <Button
                                variant={bracketFormat === 'simple' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setBracketFormat('simple')}
                              >
                                Simple
                              </Button>
                              <Button
                                variant={bracketFormat === 'detailed' ? 'default' : 'outline'}
                                size="sm"
                                onClick={() => setBracketFormat('detailed')}
                              >
                                Detailed
                              </Button>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent>
                          {bracketFormat === 'detailed' ? (
                            <EnhancedBracketView
                              matches={categoryMatches.map(match => ({
                                id: match.id,
                                team1_name: match.team1_name,
                                team2_name: match.team2_name,
                                team1_score: match.team1_score || 0,
                                team2_score: match.team2_score || 0,
                                winner_name: match.winner_id ? (match.winner_id === match.team1_id ? match.team1_name : match.team2_name) : undefined,
                                bracket_position: match.bracket_position || '',
                                status: match.status,
                                round_number: match.round_number,
                                referee_team_name: match.referee_team_name,
                                court: match.court_number || undefined
                              }))}
                              title={`${selectedBracketCategory} Bracket`}
                              format={bracketFormat}
                              onFormatChange={setBracketFormat}
                              onMatchSelect={(match) => {
                                console.log('EnhancedBracketView match selected:', match);
                                const fullMatch = matches.find(m => m.id === match.id);
                                console.log('Found fullMatch:', fullMatch);
                                if (fullMatch) {
                                  console.log('Setting selectedMatch to fullMatch:', fullMatch);
                                  handleMatchSelect(fullMatch);
                                } else {
                                  console.error('Could not find fullMatch for match:', match);
                                }
                              }}
                            />
                          ) : (
                            <div className="space-y-6">
                              {(() => {
                                const rounds = Array.from(new Set(categoryMatches.map(m => m.round_number))).sort((a, b) => a - b);
                                
                                return rounds.map(round => {
                                  const roundMatches = categoryMatches.filter(m => m.round_number === round);
                                  const maxRound = Math.max(...categoryMatches.map(m => m.round_number));
                                  
                                  const roundName = round === maxRound 
                                    ? 'Final' 
                                    : round === maxRound - 1 
                                    ? 'Semifinals' 
                                    : round === maxRound - 2
                                    ? 'Quarterfinals'
                                    : `Round ${round}`;
                                  
                                  return (
                                    <div key={round}>
                                      <h4 className="text-md font-semibold mb-3 flex items-center gap-2">
                                        {roundName}
                                        <Badge variant="outline" className="text-xs">
                                          Round {round}
                                        </Badge>
                                      </h4>
                                      <div className="grid gap-3">
                                        {roundMatches.map(match => (
                                          <Card key={match.id} className="hover:shadow-md transition-shadow">
                                            <CardContent className="p-4">
                                              <div className="flex justify-between items-start mb-3">
                                                <div className="space-y-1">
                                                  <h5 className="font-semibold text-sm">
                                                    {match.team1_name || 'TBD'} vs {match.team2_name || 'TBD'}
                                                  </h5>
                                                  <div className="flex gap-2 text-xs text-muted-foreground">
                                                    <span>Court {match.court_number}</span>
                                                    {match.referee_team_name && (
                                                      <span>• Ref: {match.referee_team_name}</span>
                                                    )}
                                                  </div>
                                                  {match.scheduled_time && (
                                                    <p className="text-xs text-muted-foreground">
                                                      {format(new Date(match.scheduled_time), 'h:mm a')}
                                                    </p>
                                                  )}
                                                </div>
                                                {getMatchStatusBadge(match)}
                                              </div>
                                              
                                              {match.status === 'completed' && (
                                                <div className="text-sm font-medium mb-3 p-2 bg-green-50 rounded text-green-800">
                                                  Final Score: {match.sets_won_team1}-{match.sets_won_team2}
                                                  {match.winner_id && (
                                                    <span className="ml-2">
                                                      🏆 {match.winner_id === match.team1_id ? match.team1_name : match.team2_name}
                                                    </span>
                                                  )}
                                                </div>
                                              )}
                                              
                              {(match.status === 'in_progress' || match.status === 'scheduled') && (
                                <Button
                                  onClick={() => {
                                    console.log('Bracket Start Match clicked for match:', match.id, match);
                                    console.log('Setting selectedMatch to:', match);
                                    handleMatchSelect(match);
                                  }}
                                  size="sm"
                                  variant={match.status === 'in_progress' ? 'default' : 'outline'}
                                  className="w-full"
                                >
                                  {match.status === 'in_progress' ? 'Continue Scoring' : 'Start Match'}
                                </Button>
                              )}
                                            </CardContent>
                                          </Card>
                                        ))}
                                      </div>
                                    </div>
                                  );
                                });
                              })()}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })()}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="schedule">
          <Card>
            <CardHeader>
              <CardTitle>Complete Match Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>Court</TableHead>
                    <TableHead>Match</TableHead>
                    <TableHead>Pool</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {matches.map((match) => (
                    <TableRow key={match.id}>
                      <TableCell>
                        {match.scheduled_time 
                          ? format(new Date(match.scheduled_time), 'h:mm a') 
                          : 'TBD'}
                      </TableCell>
                      <TableCell>{match.court_number}</TableCell>
                      <TableCell>
                        {match.team1_name} vs {match.team2_name}
                      </TableCell>
                      <TableCell>{match.pool_name || (match.tournament_phase === 'playoffs' ? 'Playoffs' : 'Pool Play')}</TableCell>
                      <TableCell>{getMatchStatusBadge(match)}</TableCell>
                      <TableCell>
                        {match.status === 'completed' 
                          ? `${match.sets_won_team1}-${match.sets_won_team2}`
                          : '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="teams">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Team Schedules</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2 mb-4">
                  {checkedInTeams.map(team => (
                    <Button
                      key={team.id}
                      variant={selectedTeamId === team.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSelectedTeamId(team.id)}
                      className="justify-start"
                    >
                      {team.name}
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>

            {selectedTeamId && (
              <TeamScheduleView
                teamId={selectedTeamId}
                teamName={checkedInTeams.find(t => t.id === selectedTeamId)?.name || ''}
                matches={matches}
              />
            )}
          </div>
          </TabsContent>

          {/* Bracket Visualization Tab */}
          <TabsContent value="brackets" className="space-y-6">
            <div className="text-sm text-muted-foreground mb-4">
              Debug: Found {filteredPlayoffMatches.length} playoff matches
              {selectedPoolForBrackets && ` (filtered for ${selectedPoolForBrackets})`}
            </div>
            <EnhancedBracketView 
              matches={filteredPlayoffMatches
                .map(m => {
                  // Determine winner name based on winner_id
                  let winner_name: string | undefined;
                  if (m.winner_id) {
                    winner_name = m.winner_id === m.team1_id ? m.team1_name : m.team2_name;
                  }
                  
                  return {
                    id: m.id,
                    team1_name: m.team1_name,
                    team2_name: m.team2_name,
                    team1_score: m.sets_won_team1 || 0,
                    team2_score: m.sets_won_team2 || 0,
                    winner_name,
                    bracket_position: m.bracket_position || `Match ${m.match_number}`,
                    status: m.status,
                    round_number: m.round_number,
                    referee_team_name: m.referee_team_name || 'TBD',
                    court: m.court_number || 1
                  };
                })
              }
              title={`${tournament.title} - Playoff Bracket${selectedPoolForBrackets ? ` (${selectedPoolForBrackets} Teams)` : ''}`}
              format={bracketFormat}
              onFormatChange={setBracketFormat}
              onMatchSelect={(match) => {
                console.log('Second EnhancedBracketView match selected:', match);
                const fullMatch = matches.find(m => m.id === match.id);
                console.log('Found fullMatch:', fullMatch);
                if (fullMatch) {
                  console.log('Setting selectedMatch to fullMatch:', fullMatch);
                  handleMatchSelect(fullMatch);
                } else {
                  console.error('Could not find fullMatch for match:', match);
                }
              }}
            />
            
            {/* Match Scoring Interface for Bracket matches - Removed: Now using Modal Dialog */}
          </TabsContent>
        </Tabs>

      {/* Advancement Configuration Dialog */}
      {poolCompletion && (
        <AdvancementConfigurationDialog
          open={showAdvancementDialog}
          onOpenChange={setShowAdvancementDialog}
          poolStats={poolCompletion.poolStats.map((pool: any) => ({
            poolName: pool.poolName,
            standings: pool.standings
          }))}
          onGenerateBrackets={handleGenerateBrackets}
          loading={generatingBrackets}
        />
      )}

      {/* Match Scoring Dialog */}
      <MatchScoringDialog
        open={matchScoringDialogOpen}
        onOpenChange={setMatchScoringDialogOpen}
        match={selectedMatch}
        tournament={tournament}
        team1={selectedMatch ? { id: selectedMatch.team1_id!, name: selectedMatch.team1_name! } : null}
        team2={selectedMatch ? { id: selectedMatch.team2_id!, name: selectedMatch.team2_name! } : null}
        onMatchUpdate={handleMatchUpdate}
      />
    </div>
  );
}