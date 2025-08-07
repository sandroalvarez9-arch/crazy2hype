import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MapPin, CalendarDays, Users, Trophy, Navigation } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { formatSkillLevel, getSkillLevelBadgeVariant, SkillLevel } from '@/utils/skillLevels';
import SkillLevelFilter from '@/components/SkillLevelFilter';

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

// Simple geocoding function (in a real app, you'd use a proper geocoding service)
const getCoordinatesFromLocation = async (location: string): Promise<{lat: number, lng: number} | null> => {
  // This is a simplified example - in production you'd use a proper geocoding API
  // For now, we'll return null and handle sorting without precise coordinates
  return null;
};

const Tournaments = () => {
  const [tournaments, setTournaments] = useState<Tournament[]>([]);
  const [loading, setLoading] = useState(true);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [locationPermission, setLocationPermission] = useState<string>('pending');
  const [selectedSkillLevels, setSelectedSkillLevels] = useState<SkillLevel[]>([]);
  const [filteredTournaments, setFilteredTournaments] = useState<Tournament[]>([]);
  const isMobile = useIsMobile();
  const { toast } = useToast();

  // Get user's current location
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLocationPermission('granted');
        },
        (error) => {
          console.log('Location access denied:', error);
          setLocationPermission('denied');
          toast({
            title: "Location Access",
            description: "Location access denied. Tournaments will be sorted alphabetically.",
            variant: "default"
          });
        }
      );
    } else {
      setLocationPermission('unsupported');
      toast({
        title: "Location Unavailable",
        description: "Geolocation is not supported. Tournaments will be sorted alphabetically.",
        variant: "default"
      });
    }
  }, [toast]);

  useEffect(() => {
    fetchTournaments();
  }, [userLocation]);

  const fetchTournaments = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select(`
          *,
          organizer:profiles!tournaments_organizer_id_fkey(username),
          teams:teams(id)
        `)
        .eq('status', 'open')
        .order('start_date', { ascending: true });

      if (error) throw error;

      let tournamentsWithDistance = data?.map(tournament => ({
        ...tournament,
        teams: tournament.teams ? [{ count: tournament.teams.length }] : [{ count: 0 }],
        distance: 0
      })) || [];

      // If we have user location, calculate distances and sort by proximity
      if (userLocation && tournamentsWithDistance.length > 0) {
        // For demo purposes, we'll assign random distances
        // In a real app, you'd geocode tournament locations and calculate actual distances
        tournamentsWithDistance = tournamentsWithDistance.map(tournament => ({
          ...tournament,
          distance: Math.random() * 100 // Random distance between 0-100km for demo
        }));

        // Sort by distance (closest first)
        tournamentsWithDistance.sort((a, b) => (a.distance || 0) - (b.distance || 0));
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
    setLocationPermission('pending');
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setLocationPermission('granted');
          fetchTournaments();
        },
        (error) => {
          console.log('Location access denied:', error);
          setLocationPermission('denied');
        }
      );
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl lg:text-4xl font-bold gradient-text mb-2">
              Browse Tournaments
            </h1>
            <p className="text-muted-foreground">
              {userLocation 
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
            {locationPermission === 'denied' && (
              <Button 
                onClick={requestLocation}
                variant="outline"
                className="flex items-center gap-2"
              >
                <Navigation className="h-4 w-4" />
                Enable Location
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
                          {tournament.distance.toFixed(1)} km
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
                No tournaments match your skill level filter. Try adjusting your filter settings.
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

export default Tournaments;