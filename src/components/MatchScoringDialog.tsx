import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MatchScoringInterface } from "./MatchScoringInterface";
import { useToast } from "@/hooks/use-toast";
import { X, Trophy, Clock, MapPin } from "lucide-react";
import { celebrateSimple } from "@/utils/animations";

interface Match {
  id: string;
  tournament_id: string;
  team1_id: string | null;
  team2_id: string | null;
  team1_name?: string;
  team2_name?: string;
  team1_score: number;
  team2_score: number;
  sets_won_team1: number;
  sets_won_team2: number;
  set_scores: Record<string, any>;
  current_set: number;
  status: string;
  winner_id: string | null;
  scheduled_time: string | null;
  court_number: number;
  pool_name: string | null;
  round_number: number;
  match_number: number;
  completed_at: string | null;
  tournament_phase?: string;
  bracket_position?: string;
}

interface Tournament {
  id: string;
  title: string;
  sets_per_game: number;
  points_per_set: number;
  must_win_by: number;
  deciding_set_points: number;
  uses_phase_formats?: boolean;
  pool_play_format?: any;
  playoff_format?: any;
}

interface Team {
  id: string;
  name: string;
}

interface MatchScoringDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  match: Match | null;
  tournament: Tournament;
  team1: Team | null;
  team2: Team | null;
  onMatchUpdate: () => void;
}

export function MatchScoringDialog({
  open,
  onOpenChange,
  match,
  tournament,
  team1,
  team2,
  onMatchUpdate
}: MatchScoringDialogProps) {
  const { toast } = useToast();
  
  if (!match) return null;

  const handleClose = () => {
    console.log('Closing match scoring dialog');
    onOpenChange(false);
  };

  const handleMatchUpdate = () => {
    onMatchUpdate();
    // Keep dialog open until match is completed, then auto-close
    if (match && match.status === 'completed') {
      celebrateSimple();
      toast({
        title: "🎉 Match Completed!",
        description: "Dialog will close automatically in 3 seconds...",
        duration: 3000,
      });
      setTimeout(() => {
        handleClose();
      }, 3000);
    }
  };

  const getMatchTitle = () => {
    if (match.pool_name) {
      return `${match.pool_name} - Round ${match.round_number}`;
    } else if (match.tournament_phase === 'playoffs' && match.bracket_position) {
      return match.bracket_position;
    }
    return `Round ${match.round_number}, Match ${match.match_number}`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Trophy className="h-6 w-6 text-primary" />
              <div>
                <DialogTitle className="text-xl font-bold">
                  {team1?.name || 'Team 1'} vs {team2?.name || 'Team 2'}
                </DialogTitle>
                <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                  <span>{getMatchTitle()}</span>
                  {match.court_number && (
                    <>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        Court {match.court_number}
                      </div>
                    </>
                  )}
                  {match.scheduled_time && (
                    <>
                      <span>•</span>
                      <div className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(match.scheduled_time).toLocaleTimeString([], { 
                          hour: '2-digit', 
                          minute: '2-digit' 
                        })}
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Badge 
                variant={match.status === 'completed' ? 'default' : 
                        match.status === 'in_progress' ? 'secondary' : 'outline'}
              >
                {match.status === 'completed' ? 'Completed' : 
                 match.status === 'in_progress' ? 'In Progress' : 'Scheduled'}
              </Badge>
            </div>
          </div>
        </DialogHeader>

        {/* Match Scoring Interface */}
        <div className="mt-4">
          <MatchScoringInterface
            match={match}
            tournament={tournament}
            team1={team1}
            team2={team2}
            onMatchUpdate={handleMatchUpdate}
          />
        </div>

        {/* Footer Actions */}
        <div className="flex justify-between items-center pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {match.status === 'completed' 
              ? '🏆 Match completed! Great game!' 
              : match.status === 'in_progress'
              ? '⚡ Match in progress - use scoring controls above'
              : '🎮 Click "Start Match" above to begin scoring'}
          </div>
          
          <div className="flex gap-2">
            {match.status !== 'completed' && (
              <Button variant="outline" onClick={handleClose}>
                Minimize Scoring
              </Button>
            )}
            <Button 
              onClick={handleClose}
              variant={match.status === 'completed' ? 'default' : 'ghost'}
            >
              {match.status === 'completed' ? '✅ Close' : 'Close Scoring'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
