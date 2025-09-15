import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { CalendarDays, Users, Trophy, MapPin, Plus, Search } from 'lucide-react';

interface Tournament {
  id: string;
  title: string;
  description: string;
  location: string;
  start_date: string;
  registration_deadline: string;
  max_teams: number;
  entry_fee: number;
  status: string;
  organizer: {
    username: string;
  };
  teams: { count: number }[];
}

const Index = () => {
  const { user, profile } = useAuth();
  const isMobile = useIsMobile();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTournaments();
  }, []);

  const fetchTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select(`
          *,
          organizer:profiles_public!tournaments_organizer_id_fkey(username),
          teams(count)
        `)
        .eq('status', 'open')
        .order('start_date', { ascending: true })
        .limit(6);

      if (error) throw error;
      setTournaments(data || []);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return (
      <div className={`min-h-screen flex items-center justify-center bg-background p-4 ${isMobile ? 'pt-8 pb-20' : ''}`}>
        <div className="text-center max-w-2xl mx-auto">
          <div className="animate-fade-in">
            <h1 className="text-4xl md:text-6xl font-bold mb-6 gradient-hero bg-clip-text text-transparent">
              VolleyTournament
            </h1>
            <p className="text-xl text-muted-foreground mb-8">
              Organize and participate in volleyball tournaments with ease. 
              Create brackets, track scores, and manage your tournaments all in one place.
            </p>
            <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'md:grid-cols-3 gap-6'} mb-8`}>
              <div className="text-center p-4 rounded-lg bg-card shadow-card">
                <Trophy className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Create Tournaments</h3>
                <p className="text-sm text-muted-foreground">Set up tournaments with automatic bracket generation</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-card shadow-card">
                <Users className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Join Teams</h3>
                <p className="text-sm text-muted-foreground">Register your team for exciting competitions</p>
              </div>
              <div className="text-center p-4 rounded-lg bg-card shadow-card">
                <CalendarDays className="h-12 w-12 text-primary mx-auto mb-4" />
                <h3 className="font-semibold mb-2">Track Progress</h3>
                <p className="text-sm text-muted-foreground">Monitor scores and statistics in real-time</p>
              </div>
            </div>
            <Link to="/auth">
              <Button size="lg" className="gradient-primary hover:opacity-90 transition-opacity">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`container mx-auto px-4 py-6 ${isMobile ? 'pb-4' : 'py-8'}`}>
      <div className="mb-6 animate-fade-in">
        <h1 className="text-2xl md:text-3xl font-bold mb-2">
          Welcome back, {profile?.username || user.email?.split('@')[0]}!
        </h1>
        <p className="text-muted-foreground">
          {profile?.role === 'host' 
            ? 'Manage your tournaments and create new ones' 
            : 'Discover upcoming tournaments or create your own volleyball competition'
          }
        </p>
      </div>

      <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'md:grid-cols-2 gap-6'} mb-8 animate-scale-in`}>
        {profile?.role === 'host' ? (
          <>
            <Card className="shadow-card hover-scale">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Create Tournament
                </CardTitle>
                <CardDescription>
                  Set up a new volleyball tournament with automatic bracket generation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/create-tournament">
                  <Button className="w-full gradient-primary hover:opacity-90 transition-opacity">
                    Create New Tournament
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="shadow-card hover-scale">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5" />
                  My Tournaments
                </CardTitle>
                <CardDescription>
                  Manage and monitor your hosted tournaments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/my-tournaments">
                  <Button variant="outline" className="w-full">
                    View My Tournaments
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card className="shadow-card hover-scale">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5" />
                  Find Tournaments
                </CardTitle>
                <CardDescription>
                  Discover and join upcoming volleyball tournaments
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/tournaments">
                  <Button className="w-full gradient-primary hover:opacity-90 transition-opacity">
                    Browse Tournaments
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="shadow-card hover-scale">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Host Tournament
                </CardTitle>
                <CardDescription>
                  Organize your own volleyball tournament
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/create-tournament">
                  <Button variant="outline" className="w-full">
                    Create Tournament
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="mb-6">
        <h2 className="text-xl md:text-2xl font-bold mb-4">Upcoming Tournaments</h2>
        {loading ? (
          <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'md:grid-cols-2 lg:grid-cols-3 gap-6'}`}>
            {[...Array(isMobile ? 3 : 6)].map((_, i) => (
              <Card key={i} className="animate-pulse shadow-card">
                <CardHeader>
                  <div className="h-4 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="h-3 bg-muted rounded"></div>
                    <div className="h-3 bg-muted rounded w-3/4"></div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : tournaments.length > 0 ? (
          <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'md:grid-cols-2 lg:grid-cols-3 gap-6'}`}>
            {tournaments.slice(0, isMobile ? 4 : 6).map((tournament) => (
              <Card key={tournament.id} className="hover:shadow-lg transition-all duration-200 shadow-card hover-scale animate-fade-in">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className={`${isMobile ? 'text-lg' : 'text-xl'} line-clamp-2`}>
                      {tournament.title}
                    </CardTitle>
                    <Badge variant="secondary" className="shrink-0">
                      {tournament.status}
                    </Badge>
                  </div>
                  <CardDescription className="flex items-center gap-1 text-sm">
                    <Users className="h-3 w-3" />
                    by {tournament.organizer?.username}
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="space-y-2">{isMobile ? (
                      <>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <MapPin className="h-3 w-3" />
                          {tournament.location}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <CalendarDays className="h-3 w-3" />
                          {new Date(tournament.start_date).toLocaleDateString()}
                        </div>
                        <div className="flex justify-between items-center text-xs">
                          <span className="text-muted-foreground">
                            {tournament.teams?.[0]?.count || 0}/{tournament.max_teams} teams
                          </span>
                          {tournament.entry_fee > 0 && (
                            <span className="font-medium">${tournament.entry_fee}</span>
                          )}
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="h-4 w-4" />
                          {tournament.location}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <CalendarDays className="h-4 w-4" />
                          {new Date(tournament.start_date).toLocaleDateString()}
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-sm text-muted-foreground">
                            {tournament.teams?.[0]?.count || 0}/{tournament.max_teams} teams
                          </span>
                          {tournament.entry_fee > 0 && (
                            <span className="text-sm font-medium">${tournament.entry_fee}</span>
                          )}
                        </div>
                      </>
                    )}
                    <Link to={`/tournament/${tournament.id}`}>
                      <Button variant="outline" size={isMobile ? "sm" : "default"} className="w-full">
                        View Details
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card className="shadow-card">
            <CardContent className="py-8 text-center">
              <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No tournaments available right now.</p>
              <Link to="/create-tournament">
                <Button className="gradient-primary hover:opacity-90 transition-opacity">
                  Create the First Tournament
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Index;
