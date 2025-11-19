import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import LoadingSkeleton, { EmptyState } from '@/components/LoadingSkeleton';
import { Trophy, Plus, List, CalendarDays, ArrowRight } from 'lucide-react';
import logo from '@/assets/block-nation-logo.png';
import { useAsync } from '@/hooks/useAsync';
import { useIsMobile } from '@/hooks/use-mobile';
import TournamentCard from '@/components/TournamentCard';

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

  // Unauthenticated view - Clean & Minimal
  if (!user) {
    return (
      <div className={`min-h-screen flex items-center justify-center gradient-hero p-4 ${isMobile ? 'pt-8 pb-20' : ''}`}>
        <div className="text-center max-w-3xl mx-auto animate-fade-in">
          <div className="mb-6 flex justify-center">
            <img 
              src={logo} 
              alt="Block Nation" 
              className="h-24 w-24 md:h-32 md:w-32 hover-scale" 
            />
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-4 text-white">
            Block Nation
          </h1>
          
          <p className="text-lg md:text-xl text-white/90 mb-12 max-w-xl mx-auto">
            Simple, fast volleyball tournament management
          </p>
          
          <div className={`flex ${isMobile ? 'flex-col gap-4' : 'justify-center gap-6'} mb-8`}>
            <Button 
              size="lg" 
              onClick={() => navigate('/tournaments/create')}
              className={`${isMobile ? 'w-full' : 'min-w-[200px]'} gradient-primary text-white hover:opacity-90 px-8 py-6 text-lg font-semibold shadow-glow`}
            >
              Create Tournament
            </Button>
            <Button 
              size="lg" 
              variant="hero"
              onClick={() => navigate('/tournaments')}
              className={`${isMobile ? 'w-full' : 'min-w-[200px]'} px-8 py-6 text-lg font-semibold`}
            >
              Browse Events
            </Button>
            <Button 
              size="lg" 
              variant="hero"
              onClick={() => navigate('/auth')}
              className={`${isMobile ? 'w-full' : 'min-w-[200px]'} px-8 py-6 text-lg font-semibold`}
            >
              Sign In
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated user view - Clean & Action-Focused
  return (
    <div className="min-h-screen bg-background">
      {/* Simplified Hero */}
      <section className="relative py-8 md:py-12 border-b">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto text-center space-y-2">
            <h1 className="text-3xl md:text-4xl font-bold">
              Welcome back, {profile?.first_name || profile?.username}
            </h1>
            <p className="text-muted-foreground">
              {profile?.role === 'host' ? 'Manage your events' : 'Your tournaments'}
            </p>
          </div>
        </div>
      </section>

      {/* Stats Dashboard - Bigger & Clearer */}
      <section className="py-6 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-3 gap-3 md:gap-6 max-w-5xl mx-auto">
            <Card className="text-center hover:shadow-md transition-shadow">
              <CardContent className="pt-6 pb-6">
                <Trophy className="h-8 w-8 md:h-10 md:w-10 text-primary mx-auto mb-2" />
                <div className="text-3xl md:text-4xl font-bold mb-1">
                  {userStats.activeTournaments}
                </div>
                <div className="text-xs md:text-sm text-muted-foreground">
                  Active Events
                </div>
              </CardContent>
            </Card>
            <Card className="text-center hover:shadow-md transition-shadow">
              <CardContent className="pt-6 pb-6">
                <List className="h-8 w-8 md:h-10 md:w-10 text-primary mx-auto mb-2" />
                <div className="text-3xl md:text-4xl font-bold mb-1">
                  {userStats.registeredTeams}
                </div>
                <div className="text-xs md:text-sm text-muted-foreground">
                  Your Teams
                </div>
              </CardContent>
            </Card>
            <Card className="text-center hover:shadow-md transition-shadow">
              <CardContent className="pt-6 pb-6">
                <CalendarDays className="h-8 w-8 md:h-10 md:w-10 text-primary mx-auto mb-2" />
                <div className="text-3xl md:text-4xl font-bold mb-1">
                  {userStats.upcomingMatches}
                </div>
                <div className="text-xs md:text-sm text-muted-foreground">
                  Upcoming
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Quick Actions - Simplified */}
      <section className="py-6">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="flex flex-col sm:flex-row gap-3">
              {profile?.role === 'host' ? (
                <>
                  <Button 
                    size="lg"
                    onClick={() => navigate('/tournaments/create')}
                    className="flex-1 h-auto py-4 gradient-primary text-white hover:opacity-90"
                  >
                    <Plus className="mr-2 h-5 w-5" />
                    Create Tournament
                  </Button>
                  <Button 
                    size="lg"
                    variant="outline"
                    onClick={() => navigate('/tournaments')}
                    className="flex-1 h-auto py-4"
                  >
                    <List className="mr-2 h-5 w-5" />
                    Manage Events
                  </Button>
                </>
              ) : (
                <>
                  <Button 
                    size="lg"
                    onClick={() => navigate('/tournaments')}
                    className="flex-1 h-auto py-4 gradient-primary text-white hover:opacity-90"
                  >
                    <Trophy className="mr-2 h-5 w-5" />
                    Browse Tournaments
                  </Button>
                  <Button 
                    size="lg"
                    variant="outline"
                    onClick={() => navigate('/tournaments/create')}
                    className="flex-1 h-auto py-4"
                  >
                    <Plus className="mr-2 h-5 w-5" />
                    Host Event
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Upcoming Tournaments */}
      <section className="py-6 pb-12">
        <div className="container mx-auto px-4">
          <div className="max-w-5xl mx-auto">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl md:text-3xl font-bold">Upcoming Tournaments</h2>
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
                description="Be the first to create one!"
                actionLabel="Create Tournament"
                actionHref="/tournaments/create"
                icon={<Trophy className="h-12 w-12 text-muted-foreground" />}
              />
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {tournaments.map((tournament) => (
                  <TournamentCard key={tournament.id} tournament={tournament} />
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
