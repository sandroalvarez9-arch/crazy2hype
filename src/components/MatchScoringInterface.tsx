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
import { advanceWinnerToNextRound } from "@/utils/bracketAdvancement";

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
  tournament_phase?: string;
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
  console.log('MatchScoringInterface rendered with:', { match, tournament, team1, team2 });
  
  const [currentSetScores, setCurrentSetScores] = useState({ team1: 0, team2: 0 });
  const [allSetScores, setAllSetScores] = useState<Record<string, { team1: number; team2: number }>>(
    match.set_scores || {}
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastSwitchPoint, setLastSwitchPoint] = useState(0);
  const [matchState, setMatchState] = useState({
    status: match.status,
    current_set: match.current_set,
    sets_won_team1: match.sets_won_team1,
    sets_won_team2: match.sets_won_team2
  });
  const { toast } = useToast();

  // Real-time updates for match status
  useEffect(() => {
    const channel = supabase
      .channel('match-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
          filter: `id=eq.${match.id}`
        },
        (payload) => {
          console.log('Real-time match update:', payload);
          const newMatch = payload.new as any;
          setMatchState({
            status: newMatch.status,
            current_set: newMatch.current_set,
            sets_won_team1: newMatch.sets_won_team1,
            sets_won_team2: newMatch.sets_won_team2
          });
          if (newMatch.set_scores) {
            setAllSetScores(newMatch.set_scores);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [match.id]);

  useEffect(() => {
    // Initialize current set scores from existing data
    const currentSetKey = `set${matchState.current_set}`;
    if (allSetScores[currentSetKey]) {
      setCurrentSetScores(allSetScores[currentSetKey]);
    } else {
      setCurrentSetScores({ team1: 0, team2: 0 });
    }
  }, [matchState.current_set, allSetScores]);

  // Reset side-switch tracker when set changes
  useEffect(() => {
    setLastSwitchPoint(0);
  }, [matchState.current_set]);

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

  const getActiveFormat = () => {
    if (tournament.uses_phase_formats) {
      const isPoolPlay = match.tournament_phase === 'pool_play';
      return isPoolPlay ? tournament.pool_play_format : tournament.playoff_format;
    }
    return {
      sets: tournament.sets_per_game,
      points: tournament.points_per_set,
      decidingPoints: tournament.deciding_set_points
    };
  };

  const getPointsNeededForSet = () => {
    const format = getActiveFormat();
    const setsWon1 = getSetsWon(1);
    const setsWon2 = getSetsWon(2);
    const totalSetsWon = setsWon1 + setsWon2;
    
    // Check if this is the deciding set
    const isDecidingSet = format?.sets > 1 && 
      totalSetsWon === format.sets - 1;
    
    return isDecidingSet ? (format?.decidingPoints || tournament.deciding_set_points) : (format?.points || tournament.points_per_set);
  };

  // Side switch interval: 7 points for regular sets, 5 points for deciding/short sets (<=15)
  const getSideSwitchInterval = () => {
    const target = getPointsNeededForSet();
    return target <= 15 ? 5 : 7;
  };

  const isSetWon = (team1Score: number, team2Score: number) => {
    const pointsNeeded = getPointsNeededForSet();
    const winBy = tournament.must_win_by;
    
    console.log('Checking if set is won:', { team1Score, team2Score, pointsNeeded, winBy });
    
    const team1Wins = team1Score >= pointsNeeded && team1Score - team2Score >= winBy;
    const team2Wins = team2Score >= pointsNeeded && team2Score - team1Score >= winBy;
    
    console.log('Set win check result:', { team1Wins, team2Wins, isWon: team1Wins || team2Wins });
    
    return team1Wins || team2Wins;
  };

  const isMatchWon = (team1Sets: number, team2Sets: number) => {
    const format = getActiveFormat();
    const setsNeeded = Math.ceil((format?.sets || tournament.sets_per_game) / 2);
    
    console.log('Checking if match is won:', { team1Sets, team2Sets, setsNeeded });
    
    const matchWon = team1Sets >= setsNeeded || team2Sets >= setsNeeded;
    console.log('Match win check result:', matchWon);
    
    return matchWon;
  };

  const handleScoreUpdate = async (team: 'team1' | 'team2', increment: number) => {
    console.log('Score update:', { team, increment, currentScores: currentSetScores });
    
    const newScores = { ...currentSetScores };
    newScores[team] = Math.max(0, newScores[team] + increment);
    
    console.log('New scores after update:', newScores);

    const interval = getSideSwitchInterval();
    const total = newScores.team1 + newScores.team2;
    const nextMultiple = Math.floor(total / interval) * interval;
    const isWon = isSetWon(newScores.team1, newScores.team2);

    // Update local scores first for immediate UI feedback
    setCurrentSetScores(newScores);

    // Notify refs to switch sides at configured intervals (7 or 5 on short/deciding sets)
    if (!isWon && nextMultiple > 0 && nextMultiple > lastSwitchPoint && total >= nextMultiple) {
      setLastSwitchPoint(nextMultiple);
      toast({
        title: 'Switch Sides',
        description: `Total points: ${nextMultiple}. Switch every ${interval} points.`,
      });
    }
    
    // Check if set is won
    if (isWon) {
      console.log('Set is won! Processing set completion...');
      
      // Set is finished, update set scores
      const currentSetKey = `set${matchState.current_set}`;
      const updatedSetScores = {
        ...allSetScores,
        [currentSetKey]: newScores
      };
      
      const team1SetsWon = getSetsWon(1) + (newScores.team1 > newScores.team2 ? 1 : 0);
      const team2SetsWon = getSetsWon(2) + (newScores.team2 > newScores.team1 ? 1 : 0);
      
      console.log('Set completion - sets won:', { team1SetsWon, team2SetsWon });
      
      // Update local state immediately
      setAllSetScores(updatedSetScores);
      
      // Check if match is won
      if (isMatchWon(team1SetsWon, team2SetsWon)) {
        console.log('Match is won! Processing match completion...');
        
        // Match is finished
        const success = await updateMatchInDatabase({
          set_scores: updatedSetScores,
          sets_won_team1: team1SetsWon,
          sets_won_team2: team2SetsWon,
          team1_score: team1SetsWon,
          team2_score: team2SetsWon,
          winner_id: team1SetsWon > team2SetsWon ? match.team1_id : match.team2_id,
          status: 'completed',
          completed_at: new Date().toISOString()
        });
        
        if (success) {
          console.log('Match completed successfully!');
          toast({
            title: "🏆 Match Completed!",
            description: `${team1SetsWon > team2SetsWon ? team1?.name : team2?.name} wins ${Math.max(team1SetsWon, team2SetsWon)}-${Math.min(team1SetsWon, team2SetsWon)}`,
            duration: 5000,
          });
          
          // Update match state
          setMatchState(prev => ({
            ...prev,
            status: 'completed',
            sets_won_team1: team1SetsWon,
            sets_won_team2: team2SetsWon
          }));

          // Advance winner to next round if this is a playoff match
          if (match.tournament_phase === 'playoffs') {
            console.log('Advancing winner to next round...');
            await advanceWinnerToNextRound(match.id);
          }
        }
      } else {
        console.log('Set completed, moving to next set...');
        
        // Move to next set
        const nextSet = matchState.current_set + 1;
        const success = await updateMatchInDatabase({
          set_scores: updatedSetScores,
          sets_won_team1: team1SetsWon,
          sets_won_team2: team2SetsWon,
          current_set: nextSet,
          status: 'in_progress'
        });
        
        if (success) {
          console.log('Set completed, starting next set:', nextSet);
          
          // Update local state for next set
          setCurrentSetScores({ team1: 0, team2: 0 });
          setLastSwitchPoint(0);
          setMatchState(prev => ({
            ...prev,
            current_set: nextSet,
            sets_won_team1: team1SetsWon,
            sets_won_team2: team2SetsWon
          }));
          
          toast({
            title: "✅ Set Completed!",
            description: `Set ${matchState.current_set}: ${newScores.team1 > newScores.team2 ? team1?.name : team2?.name} wins ${Math.max(newScores.team1, newScores.team2)}-${Math.min(newScores.team1, newScores.team2)}. Starting Set ${nextSet}`,
            duration: 4000,
          });
        }
      }
    }
  };

  const updateMatchInDatabase = async (updates: Partial<Match>): Promise<boolean> => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('matches')
        .update(updates)
        .eq('id', match.id);

      if (error) throw error;
      
      // Call the callback to refresh parent state
      onMatchUpdate();
      return true;
    } catch (error) {
      console.error('Error updating match:', error);
      toast({
        variant: "destructive",
        title: "Error updating match",
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
      return false;
    } finally {
      setIsUpdating(false);
    }
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

    // Evaluate side switch on manual updates as well
    const interval = getSideSwitchInterval();
    const total = currentSetScores.team1 + currentSetScores.team2;
    const nextMultiple = Math.floor(total / interval) * interval;
    if (nextMultiple > 0 && nextMultiple > lastSwitchPoint && total >= nextMultiple) {
      setLastSwitchPoint(nextMultiple);
      toast({
        title: 'Switch Sides',
        description: `Total points: ${nextMultiple}. Switch every ${interval} points.`,
      });
    }
  };

  const handleStartMatch = async (matchId: string) => {
    console.log('Starting match with ID:', matchId);
    console.log('Match data:', match);
    
    try {
      // Update match status to in_progress
      const { error } = await supabase
        .from('matches')
        .update({ 
          status: 'in_progress',
          current_set: match.current_set || 1 
        })
        .eq('id', matchId);

      if (error) {
        console.error('Error starting match:', error);
        throw error;
      }

      console.log('Match started successfully');
      onMatchUpdate();
      
      toast({
        title: "Match Started",
        description: `${team1?.name} vs ${team2?.name} - Match is now in progress`,
      });
    } catch (error) {
      console.error('Failed to start match:', error);
      toast({
        variant: "destructive",
        title: "Error starting match",
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
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
          <div className="text-sm font-medium flex items-center gap-2">
            Game Format
            {tournament.uses_phase_formats && (
              <Badge variant="outline" className="text-xs">
                {match.tournament_phase === 'pool_play' ? 'Pool Play' : 'Playoffs'}
              </Badge>
            )}
          </div>
          <div className="text-xs text-muted-foreground">
            {(() => {
              const format = getActiveFormat();
              const sets = format?.sets || tournament.sets_per_game;
              return (
                <>
                  {sets === 1 ? '1 set' : `Best of ${sets} sets`} to {pointsNeeded} points
                  {sets > 1 && match.current_set === sets && 
                    (format?.decidingPoints || tournament.deciding_set_points) !== (format?.points || tournament.points_per_set) && 
                    " (Deciding set)"
                  }
                  • Win by {tournament.must_win_by}
                </>
              );
            })()}
          </div>
        </div>

        {/* Start Match Button for scheduled matches */}
        {matchState.status === 'scheduled' && (
          <div className="text-center p-4 border rounded-lg bg-muted/50">
            <p className="text-muted-foreground mb-4">Match is scheduled. Click to start scoring.</p>
            <Button 
              onClick={() => handleStartMatch(match.id)}
              disabled={isUpdating}
              className="w-full"
            >
              {isUpdating ? 'Starting Match...' : 'Start Match'}
            </Button>
          </div>
        )}

        {/* Current Set Scoring - only show if match is in progress */}
        {matchState.status === 'in_progress' && (
          <div className="grid grid-cols-2 gap-6">
          {/* Team 1 */}
          <div className="text-center space-y-4">
            <div>
              <div className="font-semibold text-lg">{team1?.name || "Team 1"}</div>
              <div className="text-2xl font-bold">{matchState.sets_won_team1}</div>
              <div className="text-xs text-muted-foreground">Sets Won</div>
            </div>
            
            <div className="space-y-2">
              <div className="text-4xl font-bold text-primary">{currentSetScores.team1}</div>
              <div className="text-xs text-muted-foreground">Set {matchState.current_set}</div>
              <div className="flex gap-1 justify-center">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleScoreUpdate('team1', 1)}
                  disabled={isUpdating}
                >
                  +1
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleScoreUpdate('team1', -1)}
                  disabled={isUpdating || currentSetScores.team1 === 0}
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
              <div className="text-2xl font-bold">{matchState.sets_won_team2}</div>
              <div className="text-xs text-muted-foreground">Sets Won</div>
            </div>
            
            <div className="space-y-2">
              <div className="text-4xl font-bold text-primary">{currentSetScores.team2}</div>
              <div className="text-xs text-muted-foreground">Set {matchState.current_set}</div>
              <div className="flex gap-1 justify-center">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleScoreUpdate('team2', 1)}
                  disabled={isUpdating}
                >
                  +1
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleScoreUpdate('team2', -1)}
                  disabled={isUpdating || currentSetScores.team2 === 0}
                >
                  -1
                </Button>
              </div>
            </div>
          </div>
          </div>
        )}

        {/* Manual Score Entry - only show for in progress matches */}
        {matchState.status === 'in_progress' && (
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

        {matchState.status === 'completed' && (
          <div className="bg-green-50 dark:bg-green-950/20 p-4 rounded-lg text-center">
            <div className="font-semibold text-green-700 dark:text-green-400 text-lg">
              🏆 Match Completed!
            </div>
            <div className="text-sm text-green-600 dark:text-green-300 mt-1">
              {matchState.sets_won_team1 > matchState.sets_won_team2 ? team1?.name : team2?.name} wins {Math.max(matchState.sets_won_team1, matchState.sets_won_team2)}-{Math.min(matchState.sets_won_team1, matchState.sets_won_team2)}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}