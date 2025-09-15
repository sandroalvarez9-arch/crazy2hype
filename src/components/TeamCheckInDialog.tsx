import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { UserCheck, Clock, AlertCircle } from "lucide-react";

interface Team {
  id: string;
  name: string;
  check_in_status: string;
  check_in_time: string | null;
  captain_id: string;
}

interface TeamCheckInDialogProps {
  tournament: {
    id: string;
    title: string;
    check_in_deadline: string | null;
    start_date: string;
  };
  userTeams: Team[];
  onCheckInComplete: () => void;
}

export default function TeamCheckInDialog({ tournament, userTeams, onCheckInComplete }: TeamCheckInDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const checkInTeam = async (teamId: string) => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("teams")
        .update({
          check_in_status: 'checked_in',
          check_in_time: new Date().toISOString()
        })
        .eq("id", teamId);

      if (error) throw error;

      toast({
        title: "Success!",
        description: "Your team has been checked in for the tournament.",
      });

      onCheckInComplete();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to check in team. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const isCheckInOpen = () => {
    if (!tournament.check_in_deadline) return true;
    return new Date() <= new Date(tournament.check_in_deadline);
  };

  const canCheckIn = (team: Team) => {
    return team.check_in_status === 'pending' && isCheckInOpen();
  };

  const teamsNeedingCheckIn = userTeams.filter(team => team.check_in_status === 'pending');

  if (teamsNeedingCheckIn.length === 0) {
    return null;
  }

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button className="gap-2">
          <UserCheck className="h-4 w-4" />
          Check In Teams
          <Badge variant="secondary">{teamsNeedingCheckIn.length}</Badge>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md max-h-[80vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" />
            Tournament Check-In
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 flex-1 overflow-hidden">
          <div className="text-sm text-muted-foreground">
            <p className="font-medium">{tournament.title}</p>
            <p>Tournament starts: {new Date(tournament.start_date).toLocaleString()}</p>
            {tournament.check_in_deadline && (
              <p>Check-in deadline: {new Date(tournament.check_in_deadline).toLocaleString()}</p>
            )}
          </div>

          {!isCheckInOpen() && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
              <AlertCircle className="h-4 w-4 text-red-600" />
              <p className="text-sm text-red-700">Check-in period has ended</p>
            </div>
          )}

          <div className="space-y-3 overflow-y-auto flex-1 pr-2">
            {userTeams.map((team) => (
              <Card key={team.id}>
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">{team.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant={
                          team.check_in_status === 'checked_in' ? 'default' :
                          team.check_in_status === 'no_show' ? 'destructive' : 'secondary'
                        }>
                          {team.check_in_status === 'checked_in' ? 'Checked In' :
                           team.check_in_status === 'no_show' ? 'No Show' : 'Pending'}
                        </Badge>
                        {team.check_in_time && (
                          <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {new Date(team.check_in_time).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {canCheckIn(team) && (
                      <Button
                        size="sm"
                        onClick={() => checkInTeam(team.id)}
                        disabled={loading}
                      >
                        Check In
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {isCheckInOpen() && teamsNeedingCheckIn.length > 0 && (
            <div className="text-xs text-muted-foreground text-center">
              Make sure all your team members are present before checking in
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}