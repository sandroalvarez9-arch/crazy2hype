import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Calendar, MapPin, Users, Trophy, DollarSign, Settings, UserPlus } from 'lucide-react';
import { format } from 'date-fns';
import TeamRegistrationDialog from '@/components/TeamRegistrationDialog';
import TeamCheckInDialog from '@/components/TeamCheckInDialog';
import { TeamScheduleView } from '@/components/TeamScheduleView';
import { formatSkillLevel, getSkillLevelBadgeVariant } from '@/utils/skillLevels';

interface Tournament {
  id: string;
  title: string;
  description: string;
  location: string;
  start_date: string;
  end_date: string;
  registration_deadline: string;
  first_game_time: string | null;
  tournament_format: string;
  skill_level: string;
  estimated_game_duration: number;
  number_of_courts: number;
  brackets_generated: boolean;
  max_teams: number;
  players_per_team: number;
  entry_fee: number;
  status: string;
  organizer_id: string;
  check_in_deadline: string | null;
  bracket_version: number;
  allow_backup_teams: boolean;
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
  is_registered: boolean;
  captain_id: string;
  check_in_status: string;
  check_in_time: string | null;
  captain: {
    username: string;
    first_name: string;
    last_name: string;
  };
  contact_email: string;
  contact_phone: string;
}

const TournamentDetails = () => {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRegistrationDialog, setShowRegistrationDialog] = useState(false);
  const [userTeams, setUserTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<any[]>([]);

  useEffect(() => {
    if (id) {
      fetchTournamentDetails();
      fetchTeams();
      fetchMatches();
    }
  }, [id]);

  const fetchTournamentDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select(`
          *,
          organizer:profiles!tournaments_organizer_id_fkey(username, first_name, last_name)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setTournament(data);
    } catch (error) {
      console.error('Error fetching tournament:', error);
    }
  };

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select(`
          *,
          captain:profiles!teams_captain_id_fkey(username, first_name, last_name)
        `)
        .eq('tournament_id', id)
        .order('name');

      if (error) throw error;
      setTeams(data || []);
      
      // Fetch user's teams for check-in
      if (user) {
        const userTeamsData = data?.filter(team => team.captain_id === user.id) || [];
        setUserTeams(userTeamsData);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMatches = async () => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          team1:teams!matches_team1_id_fkey(name),
          team2:teams!matches_team2_id_fkey(name),
          referee_team:teams!matches_referee_team_id_fkey(name)
        `)
        .eq('tournament_id', id)
        .order('scheduled_time');

      if (error) throw error;
      setMatches(data || []);
    } catch (error) {
      console.error('Error fetching matches:', error);
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
      <div className="container mx-auto px-4 py-8 text-center">
        <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Tournament not found</h1>
        <p className="text-muted-foreground mb-4">The tournament you're looking for doesn't exist.</p>
        <Button onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Home
        </Button>
      </div>
    );
  }

  const isOrganizer = user?.id === tournament.organizer_id;
  const registeredTeams = teams.filter(team => team.is_registered);
  const canRegister = new Date() < new Date(tournament.registration_deadline) && 
                     tournament.status === 'open' && 
                     registeredTeams.length < tournament.max_teams;

  return (
    <div className={`container mx-auto px-4 py-6 ${isMobile ? 'pb-4' : 'py-8'}`}>
      <div className="mb-6 animate-fade-in">
        <Button
          variant="ghost"
          onClick={() => navigate(-1)}
          className="mb-4 hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-2">
              <Trophy className="h-6 w-6 md:h-8 w-8 text-primary" />
              {tournament.title}
            </h1>
            <p className="text-muted-foreground">
              Organized by {tournament.organizer.first_name} {tournament.organizer.last_name} (@{tournament.organizer.username})
            </p>
          </div>
          
          <div className="flex gap-2 flex-wrap">
            <Badge variant={getSkillLevelBadgeVariant(tournament.skill_level as any)}>
              {formatSkillLevel(tournament.skill_level as any)}
            </Badge>
            <Badge variant={tournament.status === 'open' ? 'default' : 'secondary'}>
              {tournament.status}
            </Badge>
            <div className="flex gap-2">
              {isOrganizer && (
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={() => navigate(`/tournament/${id}/manage`)}
                >
                  <Settings className="h-4 w-4 mr-2" />
                  Manage
                </Button>
              )}
              {userTeams.length > 0 && (
                <TeamCheckInDialog
                  tournament={{
                    id: tournament.id,
                    title: tournament.title,
                    check_in_deadline: tournament.check_in_deadline,
                    start_date: tournament.start_date
                  }}
                  userTeams={userTeams}
                  onCheckInComplete={fetchTeams}
                />
              )}
            </div>
          </div>
        </div>

        <Card className="shadow-card mb-6 animate-scale-in">
          <CardContent className="pt-6">
            <div className={`grid ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2 lg:grid-cols-4'} gap-4`}>
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium">{tournament.location}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Start Date</p>
                  <p className="font-medium">{format(new Date(tournament.start_date), 'PPP')}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Teams</p>
                  <p className="font-medium">{registeredTeams.length}/{tournament.max_teams}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Entry Fee</p>
                  <p className="font-medium">{tournament.entry_fee > 0 ? `$${tournament.entry_fee}` : 'Free'}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="animate-fade-in">
        <TabsList className={`grid w-full ${isMobile ? 'grid-cols-2' : userTeams.length > 0 ? 'grid-cols-4' : 'grid-cols-3'}`}>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="teams">Teams ({registeredTeams.length})</TabsTrigger>
          {!isMobile && <TabsTrigger value="matches">Matches</TabsTrigger>}
          {userTeams.length > 0 && <TabsTrigger value="schedule">My Schedule</TabsTrigger>}
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Tournament Description</CardTitle>
            </CardHeader>
            <CardContent>
              {tournament.description ? (
                <p className="text-muted-foreground whitespace-pre-wrap">{tournament.description}</p>
              ) : (
                <p className="text-muted-foreground italic">No description provided</p>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Important Dates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Registration Deadline</span>
                  <span className="font-medium">{format(new Date(tournament.registration_deadline), 'PPP')}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Tournament Start</span>
                  <span className="font-medium">{format(new Date(tournament.start_date), 'PPP')}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Tournament End</span>
                  <span className="font-medium">{format(new Date(tournament.end_date), 'PPP')}</span>
                </div>
                {tournament.first_game_time && (
                  <>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">First Game</span>
                      <span className="font-medium">{format(new Date(tournament.first_game_time), "PPP 'at' p")}</span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="teams" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Registered Teams</h3>
            {canRegister && profile?.role === 'player' && (
              <Button 
                size="sm" 
                className="gradient-primary hover:opacity-90 transition-opacity"
                onClick={() => setShowRegistrationDialog(true)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Register Team
              </Button>
            )}
          </div>

          {registeredTeams.length > 0 ? (
            <div className={`grid ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2 lg:grid-cols-3'} gap-4`}>
              {registeredTeams.map((team) => (
                <Card key={team.id} className="shadow-card hover-scale">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg">{team.name}</CardTitle>
                    <CardDescription>
                      Captain: {team.captain.first_name} {team.captain.last_name}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Players</span>
                        <span>{team.players_count}</span>
                      </div>
                      {team.contact_email && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Email</span>
                          <span className="truncate ml-2">{team.contact_email}</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="shadow-card">
              <CardContent className="py-8 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No teams registered yet</p>
                {canRegister && profile?.role === 'player' && (
                  <Button 
                    className="mt-4 gradient-primary hover:opacity-90 transition-opacity"
                    onClick={() => setShowRegistrationDialog(true)}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Be the first to register!
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        {!isMobile && (
          <TabsContent value="matches">
            <Card className="shadow-card">
              <CardContent className="py-8 text-center">
                <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Tournament matches will appear here once pool play is generated</p>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {userTeams.length > 0 && (
          <TabsContent value="schedule">
            {userTeams.map((team) => (
              <div key={team.id} className="mb-6">
                <TeamScheduleView 
                  teamId={team.id}
                  teamName={team.name}
                  matches={matches.map(match => ({
                    ...match,
                    team1_name: match.team1?.name,
                    team2_name: match.team2?.name,
                    referee_team_name: match.referee_team?.name
                  }))}
                />
              </div>
            ))}
          </TabsContent>
        )}
      </Tabs>

      <TeamRegistrationDialog
        isOpen={showRegistrationDialog}
        onOpenChange={setShowRegistrationDialog}
        tournamentId={id!}
        playersPerTeam={tournament?.players_per_team || 6}
        tournamentSkillLevel={tournament?.skill_level}
        onSuccess={fetchTeams}
      />
    </div>
  );
};

export default TournamentDetails;