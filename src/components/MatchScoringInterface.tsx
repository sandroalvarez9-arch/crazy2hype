import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Trophy, Clock, Users, MapPin } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Match {
  id: string;
  tournament_id: string;
  team1_id: string | null;
  team2_id: string | null;
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
}

interface Tournament {
  id: string;
  title: string;
  sets_per_game: number;
  points_per_set: number;
  must_win_by: number;
  deciding_set_points: number;
}

interface Team {
  id: string;
  name: string;
}

interface MatchScoringInterfaceProps {
  match: Match;
  tournament: Tournament;
  team1: Team | null;
  team2: Team | null;
  onMatchUpdate: () => void;
}

export function MatchScoringInterface({ 
  match, 
  tournament, 
  team1, 
  team2, 
  onMatchUpdate 
}: MatchScoringInterfaceProps) {
  const [currentSetScores, setCurrentSetScores] = useState({ team1: 0, team2: 0 });
  const [allSetScores, setAllSetScores] = useState<Record<string, { team1: number; team2: number }>>(
    match.set_scores || {}
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    // Initialize current set scores from existing data
    const currentSetKey = `set${match.current_set}`;
    if (allSetScores[currentSetKey]) {
      setCurrentSetScores(allSetScores[currentSetKey]);
    }
  }, [match.current_set, allSetScores]);

  const getSetsWon = (teamNumber: 1 | 2) => {
    let setsWon = 0;
    Object.values(allSetScores).forEach(scores => {
      const team1Won = scores.team1 > scores.team2;
      const team2Won = scores.team2 > scores.team1;
      
      if (teamNumber === 1 && team1Won) setsWon++;
      if (teamNumber === 2 && team2Won) setsWon++;
    });
    return setsWon;
  };

  const getPointsNeededForSet = () => {
    const setsWon1 = getSetsWon(1);
    const setsWon2 = getSetsWon(2);
    const totalSetsWon = setsWon1 + setsWon2;
    
    // Check if this is the deciding set
    const isDecidingSet = tournament.sets_per_game > 1 && 
      totalSetsWon === tournament.sets_per_game - 1;
    
    return isDecidingSet ? tournament.deciding_set_points : tournament.points_per_set;
  };

  const isSetWon = (team1Score: number, team2Score: number) => {
    const pointsNeeded = getPointsNeededForSet();
    const winBy = tournament.must_win_by;
    
    return (team1Score >= pointsNeeded && team1Score - team2Score >= winBy) ||
           (team2Score >= pointsNeeded && team2Score - team1Score >= winBy);
  };

  const isMatchWon = (team1Sets: number, team2Sets: number) => {
    const setsNeeded = Math.ceil(tournament.sets_per_game / 2);
    return team1Sets >= setsNeeded || team2Sets >= setsNeeded;
  };

  const handleScoreUpdate = async (team: 'team1' | 'team2', increment: number) => {
    const newScores = { ...currentSetScores };
    newScores[team] = Math.max(0, newScores[team] + increment);
    
    // Check if set is won
    if (isSetWon(newScores.team1, newScores.team2)) {
      // Set is finished, update set scores
      const currentSetKey = `set${match.current_set}`;
      const updatedSetScores = {
        ...allSetScores,
        [currentSetKey]: newScores
      };
      
      const team1SetsWon = getSetsWon(1) + (newScores.team1 > newScores.team2 ? 1 : 0);
      const team2SetsWon = getSetsWon(2) + (newScores.team2 > newScores.team1 ? 1 : 0);
      
      // Check if match is won
      if (isMatchWon(team1SetsWon, team2SetsWon)) {
        // Match is finished
        await updateMatchInDatabase({
          set_scores: updatedSetScores,
          sets_won_team1: team1SetsWon,
          sets_won_team2: team2SetsWon,
          team1_score: team1SetsWon,
          team2_score: team2SetsWon,
          winner_id: team1SetsWon > team2SetsWon ? match.team1_id : match.team2_id,
          status: 'completed',
          completed_at: new Date().toISOString()
        });
        
        toast({
          title: "Match Completed!",
          description: `${team1SetsWon > team2SetsWon ? team1?.name : team2?.name} wins ${Math.max(team1SetsWon, team2SetsWon)}-${Math.min(team1SetsWon, team2SetsWon)}`,
        });
      } else {
        // Move to next set
        await updateMatchInDatabase({
          set_scores: updatedSetScores,
          sets_won_team1: team1SetsWon,
          sets_won_team2: team2SetsWon,
          current_set: match.current_set + 1
        });
        
        setCurrentSetScores({ team1: 0, team2: 0 });
        toast({
          title: "Set Completed",
          description: `Set ${match.current_set}: ${newScores.team1 > newScores.team2 ? team1?.name : team2?.name} wins ${Math.max(newScores.team1, newScores.team2)}-${Math.min(newScores.team1, newScores.team2)}`,
        });
      }
      
      setAllSetScores(updatedSetScores);
    } else {
      setCurrentSetScores(newScores);
    }
  };

  const updateMatchInDatabase = async (updates: Partial<Match>) => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('matches')
        .update(updates)
        .eq('id', match.id);

      if (error) throw error;
      onMatchUpdate();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error updating match",
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
    setIsUpdating(false);
  };

  const handleManualScoreEntry = async () => {
    const currentSetKey = `set${match.current_set}`;
    const updatedSetScores = {
      ...allSetScores,
      [currentSetKey]: currentSetScores
    };
    
    await updateMatchInDatabase({
      set_scores: updatedSetScores
    });
    
    setAllSetScores(updatedSetScores);
  };

  const team1SetsWon = getSetsWon(1);
  const team2SetsWon = getSetsWon(2);
  const pointsNeeded = getPointsNeededForSet();

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            {match.pool_name && `${match.pool_name} - `}
            Round {match.round_number}, Match {match.match_number}
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              Court {match.court_number}
            </Badge>
            {match.scheduled_time && (
              <Badge variant="outline" className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {new Date(match.scheduled_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Game Format Info */}
        <div className="bg-accent/50 p-3 rounded-lg">
          <div className="text-sm font-medium">Game Format</div>
          <div className="text-xs text-muted-foreground">
            {tournament.sets_per_game === 1 ? '1 set' : `Best of ${tournament.sets_per_game} sets`} to {pointsNeeded} points
            {tournament.sets_per_game > 1 && match.current_set === tournament.sets_per_game && 
              tournament.deciding_set_points !== tournament.points_per_set && 
              " (Deciding set)"
            }
            • Win by {tournament.must_win_by}
          </div>
        </div>

        {/* Current Set Scoring */}
        <div className="grid grid-cols-2 gap-6">
          {/* Team 1 */}
          <div className="text-center space-y-4">
            <div>
              <div className="font-semibold text-lg">{team1?.name || "Team 1"}</div>
              <div className="text-2xl font-bold">{team1SetsWon}</div>
              <div className="text-xs text-muted-foreground">Sets Won</div>
            </div>
            
            <div className="space-y-2">
              <div className="text-4xl font-bold text-primary">{currentSetScores.team1}</div>
              <div className="text-xs text-muted-foreground">Set {match.current_set}</div>
              <div className="flex gap-1 justify-center">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleScoreUpdate('team1', 1)}
                  disabled={isUpdating || match.status === 'completed'}
                >
                  +1
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleScoreUpdate('team1', -1)}
                  disabled={isUpdating || match.status === 'completed' || currentSetScores.team1 === 0}
                >
                  -1
                </Button>
              </div>
            </div>
          </div>

          {/* Team 2 */}
          <div className="text-center space-y-4">
            <div>
              <div className="font-semibold text-lg">{team2?.name || "Team 2"}</div>
              <div className="text-2xl font-bold">{team2SetsWon}</div>
              <div className="text-xs text-muted-foreground">Sets Won</div>
            </div>
            
            <div className="space-y-2">
              <div className="text-4xl font-bold text-primary">{currentSetScores.team2}</div>
              <div className="text-xs text-muted-foreground">Set {match.current_set}</div>
              <div className="flex gap-1 justify-center">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleScoreUpdate('team2', 1)}
                  disabled={isUpdating || match.status === 'completed'}
                >
                  +1
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleScoreUpdate('team2', -1)}
                  disabled={isUpdating || match.status === 'completed' || currentSetScores.team2 === 0}
                >
                  -1
                </Button>
              </div>
            </div>
          </div>
        </div>

        {/* Manual Score Entry */}
        {match.status !== 'completed' && (
          <>
            <Separator />
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="team1-manual">Manual Entry - {team1?.name}</Label>
                <Input
                  id="team1-manual"
                  type="number"
                  min="0"
                  value={currentSetScores.team1}
                  onChange={(e) => setCurrentSetScores(prev => ({ ...prev, team1: parseInt(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label htmlFor="team2-manual">Manual Entry - {team2?.name}</Label>
                <Input
                  id="team2-manual"
                  type="number"
                  min="0"
                  value={currentSetScores.team2}
                  onChange={(e) => setCurrentSetScores(prev => ({ ...prev, team2: parseInt(e.target.value) || 0 }))}
                />
              </div>
            </div>
            <Button 
              onClick={handleManualScoreEntry} 
              disabled={isUpdating}
              variant="outline"
              className="w-full"
            >
              Update Scores
            </Button>
          </>
        )}

        {/* Set History */}
        {Object.keys(allSetScores).length > 0 && (
          <>
            <Separator />
            <div>
              <div className="font-medium mb-2">Set History</div>
              <div className="grid grid-cols-1 gap-1">
                {Object.entries(allSetScores).map(([setKey, scores]) => {
                  const setNumber = setKey.replace('set', '');
                  const team1Won = scores.team1 > scores.team2;
                  return (
                    <div key={setKey} className="flex justify-between items-center text-sm p-2 bg-accent/30 rounded">
                      <span>Set {setNumber}:</span>
                      <span className={`font-medium ${team1Won ? 'text-primary' : 'text-muted-foreground'}`}>
                        {team1?.name || "Team 1"} {scores.team1}
                      </span>
                      <span>-</span>
                      <span className={`font-medium ${!team1Won ? 'text-primary' : 'text-muted-foreground'}`}>
                        {scores.team2} {team2?.name || "Team 2"}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </>
        )}

        {match.status === 'completed' && (
          <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg text-center">
            <div className="font-semibold text-green-700 dark:text-green-400">
              Match Completed
            </div>
            <div className="text-sm text-green-600 dark:text-green-300 mt-1">
              {team1SetsWon > team2SetsWon ? team1?.name : team2?.name} wins {Math.max(team1SetsWon, team2SetsWon)}-{Math.min(team1SetsWon, team2SetsWon)}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}