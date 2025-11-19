import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Trophy, Users, TrendingUp, Calendar, MapPin } from 'lucide-react';
import { format } from 'date-fns';
import { formatSkillLevel, getSkillLevelBadgeVariant } from '@/utils/skillLevels';
import LoadingSkeleton from '@/components/LoadingSkeleton';

interface Team {
  id: string;
  name: string;
  skill_level: string;
  division: string | null;
  category: string | null;
  total_tournaments_played: number;
  total_wins: number;
  total_losses: number;
  created_at: string;
}

interface Player {
  id: string;
  name: string;
  position: string | null;
  jersey_number: number | null;
}

interface TournamentHistory {
  id: string;
  tournament: {
    id: string;
    title: string;
    start_date: string;
    location: string;
  };
  matches_played: number;
  matches_won: number;
  placement: string | null;
}

interface RecentMatch {
  id: string;
  match_number: number;
  opponent_name: string;
  team_score: number;
  opponent_score: number;
  status: string;
  completed_at: string | null;
  tournament_title: string;
}

export default function TeamProfile() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [team, setTeam] = useState<Team | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const [tournaments, setTournaments] = useState<TournamentHistory[]>([]);
  const [recentMatches, setRecentMatches] = useState<RecentMatch[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchTeamData = async () => {
      try {
        setLoading(true);

        // Fetch team details
        const { data: teamData, error: teamError } = await supabase
          .from('teams')
          .select('*')
          .eq('id', id)
          .single();

        if (teamError) throw teamError;
        setTeam(teamData);

        // Fetch players
        const { data: playersData, error: playersError } = await supabase
          .from('players')
          .select('id, name, position, jersey_number')
          .eq('team_id', id)
          .order('jersey_number');

        if (playersError) throw playersError;
        setPlayers(playersData || []);

        // Fetch tournament history with stats
        const { data: statsData, error: statsError } = await supabase
          .from('team_stats')
          .select(`
            id,
            matches_played,
            matches_won,
            tournament_id,
            tournaments (
              id,
              title,
              start_date,
              location
            )
          `)
          .eq('team_id', id)
          .order('tournaments(start_date)', { ascending: false })
          .limit(10);

        if (statsError) throw statsError;
        
        const formattedHistory = statsData?.map((stat: any) => ({
          id: stat.id,
          tournament: stat.tournaments,
          matches_played: stat.matches_played,
          matches_won: stat.matches_won,
          placement: null, // Could be calculated based on bracket position
        })) || [];
        
        setTournaments(formattedHistory);

        // Fetch recent matches
        const { data: matchesData, error: matchesError } = await supabase
          .from('matches')
          .select(`
            id,
            match_number,
            team1_id,
            team2_id,
            team1_score,
            team2_score,
            status,
            completed_at,
            tournament_id,
            tournaments (title),
            team1:teams!matches_team1_id_fkey (name),
            team2:teams!matches_team2_id_fkey (name)
          `)
          .or(`team1_id.eq.${id},team2_id.eq.${id}`)
          .eq('status', 'completed')
          .order('completed_at', { ascending: false })
          .limit(5);

        if (matchesError) throw matchesError;

        const formattedMatches = matchesData?.map((match: any) => {
          const isTeam1 = match.team1_id === id;
          return {
            id: match.id,
            match_number: match.match_number,
            opponent_name: isTeam1 ? match.team2?.name : match.team1?.name,
            team_score: isTeam1 ? match.team1_score : match.team2_score,
            opponent_score: isTeam1 ? match.team2_score : match.team1_score,
            status: match.status,
            completed_at: match.completed_at,
            tournament_title: match.tournaments?.title,
          };
        }) || [];

        setRecentMatches(formattedMatches);
      } catch (error) {
        console.error('Error fetching team data:', error);
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchTeamData();
    }
  }, [id]);

  if (loading) {
    return <LoadingSkeleton type="tournament" count={1} />;
  }

  if (!team) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card>
          <CardContent className="py-8 text-center">
            <p className="text-muted-foreground mb-4">Team not found</p>
            <Button onClick={() => navigate(-1)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Go Back
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const winRate = team.total_wins + team.total_losses > 0
    ? ((team.total_wins / (team.total_wins + team.total_losses)) * 100).toFixed(1)
    : '0';

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      {/* Header */}
      <div className="mb-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mb-4">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <h1 className="heading-1 mb-2">{team.name}</h1>
            <div className="flex items-center gap-2 flex-wrap">
              {team.skill_level && (
                <Badge variant={getSkillLevelBadgeVariant(team.skill_level as any)}>
                  {formatSkillLevel(team.skill_level as any)}
                </Badge>
              )}
              {team.division && (
                <Badge variant="outline">{team.division}</Badge>
              )}
              {team.category && (
                <Badge variant="secondary">{team.category}</Badge>
              )}
            </div>
          </div>

          <div className="text-right">
            <p className="text-sm text-muted-foreground">Member Since</p>
            <p className="font-medium">{format(new Date(team.created_at), 'MMMM yyyy')}</p>
          </div>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4 mb-6">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Tournaments</p>
                <p className="text-3xl font-bold">{team.total_tournaments_played || 0}</p>
              </div>
              <Trophy className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Wins</p>
                <p className="text-3xl font-bold text-green-600">{team.total_wins || 0}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Losses</p>
                <p className="text-3xl font-bold text-red-600">{team.total_losses || 0}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-red-600 rotate-180" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Win Rate</p>
                <p className="text-3xl font-bold">{winRate}%</p>
              </div>
              <Trophy className="h-8 w-8 text-primary" />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Roster */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Team Roster ({players.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {players.length > 0 ? (
              <div className="space-y-3">
                {players.map((player) => (
                  <div key={player.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <div>
                      <p className="font-medium">{player.name}</p>
                      {player.position && (
                        <p className="text-sm text-muted-foreground">{player.position}</p>
                      )}
                    </div>
                    {player.jersey_number && (
                      <Badge variant="outline">#{player.jersey_number}</Badge>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">No players registered</p>
            )}
          </CardContent>
        </Card>

        {/* Recent Matches */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Recent Matches
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentMatches.length > 0 ? (
              <div className="space-y-3">
                {recentMatches.map((match) => (
                  <div key={match.id} className="p-3 rounded-lg bg-muted/50">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-sm text-muted-foreground">{match.tournament_title}</p>
                      {match.completed_at && (
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(match.completed_at), 'MMM d')}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="font-medium">vs {match.opponent_name}</p>
                      <div className="flex items-center gap-2">
                        <span className={`font-bold ${match.team_score > match.opponent_score ? 'text-green-600' : 'text-red-600'}`}>
                          {match.team_score} - {match.opponent_score}
                        </span>
                        <Badge variant={match.team_score > match.opponent_score ? 'default' : 'destructive'}>
                          {match.team_score > match.opponent_score ? 'W' : 'L'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-4">No completed matches yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Tournament History */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Tournament History
          </CardTitle>
        </CardHeader>
        <CardContent>
          {tournaments.length > 0 ? (
            <div className="space-y-4">
              {tournaments.map((tournament) => (
                <div key={tournament.id} className="flex items-center justify-between p-4 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div className="flex-1">
                    <p className="font-medium mb-1">{tournament.tournament.title}</p>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        <span>{format(new Date(tournament.tournament.start_date), 'MMM d, yyyy')}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        <span>{tournament.tournament.location}</span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground mb-1">Record</p>
                    <p className="font-bold">
                      {tournament.matches_won || 0} - {(tournament.matches_played || 0) - (tournament.matches_won || 0)}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-muted-foreground py-8">
              No tournament history available
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
