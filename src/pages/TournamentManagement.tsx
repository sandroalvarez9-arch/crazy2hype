import { useEffect, useState } from "react";
import { useParams, Navigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { Users, UserCheck, UserX, Clock, Trophy, AlertTriangle, DollarSign, CheckCircle, ExternalLink, Receipt } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { PoolPlayManager } from "@/components/PoolPlayManager";
import { GameFormatManager } from "@/components/GameFormatManager";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import EmailPlayersDialog from "@/components/EmailPlayersDialog";
import EditTournamentDetailsDialog from "@/components/EditTournamentDetailsDialog";
import EditCapacityDialog from "@/components/EditCapacityDialog";
import { TournamentTestingDashboard } from "@/components/TournamentTestingDashboard";
import { TournamentDayDashboard } from "@/components/TournamentDayDashboard";
import { formatSkillLevel, getSkillLevelBadgeVariant } from "@/utils/skillLevels";

interface Tournament {
  id: string;
  title: string;
  status: string;
  published: boolean;
  max_teams: number;
  check_in_deadline: string | null;
  bracket_version: number;
  allow_backup_teams: boolean;
  first_game_time: string;
  start_date: string; // added for day-of checks
  estimated_game_duration: number;
  number_of_courts?: number;
  calculated_courts?: number;
  skill_levels: string[];
  divisions?: string[];
  skill_levels_by_division?: Record<string, string[]>;
  max_teams_per_division_skill?: Record<string, Record<string, number>>;
  max_teams_per_skill_level?: Record<string, number>;
  tournament_format: string;
  brackets_generated: boolean;
  sets_per_game: number;
  points_per_set: number;
  must_win_by: number;
  deciding_set_points: number;
  game_format_locked: boolean;
  entry_fee: number;
  location?: string | null;
  organizer_id?: string;
}

interface Team {
  id: string;
  name: string;
  check_in_status: string;
  check_in_time: string | null;
  is_backup: boolean;
  players_count: number;
  contact_email: string | null;
  captain_id: string;
  payment_status: string;
  payment_date: string | null;
  payment_method: string | null;
  payment_notes: string | null;
  skill_level: string | null;
  division: string | null;
  category: string | null;
}

interface BackupTeam {
  id: string;
  name: string;
  priority_order: number;
  players_count: number;
  contact_email: string | null;
  promoted_to_main: boolean;
}

export default function TournamentManagement() {
  const { id } = useParams();
  const { user } = useAuth();
  const { toast } = useToast();
  const [tournament, setTournament] = useState<Tournament | null>(null);
  const [teams, setTeams] = useState<Team[]>([]);
  const [backupTeams, setBackupTeams] = useState<BackupTeam[]>([]);
  const [loading, setLoading] = useState(true);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [activeTab, setActiveTab] = useState("teams");
  const [stripeConnected, setStripeConnected] = useState(false);
  const [publishingTournament, setPublishingTournament] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [teamsPerPage] = useState(10);
  const [checkInFilter, setCheckInFilter] = useState<'all' | 'checked_in' | 'pending' | 'no_show'>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');

  useEffect(() => {
    if (id && user) {
      fetchTournamentData();
      checkStripeStatus();
    }
  }, [id, user]);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [checkInFilter, categoryFilter]);

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

  const handleConnectStripe = async () => {
    try {
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
    }
  };

  const fetchTournamentData = async () => {
    try {
      // Fetch tournament details
      const { data: tournamentData, error: tournamentError } = await supabase
        .from("tournaments")
        .select("*")
        .eq("id", id)
        .single();

      if (tournamentError) throw tournamentError;

      setTournament(tournamentData as unknown as Tournament);
      setIsOrganizer(tournamentData.organizer_id === user?.id);

      // Only allow organizers to access this page
      if (tournamentData.organizer_id !== user?.id) {
        return;
      }

      // Fetch teams ordered by skill level first, then by name
      const { data: teamsData, error: teamsError } = await supabase
        .from("teams")
        .select("*")
        .eq("tournament_id", id)
        .eq("is_backup", false)
        .order("skill_level", { ascending: true })
        .order("name", { ascending: true });

      if (teamsError) throw teamsError;
      setTeams(teamsData || []);

      // Fetch backup teams
      const { data: backupData, error: backupError } = await supabase
        .from("backup_teams")
        .select("*")
        .eq("tournament_id", id)
        .order("priority_order");

      if (backupError) throw backupError;
      setBackupTeams(backupData || []);

    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to load tournament data",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const bulkCheckIn = async () => {
    try {
      const pendingTeamIds = teams
        .filter(t => t.check_in_status === 'pending')
        .map(t => t.id);
      
      if (pendingTeamIds.length === 0) {
        toast({
          title: "No teams to check in",
          description: "All teams are already checked in or marked as no-show.",
        });
        return;
      }

      const { error } = await supabase
        .from("teams")
        .update({ 
          check_in_status: 'checked_in',
          check_in_time: new Date().toISOString()
        })
        .in("id", pendingTeamIds);

      if (error) throw error;

      await supabase.rpc('log_tournament_action', {
        tournament_id: id,
        action: 'bulk_check_in',
        details: { team_count: pendingTeamIds.length }
      });

      fetchTournamentData();
      toast({
        title: "Success",
        description: `${pendingTeamIds.length} teams checked in.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to bulk check-in teams",
        variant: "destructive",
      });
    }
  };

  const updateTeamCheckIn = async (teamId: string, status: string) => {
    try {
      const updateData: any = { check_in_status: status };
      if (status === 'checked_in') {
        updateData.check_in_time = new Date().toISOString();
      }

      const { error } = await supabase
        .from("teams")
        .update(updateData)
        .eq("id", teamId);

      if (error) throw error;

      // Log the action
      await supabase.rpc('log_tournament_action', {
        tournament_id: id,
        action: `team_${status}`,
        details: { team_id: teamId }
      });

      fetchTournamentData();
      toast({
        title: "Success",
        description: `Team ${status === 'checked_in' ? 'checked in' : 'marked as no-show'}`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update team status",
        variant: "destructive",
      });
    }
  };

  const promoteBackupTeam = async (backupTeamId: string) => {
    try {
      const backupTeam = backupTeams.find(t => t.id === backupTeamId);
      if (!backupTeam) return;

      // Move backup team to main teams
      const { error: insertError } = await supabase
        .from("teams")
        .insert({
          name: backupTeam.name,
          tournament_id: id,
          captain_id: user?.id, // This should be the backup team's captain
          contact_email: backupTeam.contact_email,
          players_count: backupTeam.players_count,
          check_in_status: 'pending',
          is_backup: false
        });

      if (insertError) throw insertError;

      // Mark backup team as promoted
      const { error: updateError } = await supabase
        .from("backup_teams")
        .update({ promoted_to_main: true })
        .eq("id", backupTeamId);

      if (updateError) throw updateError;

      // Log the action
      await supabase.rpc('log_tournament_action', {
        tournament_id: id,
        action: 'backup_team_promoted',
        details: { backup_team_id: backupTeamId, team_name: backupTeam.name }
      });

      fetchTournamentData();
      toast({
        title: "Success",
        description: `${backupTeam.name} promoted to main tournament`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to promote backup team",
        variant: "destructive",
      });
    }
  };

  const bulkMarkAsPaid = async () => {
    try {
      const unpaidTeamIds = teams
        .filter(t => t.payment_status === 'pending')
        .map(t => t.id);
      
      if (unpaidTeamIds.length === 0) {
        toast({
          title: "No teams to update",
          description: "All teams are already marked as paid.",
        });
        return;
      }

      const { error } = await supabase
        .from("teams")
        .update({ 
          payment_status: 'paid',
          payment_date: new Date().toISOString(),
          payment_method: 'manual'
        })
        .in("id", unpaidTeamIds);

      if (error) throw error;

      await supabase.rpc('log_tournament_action', {
        tournament_id: id,
        action: 'bulk_mark_paid',
        details: { team_count: unpaidTeamIds.length }
      });

      fetchTournamentData();
      toast({
        title: "Success",
        description: `${unpaidTeamIds.length} teams marked as paid.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to bulk update payment status",
        variant: "destructive",
      });
    }
  };

  const updatePaymentStatus = async (teamId: string, status: string, method?: string, notes?: string) => {
    try {
      const updateData: any = { 
        payment_status: status,
        payment_method: method || null,
        payment_notes: notes || null
      };
      
      if (status === 'paid') {
        updateData.payment_date = new Date().toISOString();
      }

      const { error } = await supabase
        .from("teams")
        .update(updateData)
        .eq("id", teamId);

      if (error) throw error;

      // Log the action
      await supabase.rpc('log_tournament_action', {
        tournament_id: id,
        action: `payment_${status}`,
        details: { team_id: teamId, payment_method: method, notes }
      });

      fetchTournamentData();
      toast({
        title: "Success",
        description: `Payment status updated to ${status}`,
      });
    } catch (error) {
      toast({
        title: "Error", 
        description: "Failed to update payment status",
        variant: "destructive",
      });
    }
  };

  const publishTournament = async () => {
    if (!stripeConnected) {
      toast({
        title: "Stripe Not Connected",
        description: "Please connect your Stripe account before publishing the tournament.",
        variant: "destructive"
      });
      return;
    }

    setPublishingTournament(true);
    try {
      const { error } = await supabase
        .from('tournaments')
        .update({ 
          status: 'open',
          published: true 
        })
        .eq('id', id);

      if (error) throw error;

      await supabase.rpc('log_tournament_action', {
        tournament_id: id,
        action: 'tournament_published',
        details: {}
      });

      await fetchTournamentData();
      toast({
        title: "Success",
        description: "Tournament has been published and is now visible to participants!",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to publish tournament",
        variant: "destructive",
      });
    } finally {
      setPublishingTournament(false);
    }
  };

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Loading...</div>;
  }

  if (!isOrganizer) {
    return <Navigate to="/tournaments" replace />;
  }

  const checkedInTeams = teams.filter(t => t.check_in_status === 'checked_in').length;
  const noShowTeams = teams.filter(t => t.check_in_status === 'no_show').length;
  const pendingTeams = teams.filter(t => t.check_in_status === 'pending').length;
  const paidTeams = teams.filter(t => t.payment_status === 'paid').length;
  const unpaidTeams = teams.filter(t => t.payment_status === 'pending').length;
  const isTournamentDay = tournament ?
    new Date().toDateString() === new Date(tournament.start_date).toDateString() : false;

  // Get unique categories from teams (e.g., "Men's A", "Men's B", "Women's A", "Women's B")
  const uniqueCategories = Array.from(
    new Set(
      teams
        .map(t => t.category)
        .filter(c => c !== null && c !== undefined && c !== '')
    )
  ).sort();

  // Filter teams based on check-in status AND category
  let filteredTeams = teams;
  
  // Apply check-in status filter
  if (checkInFilter !== 'all') {
    filteredTeams = filteredTeams.filter(t => t.check_in_status === checkInFilter);
  }
  
  // Apply category filter
  if (categoryFilter !== 'all') {
    filteredTeams = filteredTeams.filter(t => t.category === categoryFilter);
  }

  return (
    <div className="container mx-auto p-2 sm:p-3 md:p-6 max-w-full overflow-x-hidden">
      <div className="mb-4 md:mb-6 flex flex-col gap-3 md:gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <h1 className="text-lg sm:text-2xl md:text-3xl font-bold break-words">{tournament?.title} - Management</h1>
            {tournament?.status === 'draft' && (
              <Badge variant="secondary" className="text-xs">DRAFT</Badge>
            )}
            {tournament?.published && (
              <Badge variant="default" className="text-xs bg-green-600">LIVE</Badge>
            )}
          </div>
          <p className="text-sm sm:text-base text-muted-foreground">Manage teams, check-ins, communications, and logistics</p>
          {tournament?.status === 'draft' && !tournament?.published && (
            <p className="text-sm text-amber-600 mt-1">
              This tournament is not yet visible to the public. {stripeConnected ? 'Click "Publish Tournament" to make it live.' : 'Connect Stripe to publish it.'}
            </p>
          )}
        </div>
        {tournament && (
          <div className="flex flex-col gap-2 sm:flex-row sm:gap-2 sm:shrink-0">
            <Button
              variant="outline"
              onClick={() => window.location.href = `/tournament/${id}/money`}
            >
              <Receipt className="h-4 w-4 mr-2" />
              Money & Reporting
            </Button>
            {tournament.status === 'draft' && !tournament.published && (
              <Button
                onClick={publishTournament}
                disabled={!stripeConnected || publishingTournament}
                className="bg-green-600 hover:bg-green-700"
              >
                {publishingTournament ? 'Publishing...' : 'Publish Tournament'}
              </Button>
            )}
            <EditCapacityDialog
              tournament={{
                id: tournament.id,
                title: tournament.title,
                divisions: tournament.divisions || [],
                skill_levels_by_division: tournament.skill_levels_by_division || {},
                max_teams_per_division_skill: tournament.max_teams_per_division_skill || {},
                max_teams_per_skill_level: tournament.max_teams_per_skill_level || {},
                max_teams: tournament.max_teams,
              }}
              onSaved={fetchTournamentData}
            />
            <EditTournamentDetailsDialog
              tournament={{
                id: tournament.id,
                title: tournament.title,
                location: tournament.location || null,
                first_game_time: tournament.first_game_time,
                max_teams: tournament.max_teams,
              }}
              onSaved={fetchTournamentData}
            />
          </div>
        )}
      </div>

      {!stripeConnected && tournament?.status === 'draft' && (
        <Alert className="mb-6 border-amber-500 bg-amber-50 dark:bg-amber-950">
          <AlertTriangle className="h-4 w-4 text-amber-600" />
          <AlertTitle className="text-amber-900 dark:text-amber-100">Stripe Connection Required</AlertTitle>
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            <p className="mb-3">
              You need to connect your Stripe account to accept online payments and publish this tournament.
            </p>
            <Button 
              onClick={handleConnectStripe}
              variant="default"
              className="bg-[#635BFF] hover:bg-[#5348E6]"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Connect with Stripe
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Total Teams</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold">{teams.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Checked In</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-green-600">{checkedInTeams}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">No Shows</CardTitle>
            <UserX className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-red-600">{noShowTeams}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs sm:text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-xl sm:text-2xl font-bold text-yellow-600">{pendingTeams}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="w-full overflow-x-auto pb-1">
          <TabsList className="flex justify-start w-max min-w-full h-10 p-1 gap-1 bg-muted rounded-md">
            <TabsTrigger value="teams" className="flex-shrink-0 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3">Teams</TabsTrigger>
            {tournament?.entry_fee > 0 && <TabsTrigger value="payments" className="flex-shrink-0 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3">Payments</TabsTrigger>}
            <TabsTrigger value="backup" className="flex-shrink-0 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3">Backup</TabsTrigger>
            <TabsTrigger value="format" className="flex-shrink-0 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3">Format</TabsTrigger>
            <TabsTrigger value="poolplay" className="flex-shrink-0 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3">Pool Play</TabsTrigger>
            <TabsTrigger value="tournament-day" className="flex-shrink-0 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3">Live</TabsTrigger>
            <TabsTrigger value="testing" className="flex-shrink-0 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3">Testing</TabsTrigger>
            <TabsTrigger value="communications" className="flex-shrink-0 whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3">Comms</TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="teams" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <CardTitle>Team Check-in Status</CardTitle>
              {pendingTeams > 0 && (
                <Button onClick={bulkCheckIn} variant="outline" size="sm">
                  Check-in All Pending ({pendingTeams})
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {/* Category Filter Tabs */}
              {uniqueCategories.length > 0 && (
                <div className="mb-4">
                  <Label className="text-sm font-medium mb-2 block">Filter by Category</Label>
                  <Tabs value={categoryFilter} onValueChange={setCategoryFilter} className="w-full">
                    <TabsList className="grid w-full gap-1" style={{ gridTemplateColumns: `repeat(${Math.min(uniqueCategories.length + 1, 6)}, minmax(0, 1fr))` }}>
                      <TabsTrigger value="all" className="text-xs md:text-sm whitespace-nowrap">
                        All ({teams.length})
                      </TabsTrigger>
                      {uniqueCategories.map((category) => {
                        const categoryTeams = teams.filter(t => t.category === category);
                        return (
                          <TabsTrigger key={category} value={category} className="text-xs md:text-sm whitespace-nowrap">
                            {category} ({categoryTeams.length})
                          </TabsTrigger>
                        );
                      })}
                    </TabsList>
                  </Tabs>
                </div>
              )}

              {/* Check-in Status Filter Tabs */}
              <div className="mb-4">
                <Label className="text-sm font-medium mb-2 block">Filter by Check-in Status</Label>
                <Tabs value={checkInFilter} onValueChange={(value) => setCheckInFilter(value as any)} className="w-full">
                  <TabsList className="grid w-full grid-cols-2 md:grid-cols-4 gap-1">
                    <TabsTrigger value="all" className="text-xs md:text-sm">
                      All
                    </TabsTrigger>
                    <TabsTrigger value="checked_in" className="text-xs md:text-sm">
                      <UserCheck className="h-3 w-3 mr-1 md:h-4 md:w-4" />
                      Checked In ({checkedInTeams})
                    </TabsTrigger>
                    <TabsTrigger value="pending" className="text-xs md:text-sm">
                      <Clock className="h-3 w-3 mr-1 md:h-4 md:w-4" />
                      Pending ({pendingTeams})
                    </TabsTrigger>
                    <TabsTrigger value="no_show" className="text-xs md:text-sm">
                      <UserX className="h-3 w-3 mr-1 md:h-4 md:w-4" />
                      No Show ({noShowTeams})
                    </TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              <div className="space-y-4">
                {filteredTeams.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    No teams found in this category
                  </div>
                ) : (
                  filteredTeams
                    .slice((currentPage - 1) * teamsPerPage, currentPage * teamsPerPage)
                    .map((team) => (
                  <div key={team.id} className="flex flex-col gap-3 p-3 sm:p-4 border rounded-lg sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="font-medium text-sm sm:text-base break-words">{team.name}</h3>
                        {team.category && (
                          <Badge variant="default" className="text-xs bg-primary">
                            {team.category}
                          </Badge>
                        )}
                        {team.skill_level && (
                          <Badge variant={getSkillLevelBadgeVariant(team.skill_level as any)} className="text-xs">
                            {formatSkillLevel(team.skill_level as any)}
                          </Badge>
                        )}
                        {team.division && (
                          <Badge variant="outline" className="text-xs">
                            {team.division.toUpperCase()}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs sm:text-sm text-muted-foreground break-words">
                        {team.players_count} players • {team.contact_email}
                      </p>
                      {team.check_in_time && (
                        <p className="text-xs text-muted-foreground">
                          Checked in: {new Date(team.check_in_time).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2 sm:shrink-0">
                      <Badge 
                        variant={
                          team.check_in_status === 'checked_in' ? 'default' :
                          team.check_in_status === 'no_show' ? 'destructive' : 'secondary'
                        }
                        className="text-xs w-fit"
                      >
                        {team.check_in_status.replace('_', ' ').toUpperCase()}
                      </Badge>
                      {team.check_in_status === 'pending' && isTournamentDay && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => updateTeamCheckIn(team.id, 'checked_in')}
                            className="text-xs px-2 py-1 h-8"
                          >
                            Check In
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="destructive" className="text-xs px-2 py-1 h-8">
                                No Show
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Mark as No Show</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to mark {team.name} as a no-show? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => updateTeamCheckIn(team.id, 'no_show')}
                                >
                                  Confirm No Show
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
              </div>
              
              {filteredTeams.length > teamsPerPage && (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mt-6 pt-4 border-t">
                  <div className="text-sm text-muted-foreground">
                    Showing {Math.min((currentPage - 1) * teamsPerPage + 1, filteredTeams.length)} to{' '}
                    {Math.min(currentPage * teamsPerPage, filteredTeams.length)} of {filteredTeams.length} teams
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                    >
                      Previous
                    </Button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: Math.ceil(filteredTeams.length / teamsPerPage) }, (_, i) => i + 1)
                        .filter(page => {
                          const totalPages = Math.ceil(filteredTeams.length / teamsPerPage);
                          return page === 1 || 
                                 page === totalPages || 
                                 Math.abs(page - currentPage) <= 1;
                        })
                        .map((page, index, arr) => (
                          <div key={page} className="flex items-center gap-1">
                            {index > 0 && arr[index - 1] !== page - 1 && (
                              <span className="px-2 text-muted-foreground">...</span>
                            )}
                            <Button
                              variant={currentPage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => setCurrentPage(page)}
                              className="w-8 h-8 p-0"
                            >
                              {page}
                            </Button>
                          </div>
                        ))}
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(p => Math.min(Math.ceil(filteredTeams.length / teamsPerPage), p + 1))}
                      disabled={currentPage === Math.ceil(filteredTeams.length / teamsPerPage)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="backup" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Backup Teams Waitlist</CardTitle>
            </CardHeader>
            <CardContent>
              {backupTeams.length === 0 ? (
                <p className="text-muted-foreground">No backup teams registered</p>
              ) : (
                <div className="space-y-4">
                  {backupTeams.map((team) => (
                    <div key={team.id} className="flex flex-col gap-3 p-3 sm:p-4 border rounded-lg sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-sm sm:text-base break-words">{team.name}</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground break-words">
                          Priority: #{team.priority_order} • {team.players_count} players • {team.contact_email}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 sm:shrink-0">
                        {team.promoted_to_main ? (
                          <Badge variant="default" className="text-xs w-fit">Promoted</Badge>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => promoteBackupTeam(team.id)}
                            disabled={teams.length >= tournament?.max_teams!}
                            className="text-xs px-2 py-1 h-8 whitespace-nowrap"
                          >
                            Promote
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {tournament?.entry_fee > 0 && (
          <TabsContent value="payments" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold text-green-600">
                    ${(paidTeams * (tournament?.entry_fee || 0)).toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {paidTeams} paid teams
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium">Outstanding</CardTitle>
                  <Clock className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold text-yellow-600">
                    ${(unpaidTeams * (tournament?.entry_fee || 0)).toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {unpaidTeams} unpaid teams
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-xs sm:text-sm font-medium">Payment Rate</CardTitle>
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-xl sm:text-2xl font-bold text-blue-600">
                    {teams.length > 0 ? Math.round((paidTeams / teams.length) * 100) : 0}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {paidTeams} of {teams.length} teams
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Payment Status</CardTitle>
                {unpaidTeams > 0 && (
                  <Button onClick={bulkMarkAsPaid} variant="outline" size="sm">
                    Mark All as Paid ({unpaidTeams})
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {teams.map((team) => (
                    <div key={team.id} className="flex flex-col gap-3 p-3 sm:p-4 border rounded-lg sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <h3 className="font-medium text-sm sm:text-base break-words">{team.name}</h3>
                        <p className="text-xs sm:text-sm text-muted-foreground break-words">
                          {team.contact_email} • Entry Fee: ${tournament?.entry_fee}
                        </p>
                        {team.payment_date && (
                          <p className="text-xs text-muted-foreground">
                            Paid: {new Date(team.payment_date).toLocaleString()}
                            {team.payment_method && ` via ${team.payment_method}`}
                          </p>
                        )}
                        {team.payment_notes && (
                          <p className="text-xs text-muted-foreground">
                            Note: {team.payment_notes}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-2 sm:shrink-0">
                        <Badge 
                          variant={team.payment_status === 'paid' ? 'default' : 'secondary'}
                          className="text-xs w-fit"
                        >
                          {team.payment_status.toUpperCase()}
                        </Badge>
                        {team.payment_status === 'pending' && (
                          <PaymentConfirmDialog
                            team={team}
                            entryFee={tournament?.entry_fee || 0}
                            onConfirm={(method, notes) => updatePaymentStatus(team.id, 'paid', method, notes)}
                          />
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}

        <TabsContent value="format" className="space-y-4">
          {tournament && (
            <GameFormatManager 
              tournament={tournament}
              matches={[]} // TODO: Fetch matches when needed
              onTournamentUpdate={fetchTournamentData}
            />
          )}
        </TabsContent>

        <TabsContent value="poolplay" className="space-y-4">
          {tournament && (
            <PoolPlayManager 
              tournament={tournament}
              teams={teams}
              onBracketsGenerated={fetchTournamentData}
            />
          )}
        </TabsContent>

        <TabsContent value="tournament-day" className="space-y-4">
          {tournament && (
            <TournamentDayDashboard 
              tournament={tournament}
              teams={teams}
            />
          )}
        </TabsContent>

        <TabsContent value="testing" className="space-y-4">
          {tournament && (
            <TournamentTestingDashboard 
              tournament={tournament}
              teams={teams}
              onDataChange={fetchTournamentData}
            />
          )}
        </TabsContent>

        <TabsContent value="tournament-day" className="space-y-4">
          {tournament && (
            <TournamentDayDashboard 
              tournament={tournament}
              teams={teams}
            />
          )}
        </TabsContent>

        <TabsContent value="testing" className="space-y-4">
          {tournament && (
            <TournamentTestingDashboard 
              tournament={tournament}
              teams={teams}
              onDataChange={fetchTournamentData}
            />
          )}
        </TabsContent>
        <TabsContent value="communications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Email all players</CardTitle>
            </CardHeader>
            <CardContent className="flex items-center justify-between">
              <p className="text-muted-foreground">
                Send announcements or updates to all registered players and team contacts.
              </p>
              {tournament && <EmailPlayersDialog tournamentId={tournament.id} defaultSubject={`${tournament.title} - Update`} />}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface PaymentConfirmDialogProps {
  team: Team;
  entryFee: number;
  onConfirm: (method: string, notes: string) => void;
}

function PaymentConfirmDialog({ team, entryFee, onConfirm }: PaymentConfirmDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState('');
  const [notes, setNotes] = useState('');

  const handleConfirm = () => {
    onConfirm(paymentMethod, notes);
    setIsOpen(false);
    setPaymentMethod('');
    setNotes('');
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          Mark as Paid
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Confirm Payment</DialogTitle>
          <DialogDescription>
            Mark {team.name}'s payment of ${entryFee} as received.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Payment Method</Label>
            <Select value={paymentMethod} onValueChange={setPaymentMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">Cash</SelectItem>
                <SelectItem value="check">Check</SelectItem>
                <SelectItem value="credit_card">Credit Card</SelectItem>
                <SelectItem value="debit_card">Debit Card</SelectItem>
                <SelectItem value="venmo">Venmo</SelectItem>
                <SelectItem value="paypal">PayPal</SelectItem>
                <SelectItem value="zelle">Zelle</SelectItem>
                <SelectItem value="bank_transfer">Bank Transfer</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Notes (optional)</Label>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Payment reference, confirmation number, etc."
              rows={3}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleConfirm} disabled={!paymentMethod}>
            Confirm Payment
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
