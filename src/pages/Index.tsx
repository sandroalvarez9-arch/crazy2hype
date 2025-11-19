import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import LoadingSkeleton, { EmptyState } from '@/components/LoadingSkeleton';
import { format } from 'date-fns';
import { Calendar, MapPin, Users, Trophy, Plus, List, CalendarDays } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import logo from '@/assets/block-nation-logo.png';
import { useAsync } from '@/hooks/useAsync';
import { useIsMobile } from '@/hooks/use-mobile';
import blockNationLogo from '@/assets/block-nation-logo.png';
import { Star, Zap, Target, Search } from 'lucide-react';

interface Tournament {
  id: string;
  title: string;
  description: string;
  location: string;
  start_date: string;
  end_date: string;
  registration_deadline: string;
  max_teams: number;
  entry_fee: number;
  status: string;
  organizer: {
    username: string;
    first_name: string;
    last_name: string;
  };
  teams: { count: number }[];
}

const Index = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [userStats, setUserStats] = useState({
    activeTournaments: 0,
    registeredTeams: 0,
    upcomingMatches: 0,
  });

  const { execute: fetchTournaments, loading, error, retry } = useAsync(
    async () => {
      const { data, error } = await supabase
        .from('tournaments')
        .select(`
          *,
          organizer:profiles!tournaments_organizer_id_fkey(username, first_name, last_name),
          teams(count)
        `)
        .eq('status', 'open')
        .gte('end_date', new Date().toISOString())
        .order('start_date', { ascending: true })
        .limit(6);

      if (error) throw error;
      setTournaments(data || []);
      return data;
    },
    {
      errorMessage: 'Failed to load tournaments. Please try again.',
    }
  );

  const { execute: fetchUserStats } = useAsync(
    async () => {
      if (!user) return null;

      // Fetch user's teams
      const { data: teams, error: teamsError } = await supabase
        .from('teams')
        .select('id, tournament_id, tournaments!inner(status, start_date, end_date)')
        .eq('captain_id', user.id);

      if (teamsError) throw teamsError;

      // Count active tournaments (user's tournaments that haven't ended)
      const activeTournaments = teams?.filter(
        (team: any) => new Date(team.tournaments.end_date) >= new Date()
      ).length || 0;

      // Fetch upcoming matches for user's teams
      const teamIds = teams?.map((team: any) => team.id) || [];
      if (teamIds.length > 0) {
        const { data: matches, error: matchesError } = await supabase
          .from('matches')
          .select('id')
          .or(`team1_id.in.(${teamIds.join(',')}),team2_id.in.(${teamIds.join(',')})`)
          .eq('status', 'scheduled')
          .gte('scheduled_time', new Date().toISOString());

        if (matchesError) throw matchesError;

        setUserStats({
          activeTournaments,
          registeredTeams: teams?.length || 0,
          upcomingMatches: matches?.length || 0,
        });
      } else {
        setUserStats({
          activeTournaments,
          registeredTeams: 0,
          upcomingMatches: 0,
        });
      }

      return { activeTournaments, teams: teams?.length || 0 };
    },
    {
      errorMessage: 'Failed to load your stats',
    }
  );

  useEffect(() => {
    fetchTournaments();
  }, []);

  useEffect(() => {
    if (user) {
      fetchUserStats();
    }
  }, [user]);

  // Unauthenticated view
  if (!user) {
    return (
      <div className={`min-h-screen flex items-center justify-center gradient-hero p-4 ${isMobile ? 'pt-8 pb-20' : ''}`}>
        <div className="text-center max-w-4xl mx-auto">
          <div className="animate-fade-in">
            <div className="mb-8 flex justify-center">
              <div className="relative">
                <img 
                  src={blockNationLogo} 
                  alt="Block Nation" 
                  className="h-32 w-32 md:h-40 md:w-40 animate-scale-in hover-scale" 
                />
                <div className="absolute inset-0 bg-white/10 rounded-full animate-pulse"></div>
              </div>
            </div>
            <h1 className="text-5xl md:text-7xl font-bold mb-6 text-white drop-shadow-lg">
              Block Nation
            </h1>
            <p className="text-xl md:text-2xl text-white/90 mb-12 drop-shadow">
              The ultimate volleyball tournament platform. 
              Create brackets, track scores, and elevate your game to championship level.
            </p>
            <div className={`grid ${isMobile ? 'grid-cols-1 gap-6' : 'md:grid-cols-3 gap-8'} mb-12`}>
              <div className="text-center p-6 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 shadow-elegant hover-scale animate-fade-in">
                <div className="inline-flex p-3 rounded-full bg-white/20 mb-4">
                  <Trophy className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-white">Elite Tournaments</h3>
                <p className="text-white/80 leading-relaxed">Professional-grade tournaments with automatic bracket generation and real-time scoring</p>
              </div>
              <div className="text-center p-6 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 shadow-elegant hover-scale animate-fade-in" style={{animationDelay: '0.1s'}}>
                <div className="inline-flex p-3 rounded-full bg-white/20 mb-4">
                  <Zap className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-white">Lightning Fast</h3>
                <p className="text-white/80 leading-relaxed">Seamless tournament management with instant updates and real-time bracket progression</p>
              </div>
              <div className="text-center p-6 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 shadow-elegant hover-scale animate-fade-in" style={{animationDelay: '0.2s'}}>
                <div className="inline-flex p-3 rounded-full bg-white/20 mb-4">
                  <Target className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-white">Championship Ready</h3>
                <p className="text-white/80 leading-relaxed">Tournament organizers and players united on one powerful platform</p>
              </div>
            </div>
            <div className={`flex ${isMobile ? 'flex-col space-y-4' : 'justify-center gap-6'}`}>
              <Link to="/auth">
                <Button 
                  size="lg" 
                  className={`${isMobile ? 'w-full' : ''} gradient-primary hover:opacity-90 transition-all px-8 py-6 text-lg font-semibold shadow-elegant hover-scale`}
                >
                  Start Your Tournament
                </Button>
              </Link>
              <Link to="/tournaments">
                <Button 
                  size="lg" 
                  variant="outline" 
                  className={`${isMobile ? 'w-full' : ''} bg-white/10 backdrop-blur-sm border-white/30 text-white hover:bg-white/20 px-8 py-6 text-lg font-semibold shadow-elegant hover-scale`}
                >
                  <Search className="mr-2 h-5 w-5" />
                  Explore Tournaments
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated user view
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section with Welcome Message */}
      <section className="relative py-12 md:py-16 border-b bg-gradient-to-b from-background to-muted/20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center space-y-4">
            <img 
              src={logo} 
              alt="Block Nation" 
              className="h-16 mx-auto mb-2"
            />
            <h1 className="text-3xl md:text-4xl font-bold">
              Welcome back, {profile?.first_name || profile?.username || 'Player'}!
            </h1>
            <p className="text-lg text-muted-foreground">
              {profile?.role === 'host' 
                ? 'Manage your tournaments and create amazing events' 
                : 'Discover elite tournaments and showcase your skills'}
            </p>
          </div>
        </div>
      </section>

      {/* Stats Dashboard */}
      <section className="py-8 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 max-w-4xl mx-auto">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Active Tournaments</CardDescription>
                <CardTitle className="text-3xl flex items-center gap-2">
                  <Trophy className="h-6 w-6 text-primary" />
                  {userStats.activeTournaments}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Registered Teams</CardDescription>
                <CardTitle className="text-3xl flex items-center gap-2">
                  <Users className="h-6 w-6 text-primary" />
                  {userStats.registeredTeams}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Upcoming Matches</CardDescription>
                <CardTitle className="text-3xl flex items-center gap-2">
                  <CalendarDays className="h-6 w-6 text-primary" />
                  {userStats.upcomingMatches}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Quick Actions */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto">
            <h2 className="text-2xl font-bold mb-4">Quick Actions</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {profile?.role === 'host' ? (
                <>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/tournaments/create')}>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Plus className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">Create Tournament</CardTitle>
                          <CardDescription>Set up a new elite event</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/tournaments')}>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <List className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">My Tournaments</CardTitle>
                          <CardDescription>Manage your events</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                </>
              ) : (
                <>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/tournaments')}>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Trophy className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">Browse Tournaments</CardTitle>
                          <CardDescription>Find your next competition</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                  <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate('/tournaments/create')}>
                    <CardHeader>
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <Plus className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <CardTitle className="text-lg">Host Tournament</CardTitle>
                          <CardDescription>Organize your own event</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Upcoming Tournaments */}
      <section className="py-8">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-3xl font-bold">Upcoming Tournaments</h2>
              <Button variant="outline" onClick={() => navigate('/tournaments')}>
                View All
              </Button>
            </div>
            
            {loading ? (
              <LoadingSkeleton type="tournament" count={3} />
            ) : error ? (
              <Card>
                <CardContent className="py-8 text-center">
                  <p className="text-muted-foreground mb-4">Failed to load tournaments</p>
                  <Button onClick={retry}>Try Again</Button>
                </CardContent>
              </Card>
            ) : tournaments.length === 0 ? (
              <EmptyState
                title="No tournaments available"
                description="Be the first to create an elite tournament!"
                actionLabel="Create Tournament"
                actionHref="/tournaments/create"
                icon={<Trophy className="h-12 w-12 text-muted-foreground" />}
              />
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {tournaments.map((tournament) => (
                  <Link key={tournament.id} to={`/tournaments/${tournament.id}`}>
                    <Card className="h-full hover:shadow-lg transition-shadow cursor-pointer">
                      <CardHeader>
                        <CardTitle className="text-xl mb-2">{tournament.title}</CardTitle>
                        <CardDescription className="line-clamp-2">
                          {tournament.description || 'Join this exciting volleyball tournament'}
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-sm">
                            <MapPin className="h-4 w-4 text-muted-foreground" />
                            <span className="truncate">{tournament.location}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Calendar className="h-4 w-4 text-muted-foreground" />
                            <span>{format(new Date(tournament.start_date), 'MMM d, yyyy')}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span>
                              {tournament.teams?.[0]?.count || 0}/{tournament.max_teams} teams
                            </span>
                          </div>
                          {tournament.entry_fee > 0 && (
                            <Badge variant="secondary" className="mt-2">
                              ${tournament.entry_fee} entry fee
                            </Badge>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
};

export default Index;
