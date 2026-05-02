import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import LoadingSkeleton, { EmptyState } from '@/components/LoadingSkeleton';
import { Trophy, ArrowRight, Search, MapPin, Calendar, Sparkles } from 'lucide-react';
import { useAsync } from '@/hooks/useAsync';
import TournamentCard from '@/components/TournamentCard';
import { shouldShowOnPublicTournamentLists } from '@/utils/publicTournamentFilters';

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
  skill_levels?: string[];
  organizer?: { username: string; first_name?: string; last_name?: string };
  teams?: { count: number }[];
}

const Index = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [stats, setStats] = useState({ available: 0, liveNow: 0, openSpots: 0, hosts: 0 });
  const [locationQuery, setLocationQuery] = useState('');

  const { execute: fetchTournaments, loading, error, retry } = useAsync(
    async () => {
      // Use the public RPC so unauthenticated visitors see the same list.
      const { data, error } = await supabase.rpc('get_public_tournaments');
      if (error) throw error;

      const cleanedPublicTournaments = (data || []).filter((t: any) =>
        shouldShowOnPublicTournamentLists(t)
      );

      const upcoming = cleanedPublicTournaments
        .sort((a: any, b: any) => new Date(a.start_date).getTime() - new Date(b.start_date).getTime())
        .slice(0, 6);

      // Decorate with team counts
      const ids = upcoming.map((t: any) => t.id);
      let teamMap: Record<string, number> = {};
      if (ids.length > 0) {
        const { data: teamRows } = await supabase
          .from('teams_public')
          .select('tournament_id')
          .in('tournament_id', ids);
        teamMap = (teamRows || []).reduce<Record<string, number>>((acc, row: any) => {
          acc[row.tournament_id] = (acc[row.tournament_id] || 0) + 1;
          return acc;
        }, {});
      }

      const decorated: Tournament[] = upcoming.map((t: any) => ({
        ...t,
        teams: [{ count: teamMap[t.id] || 0 }],
      }));
      setTournaments(decorated);

      const liveNow = cleanedPublicTournaments.filter((t: any) => t.status === 'in_progress').length;
      const openSpots = decorated.reduce(
        (sum, t) => sum + Math.max(0, (t.max_teams || 0) - (teamMap[t.id] || 0)),
        0
      );
      setStats({
        available: cleanedPublicTournaments.length,
        liveNow,
        openSpots,
        hosts: new Set(cleanedPublicTournaments.map((t: any) => t.organizer_id || t.id)).size,
      });

      return decorated;
    },
    { errorMessage: 'Failed to load tournaments. Please try again.' }
  );

  useEffect(() => {
    fetchTournaments();
  }, []);

  const goToBrowse = () => {
    const params = locationQuery.trim() ? `?q=${encodeURIComponent(locationQuery.trim())}` : '';
    navigate(`/tournaments${params}`);
  };

  return (
    <div className="bg-background text-foreground">
      {/* HERO */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-glow opacity-70 pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 md:px-6 pt-16 md:pt-24 pb-12 md:pb-16">
          {/* Live status pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface-raised border border-white/10 text-xs font-medium text-accent mb-6 animate-fade-in">
            <span className="size-2 rounded-full bg-accent animate-pulse-dot" />
            {stats.liveNow > 0
              ? `${stats.liveNow} tournaments live right now`
              : stats.available > 0
                ? `${stats.available} tournaments open for registration`
                : 'Find your next tournament'}
          </div>

          <h1 className="font-display font-extrabold text-5xl md:text-7xl lg:text-8xl tracking-tighter leading-[0.95] text-balance max-w-4xl">
            Find your court.
            <br />
            <span className="text-primary">Own the rally.</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-xl">
            Browse upcoming volleyball tournaments near you, register your team in minutes, and
            follow live brackets and scores.
          </p>

          {/* Quick search */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              goToBrowse();
            }}
            className="mt-10 bg-surface-raised border border-white/10 rounded-2xl p-2 flex flex-col sm:flex-row gap-2 max-w-2xl shadow-card"
          >
            <div className="flex items-center gap-3 px-4 py-3 bg-background rounded-xl flex-1">
              <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
              <Input
                value={locationQuery}
                onChange={(e) => setLocationQuery(e.target.value)}
                placeholder="City, ZIP, or venue"
                className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0 text-sm font-medium placeholder:text-muted-foreground"
              />
            </div>
            <Button
              type="submit"
              className="bg-primary hover:bg-primary/90 text-primary-foreground font-display font-bold uppercase tracking-wide rounded-xl px-6"
            >
              <Search className="h-4 w-4 mr-2" />
              Browse
            </Button>
          </form>

          {/* Stat strip */}
          <div className="mt-12 grid grid-cols-3 gap-6 md:gap-12 max-w-2xl py-6 border-y border-white/5">
            <Stat label="Available tournaments" value={stats.available.toString()} accent />
            <Stat label="Open team spots" value={stats.openSpots.toString()} />
            <Stat label="Active hosts" value={stats.hosts.toString()} />
          </div>
        </div>
      </section>

      {/* TOURNAMENTS GRID */}
      <section className="bg-background py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="flex items-end justify-between mb-8">
            <div>
              <h2 className="font-display font-extrabold text-3xl md:text-4xl tracking-tight">
                Upcoming tournaments
              </h2>
              <p className="text-sm text-muted-foreground mt-1">
                Sorted by start date. Register before they fill up.
              </p>
            </div>
            <Button
              variant="ghost"
              onClick={() => navigate('/tournaments')}
              className="text-accent hover:text-accent hover:bg-accent/10 text-sm font-semibold uppercase tracking-wide"
            >
              View all <ArrowRight className="h-4 w-4 ml-1" />
            </Button>
          </div>

          {loading ? (
            <LoadingSkeleton type="tournament" count={6} />
          ) : error ? (
            <div className="bg-surface-raised border border-destructive/30 rounded-2xl p-10 text-center">
              <Trophy className="h-10 w-10 text-destructive mx-auto mb-4" />
              <h3 className="font-display font-bold mb-2">Could not load tournaments</h3>
              <p className="text-sm text-muted-foreground mb-6">Something went wrong. Try again.</p>
              <Button onClick={retry} variant="outline">
                Retry
              </Button>
            </div>
          ) : tournaments.length === 0 ? (
            <EmptyState
              title="No upcoming tournaments yet"
              description="Be the first to host one."
              actionLabel="Host a tournament"
              actionHref="/host"
              icon={<Trophy className="h-12 w-12 text-muted-foreground" />}
            />
          ) : (
            <div className="grid gap-4 md:gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {tournaments.map((t) => (
                <TournamentCard key={t.id} tournament={t} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* HOW IT WORKS — short, player-first */}
      <section className="py-12 md:py-16 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <h2 className="font-display font-extrabold text-2xl md:text-3xl tracking-tight mb-8">
            How it works
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
            <Step
              n="01"
              title="Browse tournaments"
              body="Filter by city, skill level, and date. Open public event pages without signing in."
            />
            <Step
              n="02"
              title="Register your team"
              body="Quick wizard with captain info, players, and payment. Done in minutes."
            />
            <Step
              n="03"
              title="Show up & play"
              body="Follow live brackets, scores, and court assignments straight from your phone."
            />
          </div>
        </div>
      </section>

      {/* HOST CTA */}
      <section className="py-12 md:py-16">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          <div className="relative overflow-hidden rounded-3xl gradient-host p-8 md:p-14 flex flex-col md:flex-row items-start md:items-center justify-between gap-8">
            <div className="absolute -right-16 -top-16 w-64 h-64 bg-accent/30 blur-3xl rounded-full pointer-events-none" />
            <div className="relative max-w-xl">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/20 text-xs font-bold uppercase tracking-widest text-white mb-4">
                <Sparkles className="h-3 w-3" />
                For hosts
              </div>
              <h2 className="font-display font-extrabold text-3xl md:text-5xl tracking-tighter text-white uppercase">
                Run your own tournament.
              </h2>
              <p className="mt-3 text-white/85 text-base md:text-lg">
                Registrations, payments, brackets, and live scoring — all in one place. Built for
                directors who want to spend more time on the court.
              </p>
            </div>
            <Button
              size="lg"
              onClick={() => navigate(user ? '/create-tournament' : '/host')}
              className="relative bg-background text-foreground hover:bg-background/90 font-display font-bold uppercase tracking-wide rounded-xl px-7 py-6 text-base"
            >
              {user ? 'Create tournament' : 'Become a host'}
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      {/* Authenticated quick links */}
      {user && (
        <section className="pb-16">
          <div className="max-w-7xl mx-auto px-4 md:px-6">
            <div className="bg-surface-raised border border-white/5 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="text-xs uppercase tracking-widest text-muted-foreground font-semibold mb-1">
                  Welcome back
                </div>
                <div className="font-display font-bold text-xl md:text-2xl">
                  {profile?.first_name || profile?.username || 'Player'}
                </div>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Button variant="outline" onClick={() => navigate('/my-tournaments')} className="rounded-full">
                  <Calendar className="h-4 w-4 mr-2" /> My tournaments
                </Button>
                <Button onClick={() => navigate('/profile')} className="rounded-full">
                  Profile settings
                </Button>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

const Stat = ({ label, value, accent }: { label: string; value: string; accent?: boolean }) => (
  <div>
    <div
      className={`font-display font-extrabold text-3xl md:text-4xl tabular-nums tracking-tight ${
        accent ? 'text-accent' : 'text-foreground'
      }`}
    >
      {value}
    </div>
    <div className="text-[10px] md:text-xs uppercase tracking-widest text-muted-foreground font-semibold mt-1">
      {label}
    </div>
  </div>
);

const Step = ({ n, title, body }: { n: string; title: string; body: string }) => (
  <div className="bg-surface-raised border border-white/5 rounded-2xl p-6 hover:border-white/20 transition-colors">
    <div className="font-display font-extrabold text-3xl text-primary tabular-nums">{n}</div>
    <div className="font-display font-bold text-lg mt-3">{title}</div>
    <p className="text-sm text-muted-foreground mt-2 leading-relaxed">{body}</p>
  </div>
);

export default Index;
