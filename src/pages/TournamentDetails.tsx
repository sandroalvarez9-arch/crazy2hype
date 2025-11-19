import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { useIsMobile } from '@/hooks/use-mobile';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Calendar, MapPin, Users, Trophy, DollarSign, Settings, UserPlus, ExternalLink, Share2 } from 'lucide-react';
import { format } from 'date-fns';
import { TeamRegistrationWizard } from '@/components/TeamRegistrationWizard';
import TeamCheckInDialog from '@/components/TeamCheckInDialog';
import TeamEditDialog from '@/components/TeamEditDialog';
import { TeamScheduleView } from '@/components/TeamScheduleView';
import { useToast } from '@/hooks/use-toast';
import { formatSkillLevel, getSkillLevelBadgeVariant } from '@/utils/skillLevels';

interface Tournament {
  id: string;
  title: string;
  description: string;
  location: string;
  start_date: string;
  end_date: string;
  registration_deadline: string;
  first_game_time: string | null;
  tournament_format: string;
  skill_levels: string[];
  estimated_game_duration: number;
  number_of_courts: number;
  brackets_generated: boolean;
  max_teams: number;
  max_teams_per_skill_level?: Record<string, number>;
  players_per_team: number;
  entry_fee: number;
  payment_instructions: string | null;
  venmo_username: string | null;
  paypal_email: string | null;
  bank_details: string | null;
  cashapp_info: string | null;
  other_payment_methods: string | null;
  status: string;
  organizer_id: string;
  check_in_deadline: string | null;
  bracket_version: number;
  allow_backup_teams: boolean;
  organizer: {
    username: string;
    first_name: string;
    last_name: string;
  };
}

interface Team {
  id: string;
  name: string;
  players_count: number;
  is_registered: boolean;
  captain_id: string;
  check_in_status: string;
  check_in_time: string | null;
  skill_level?: string;
  captain: {
    username: string;
    first_name: string;
    last_name: string;
  };
  contact_email: string;
  contact_phone: string;
}

const TournamentDetails = () => {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { toast } = useToast();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [showRegistrationDialog, setShowRegistrationDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [userTeams, setUserTeams] = useState<Team[]>([]);
  const [matches, setMatches] = useState<any[]>([]);
  const [paying, setPaying] = useState(false);
  const [distanceText, setDistanceText] = useState<string | null>(null);
  const [mapsLink, setMapsLink] = useState<string | null>(null);
  const [stripeConnected, setStripeConnected] = useState(false);


  useEffect(() => {
    if (id) {
      fetchTournamentDetails();
      fetchTeams();
      fetchMatches();
    }
  }, [id]);

  useEffect(() => {
    if (user) {
      checkStripeStatus();
    }
  }, [user]);

  const checkStripeStatus = async () => {
    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('stripe_connected, stripe_charges_enabled')
        .eq('user_id', user?.id)
        .single();
      
      setStripeConnected(profile?.stripe_connected && profile?.stripe_charges_enabled);
    } catch (error) {
      console.error('Error checking Stripe status:', error);
    }
  };

  const fetchTournamentDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('tournaments')
        .select(`
          *,
          organizer:profiles_public!tournaments_organizer_id_fkey(username, first_name, last_name)
        `)
        .eq('id', id)
        .single();

      if (error) throw error;
      setTournament({
        ...data,
        max_teams_per_skill_level: data.max_teams_per_skill_level as Record<string, number> | undefined
      });
    } catch (error) {
      console.error('Error fetching tournament:', error);
    }
  };

  const fetchTeams = async () => {
    try {
      const { data, error } = await supabase
        .from('teams')
        .select(`
          *,
          captain:profiles_public!teams_captain_id_fkey(username, first_name, last_name)
        `)
        .eq('tournament_id', id)
        .order('skill_level', { ascending: true })
        .order('name', { ascending: true });

      if (error) throw error;
      setTeams(data || []);
      
      // Fetch user's teams for check-in
      if (user) {
        const userTeamsData = data?.filter(team => team.captain_id === user.id) || [];
        setUserTeams(userTeamsData);
      }
    } catch (error) {
      console.error('Error fetching teams:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMatches = async () => {
    try {
      const { data, error } = await supabase
        .from('matches')
        .select(`
          *,
          team1:teams!matches_team1_id_fkey(name),
          team2:teams!matches_team2_id_fkey(name),
          referee_team:teams!matches_referee_team_id_fkey(name)
        `)
        .eq('tournament_id', id)
        .order('scheduled_time');

      if (error) throw error;
      setMatches(data || []);
    } catch (error) {
      console.error('Error fetching matches:', error);
    }
  };

  const handlePayOnline = async () => {
    if (!tournament || !user) return;
    try {
      setPaying(true);
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: { tournamentId: tournament.id },
      });
      if (error) throw error as any;
      if ((data as any)?.url) {
        window.open((data as any).url as string, '_blank');
      } else {
        throw new Error('No payment URL received');
      }
    } catch (e) {
      console.error('Stripe checkout error:', e);
      toast({
        title: "Payment Error",
        description: "Failed to initiate payment. Please try again or contact support.",
        variant: "destructive",
      });
    } finally {
      setPaying(false);
    }
  };

  const handleConnectStripe = async () => {
    try {
      setPaying(true);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Not authenticated");

      const { data, error } = await supabase.functions.invoke("get-stripe-oauth-url", {
        headers: { Authorization: `Bearer ${session.access_token}` }
      });

      if (error) throw error;
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to initiate Stripe connection",
        variant: "destructive",
      });
    } finally {
      setPaying(false);
    }
  };

  const handleSharePublicView = () => {
    const publicUrl = `${window.location.origin}/tournament/${id}/live`;
    navigator.clipboard.writeText(publicUrl).then(() => {
      toast({
        title: "Link Copied!",
        description: "Public view link copied to clipboard. Share it with spectators!",
      });
    }).catch(() => {
      toast({
        title: "Copy Failed",
        description: publicUrl,
        variant: "destructive",
      });
    });
  };

  // Compute real-world distance to tournament location
  useEffect(() => {
    const computeDistance = async () => {
      if (!tournament?.location) return;

      // Build maps link
      const link = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(tournament.location)}`;
      setMapsLink(link);

      // Get user location
      const getPosition = () => new Promise<GeolocationPosition>((resolve, reject) => {
        if (!('geolocation' in navigator)) return reject(new Error('Geolocation not supported'));
        navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 10000 });
      });

      try {
        const pos = await getPosition();
        const userLat = pos.coords.latitude;
        const userLng = pos.coords.longitude;

        // Geocode with cache
        const key = `geocode:${tournament.location}`;
        const cachedRaw = localStorage.getItem(key);
        let dest: { lat: number; lng: number; place_name?: string } | null = null;
        if (cachedRaw) {
          try {
            const cached = JSON.parse(cachedRaw);
            if (cached?.lat && cached?.lng && Date.now() - (cached.ts || 0) < 1000 * 60 * 60 * 24 * 30) {
              dest = { lat: cached.lat, lng: cached.lng, place_name: cached.place_name };
            }
          } catch {}
        }

        if (!dest) {
          const { data, error } = await supabase.functions.invoke('geocode', {
            body: { query: tournament.location },
          });
          if (error) throw error as any;
          const { lat, lng, place_name } = data as any;
          dest = { lat, lng, place_name };
          localStorage.setItem(key, JSON.stringify({ ...dest, ts: Date.now() }));
        }

        if (dest) {
          const km = haversine(userLat, userLng, dest.lat, dest.lng);
          const miles = km * 0.621371;
          setDistanceText(`${miles.toFixed(1)} miles away`);
        }
      } catch (e) {
        // Silent fail – user denied or geocode failed
        // console.warn('Distance computation skipped:', e);
      }
    };

    computeDistance();
  }, [tournament?.location]);

  function haversine(lat1: number, lon1: number, lat2: number, lon2: number) {
    const toRad = (v: number) => (v * Math.PI) / 180;
    const R = 6371; // km
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // km
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }


  if (!tournament) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Tournament not found</h1>
        <p className="text-muted-foreground mb-4">The tournament you're looking for doesn't exist.</p>
        <Button onClick={() => navigate('/')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Go Home
        </Button>
      </div>
    );
  }

  const isOrganizer = user?.id === tournament.organizer_id;
  const registeredTeams = teams.filter(team => team.is_registered);
  
  // Calculate registration status by skill level
  const getRegistrationStatusBySkillLevel = () => {
    const statusBySkillLevel: Record<string, { registered: number, max: number }> = {};
    
    tournament.skill_levels.forEach(skillLevel => {
      const teamsInSkillLevel = registeredTeams.filter(team => team.skill_level === skillLevel).length;
      const maxTeamsForSkillLevel = tournament.max_teams_per_skill_level?.[skillLevel] || 0;
      statusBySkillLevel[skillLevel] = {
        registered: teamsInSkillLevel,
        max: maxTeamsForSkillLevel
      };
    });
    
    return statusBySkillLevel;
  };
  
  const skillLevelStatus = getRegistrationStatusBySkillLevel();
  const canRegister = new Date() < new Date(tournament.registration_deadline) && 
                     tournament.status === 'open';

  return (
    <div className={`container mx-auto px-3 md:px-4 py-4 md:py-6 ${isMobile ? 'pb-4' : 'md:py-8'}`}>
      <div className="mb-4 md:mb-6 animate-fade-in">
        <Button
          variant="ghost"
          size={isMobile ? "sm" : "default"}
          onClick={() => navigate(-1)}
          className="mb-3 md:mb-4 hover:bg-muted"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 md:gap-4 mb-4 md:mb-6">
          <div className="min-w-0">
            <h1 className="text-xl md:text-3xl font-bold mb-2 flex items-center gap-2">
              <Trophy className="h-5 w-5 md:h-8 md:w-8 text-primary shrink-0" />
              <span className="break-words">{tournament.title}</span>
            </h1>
            <p className="text-xs md:text-sm text-muted-foreground break-words">
              Organized by {tournament.organizer ? 
                `${tournament.organizer.first_name} ${tournament.organizer.last_name} (@${tournament.organizer.username})` : 
                'Unknown Organizer'
              }
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-2 flex-wrap">
          <div className="flex flex-wrap gap-1">
            {tournament.skill_levels.map((level) => (
              <Badge key={level} variant={getSkillLevelBadgeVariant(level as any)}>
                {formatSkillLevel(level as any)}
              </Badge>
            ))}
          </div>
            <Badge variant={tournament.status === 'open' ? 'default' : 'secondary'} className="text-xs">
              {tournament.status}
            </Badge>
            <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              {isOrganizer && (
                <>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={handleSharePublicView}
                    className="w-full sm:w-auto text-xs"
                  >
                    <Share2 className="h-3 w-3 mr-1" />
                    Share Live View
                  </Button>
                  <Button 
                    size="sm" 
                    variant="outline"
                    onClick={() => navigate(`/tournament/${id}/manage`)}
                    className="w-full sm:w-auto text-xs"
                  >
                    <Settings className="h-4 w-4 mr-2" />
                    Manage
                  </Button>
                </>
              )}
              {tournament.entry_fee > 0 && user && !isOrganizer && (
                <Button 
                  size="sm"
                  className="gradient-primary hover:opacity-90 transition-opacity w-full sm:w-auto text-xs"
                  onClick={handlePayOnline}
                  disabled={paying}
                >
                  <DollarSign className="h-4 w-4 mr-2" />
                  {paying ? 'Redirecting…' : 'Pay online'}
                </Button>
              )}
              {tournament.entry_fee > 0 && user && isOrganizer && !stripeConnected && (
                <Button 
                  size="sm"
                  className="bg-[#635BFF] hover:bg-[#5348E6] text-white w-full sm:w-auto text-xs"
                  onClick={handleConnectStripe}
                  disabled={paying}
                >
                  <ExternalLink className="h-4 w-4 mr-2" />
                  {paying ? 'Redirecting…' : 'Connect Stripe'}
                </Button>
              )}
              {userTeams.length > 0 && (
                <TeamCheckInDialog
                  tournament={{
                    id: tournament.id,
                    title: tournament.title,
                    check_in_deadline: tournament.check_in_deadline,
                    start_date: tournament.start_date
                  }}
                  userTeams={userTeams}
                  onCheckInComplete={fetchTeams}
                />
              )}
            </div>
          </div>
        </div>

        <Card className="shadow-card mb-4 md:mb-6 animate-scale-in">
          <CardContent className="pt-4 md:pt-6 px-3 md:px-6">
            <div className={`grid ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2 lg:grid-cols-4'} gap-3 md:gap-4`}>
              <div className="flex items-center gap-3">
                <MapPin className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Location</p>
                  <p className="font-medium">{tournament.location}</p>
                  {distanceText && (
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {distanceText}
                      {mapsLink && (
                        <>
                          {' '}
                          •{' '}
                          <a href={mapsLink} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                            Open in Maps
                          </a>
                        </>
                      )}
                    </p>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Calendar className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Start Date</p>
                  <p className="font-medium">{format(new Date(tournament.start_date), 'PPP')}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <Users className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Teams</p>
                  <p className="font-medium">{registeredTeams.length}/{tournament.max_teams}</p>
                  {tournament.skill_levels.length > 1 && (
                    <div className="text-xs text-muted-foreground mt-1">
                      {tournament.skill_levels.map(level => (
                        <div key={level} className="inline-flex items-center gap-1 mr-2">
                          <Badge variant={getSkillLevelBadgeVariant(level as any)} className="text-xs">
                            {formatSkillLevel(level as any)}
                          </Badge>
                          <span>{skillLevelStatus[level]?.registered || 0}/{skillLevelStatus[level]?.max || 0}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex items-center gap-3">
                <DollarSign className="h-5 w-5 text-primary" />
                <div>
                  <p className="text-sm text-muted-foreground">Entry Fee</p>
                  <p className="font-medium">{tournament.entry_fee > 0 ? `$${tournament.entry_fee}` : 'Free'}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="overview" className="animate-fade-in">
        <TabsList className={`grid w-full ${isMobile ? 'grid-cols-2' : userTeams.length > 0 ? 'grid-cols-4' : 'grid-cols-3'}`}>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="teams">Teams ({registeredTeams.length})</TabsTrigger>
          {!isMobile && <TabsTrigger value="matches">Matches</TabsTrigger>}
          {userTeams.length > 0 && <TabsTrigger value="schedule">My Schedule</TabsTrigger>}
        </TabsList>
        
        <TabsContent value="overview" className="space-y-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Tournament Description</CardTitle>
            </CardHeader>
            <CardContent>
              {tournament.description ? (
                <p className="text-muted-foreground whitespace-pre-wrap">{tournament.description}</p>
              ) : (
                <p className="text-muted-foreground italic">No description provided</p>
              )}
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle>Important Dates</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Registration Deadline</span>
                  <span className="font-medium">{format(new Date(tournament.registration_deadline), 'PPP')}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Tournament Start</span>
                  <span className="font-medium">{format(new Date(tournament.start_date), 'PPP')}</span>
                </div>
                <Separator />
                <div className="flex justify-between items-center">
                  <span className="text-muted-foreground">Tournament End</span>
                  <span className="font-medium">{format(new Date(tournament.end_date), 'PPP')}</span>
                </div>
                {tournament.first_game_time && (
                  <>
                    <Separator />
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground">First Game Time</span>
                      <span className="font-medium">{tournament.first_game_time}</span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="teams" className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Registered Teams</h3>
            {canRegister && profile?.role === 'player' && (
              <Button 
                size="sm" 
                className="gradient-primary hover:opacity-90 transition-opacity"
                onClick={() => setShowRegistrationDialog(true)}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Register Team
              </Button>
            )}
          </div>

          {registeredTeams.length > 0 ? (
            <div className={`grid ${isMobile ? 'grid-cols-1' : 'md:grid-cols-2 lg:grid-cols-3'} gap-4`}>
              {registeredTeams.map((team) => (
                <Card key={team.id} className="shadow-card hover-scale">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{team.name}</CardTitle>
                        <CardDescription>
                          Captain: {team.captain ? 
                            `${team.captain.first_name} ${team.captain.last_name}` : 
                            'Unknown Captain'
                          }
                        </CardDescription>
                      </div>
                      {user && team.captain_id === user.id && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setSelectedTeam(team);
                            setShowEditDialog(true);
                          }}
                        >
                          Edit
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                     <div className="space-y-2">
                       <div className="flex justify-between text-sm">
                         <span className="text-muted-foreground">Players</span>
                         <span>{team.players_count}</span>
                       </div>
                       {team.skill_level && (
                         <div className="flex justify-between text-sm">
                           <span className="text-muted-foreground">Skill Level</span>
                           <Badge variant={getSkillLevelBadgeVariant(team.skill_level as any)} className="text-xs">
                             {formatSkillLevel(team.skill_level as any)}
                           </Badge>
                         </div>
                       )}
                       {team.contact_email && (
                         <div className="flex justify-between text-sm">
                           <span className="text-muted-foreground">Email</span>
                           <span className="truncate ml-2">{team.contact_email}</span>
                         </div>
                       )}
                     </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="shadow-card">
              <CardContent className="py-8 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No teams registered yet</p>
                {canRegister && profile?.role === 'player' && (
                  <Button 
                    className="mt-4 gradient-primary hover:opacity-90 transition-opacity"
                    onClick={() => setShowRegistrationDialog(true)}
                  >
                    <UserPlus className="h-4 w-4 mr-2" />
                    Be the first to register!
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>
        
        {!isMobile && (
          <TabsContent value="matches">
            <Card className="shadow-card">
              <CardContent className="py-8 text-center">
                <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">Tournament matches will appear here once pool play is generated</p>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        {userTeams.length > 0 && (
          <TabsContent value="schedule">
            {userTeams.map((team) => (
              <div key={team.id} className="mb-6">
                <TeamScheduleView 
                  teamId={team.id}
                  teamName={team.name}
                  matches={matches.map(match => ({
                    ...match,
                    team1_name: match.team1?.name,
                    team2_name: match.team2?.name,
                    referee_team_name: match.referee_team?.name
                  }))}
                />
              </div>
            ))}
          </TabsContent>
        )}
      </Tabs>

      <TeamRegistrationWizard
        isOpen={showRegistrationDialog}
        onOpenChange={setShowRegistrationDialog}
        tournamentId={id!}
        playersPerTeam={tournament?.players_per_team || 6}
        tournamentSkillLevels={tournament?.skill_levels as any}
        maxTeamsPerSkillLevel={tournament?.max_teams_per_skill_level}
        entryFee={tournament?.entry_fee}
        paymentInstructions={tournament?.payment_instructions}
        venmoUsername={tournament?.venmo_username}
        paypalEmail={tournament?.paypal_email}
        bankDetails={tournament?.bank_details}
        cashappInfo={tournament?.cashapp_info}
        otherPaymentMethods={tournament?.other_payment_methods}
        onSuccess={fetchTeams}
      />

      {selectedTeam && (
        <TeamEditDialog
          isOpen={showEditDialog}
          onOpenChange={setShowEditDialog}
          team={selectedTeam}
          checkInDeadline={tournament?.check_in_deadline}
          onSuccess={() => {
            fetchTeams();
            setShowEditDialog(false);
            setSelectedTeam(null);
          }}
        />
      )}
    </div>
  );
};

export default TournamentDetails;