import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { MatchScoringInterface } from "@/components/MatchScoringInterface";
import { TeamScheduleView } from "@/components/TeamScheduleView";
import { PoolDetailsView } from "@/components/PoolDetailsView";
import { format } from "date-fns";
import { Trophy, Clock, Users, Play, Pause, CheckCircle } from "lucide-react";

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
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [selectedPool, setSelectedPool] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    if (tournament.brackets_generated) {
      fetchMatches();
    }
  }, [tournament.id, tournament.brackets_generated]);

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

  const handleMatchUpdate = () => {
    fetchMatches();
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

  const stats = {
    totalMatches: matches.length,
    completed: matches.filter(m => m.status === 'completed').length,
    inProgress: matches.filter(m => m.status === 'in_progress').length,
    scheduled: matches.filter(m => m.status === 'scheduled').length
  };

  const checkedInTeams = teams.filter(team => team.check_in_status === 'checked_in');
  
  // Get unique pools from matches
  const pools = Array.from(new Set(matches.map(match => match.pool_name).filter(Boolean)));
  
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
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="matches">Live Matches</TabsTrigger>
          <TabsTrigger value="pools">Pool Play</TabsTrigger>
          <TabsTrigger value="schedule">Full Schedule</TabsTrigger>
          <TabsTrigger value="teams">Team Schedules</TabsTrigger>
        </TabsList>

        <TabsContent value="matches" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Play className="h-5 w-5" />
                Active & Upcoming Matches
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
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h4 className="font-semibold">
                              {match.team1_name} vs {match.team2_name}
                            </h4>
                            <p className="text-sm text-muted-foreground">
                              Court {match.court_number} • {match.pool_name} • Round {match.round_number}
                            </p>
                            {match.scheduled_time && (
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(match.scheduled_time), 'h:mm a')}
                              </p>
                            )}
                          </div>
                          {getMatchStatusBadge(match)}
                        </div>
                        
                        {match.status === 'in_progress' && (
                          <Button
                            onClick={() => setSelectedMatch(match)}
                            size="sm"
                            className="mb-2"
                          >
                            Continue Scoring
                          </Button>
                        )}
                        
                        {match.status === 'scheduled' && (
                          <Button
                            onClick={() => setSelectedMatch(match)}
                            size="sm"
                            variant="outline"
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

          {/* Match Scoring Interface */}
          {selectedMatch && (
            <Card>
              <CardHeader>
                <CardTitle>Match Scoring</CardTitle>
              </CardHeader>
              <CardContent>
                <MatchScoringInterface
                  match={selectedMatch}
                  tournament={tournament}
                  team1={{ id: selectedMatch.team1_id!, name: selectedMatch.team1_name! }}
                  team2={{ id: selectedMatch.team2_id!, name: selectedMatch.team2_name! }}
                  onMatchUpdate={handleMatchUpdate}
                />
                <Button
                  onClick={() => setSelectedMatch(null)}
                  variant="outline"
                  className="mt-4"
                >
                  Close Scoring
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="pools" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Pool Play Overview
              </CardTitle>
            </CardHeader>
            <CardContent>
              {pools.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">No pools found</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {pools.map(pool => {
                    const poolMatches = matches.filter(m => m.pool_name === pool);
                    const completedMatches = poolMatches.filter(m => m.status === 'completed');
                    const inProgressMatches = poolMatches.filter(m => m.status === 'in_progress');
                    const scheduledMatches = poolMatches.filter(m => m.status === 'scheduled');
                    
                    return (
                      <Card 
                        key={pool} 
                        className="cursor-pointer hover:bg-accent/50 transition-colors"
                        onClick={() => setSelectedPool(pool)}
                      >
                        <CardContent className="pt-6">
                          <div className="text-center space-y-2">
                            <h3 className="font-semibold text-lg">{pool}</h3>
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
                      <TableCell>{match.pool_name}</TableCell>
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
      </Tabs>
    </div>
  );
}