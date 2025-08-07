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
import { Users, UserCheck, UserX, Clock, Trophy, AlertTriangle } from "lucide-react";
import { PoolPlayManager } from "@/components/PoolPlayManager";

interface Tournament {
  id: string;
  title: string;
  status: string;
  max_teams: number;
  check_in_deadline: string | null;
  bracket_version: number;
  allow_backup_teams: boolean;
  first_game_time: string;
  estimated_game_duration: number;
  number_of_courts: number;
  tournament_format: string;
  brackets_generated: boolean;
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

  useEffect(() => {
    if (id && user) {
      fetchTournamentData();
    }
  }, [id, user]);

  const fetchTournamentData = async () => {
    try {
      // Fetch tournament details
      const { data: tournamentData, error: tournamentError } = await supabase
        .from("tournaments")
        .select("*")
        .eq("id", id)
        .single();

      if (tournamentError) throw tournamentError;

      setTournament(tournamentData);
      setIsOrganizer(tournamentData.organizer_id === user?.id);

      // Only allow organizers to access this page
      if (tournamentData.organizer_id !== user?.id) {
        return;
      }

      // Fetch teams
      const { data: teamsData, error: teamsError } = await supabase
        .from("teams")
        .select("*")
        .eq("tournament_id", id)
        .eq("is_backup", false);

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

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">{tournament?.title} - Management</h1>
        <p className="text-muted-foreground">Manage teams, check-ins, and tournament logistics</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Teams</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{teams.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Checked In</CardTitle>
            <UserCheck className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{checkedInTeams}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">No Shows</CardTitle>
            <UserX className="h-4 w-4 text-red-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{noShowTeams}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-600">{pendingTeams}</div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="teams" className="space-y-4">
        <TabsList>
          <TabsTrigger value="teams">Team Management</TabsTrigger>
          <TabsTrigger value="backup">Backup Teams</TabsTrigger>
          <TabsTrigger value="poolplay">Pool Play</TabsTrigger>
          <TabsTrigger value="bracket">Bracket Control</TabsTrigger>
        </TabsList>

        <TabsContent value="teams" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Team Check-in Status</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {teams.map((team) => (
                  <div key={team.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium">{team.name}</h3>
                      <p className="text-sm text-muted-foreground">
                        {team.players_count} players • {team.contact_email}
                      </p>
                      {team.check_in_time && (
                        <p className="text-xs text-muted-foreground">
                          Checked in: {new Date(team.check_in_time).toLocaleString()}
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant={
                        team.check_in_status === 'checked_in' ? 'default' :
                        team.check_in_status === 'no_show' ? 'destructive' : 'secondary'
                      }>
                        {team.check_in_status.replace('_', ' ').toUpperCase()}
                      </Badge>
                      {team.check_in_status === 'pending' && (
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            onClick={() => updateTeamCheckIn(team.id, 'checked_in')}
                          >
                            Check In
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button size="sm" variant="destructive">
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
                ))}
              </div>
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
                    <div key={team.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-medium">{team.name}</h3>
                        <p className="text-sm text-muted-foreground">
                          Priority: #{team.priority_order} • {team.players_count} players • {team.contact_email}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {team.promoted_to_main ? (
                          <Badge variant="default">Promoted</Badge>
                        ) : (
                          <Button
                            size="sm"
                            onClick={() => promoteBackupTeam(team.id)}
                            disabled={teams.length >= tournament?.max_teams!}
                          >
                            Promote to Main
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

        <TabsContent value="poolplay" className="space-y-4">
          {tournament && (
            <PoolPlayManager 
              tournament={tournament}
              teams={teams}
              onBracketsGenerated={fetchTournamentData}
            />
          )}
        </TabsContent>

        <TabsContent value="bracket" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Trophy className="h-5 w-5" />
                Bracket Management
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center gap-2 p-4 bg-muted rounded-lg">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <div>
                    <p className="font-medium">Current Bracket Version: {tournament?.bracket_version}</p>
                    <p className="text-sm text-muted-foreground">
                      {checkedInTeams} teams checked in, {noShowTeams} no-shows
                    </p>
                  </div>
                </div>
                
                {noShowTeams > 0 && (
                  <div className="p-4 border border-orange-200 bg-orange-50 rounded-lg">
                    <h4 className="font-medium text-orange-800 mb-2">Action Required</h4>
                    <p className="text-sm text-orange-700 mb-3">
                      You have {noShowTeams} no-show teams. Consider promoting backup teams or regenerating brackets.
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm">
                        Regenerate Bracket
                      </Button>
                      <Button variant="outline" size="sm">
                        Generate Matches
                      </Button>
                    </div>
                  </div>
                )}
                
                <div className="text-center p-8 text-muted-foreground">
                  <Trophy className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Bracket generation and match management coming soon</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}