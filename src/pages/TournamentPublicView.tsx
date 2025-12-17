import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ArrowLeft, Calendar, MapPin, Users, Trophy, ExternalLink } from 'lucide-react';
import { format } from 'date-fns';
import { formatSkillLevel, getSkillLevelBadgeVariant, type SkillLevel } from '@/utils/skillLevels';
import ChampionshipBracketView from '@/components/ChampionshipBracketView';
import { useIsMobile } from '@/hooks/use-mobile';
import logo from '@/assets/block-nation-logo.png';
import { WeatherWidget } from '@/components/WeatherWidget';
import { SMSNotificationSubscribe } from '@/components/SMSNotificationSubscribe';
interface Tournament {
  id: string;
  title: string;
  description: string;
  location: string;
  start_date: string;
  end_date: string;
  tournament_format: string;
  skill_levels: string[];
  max_teams: number;
  players_per_team: number;
  entry_fee: number;
  status: string;
  brackets_generated: boolean;
  organizer: {
    username: string;
    first_name: string;
    last_name: string;
  };
}

interface Team {
  id: string;
  name: string;
  players_count: number;
  skill_level?: string;
  check_in_status: string;
}

interface Match {
  id: string;
  match_number: number;
  team1_id: string | null;
  team2_id: string | null;
  team1_score: number | null;
  team2_score: number | null;
  winner_id: string | null;
  status: string;
  scheduled_time: string | null;
  court_number: number | null;
  round_number: number;
  bracket_position: string | null;
  pool_name: string | null;
  skill_level: string | null;
  team1: { name: string } | null;
  team2: { name: string } | null;
  winner: { name: string } | null;
}

const TournamentPublicView = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapsLink, setMapsLink] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchPublicTournamentData();
    }
  }, [id]);

  const fetchPublicTournamentData = async () => {
    setLoading(true);
    try {
      // Fetch tournament details
      const { data: tournamentData, error: tournamentError } = await supabase
        .from('tournaments')
        .select(`
          *,
          organizer:profiles!tournaments_organizer_id_fkey(username, first_name, last_name)
        `)
        .eq('id', id)
        .single();

      if (tournamentError) throw tournamentError;
      setTournament(tournamentData);

      // Create Google Maps link
      if (tournamentData.location) {
        const encodedLocation = encodeURIComponent(tournamentData.location);
        setMapsLink(`https://www.google.com/maps/search/?api=1&query=${encodedLocation}`);
      }

      // Fetch teams
      const { data: teamsData, error: teamsError } = await supabase
        .from('teams_public')
        .select('*')
        .eq('tournament_id', id)
        .eq('is_registered', true)
        .order('name');

      if (teamsError) throw teamsError;
      setTeams(teamsData || []);

      // Fetch matches
      const { data: matchesData, error: matchesError } = await supabase
        .from('matches')
        .select(`
          *,
          team1:teams_public!matches_team1_id_fkey(name),
          team2:teams_public!matches_team2_id_fkey(name),
          winner:teams_public!matches_winner_id_fkey(name)
        `)
        .eq('tournament_id', id)
        .order('scheduled_time', { ascending: true });

      if (matchesError) throw matchesError;
      setMatches(matchesData || []);
    } catch (error) {
      console.error('Error fetching public tournament data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!tournament) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Card className="max-w-md mx-4">
          <CardContent className="py-8 text-center">
            <Trophy className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Tournament Not Found</h2>
            <p className="text-muted-foreground mb-4">
              This tournament doesn't exist or is not available.
            </p>
            <Button onClick={() => navigate('/')}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const bracketsMatches = matches.filter(m => m.bracket_position);
  const poolMatches = matches.filter(m => m.pool_name);
  const upcomingMatches = matches
    .filter(m => m.status === 'scheduled' && m.scheduled_time)
    .slice(0, 10);

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <img src={logo} alt="Block Nation" className="h-8 w-8" />
              <div>
                <h1 className={`font-bold ${isMobile ? 'text-sm' : 'text-lg'}`}>
                  {tournament.title}
                </h1>
                <p className="text-xs text-muted-foreground">Live View</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <SMSNotificationSubscribe tournamentId={tournament.id} />
              <Badge variant={tournament.status === 'open' ? 'default' : 'secondary'}>
                {tournament.status}
              </Badge>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-6 max-w-7xl">
        {/* Tournament Info Card */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-2xl">{tournament.title}</CardTitle>
            {tournament.description && (
              <p className="text-muted-foreground mt-2">{tournament.description}</p>
            )}
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                  <div>
                    <p className="font-medium">{tournament.location}</p>
                    {mapsLink && (
                      <a
                        href={mapsLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                      >
                        Get Directions
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span>
                    {format(new Date(tournament.start_date), 'MMMM d, yyyy')}
                    {tournament.start_date !== tournament.end_date && 
                      ` - ${format(new Date(tournament.end_date), 'MMMM d, yyyy')}`
                    }
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <span>{teams.length} / {tournament.max_teams} teams registered</span>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                  <span className="capitalize">{tournament.tournament_format?.replace('_', ' ')}</span>
                </div>

                {tournament.skill_levels && tournament.skill_levels.length > 0 && (
                  <div>
                    <span className="text-sm text-muted-foreground mb-2 block">Skill Levels:</span>
                    <div className="flex flex-wrap gap-2">
                      {tournament.skill_levels.map((level) => (
                        <Badge key={level} variant={getSkillLevelBadgeVariant(level as SkillLevel)}>
                          {formatSkillLevel(level as SkillLevel)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                <div className="text-sm text-muted-foreground">
                  Organized by {tournament.organizer.first_name} {tournament.organizer.last_name}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Weather & Maps Section */}
        <div className="space-y-6 mb-6">
          <WeatherWidget location={tournament.location} startDate={tournament.start_date} />
          
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Tournament Location
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="rounded-lg overflow-hidden border">
                <iframe
                  title="Tournament Location Map"
                  src={`https://maps.google.com/maps?q=${encodeURIComponent(tournament.location)}&output=embed&zoom=14`}
                  className="w-full h-64 md:h-96"
                  loading="lazy"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
              {mapsLink && (
                <div className="mt-4">
                  <a
                    href={mapsLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-2 text-primary hover:underline"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Get Directions to {tournament.location}
                  </a>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Tabs for different views */}
        <Tabs defaultValue="bracket" className="w-full">
          <TabsList className={`grid w-full ${tournament.brackets_generated ? 'grid-cols-3' : 'grid-cols-2'}`}>
            {tournament.brackets_generated && (
              <TabsTrigger value="bracket">Bracket</TabsTrigger>
            )}
            <TabsTrigger value="schedule">Schedule</TabsTrigger>
            <TabsTrigger value="teams">Teams</TabsTrigger>
          </TabsList>

          {tournament.brackets_generated && (
            <TabsContent value="bracket" className="mt-6">
              {bracketsMatches.length > 0 ? (
                <ChampionshipBracketView
                  matches={bracketsMatches.map(m => ({
                    id: m.id,
                    team1_id: m.team1_id,
                    team2_id: m.team2_id,
                    team1_name: m.team1?.name || 'TBD',
                    team2_name: m.team2?.name || 'TBD',
                    team1_score: m.team1_score || 0,
                    team2_score: m.team2_score || 0,
                    winner_id: m.winner_id,
                    winner_name: m.winner?.name,
                    bracket_position: m.bracket_position || '',
                    status: m.status,
                    round_number: m.round_number,
                    court: m.court_number || undefined,
                  }))}
                  title="PLAYOFFS"
                  isHost={false}
                />
              ) : (
                <Card>
                  <CardContent className="py-8 text-center text-muted-foreground">
                    Bracket will appear here once matches begin
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          )}

          <TabsContent value="schedule" className="mt-6">
            {upcomingMatches.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-lg font-semibold mb-4">
                  {matches.some(m => m.status === 'in_progress') ? 'Live & Upcoming' : 'Upcoming'} Matches
                </h3>
                {upcomingMatches.map((match) => (
                  <Card key={match.id}>
                    <CardContent className="py-4">
                      <div className="flex items-center justify-between flex-wrap gap-4">
                        <div className="flex-1 min-w-[200px]">
                          <div className="flex items-center justify-between mb-2">
                            <span className="font-semibold">
                              {match.team1?.name || 'TBD'}
                            </span>
                            <span className="text-2xl font-bold">
                              {match.team1_score ?? '-'}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="font-semibold">
                              {match.team2?.name || 'TBD'}
                            </span>
                            <span className="text-2xl font-bold">
                              {match.team2_score ?? '-'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          {match.status === 'in_progress' && (
                            <Badge variant="default" className="mb-2">LIVE</Badge>
                          )}
                          {match.court_number && (
                            <div className="text-sm text-muted-foreground">
                              Court {match.court_number}
                            </div>
                          )}
                          {match.scheduled_time && (
                            <div className="text-sm text-muted-foreground">
                              {format(new Date(match.scheduled_time), 'h:mm a')}
                            </div>
                          )}
                          {match.skill_level && (
                            <Badge variant={getSkillLevelBadgeVariant(match.skill_level as SkillLevel)} className="mt-1">
                              {formatSkillLevel(match.skill_level as SkillLevel)}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No matches scheduled yet
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="teams" className="mt-6">
            {teams.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {teams.map((team) => (
                  <Card key={team.id}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{team.name}</CardTitle>
                          <p className="text-sm text-muted-foreground mt-1">
                            {team.players_count} players
                          </p>
                        </div>
                        {team.skill_level && (
                          <Badge variant={getSkillLevelBadgeVariant(team.skill_level as SkillLevel)}>
                            {formatSkillLevel(team.skill_level as SkillLevel)}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            ) : (
              <Card>
                <CardContent className="py-8 text-center text-muted-foreground">
                  No teams registered yet
                </CardContent>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Footer */}
      <footer className="border-t mt-12 py-6 bg-muted/30">
        <div className="container mx-auto px-4 text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <img src={logo} alt="Block Nation" className="h-6 w-6" />
            <span className="font-semibold">Block Nation</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Simple, fast volleyball tournament management
          </p>
          <Button
            variant="link"
            onClick={() => navigate('/')}
            className="mt-2"
          >
            Create Your Own Tournament
          </Button>
        </div>
      </footer>
    </div>
  );
};

export default TournamentPublicView;
