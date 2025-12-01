import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useUserTeams } from "@/hooks/useUserTeams";
import { Calendar, MapPin, Users, AlertCircle, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ConfirmationDialog } from "./ConfirmationDialog";

export const UserTournamentsTab = () => {
  const { teams, loading, error, refetch } = useUserTeams();
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteAllDialogOpen, setDeleteAllDialogOpen] = useState(false);
  const [teamToDelete, setTeamToDelete] = useState<{ id: string; name: string } | null>(null);
  const [deleting, setDeleting] = useState(false);

  const handleDeleteClick = (teamId: string, teamName: string) => {
    setTeamToDelete({ id: teamId, name: teamName });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!teamToDelete) return;

    setDeleting(true);
    try {
      const { error } = await supabase
        .from("teams")
        .delete()
        .eq("id", teamToDelete.id);

      if (error) throw error;

      toast.success(`Team "${teamToDelete.name}" has been deleted`);
      refetch();
      setDeleteDialogOpen(false);
      setTeamToDelete(null);
    } catch (err: any) {
      console.error("Error deleting team:", err);
      toast.error(err.message || "Failed to delete team");
    } finally {
      setDeleting(false);
    }
  };

  const handleDeleteAllClick = () => {
    if (teams.length === 0) return;
    setDeleteAllDialogOpen(true);
  };

  const handleConfirmDeleteAll = async () => {
    setDeleting(true);
    try {
      const teamIds = teams.map(team => team.id);
      
      const { error } = await supabase
        .from("teams")
        .delete()
        .in("id", teamIds);

      if (error) throw error;

      toast.success(`Successfully deleted ${teamIds.length} team${teamIds.length > 1 ? 's' : ''}`);
      refetch();
      setDeleteAllDialogOpen(false);
    } catch (err: any) {
      console.error("Error deleting teams:", err);
      toast.error(err.message || "Failed to delete teams");
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-32 w-full" />
      </div>
    );
  }

  if (error) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertCircle className="h-12 w-12 text-destructive mb-4" />
            <p className="text-muted-foreground mb-4">Failed to load your tournaments</p>
            <Button onClick={refetch} variant="outline">
              Try Again
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (teams.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Users className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Teams Yet</h3>
            <p className="text-muted-foreground mb-6">
              You haven't registered for any tournaments yet.
            </p>
            <Button onClick={() => navigate("/tournaments")}>
              Browse Tournaments
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  // Group teams by tournament and separate upcoming vs past
  const tournamentGroups = teams.reduce((acc, team) => {
    const tournamentId = team.tournament.id;
    if (!acc[tournamentId]) {
      acc[tournamentId] = {
        tournament: team.tournament,
        teams: [],
      };
    }
    acc[tournamentId].teams.push(team);
    return acc;
  }, {} as Record<string, { tournament: any; teams: typeof teams }>);

  const now = new Date();
  const upcomingTournaments = Object.values(tournamentGroups).filter(
    (group) => new Date(group.tournament.start_date) >= now
  );
  const pastTournaments = Object.values(tournamentGroups).filter(
    (group) => new Date(group.tournament.start_date) < now
  );

  const getPaymentBadgeVariant = (status: string | null) => {
    switch (status) {
      case "paid":
        return "default";
      case "pending":
        return "secondary";
      default:
        return "destructive";
    }
  };

  const getCheckInBadgeVariant = (status: string | null) => {
    return status === "checked_in" ? "default" : "secondary";
  };

  return (
    <div className="space-y-6">
      {/* Delete All Button */}
      {teams.length > 0 && (
        <div className="flex justify-end">
          <Button
            variant="outline"
            onClick={handleDeleteAllClick}
            className="text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete All Teams ({teams.length})
          </Button>
        </div>
      )}

      {/* Upcoming Tournaments */}
      {upcomingTournaments.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Upcoming Tournaments ({upcomingTournaments.length})
          </h3>
          <div className="space-y-4">
            {upcomingTournaments.map((group) => (
              <Card key={group.tournament.id} className="hover:shadow-elegant transition-shadow">
                <CardHeader>
                  <CardTitle className="text-xl">{group.tournament.title}</CardTitle>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-2">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(group.tournament.start_date), "MMM d, yyyy")}
                    </span>
                    {group.tournament.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {group.tournament.location}
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Your Teams:</h4>
                    {group.teams.map((team) => (
                      <div
                        key={team.id}
                        className="flex flex-wrap items-center justify-between gap-2 p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="flex flex-wrap items-center gap-2 flex-1">
                          <span className="font-medium">{team.name}</span>
                          {team.skill_level && (
                            <Badge variant="outline">{team.skill_level}</Badge>
                          )}
                          {team.division && (
                            <Badge variant="outline">{team.division}</Badge>
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant={getCheckInBadgeVariant(team.check_in_status)}>
                            {team.check_in_status === "checked_in" ? "Checked In" : "Not Checked In"}
                          </Badge>
                          <Badge variant={getPaymentBadgeVariant(team.payment_status)}>
                            {team.payment_status === "paid" ? "Paid" : team.payment_status === "pending" ? "Payment Pending" : "Payment Failed"}
                          </Badge>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDeleteClick(team.id, team.name)}
                            className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <Button
                      onClick={() => navigate(`/tournament/${group.tournament.id}`)}
                      variant="default"
                      size="sm"
                    >
                      View Tournament
                    </Button>
                    <Button
                      onClick={() => navigate(`/tournament/${group.tournament.id}`)}
                      variant="outline"
                      size="sm"
                    >
                      View Schedule
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Past Tournaments */}
      {pastTournaments.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Past Tournaments ({pastTournaments.length})
          </h3>
          <div className="space-y-4">
            {pastTournaments.map((group) => (
              <Card key={group.tournament.id} className="opacity-75 hover:opacity-100 transition-opacity">
                <CardHeader>
                  <CardTitle className="text-xl">{group.tournament.title}</CardTitle>
                  <div className="flex flex-wrap gap-4 text-sm text-muted-foreground mt-2">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {format(new Date(group.tournament.start_date), "MMM d, yyyy")}
                    </span>
                    {group.tournament.location && (
                      <span className="flex items-center gap-1">
                        <MapPin className="h-4 w-4" />
                        {group.tournament.location}
                      </span>
                    )}
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <h4 className="font-medium text-sm">Your Teams:</h4>
                    {group.teams.map((team) => (
                      <div
                        key={team.id}
                        className="flex flex-wrap items-center justify-between gap-2 p-3 bg-muted/50 rounded-lg"
                      >
                        <div className="flex flex-wrap items-center gap-2 flex-1">
                          <span className="font-medium">{team.name}</span>
                          {team.skill_level && (
                            <Badge variant="outline">{team.skill_level}</Badge>
                          )}
                          {team.division && (
                            <Badge variant="outline">{team.division}</Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteClick(team.id, team.name)}
                          className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                  <div className="mt-4">
                    <Button
                      onClick={() => navigate(`/tournament/${group.tournament.id}`)}
                      variant="outline"
                      size="sm"
                    >
                      View Results
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      <ConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Delete Team"
        description={`Are you sure you want to delete "${teamToDelete?.name}"? This action cannot be undone and will remove all associated data including players and match history.`}
        onConfirm={handleConfirmDelete}
        confirmText="Delete Team"
        variant="destructive"
      />

      <ConfirmationDialog
        open={deleteAllDialogOpen}
        onOpenChange={setDeleteAllDialogOpen}
        title="Delete All Teams"
        description={`Are you sure you want to delete all ${teams.length} team${teams.length > 1 ? 's' : ''}? This action cannot be undone and will remove all teams, players, and match history from your profile.`}
        onConfirm={handleConfirmDeleteAll}
        confirmText={`Delete All ${teams.length} Team${teams.length > 1 ? 's' : ''}`}
        variant="destructive"
      />
    </div>
  );
};
