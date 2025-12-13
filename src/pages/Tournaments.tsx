import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, CalendarDays, Users, Trophy, Navigation, Share2, Eye, ChevronDown, ChevronUp, Filter } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { formatSkillLevel, getSkillLevelBadgeVariant, SkillLevel } from '@/utils/skillLevels';
import SkillLevelFilter from '@/components/SkillLevelFilter';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

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
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
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
      let query = supabase
        .from('tournaments')
        .select(`
          *,
          organizer:profiles_public!tournaments_organizer_id_fkey(username),
          teams:teams(id)
        `)
        .order('start_date', { ascending: true });

      // Filter by user's tournaments if showMyTournaments is true
      if (showMyTournaments && user) {
        query = query.eq('organizer_id', user.id);
      } else if (!showMyTournaments) {
        // Only show published, open tournaments that haven't ended yet
        const today = new Date().toISOString().split('T')[0];
        query = query
          .eq('published', true)
          .eq('status', 'open')
          .gte('end_date', today);
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

  const toggleCardExpand = (id: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const getProgressColor = (fillPercentage: number) => {
    if (fillPercentage >= 90) return 'bg-destructive';
    if (fillPercentage >= 70) return 'bg-volleyball-yellow';
    return 'bg-primary';
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

  return (
    <div className="container mx-auto px-3 md:px-4 py-4 md:py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col gap-4 mb-6 md:mb-8">
          <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-3 md:gap-4">
            <div className="min-w-0">
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-bold gradient-text mb-2 break-words">
                {showMyTournaments ? 'My Tournaments' : 'Browse Tournaments'}
              </h1>
              <p className="text-sm md:text-base text-muted-foreground break-words">
                {showMyTournaments 
                  ? `${filteredTournaments.length} of ${tournaments.length} tournaments you've created`
                  : userLocation 
                    ? `${filteredTournaments.length} of ${tournaments.length} tournaments sorted by distance`
                    : `${filteredTournaments.length} of ${tournaments.length} tournaments available`
                }
              </p>
            </div>

            <div className="flex flex-col sm:flex-row lg:flex-row gap-2 w-full lg:w-auto">
              <SkillLevelFilter 
                selectedLevels={selectedSkillLevels}
                onLevelsChange={setSelectedSkillLevels}
              />
              {locationPermission !== 'granted' && (
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full lg:w-auto">
                  <Input
                    placeholder="City or ZIP"
                    aria-label="Enter a city or ZIP"
                    value={manualQuery}
                    onChange={(e) => setManualQuery(e.target.value)}
                    className="w-full sm:w-[140px] h-9 text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleManualSubmit}
                      disabled={!manualQuery.trim() || manualLoading}
                      className="flex-1 sm:flex-initial text-xs"
                    >
                      {manualLoading ? 'Setting...' : 'Set'}
                    </Button>
                    <Button 
                      onClick={requestLocation}
                      variant="outline"
                      size="sm"
                      className="flex items-center justify-center gap-1 flex-1 sm:flex-initial text-xs"
                      title={isIframe ? 'Preview may block geolocation' : undefined}
                    >
                      <Navigation className="h-3 w-3" />
                      <span className="hidden sm:inline">Use Location</span>
                      <span className="sm:hidden">Location</span>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Status Filter Tabs */}
          <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as StatusFilter)} className="w-full">
            <TabsList className="w-full md:w-auto grid grid-cols-4 md:inline-flex">
              <TabsTrigger value="all" className="text-xs md:text-sm">All</TabsTrigger>
              <TabsTrigger value="upcoming" className="text-xs md:text-sm">Upcoming</TabsTrigger>
              <TabsTrigger value="active" className="text-xs md:text-sm">Active</TabsTrigger>
              <TabsTrigger value="past" className="text-xs md:text-sm">Past</TabsTrigger>
            </TabsList>
          </Tabs>
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
            {filteredTournaments.map((tournament) => {
              const teamCount = tournament.teams?.[0]?.count || 0;
              const fillPercentage = (teamCount / tournament.max_teams) * 100;
              const isExpanded = expandedCards.has(tournament.id);
              
              return (
                <Card key={tournament.id} className="hover:shadow-lg transition-all duration-200 shadow-card hover-scale animate-fade-in">
                  {isMobile ? (
                    // Mobile: Collapsible card with bigger touch targets
                    <Collapsible open={isExpanded} onOpenChange={() => toggleCardExpand(tournament.id)}>
                      <CollapsibleTrigger className="w-full text-left">
                        <CardHeader className="pb-3">
                          <div className="flex justify-between items-start gap-2">
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-lg line-clamp-2 mb-1">
                                {tournament.title}
                              </CardTitle>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <CalendarDays className="h-4 w-4 shrink-0" />
                                {new Date(tournament.start_date).toLocaleDateString('en-US', {
                                  month: 'short',
                                  day: 'numeric'
                                })}
                                {userLocation && tournament.distance !== undefined && (
                                  <Badge variant="outline" className="text-xs ml-1">
                                    {tournament.distance.toFixed(0)} mi
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Badge 
                                variant={tournament.status === 'open' ? 'default' : 'secondary'} 
                                className="shrink-0 text-xs"
                              >
                                {tournament.status}
                              </Badge>
                              {isExpanded ? (
                                <ChevronUp className="h-5 w-5 text-muted-foreground" />
                              ) : (
                                <ChevronDown className="h-5 w-5 text-muted-foreground" />
                              )}
                            </div>
                          </div>
                        </CardHeader>
                      </CollapsibleTrigger>
                      
                      <CollapsibleContent>
                        <CardContent className="pt-0 space-y-4">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <MapPin className="h-4 w-4 shrink-0" />
                              <span className="line-clamp-1">{tournament.location}</span>
                            </div>
                            <div className="flex items-center gap-1 text-sm text-muted-foreground">
                              <Users className="h-4 w-4 shrink-0" />
                              by {tournament.organizer?.username}
                            </div>
                            <div className="flex flex-wrap gap-1">
                              {tournament.skill_levels.map((level) => (
                                <Badge key={level} variant={getSkillLevelBadgeVariant(level as SkillLevel)} className="text-xs">
                                  {formatSkillLevel(level as SkillLevel)}
                                </Badge>
                              ))}
                            </div>
                          </div>

                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Teams</span>
                              <span className="font-semibold">
                                {teamCount}/{tournament.max_teams}
                              </span>
                            </div>
                            <Progress 
                              value={fillPercentage} 
                              className="h-2"
                              indicatorClassName={getProgressColor(fillPercentage)}
                            />
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>{Math.round(fillPercentage)}% full</span>
                              {tournament.entry_fee > 0 && (
                                <span className="font-medium">${tournament.entry_fee} entry</span>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col gap-2">
                            <div className="flex gap-2">
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex-1 min-h-[44px]"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleShareLink(tournament.id);
                                }}
                              >
                                <Share2 className="h-4 w-4 mr-2" />
                                Share
                              </Button>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                className="flex-1 min-h-[44px]"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/tournament/${tournament.id}/live`);
                                }}
                              >
                                <Eye className="h-4 w-4 mr-2" />
                                Live View
                              </Button>
                            </div>
                            <Link to={`/tournament/${tournament.id}`} className="block">
                              <Button variant="default" className="w-full min-h-[44px]">
                                View Details
                              </Button>
                            </Link>
                          </div>
                        </CardContent>
                      </CollapsibleContent>
                    </Collapsible>
                  ) : (
                    // Desktop: Full card view
                    <>
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-xl line-clamp-2">
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
                        <div className="space-y-3">
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <MapPin className="h-4 w-4" />
                            {tournament.location}
                          </div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <CalendarDays className="h-4 w-4" />
                            {new Date(tournament.start_date).toLocaleDateString('en-US', {
                              weekday: 'short',
                              month: 'short',
                              day: 'numeric'
                            })}
                          </div>
                          
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Teams</span>
                              <span className="font-semibold">
                                {teamCount}/{tournament.max_teams}
                              </span>
                            </div>
                            <Progress 
                              value={fillPercentage} 
                              className="h-2"
                              indicatorClassName={getProgressColor(fillPercentage)}
                            />
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>{Math.round(fillPercentage)}% full</span>
                              {tournament.entry_fee > 0 && (
                                <span className="font-medium">${tournament.entry_fee} entry</span>
                              )}
                            </div>
                          </div>

                          <div className="flex gap-2 pt-2">
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1"
                              onClick={() => handleShareLink(tournament.id)}
                            >
                              <Share2 className="h-4 w-4 mr-1" />
                              Share
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              className="flex-1"
                              onClick={() => navigate(`/tournament/${tournament.id}/live`)}
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              Live
                            </Button>
                          </div>
                          <Link to={`/tournament/${tournament.id}`}>
                            <Button variant="default" className="w-full">
                              View Details
                            </Button>
                          </Link>
                        </div>
                      </CardContent>
                    </>
                  )}
                </Card>
              );
            })}
          </div>
        ) : tournaments.length > 0 ? (
          <Card className="shadow-card">
            <CardContent className="py-8 text-center">
              <Filter className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground mb-4">
                No tournaments match your current filters. Try adjusting your filter settings.
              </p>
              <div className="flex flex-wrap justify-center gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setSelectedSkillLevels([]);
                    setStatusFilter('all');
                  }}
                >
                  Clear All Filters
                </Button>
                <Link to="/create-tournament">
                  <Button className="gradient-primary hover:opacity-90 transition-opacity">
                    Create Tournament
                  </Button>
                </Link>
              </div>
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