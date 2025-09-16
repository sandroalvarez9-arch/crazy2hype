import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ArrowLeft, Trophy, Target } from "lucide-react";
import { format } from "date-fns";
import { TeamDetailsView } from "@/components/TeamDetailsView";

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
  team1_score: number | null;
  team2_score: number | null;
  set_scores: any;
  current_set: number | null;
  completed_at: string | null;
}

interface PoolRecord {
  teamId: string;
  teamName: string;
  wins: number;
  losses: number;
  setsWon: number;
  setsLost: number;
  winPercentage: number;
  setsDifferential: number;
}

interface PoolDetailsViewProps {
  poolName: string;
  matches: Match[];
  onBack: () => void;
}

export function PoolDetailsView({ poolName, matches, onBack }: PoolDetailsViewProps) {
  const [poolMatches, setPoolMatches] = useState<Match[]>([]);
  const [standings, setStandings] = useState<PoolRecord[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => {
    // Filter matches for this pool
    const filteredMatches = matches.filter(match => match.pool_name === poolName);
    setPoolMatches(filteredMatches);

    // Calculate standings
    calculateStandings(filteredMatches);
  }, [poolName, matches]);

  // If a team is selected, show team details
  if (selectedTeam) {
    console.log('Rendering team details for:', selectedTeam);
    return (
      <TeamDetailsView
        teamId={selectedTeam.id}
        teamName={selectedTeam.name}
        allMatches={matches}
        onBack={() => setSelectedTeam(null)}
      />
    );
  }

  const calculateStandings = (matches: Match[]) => {
    const teamStats: Record<string, PoolRecord> = {};

    // Initialize all teams in the pool
    matches.forEach(match => {
      if (match.team1_id && match.team1_name) {
        if (!teamStats[match.team1_id]) {
          teamStats[match.team1_id] = {
            teamId: match.team1_id,
            teamName: match.team1_name,
            wins: 0,
            losses: 0,
            setsWon: 0,
            setsLost: 0,
            winPercentage: 0,
            setsDifferential: 0
          };
        }
      }
      if (match.team2_id && match.team2_name) {
        if (!teamStats[match.team2_id]) {
          teamStats[match.team2_id] = {
            teamId: match.team2_id,
            teamName: match.team2_name,
            wins: 0,
            losses: 0,
            setsWon: 0,
            setsLost: 0,
            winPercentage: 0,
            setsDifferential: 0
          };
        }
      }
    });

    // Calculate stats from completed matches
    matches
      .filter(match => match.status === 'completed')
      .forEach(match => {
        if (match.team1_id && match.team2_id) {
          const team1Stats = teamStats[match.team1_id];
          const team2Stats = teamStats[match.team2_id];
          
          if (team1Stats && team2Stats) {
            const team1Sets = match.sets_won_team1 || 0;
            const team2Sets = match.sets_won_team2 || 0;
            
            // Add sets
            team1Stats.setsWon += team1Sets;
            team1Stats.setsLost += team2Sets;
            team2Stats.setsWon += team2Sets;
            team2Stats.setsLost += team1Sets;
            
            // Determine winner from set scores if winner_id is not set
            let winnerId = match.winner_id;
            if (!winnerId && (team1Sets > 0 || team2Sets > 0)) {
              winnerId = team1Sets > team2Sets ? match.team1_id : match.team2_id;
            }
            
            // Add wins/losses
            if (winnerId === match.team1_id) {
              team1Stats.wins++;
              team2Stats.losses++;
            } else if (winnerId === match.team2_id) {
              team2Stats.wins++;
              team1Stats.losses++;
            }
          }
        }
      });

    // Calculate win percentages and sort
    const sortedStandings = Object.values(teamStats)
      .map(team => ({
        ...team,
        winPercentage: team.wins + team.losses > 0 ? team.wins / (team.wins + team.losses) : 0,
        setsDifferential: team.setsWon - team.setsLost
      }))
      .sort((a, b) => {
        // Sort by win percentage first
        if (a.winPercentage !== b.winPercentage) {
          return b.winPercentage - a.winPercentage;
        }
        // Then by sets differential (higher is better)
        if (a.setsDifferential !== b.setsDifferential) {
          return b.setsDifferential - a.setsDifferential;
        }
        // Finally by sets won (higher is better)
        return b.setsWon - a.setsWon;
      });

    setStandings(sortedStandings);
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

  const getPositionIcon = (index: number) => {
    if (index === 0) return <Trophy className="h-4 w-4 text-yellow-500" />;
    if (index === 1) return <Trophy className="h-4 w-4 text-gray-400" />;
    if (index === 2) return <Trophy className="h-4 w-4 text-amber-600" />;
    return <Target className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Button onClick={onBack} variant="outline" size="sm">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Overview
        </Button>
        <div>
          <h2 className="text-2xl font-bold">{poolName} Details</h2>
          <p className="text-muted-foreground">Pool standings and match results</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Standings */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Pool Standings
            </CardTitle>
          </CardHeader>
          <CardContent>
            {standings.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">No matches completed yet</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">Pos</TableHead>
                    <TableHead>Team</TableHead>
                    <TableHead className="text-center">W-L</TableHead>
                    <TableHead className="text-center">Sets</TableHead>
                    <TableHead className="text-center">Diff</TableHead>
                    <TableHead className="text-center">Win %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {standings.map((team, index) => (
                    <TableRow 
                      key={team.teamId}
                      className="cursor-pointer hover:bg-accent/50 transition-colors"
                      onClick={() => {
                        console.log('Team clicked:', team.teamName, team.teamId);
                        setSelectedTeam({ id: team.teamId, name: team.teamName });
                      }}
                    >
                      <TableCell className="text-center">
                        <div className="flex items-center justify-center">
                          {getPositionIcon(index)}
                          <span className="ml-1 font-semibold">{index + 1}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-medium">{team.teamName}</TableCell>
                      <TableCell className="text-center">
                        <span className="font-mono">
                          {team.wins}-{team.losses}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-mono text-sm">
                          {team.setsWon}-{team.setsLost}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={`font-mono text-sm ${
                          team.setsDifferential > 0 ? 'text-green-600' : 
                          team.setsDifferential < 0 ? 'text-red-600' : 
                          'text-muted-foreground'
                        }`}>
                          {team.setsDifferential > 0 ? '+' : ''}{team.setsDifferential}
                        </span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-mono">
                          {team.wins + team.losses > 0 
                            ? (team.winPercentage * 100).toFixed(0) + '%'
                            : '-'
                          }
                        </span>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Pool Stats */}
        <Card>
          <CardHeader>
            <CardTitle>Pool Statistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-accent/50 rounded-lg">
                <div className="text-2xl font-bold text-primary">{poolMatches.length}</div>
                <div className="text-sm text-muted-foreground">Total Matches</div>
              </div>
              <div className="text-center p-4 bg-accent/50 rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {poolMatches.filter(m => m.status === 'completed').length}
                </div>
                <div className="text-sm text-muted-foreground">Completed</div>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-4 bg-accent/50 rounded-lg">
                <div className="text-2xl font-bold text-blue-600">
                  {poolMatches.filter(m => m.status === 'in_progress').length}
                </div>
                <div className="text-sm text-muted-foreground">In Progress</div>
              </div>
              <div className="text-center p-4 bg-accent/50 rounded-lg">
                <div className="text-2xl font-bold text-yellow-600">
                  {poolMatches.filter(m => m.status === 'scheduled').length}
                </div>
                <div className="text-sm text-muted-foreground">Scheduled</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pool Matches */}
      <Card>
        <CardHeader>
          <CardTitle>Pool Matches</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Round</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Court</TableHead>
                <TableHead>Match</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Result</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {poolMatches
                .sort((a, b) => a.round_number - b.round_number || a.match_number - b.match_number)
                .map((match) => (
                  <TableRow key={match.id}>
                    <TableCell>R{match.round_number}</TableCell>
                    <TableCell>
                      {match.scheduled_time 
                        ? format(new Date(match.scheduled_time), 'h:mm a') 
                        : 'TBD'}
                    </TableCell>
                    <TableCell>{match.court_number}</TableCell>
                    <TableCell>
                      <div className="font-medium">
                        {match.team1_name} vs {match.team2_name}
                      </div>
                    </TableCell>
                    <TableCell>{getMatchStatusBadge(match)}</TableCell>
                    <TableCell>
                      {match.status === 'completed' ? (
                        <div className="font-mono text-sm">
                          <div>
                            {match.sets_won_team1}-{match.sets_won_team2}
                          </div>
                          {match.winner_id && (
                            <div className="text-xs text-muted-foreground">
                              Winner: {match.winner_id === match.team1_id ? match.team1_name : match.team2_name}
                            </div>
                          )}
                        </div>
                      ) : match.status === 'in_progress' ? (
                        <div className="text-sm text-blue-600 font-medium">Live</div>
                      ) : (
                        <div className="text-sm text-muted-foreground">-</div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}