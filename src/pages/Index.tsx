import { useAuth } from '@/hooks/useAuth';
import { useIsMobile } from '@/hooks/use-mobile';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Link } from 'react-router-dom';
import { CalendarDays, Users, Trophy, MapPin, Plus, Search, Star, Zap, Target } from 'lucide-react';
import blockNationLogo from '@/assets/block-nation-logo.png';

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
        .gte('end_date', new Date().toISOString())
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
                <p className="text-white/80 leading-relaxed">Instant team registration, live score updates, and seamless tournament management</p>
              </div>
              <div className="text-center p-6 rounded-xl bg-white/10 backdrop-blur-sm border border-white/20 shadow-elegant hover-scale animate-fade-in" style={{animationDelay: '0.2s'}}>
                <div className="inline-flex p-3 rounded-full bg-white/20 mb-4">
                  <Target className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-3 text-white">Championship Ready</h3>
                <p className="text-white/80 leading-relaxed">Advanced statistics, referee management, and playoff progression tracking</p>
              </div>
            </div>
            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link to="/auth">
                <Button size="lg" className="bg-white text-primary hover:bg-white/90 transition-all duration-300 px-8 py-4 text-lg font-semibold shadow-elegant">
                  Start Your Tournament
                </Button>
              </Link>
              <Link to="/tournaments">
                <Button size="lg" variant="outline" className="border-2 border-white/30 text-white hover:bg-white/10 transition-all duration-300 px-8 py-4 text-lg">
                  Explore Tournaments
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`container mx-auto px-4 py-6 ${isMobile ? 'pb-4' : 'py-8'}`}>
      <div className="mb-6 animate-fade-in">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold mb-2 flex items-center gap-3">
              <img src={blockNationLogo} alt="Block Nation" className="h-8 w-8" />
              Welcome back, {profile?.username || user.email?.split('@')[0]}!
            </h1>
            <p className="text-muted-foreground">
              {profile?.role === 'host' 
                ? 'Manage your tournaments and create championship experiences' 
                : 'Discover elite tournaments and elevate your volleyball game'
              }
            </p>
          </div>
        </div>
      </div>

      <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'md:grid-cols-2 gap-6'} mb-8 animate-scale-in`}>
        {profile?.role === 'host' ? (
          <>
            <Card className="shadow-card hover-scale gradient-card border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Plus className="h-5 w-5" />
                  Create Elite Tournament
                </CardTitle>
                <CardDescription>
                  Launch a professional volleyball tournament with advanced bracket generation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/create-tournament">
                  <Button className="w-full gradient-primary hover:opacity-90 transition-opacity shadow-glow">
                    Create Championship Tournament
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="shadow-card hover-scale">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Trophy className="h-5 w-5 text-volleyball-orange" />
                  Tournament Dashboard
                </CardTitle>
                <CardDescription>
                  Monitor and manage your hosted tournaments with real-time analytics
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/my-tournaments">
                  <Button variant="outline" className="w-full">
                    View Tournament Dashboard
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </>
        ) : (
          <>
            <Card className="shadow-card hover-scale gradient-card border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-primary">
                  <Search className="h-5 w-5" />
                  Discover Elite Tournaments
                </CardTitle>
                <CardDescription>
                  Join premium volleyball tournaments and compete at championship level
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/tournaments">
                  <Button className="w-full gradient-primary hover:opacity-90 transition-opacity shadow-glow">
                    Explore Elite Tournaments
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="shadow-card hover-scale">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5 text-volleyball-orange" />
                  Host Your Tournament
                </CardTitle>
                <CardDescription>
                  Organize your own professional volleyball tournament experience
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link to="/create-tournament">
                  <Button variant="outline" className="w-full">
                    Become a Tournament Host
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
            {tournaments.slice(0, isMobile ? 4 : 6).map((tournament, index) => (
              <Card key={tournament.id} className="hover:shadow-lg transition-all duration-200 shadow-card hover-scale animate-fade-in">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className={`${isMobile ? 'text-lg' : 'text-xl'} line-clamp-2`}>
                      {tournament.title}
                    </CardTitle>
                    <div className="flex flex-col gap-1">
                      <Badge 
                        variant={tournament.status === 'open' ? 'default' : 'secondary'} 
                        className="shrink-0"
                      >
                        {tournament.status}
                      </Badge>
                      {index === 0 && (
                        <Badge variant="outline" className="text-xs bg-volleyball-orange/10 border-volleyball-orange/30">
                          Featured
                        </Badge>
                      )}
                    </div>
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
            <CardContent className="py-12 text-center">
              <div className="flex justify-center mb-6">
                <div className="relative">
                  <img 
                    src={blockNationLogo} 
                    alt="Block Nation" 
                    className="h-16 w-16 opacity-50 hover-scale" 
                  />
                  <div className="absolute -bottom-2 -right-2 bg-primary rounded-full p-2">
                    <Trophy className="h-4 w-4 text-primary-foreground" />
                  </div>
                </div>
              </div>
              <h3 className="text-xl font-semibold mb-2">No Elite Tournaments Yet</h3>
              <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                Be the pioneer and create the first championship-level tournament in the Block Nation platform.
              </p>
              <Link to="/create-tournament">
                <Button className="gradient-primary hover:opacity-90 transition-opacity shadow-glow">
                  Create the First Elite Tournament
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
