import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, CalendarDays, Users, Trophy, Navigation } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { formatSkillLevel, getSkillLevelBadgeVariant, SkillLevel } from '@/utils/skillLevels';
import SkillLevelFilter from '@/components/SkillLevelFilter';
import { Input } from '@/components/ui/input';

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
  const requestedRef = useRef(false);
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const { user } = useAuth();

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
      let query = supabase
        .from('tournaments')
        .select(`
          *,
          organizer:profiles!tournaments_organizer_id_fkey(username),
          teams:teams(id)
        `)
        .order('start_date', { ascending: true });

      // Filter by user's tournaments if showMyTournaments is true
      if (showMyTournaments && user) {
        query = query.eq('organizer_id', user.id);
      } else if (!showMyTournaments) {
        query = query.eq('status', 'open');
      }

      const { data, error } = await query;

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

  // Filter tournaments based on selected skill levels
  useEffect(() => {
    if (selectedSkillLevels.length === 0) {
      setFilteredTournaments(tournaments);
    } else {
      setFilteredTournaments(
        tournaments.filter(tournament => 
          tournament.skill_levels.some(level => selectedSkillLevels.includes(level as SkillLevel))
        )
      );
    }
  }, [tournaments, selectedSkillLevels]);

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

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold gradient-text mb-2">
              {showMyTournaments ? 'My Tournaments' : 'Browse Tournaments'}
            </h1>
            <p className="text-muted-foreground">
              {showMyTournaments 
                ? `${filteredTournaments.length} of ${tournaments.length} tournaments you've created`
                : userLocation 
                  ? `${filteredTournaments.length} of ${tournaments.length} tournaments sorted by distance from your location`
                  : `${filteredTournaments.length} of ${tournaments.length} tournaments available`
              }
            </p>
          </div>

          <div className="flex flex-col lg:flex-row gap-2">
            <SkillLevelFilter 
              selectedLevels={selectedSkillLevels}
              onLevelsChange={setSelectedSkillLevels}
            />
            <div className="flex gap-2">
              <Input
                placeholder="City or ZIP"
                value={manualQuery}
                onChange={(e) => setManualQuery(e.target.value)}
                className="w-[180px]"
              />
              <Button
                variant="outline"
                onClick={handleManualSubmit}
                disabled={!manualQuery.trim() || manualLoading}
              >
                {manualLoading ? 'Setting...' : 'Set location'}
              </Button>
            </div>
            {locationPermission !== 'granted' && (
              <Button 
                onClick={requestLocation}
                variant="outline"
                className="flex items-center gap-2"
                title={isIframe ? 'Preview may block geolocation' : undefined}
              >
                <Navigation className="h-4 w-4" />
                Use My Location
              </Button>
            )}
          </div>
        </div>

        {loading ? (
          <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'md:grid-cols-2 lg:grid-cols-3 gap-6'}`}>
            {[...Array(6)].map((_, i) => (
              <Card key={i} className="animate-pulse shadow-card">
                <CardHeader>
                  <Skeleton className="h-4 w-3/4 mb-2" />
                  <Skeleton className="h-3 w-1/2" />
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-3/4" />
                    <Skeleton className="h-8 w-full" />
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredTournaments.length > 0 ? (
          <div className={`grid ${isMobile ? 'grid-cols-1 gap-4' : 'md:grid-cols-2 lg:grid-cols-3 gap-6'}`}>
            {filteredTournaments.map((tournament, index) => (
              <Card key={tournament.id} className="hover:shadow-lg transition-all duration-200 shadow-card hover-scale animate-fade-in">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <CardTitle className={`${isMobile ? 'text-lg' : 'text-xl'} line-clamp-2`}>
                      {tournament.title}
                    </CardTitle>
                    <div className="flex flex-col items-end gap-1">
                      <div className="flex flex-wrap gap-1">
                        {tournament.skill_levels.map((level) => (
                          <Badge key={level} variant={getSkillLevelBadgeVariant(level as SkillLevel)} className="shrink-0 text-xs">
                            {formatSkillLevel(level as SkillLevel)}
                          </Badge>
                        ))}
                        <Badge variant="secondary" className="shrink-0 text-xs">
                          {tournament.status}
                        </Badge>
                      </div>
                      {userLocation && tournament.distance !== undefined && (
                        <Badge variant="outline" className="text-xs">
                          {tournament.distance.toFixed(1)} mi
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
                  <div className="space-y-2">
                    {isMobile ? (
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
        ) : tournaments.length > 0 ? (
          <Card className="shadow-card">
            <CardContent className="py-8 text-center">
              <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                {showMyTournaments 
                  ? "No tournaments match your skill level filter. Try adjusting your filter settings."
                  : "No tournaments match your skill level filter. Try adjusting your filter settings."
                }
              </p>
              <Button 
                variant="outline" 
                onClick={() => setSelectedSkillLevels([])}
                className="mr-2"
              >
                Clear Filters
              </Button>
              <Link to="/create-tournament">
                <Button className="gradient-primary hover:opacity-90 transition-opacity">
                  Create Tournament
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <Card className="shadow-card">
            <CardContent className="py-8 text-center">
              <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                {showMyTournaments 
                  ? "You haven't created any tournaments yet."
                  : "No tournaments available right now."
                }
              </p>
              <Link to="/create-tournament">
                <Button className="gradient-primary hover:opacity-90 transition-opacity">
                  {showMyTournaments ? 'Create Your First Tournament' : 'Create the First Tournament'}
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Tournaments;