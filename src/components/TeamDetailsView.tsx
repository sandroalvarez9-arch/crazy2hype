import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Users, Calendar, Trophy, ExternalLink } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Link } from "react-router-dom";

interface Player {
  id: string;
  name: string;
  position?: string;
  jersey_number?: number;
}

interface Match {
  id: string;
  tournament_id: string;
  team1_id: string | null;
  team2_id: string | null;
  team1_name?: string;
  team2_name?: string;
  scheduled_time: string | null;
  court_number: number | null;
  status: string;
  pool_name: string | null;
  round_number: number;
  match_number: number;
  sets_won_team1: number | null;
  sets_won_team2: number | null;
  winner_id: string | null;
}

interface TeamDetailsViewProps {
  teamId: string;
  teamName: string;
  allMatches: Match[];
  onBack: () => void;
}

export function TeamDetailsView({ teamId, teamName, allMatches, onBack }: TeamDetailsViewProps) {
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchTeamPlayers();
  }, [teamId]);

  const fetchTeamPlayers = async () => {
    try {
      const { data, error } = await supabase
        .from('players')
        .select('id, name, position, jersey_number')
        .eq('team_id', teamId)
        .order('jersey_number', { ascending: true });

      if (error) throw error;
      setPlayers(data || []);
    } catch (error) {
      console.error('Error fetching players:', error);
      toast({
        title: "Error",
        description: "Failed to load team roster",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter matches for this team
  const teamMatches = allMatches.filter(match => 
    match.team1_id === teamId || match.team2_id === teamId
  );

  const getMatchResult = (match: Match) => {
    if (match.status !== 'completed') return null;
    
    const isTeam1 = match.team1_id === teamId;
    const teamSets = isTeam1 ? match.sets_won_team1 : match.sets_won_team2;
    const opponentSets = isTeam1 ? match.sets_won_team2 : match.sets_won_team1;
    const won = match.winner_id === teamId;
    
    return {
      won,
      score: `${teamSets}-${opponentSets}`,
      opponent: isTeam1 ? match.team2_name : match.team1_name
    };
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

  const teamRecord = teamMatches.reduce(
    (record, match) => {
      if (match.status === 'completed' && match.winner_id) {
        if (match.winner_id === teamId) {
          record.wins++;
        } else {
          record.losses++;
        }
      }
      return record;
    },
    { wins: 0, losses: 0 }
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-4">
          <Button onClick={onBack} variant="outline" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Pool
          </Button>
          <div>
            <h2 className="text-2xl font-bold">{teamName}</h2>
            <p className="text-muted-foreground">
              Record: {teamRecord.wins}W - {teamRecord.losses}L
            </p>
          </div>
        </div>
        <Link to={`/team/${teamId}`}>
          <Button variant="outline" size="sm">
            <ExternalLink className="h-4 w-4 mr-2" />
            View Full Profile
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team Roster */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Roster
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-muted-foreground mt-4">Loading roster...</p>
              </div>
            ) : players.length === 0 ? (
              <div className="text-center py-8">
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No players registered</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-16">#</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Position</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {players.map((player) => (
                    <TableRow key={player.id}>
                      <TableCell className="font-mono font-semibold">
                        {player.jersey_number || '-'}
                      </TableCell>
                      <TableCell className="font-medium">{player.name}</TableCell>
                      <TableCell className="text-muted-foreground">
                        {player.position || '-'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Team Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Team Statistics
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-accent/50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{teamRecord.wins}</div>
                <div className="text-sm text-muted-foreground">Wins</div>
              </div>
              <div className="text-center p-4 bg-accent/50 rounded-lg">
                <div className="text-2xl font-bold text-red-600">{teamRecord.losses}</div>
                <div className="text-sm text-muted-foreground">Losses</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-accent/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">{teamMatches.length}</div>
                <div className="text-sm text-muted-foreground">Total Matches</div>
              </div>
              <div className="text-center p-4 bg-accent/50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {teamRecord.wins + teamRecord.losses > 0 
                    ? Math.round((teamRecord.wins / (teamRecord.wins + teamRecord.losses)) * 100)
                    : 0}%
                </div>
                <div className="text-sm text-muted-foreground">Win Rate</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Team Schedule */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Match Schedule
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Round</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Court</TableHead>
                <TableHead>Opponent</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Result</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {teamMatches
                .sort((a, b) => a.round_number - b.round_number || a.match_number - b.match_number)
                .map((match) => {
                  const result = getMatchResult(match);
                  const isTeam1 = match.team1_id === teamId;
                  const opponent = isTeam1 ? match.team2_name : match.team1_name;
                  
                  return (
                    <TableRow key={match.id}>
                      <TableCell>R{match.round_number}</TableCell>
                      <TableCell>
                        {match.scheduled_time 
                          ? format(new Date(match.scheduled_time), 'h:mm a') 
                          : 'TBD'}
                      </TableCell>
                      <TableCell>{match.court_number}</TableCell>
                      <TableCell className="font-medium">
                        vs {opponent || 'TBD'}
                      </TableCell>
                      <TableCell>{getMatchStatusBadge(match)}</TableCell>
                      <TableCell>
                        {result ? (
                          <div className={`font-mono text-sm ${result.won ? 'text-green-600' : 'text-red-600'}`}>
                            <div className="font-semibold">
                              {result.won ? 'W' : 'L'} {result.score}
                            </div>
                          </div>
                        ) : match.status === 'in_progress' ? (
                          <div className="text-sm text-blue-600 font-medium">Live</div>
                        ) : (
                          <div className="text-sm text-muted-foreground">-</div>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}