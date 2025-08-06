import { useAuth } from '@/hooks/useAuth';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { CalendarDays, Users, Trophy, MapPin } from 'lucide-react';

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
  const { user } = useAuth();
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
          organizer:profiles!tournaments_organizer_id_fkey(username),
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center max-w-2xl mx-auto px-4">
          <h1 className="text-4xl font-bold mb-6 text-foreground">VolleyTournament</h1>
          <p className="text-xl text-muted-foreground mb-8">
            Organize and participate in volleyball tournaments with ease. 
            Create brackets, track scores, and manage your tournaments all in one place.
          </p>
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            <div className="text-center">
              <Trophy className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Create Tournaments</h3>
              <p className="text-sm text-muted-foreground">Set up tournaments with automatic bracket generation</p>
            </div>
            <div className="text-center">
              <Users className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Join Teams</h3>
              <p className="text-sm text-muted-foreground">Register your team for exciting competitions</p>
            </div>
            <div className="text-center">
              <CalendarDays className="h-12 w-12 text-primary mx-auto mb-4" />
              <h3 className="font-semibold mb-2">Track Progress</h3>
              <p className="text-sm text-muted-foreground">Monitor scores and statistics in real-time</p>
            </div>
          </div>
          <Link to="/auth">
            <Button size="lg">Get Started</Button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Welcome back!</h1>
        <p className="text-muted-foreground">
          Discover upcoming tournaments or create your own volleyball competition.
        </p>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-8">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Trophy className="h-5 w-5" />
              Create Tournament
            </CardTitle>
            <CardDescription>
              Organize your own volleyball tournament with automatic bracket generation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/create-tournament">
              <Button className="w-full">Create New Tournament</Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Join Tournament
            </CardTitle>
            <CardDescription>
              Find and register for upcoming volleyball tournaments
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link to="/tournaments">
              <Button variant="outline" className="w-full">Browse Tournaments</Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">Upcoming Tournaments</h2>
        {loading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse">
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
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tournaments.map((tournament) => (
              <Card key={tournament.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <CardTitle className="text-lg">{tournament.title}</CardTitle>
                    <Badge variant="secondary">{tournament.status}</Badge>
                  </div>
                  <CardDescription className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    by {tournament.organizer?.username}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
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
                    <Link to={`/tournaments/${tournament.id}`}>
                      <Button variant="outline" size="sm" className="w-full">
                        View Details
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center">
              <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">No tournaments available right now.</p>
              <Link to="/create-tournament">
                <Button>Create the First Tournament</Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Index;
