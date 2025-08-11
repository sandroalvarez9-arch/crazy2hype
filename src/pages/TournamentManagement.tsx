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
import { Users, UserCheck, UserX, Clock, Trophy, AlertTriangle, DollarSign, CheckCircle } from "lucide-react";
import { PoolPlayManager } from "@/components/PoolPlayManager";
import { GameFormatManager } from "@/components/GameFormatManager";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import EmailPlayersDialog from "@/components/EmailPlayersDialog";
import EditTournamentDetailsDialog from "@/components/EditTournamentDetailsDialog";

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
  number_of_courts?: number;
  calculated_courts?: number;
  skill_levels: string[];
  tournament_format: string;
  brackets_generated: boolean;
  sets_per_game: number;
  points_per_set: number;
  must_win_by: number;
  deciding_set_points: number;
  game_format_locked: boolean;
  entry_fee: number;
  location?: string | null;
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

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{tournament?.title} - Management</h1>
          <p className="text-muted-foreground">Manage teams, check-ins, communications, and logistics</p>
        </div>
        {tournament && (
          <EditTournamentDetailsDialog
            tournament={{
              id: tournament.id,
              title: tournament.title,
              location: tournament.location || null,
              first_game_time: tournament.first_game_time,
            }}
            onSaved={fetchTournamentData}
          />
        )}
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
          {tournament?.entry_fee > 0 && <TabsTrigger value="payments">Payment Management</TabsTrigger>}
          <TabsTrigger value="backup">Backup Teams</TabsTrigger>
          <TabsTrigger value="format">Game Format</TabsTrigger>
          <TabsTrigger value="poolplay">Pool Play</TabsTrigger>
          <TabsTrigger value="bracket">Bracket Control</TabsTrigger>
          <TabsTrigger value="communications">Communications</TabsTrigger>
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

        {tournament?.entry_fee > 0 && (
          <TabsContent value="payments" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                  <DollarSign className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    ${(paidTeams * (tournament?.entry_fee || 0)).toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {paidTeams} paid teams
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
                  <Clock className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">
                    ${(unpaidTeams * (tournament?.entry_fee || 0)).toFixed(2)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {unpaidTeams} unpaid teams
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Payment Rate</CardTitle>
                  <CheckCircle className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {teams.length > 0 ? Math.round((paidTeams / teams.length) * 100) : 0}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {paidTeams} of {teams.length} teams
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Payment Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {teams.map((team) => (
                    <div key={team.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex-1">
                        <h3 className="font-medium">{team.name}</h3>
                        <p className="text-sm text-muted-foreground">
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
                      <div className="flex items-center gap-2">
                        <Badge variant={team.payment_status === 'paid' ? 'default' : 'secondary'}>
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
