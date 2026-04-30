import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { MapPin, CalendarDays, Trophy, Navigation, Filter, Search } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { SkillLevel } from '@/utils/skillLevels';
import SkillLevelFilter from '@/components/SkillLevelFilter';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import TournamentCard from '@/components/TournamentCard';
import { shouldShowOnPublicTournamentLists } from '@/utils/publicTournamentFilters';

interface Tournament {
  id: string;
  title: string;
  description: string;
  location: string;
  start_date: string;
  end_date: string;
  max_teams: number;
  entry_fee: number;
  status: string;
  skill_levels: string[];
  organizer?: {
    username: string;
  };
  teams?: {
    count: number;
  }[];
  distance?: number;
}

// Function to calculate distance between two coordinates using Haversine formula
const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number): number => {
  const R = 6371; // Radius of the Earth in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
};

// Geocode location with localStorage caching (30 days)
const geocodeLocation = async (location: string): Promise<{ lat: number; lng: number } | null> => {
  const key = `geocode:${location}`;
  const cached = localStorage.getItem(key);
  if (cached) {
    try {
      const obj = JSON.parse(cached);
      if (obj?.lat && obj?.lng && Date.now() - (obj.ts || 0) < 1000 * 60 * 60 * 24 * 30) {
        return { lat: obj.lat, lng: obj.lng };
      }
    } catch {}
  }
  try {
    const { data, error } = await supabase.functions.invoke('geocode', { body: { query: location } });
    if (error) throw error as any;
    const { lat, lng, place_name } = data as any;
    localStorage.setItem(key, JSON.stringify({ lat, lng, place_name, ts: Date.now() }));
    return { lat, lng };
  } catch (e) {
    console.error('Geocoding failed:', e);
    return null;
  }
};

type StatusFilter = 'all' | 'upcoming' | 'active' | 'past';

const Tournaments = ({ showMyTournaments = false }: { showMyTournaments?: boolean }) => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locationPermission, setLocationPermission] = useState<string>('pending');
  const [selectedSkillLevels, setSelectedSkillLevels] = useState<SkillLevel[]>([]);
  const [filteredTournaments, setFilteredTournaments] = useState<Tournament[]>([]);
  const [manualQuery, setManualQuery] = useState('');
  const [manualLoading, setManualLoading] = useState(false);
  const [isIframe, setIsIframe] = useState(false);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchParams] = useSearchParams();
  const requestedRef = useRef(false);
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();

// Helpers for robust geolocation
const isInIframeSafe = () => {
  try {
    return window.self !== window.top;
  } catch {
    return true;
  }
};

const getCurrentPositionWithTimeout = (timeout = 8000) =>
  new Promise<GeolocationPosition>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Geolocation timeout')), timeout);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        clearTimeout(timer);
        resolve(pos);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
      { enableHighAccuracy: false, timeout, maximumAge: 300000 }
    );
  });

const checkAndRequestLocation = async (manual = false) => {
  if (requestedRef.current && !manual) return;
  requestedRef.current = true;

  if (!('geolocation' in navigator)) {
    setLocationPermission('unsupported');
    toast({
      title: 'Location unavailable',
      description: 'Geolocation is not supported by your browser.',
      variant: 'default',
    });
    return;
  }

  const iframe = isInIframeSafe();
  setIsIframe(iframe);
  if (iframe && !manual) {
    setLocationPermission('blocked');
    toast({
      title: 'Location blocked in preview',
      description: 'Browsers often block geolocation inside iframes. Use the city/ZIP field instead.',
      variant: 'default',
    });
    return;
  }

  try {
    const perm = await navigator.permissions?.query({ name: 'geolocation' as PermissionName });
    if (perm) setLocationPermission(perm.state);
    if (perm?.state === 'denied') {
      toast({ title: 'Location denied', description: 'Please allow location or use the city/ZIP field.', variant: 'default' });
      return;
    }

    const pos = await getCurrentPositionWithTimeout(8000);
    const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    setUserLocation(loc);
    setLocationPermission('granted');
    localStorage.setItem('userLocation', JSON.stringify({ ...loc, ts: Date.now() }));
  } catch (err: any) {
    setLocationPermission('denied');
    const msg = err?.message?.includes('timeout') ? 'Location request timed out.' : 'Unable to get your location.';
    toast({ title: 'Location error', description: `${msg} You can enter a city or ZIP instead.`, variant: 'default' });
  }
};

// On mount: restore cached location and try one-time geolocation
useEffect(() => {
  try {
    const cached = localStorage.getItem('userLocation');
    if (cached) {
      const obj = JSON.parse(cached);
      if (obj?.lat && obj?.lng && Date.now() - (obj.ts || 0) < 1000 * 60 * 60 * 24 * 7) {
        setUserLocation({ lat: obj.lat, lng: obj.lng });
      }
    }
  } catch {}
  checkAndRequestLocation();
}, []);


  useEffect(() => {
    fetchTournaments();
  }, [userLocation, showMyTournaments, user]);

  const fetchTournaments = async () => {
    try {
      let data: any[] = [];
      let error: any = null;

      // Filter by user's tournaments if showMyTournaments is true
      if (showMyTournaments && user) {
        // User's own tournaments - query directly (RLS allows organizers to see their own)
        const result = await supabase
          .from('tournaments')
          .select(`
            *,
            organizer:profiles_public!tournaments_organizer_id_fkey(username),
            teams:teams(id)
          `)
          .eq('organizer_id', user.id)
          .order('start_date', { ascending: true });
        data = result.data || [];
        error = result.error;
      } else {
        // Public tournaments - use secure RPC function
        const result = await supabase.rpc('get_public_tournaments');
        if (result.error) throw result.error;
        
        // Fetch team counts for each tournament
        const tournamentIds = (result.data || []).map((t: any) => t.id);
        const teamsResult = await supabase
          .from('teams_public')
          .select('tournament_id')
          .in('tournament_id', tournamentIds);
        
        const teamCounts = new Map<string, number>();
        (teamsResult.data || []).forEach((t: any) => {
          teamCounts.set(t.tournament_id, (teamCounts.get(t.tournament_id) || 0) + 1);
        });
        
        // Filter public lists down to real, still-relevant tournaments
        data = (result.data || [])
          .filter((t: any) => t.status === 'open' && shouldShowOnPublicTournamentLists(t))
          .map((t: any) => ({
            ...t,
            teams: [{ count: teamCounts.get(t.id) || 0 }]
          }));
      }

      if (error) throw error;

let tournamentsWithDistance = (data?.map((tournament) => ({
  ...tournament,
  teams: tournament.teams ? [{ count: tournament.teams.length }] : [{ count: 0 }],
})) || []) as Tournament[];

// If we have user location, calculate distances and sort by proximity
if (userLocation && tournamentsWithDistance.length > 0) {
  const uniqueLocations = Array.from(new Set(tournamentsWithDistance.map(t => t.location).filter(Boolean)));
  const coordMap = new Map<string, { lat: number; lng: number }>();
  await Promise.all(
    uniqueLocations.map(async (loc) => {
      const coords = await geocodeLocation(loc);
      if (coords) coordMap.set(loc, coords);
    })
  );

  tournamentsWithDistance = tournamentsWithDistance.map((t) => {
    const coords = coordMap.get(t.location);
    const distance = coords
      ? calculateDistance(userLocation.lat, userLocation.lng, coords.lat, coords.lng) * 0.621371
      : undefined;
    return { ...t, distance };
  });

  tournamentsWithDistance.sort((a, b) => {
    const da = a.distance ?? Number.POSITIVE_INFINITY;
    const db = b.distance ?? Number.POSITIVE_INFINITY;
    return da - db;
  });
} else {
  // Fallback to alphabetical sorting if no location
  tournamentsWithDistance.sort((a, b) => a.title.localeCompare(b.title));
}

setTournaments(tournamentsWithDistance);
    } catch (error) {
      console.error('Error fetching tournaments:', error);
      toast({
        title: "Error",
        description: "Failed to fetch tournaments. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter tournaments based on selected skill levels and status
  useEffect(() => {
    let filtered = tournaments;
    
    // Apply skill level filter
    if (selectedSkillLevels.length > 0) {
      filtered = filtered.filter(tournament => 
        tournament.skill_levels.some(level => selectedSkillLevels.includes(level as SkillLevel))
      );
    }
    
    // Apply status filter
    const now = new Date();
    if (statusFilter === 'upcoming') {
      filtered = filtered.filter(t => new Date(t.start_date) > now);
    } else if (statusFilter === 'active') {
      filtered = filtered.filter(t => {
        const start = new Date(t.start_date);
        const end = new Date(t.end_date);
        return start <= now && end >= now;
      });
    } else if (statusFilter === 'past') {
      filtered = filtered.filter(t => new Date(t.end_date) < now);
    }
    
    setFilteredTournaments(filtered);
  }, [tournaments, selectedSkillLevels, statusFilter]);

  const handleShareLink = async (tournamentId: string) => {
    const url = `${window.location.origin}/tournament/${tournamentId}/live`;
    try {
      await navigator.clipboard.writeText(url);
      toast({
        title: "Link copied!",
        description: "Public tournament link copied to clipboard.",
      });
    } catch {
      toast({
        title: "Share link",
        description: url,
      });
    }
  };

  const getProgressColor = (fillPercentage: number) => {
    if (fillPercentage >= 90) return 'bg-destructive';
    if (fillPercentage >= 70) return 'bg-primary';
    return 'bg-accent';
  };

  const requestLocation = () => {
    checkAndRequestLocation(true);
  };

  const handleManualSubmit = async () => {
    if (!manualQuery.trim()) return;
    setManualLoading(true);
    try {
      const coords = await geocodeLocation(manualQuery.trim());
      if (!coords) {
        toast({ title: 'Not found', description: 'Could not find that place. Try a different city or ZIP.', variant: 'default' });
      } else {
        setUserLocation(coords);
        localStorage.setItem('userLocation', JSON.stringify({ ...coords, ts: Date.now(), source: 'manual', query: manualQuery.trim() }));
        setLocationPermission('manual');
        toast({ title: 'Location set', description: 'Sorting by distance from your chosen location.', variant: 'default' });
        fetchTournaments();
      }
    } finally {
      setManualLoading(false);
    }
  };

  // Apply ?q= from URL once on mount
  useEffect(() => {
    const q = searchParams.get('q');
    if (q && !manualQuery) {
      setManualQuery(q);
    }
  }, [searchParams]);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-6 py-8 md:py-12">
      {/* Header */}
      <div className="mb-8 md:mb-10">
        <h1 className="font-display font-extrabold text-4xl md:text-5xl tracking-tighter mb-2">
          {showMyTournaments ? 'My tournaments' : 'Browse tournaments'}
        </h1>
        <p className="text-muted-foreground">
          {showMyTournaments
            ? `${filteredTournaments.length} of ${tournaments.length} tournaments you've created`
            : userLocation
            ? `${filteredTournaments.length} tournaments sorted by distance`
            : `${filteredTournaments.length} tournaments available`}
        </p>
      </div>

      {/* Filter bar */}
      <div className="bg-surface-raised border border-white/5 rounded-2xl p-3 md:p-4 mb-6 flex flex-col lg:flex-row gap-3 items-stretch lg:items-center">
        <div className="flex items-center gap-2 px-3 py-2 bg-background rounded-xl flex-1 min-w-0">
          <MapPin className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            placeholder="City or ZIP"
            value={manualQuery}
            onChange={(e) => setManualQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleManualSubmit()}
            className="border-0 bg-transparent p-0 h-auto focus-visible:ring-0 text-sm"
          />
          <Button
            size="sm"
            variant="ghost"
            onClick={handleManualSubmit}
            disabled={!manualQuery.trim() || manualLoading}
            className="text-xs font-semibold"
          >
            {manualLoading ? '...' : 'Set'}
          </Button>
        </div>
        <SkillLevelFilter
          selectedLevels={selectedSkillLevels}
          onLevelsChange={setSelectedSkillLevels}
        />
        {locationPermission !== 'granted' && (
          <Button
            onClick={requestLocation}
            variant="outline"
            size="sm"
            className="rounded-full"
            title={isIframe ? 'Preview may block geolocation' : undefined}
          >
            <Navigation className="h-3.5 w-3.5 mr-1.5" />
            Use my location
          </Button>
        )}
      </div>

      {/* Status tabs */}
      <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)} className="w-full mb-6">
        <TabsList className="bg-surface-raised border border-white/5 grid grid-cols-4 w-full md:w-auto md:inline-flex">
          <TabsTrigger value="all" className="text-xs md:text-sm">All</TabsTrigger>
          <TabsTrigger value="upcoming" className="text-xs md:text-sm">Upcoming</TabsTrigger>
          <TabsTrigger value="active" className="text-xs md:text-sm">Active</TabsTrigger>
          <TabsTrigger value="past" className="text-xs md:text-sm">Past</TabsTrigger>
        </TabsList>
      </Tabs>

      {/* Grid */}
      {loading ? (
        <div className="grid gap-4 md:gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-surface-raised border border-white/5 rounded-2xl h-64 animate-pulse" />
          ))}
        </div>
      ) : filteredTournaments.length > 0 ? (
        <div className="grid gap-4 md:gap-5 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {filteredTournaments.map((t) => (
            <TournamentCard key={t.id} tournament={t as any} />
          ))}
        </div>
      ) : tournaments.length > 0 ? (
        <div className="bg-surface-raised border border-white/5 rounded-2xl p-12 text-center">
          <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-6">No tournaments match your filters.</p>
          <Button
            variant="outline"
            onClick={() => {
              setSelectedSkillLevels([]);
              setStatusFilter('all');
            }}
          >
            Clear filters
          </Button>
        </div>
      ) : (
        <div className="bg-surface-raised border border-white/5 rounded-2xl p-12 text-center">
          <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground mb-6">
            {showMyTournaments
              ? "You haven't created any tournaments yet."
              : 'No tournaments available right now.'}
          </p>
          <Link to={user ? '/create-tournament' : '/host'}>
            <Button className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full">
              {showMyTournaments ? 'Create your first tournament' : 'Host a tournament'}
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
};

export default Tournaments;
