import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Clock, Lock, Unlock, Settings } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Tournament {
  id: string;
  sets_per_game: number;
  points_per_set: number;
  must_win_by: number;
  deciding_set_points: number;
  game_format_locked: boolean;
  brackets_generated: boolean;
  estimated_game_duration: number;
  number_of_courts?: number;
}

interface Match {
  id: string;
  status: string;
}

interface GameFormatManagerProps {
  tournament: Tournament;
  matches: Match[];
  onTournamentUpdate: () => void;
}

const GAME_FORMAT_PRESETS = [
  {
    name: "Quick Format",
    description: "Best of 1 set to 21 points - Fast tournaments",
    sets: 1,
    points: 21,
    decidingPoints: 21,
    estimatedMinutes: 15
  },
  {
    name: "Standard",
    description: "Best of 3 sets to 25 points - Most common",
    sets: 3,
    points: 25,
    decidingPoints: 15,
    estimatedMinutes: 45
  },
  {
    name: "Championship",
    description: "Best of 5 sets to 25 points - Full competition",
    sets: 5,
    points: 25,
    decidingPoints: 15,
    estimatedMinutes: 75
  }
];

export function GameFormatManager({ tournament, matches, onTournamentUpdate }: GameFormatManagerProps) {
  const [format, setFormat] = useState({
    sets_per_game: tournament.sets_per_game,
    points_per_set: tournament.points_per_set,
    must_win_by: tournament.must_win_by,
    deciding_set_points: tournament.deciding_set_points
  });
  
  const [isUpdating, setIsUpdating] = useState(false);
  const [emergencyChangeReason, setEmergencyChangeReason] = useState("");
  const { toast } = useToast();

  const hasStartedMatches = matches.some(match => 
    match.status === 'in_progress' || match.status === 'completed'
  );

  const canModifyFormat = !tournament.game_format_locked || !hasStartedMatches;

  const calculateEstimatedDuration = (sets: number, points: number) => {
    // Rough estimation: 1 minute per 2 points, plus set breaks
    const pointsPerSet = points * 1.2; // Account for deuce scenarios
    const avgSetsPlayed = sets === 1 ? 1 : sets === 3 ? 2.2 : 3.5;
    return Math.round(avgSetsPlayed * (pointsPerSet / 2) + (avgSetsPlayed - 1) * 3); // 3 min break between sets
  };

  const handlePresetSelect = (preset: typeof GAME_FORMAT_PRESETS[0]) => {
    setFormat({
      sets_per_game: preset.sets,
      points_per_set: preset.points,
      must_win_by: tournament.must_win_by,
      deciding_set_points: preset.decidingPoints
    });
  };

  const handleFormatUpdate = async (isEmergencyChange = false) => {
    setIsUpdating(true);
    try {
      const oldFormat = {
        sets_per_game: tournament.sets_per_game,
        points_per_set: tournament.points_per_set,
        must_win_by: tournament.must_win_by,
        deciding_set_points: tournament.deciding_set_points
      };

      // Update tournament format
      const { error } = await supabase
        .from('tournaments')
        .update(format)
        .eq('id', tournament.id);

      if (error) throw error;

      // Log the change if it's during tournament
      if (isEmergencyChange) {
        const { error: logError } = await supabase.rpc('log_format_change', {
          tournament_id: tournament.id,
          old_format: oldFormat,
          new_format: format,
          change_reason: emergencyChangeReason
        });

        if (logError) console.error('Error logging format change:', logError);
      }

      toast({
        title: isEmergencyChange ? "Emergency Format Change Applied" : "Game Format Updated",
        description: `Format updated to ${format.sets_per_game === 1 ? '1 set' : `best of ${format.sets_per_game} sets`} to ${format.points_per_set} points`,
      });

      setEmergencyChangeReason("");
      onTournamentUpdate();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error updating format",
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
    setIsUpdating(false);
  };

  const handleLockFormat = async () => {
    setIsUpdating(true);
    try {
      const { error } = await supabase
        .from('tournaments')
        .update({ game_format_locked: !tournament.game_format_locked })
        .eq('id', tournament.id);

      if (error) throw error;

      toast({
        title: tournament.game_format_locked ? "Format Unlocked" : "Format Locked",
        description: tournament.game_format_locked 
          ? "Format can now be modified" 
          : "Format is locked and cannot be changed",
      });

      onTournamentUpdate();
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error updating lock status",
        description: error instanceof Error ? error.message : "Unknown error occurred",
      });
    }
    setIsUpdating(false);
  };

  const estimatedDuration = calculateEstimatedDuration(format.sets_per_game, format.points_per_set);
  const currentEstimatedDuration = calculateEstimatedDuration(tournament.sets_per_game, tournament.points_per_set);
  const timeDifference = estimatedDuration - currentEstimatedDuration;

  return (
    <div className="space-y-6">
      {/* Current Format Status */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Current Game Format
            </CardTitle>
            <CardDescription>
              {tournament.sets_per_game === 1 ? '1 set' : `Best of ${tournament.sets_per_game} sets`} to {tournament.points_per_set} points
              {tournament.sets_per_game > 1 && ` (${tournament.deciding_set_points} for deciding set)`}
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={tournament.game_format_locked ? "destructive" : "secondary"}>
              {tournament.game_format_locked ? (
                <>
                  <Lock className="h-3 w-3 mr-1" />
                  Locked
                </>
              ) : (
                <>
                  <Unlock className="h-3 w-3 mr-1" />
                  Unlocked
                </>
              )}
            </Badge>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLockFormat}
              disabled={isUpdating}
            >
              {tournament.game_format_locked ? "Unlock" : "Lock"} Format
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              ~{currentEstimatedDuration} min per match
            </div>
            <div>
              Win by: {tournament.must_win_by} points
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Format Configuration */}
      {canModifyFormat && (
        <Card>
          <CardHeader>
            <CardTitle>Configure Game Format</CardTitle>
            <CardDescription>
              Set the scoring format for all matches in this tournament
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Presets */}
            <div>
              <Label className="text-base font-medium">Quick Presets</Label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                {GAME_FORMAT_PRESETS.map((preset) => (
                  <Card
                    key={preset.name}
                    className="cursor-pointer transition-colors hover:bg-accent"
                    onClick={() => handlePresetSelect(preset)}
                  >
                    <CardContent className="p-4">
                      <div className="font-medium">{preset.name}</div>
                      <div className="text-sm text-muted-foreground mt-1">
                        {preset.description}
                      </div>
                      <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                        <Clock className="h-3 w-3" />
                        ~{preset.estimatedMinutes} min
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>

            {/* Custom Settings */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="sets">Sets per Game</Label>
                <Select value={format.sets_per_game.toString()} onValueChange={(value) => setFormat(prev => ({...prev, sets_per_game: parseInt(value)}))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Set</SelectItem>
                    <SelectItem value="3">Best of 3</SelectItem>
                    <SelectItem value="5">Best of 5</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="points">Points per Set</Label>
                <Input
                  type="number"
                  min="15"
                  max="50"
                  value={format.points_per_set}
                  onChange={(e) => setFormat(prev => ({...prev, points_per_set: parseInt(e.target.value) || 25}))}
                />
              </div>

              <div>
                <Label htmlFor="winBy">Must Win By</Label>
                <Select value={format.must_win_by.toString()} onValueChange={(value) => setFormat(prev => ({...prev, must_win_by: parseInt(value)}))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Point</SelectItem>
                    <SelectItem value="2">2 Points</SelectItem>
                    <SelectItem value="3">3 Points</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {format.sets_per_game > 1 && (
                <div>
                  <Label htmlFor="decidingPoints">Deciding Set Points</Label>
                  <Input
                    type="number"
                    min="15"
                    max="30"
                    value={format.deciding_set_points}
                    onChange={(e) => setFormat(prev => ({...prev, deciding_set_points: parseInt(e.target.value) || 15}))}
                  />
                </div>
              )}
            </div>

            {/* Impact Preview */}
            <div className="bg-accent/50 p-4 rounded-lg">
              <div className="font-medium flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Format Impact
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Estimated match duration: ~{estimatedDuration} minutes
                {timeDifference !== 0 && (
                  <span className={timeDifference > 0 ? "text-destructive" : "text-green-600"}>
                    {" "}({timeDifference > 0 ? "+" : ""}{timeDifference} min vs current)
                  </span>
                )}
              </div>
            </div>

            <Button 
              onClick={() => handleFormatUpdate(false)} 
              disabled={isUpdating}
              className="w-full"
            >
              {isUpdating ? "Updating..." : "Update Game Format"}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Emergency Format Change */}
      {!canModifyFormat && hasStartedMatches && (
        <Card className="border-destructive/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Emergency Format Change
            </CardTitle>
            <CardDescription>
              Tournament has started. Format changes will only apply to remaining matches.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Changing format mid-tournament may affect fairness. Only use for time management emergencies.
              </AlertDescription>
            </Alert>

            <Dialog>
              <DialogTrigger asChild>
                <Button variant="destructive" className="w-full mt-4">
                  Make Emergency Format Change
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Emergency Format Change</DialogTitle>
                  <DialogDescription>
                    This will change the format for all remaining unplayed matches. Please provide a reason for this change.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="reason">Reason for Change</Label>
                    <Textarea
                      id="reason"
                      placeholder="e.g., Running behind schedule, facility closing early..."
                      value={emergencyChangeReason}
                      onChange={(e) => setEmergencyChangeReason(e.target.value)}
                    />
                  </div>
                  
                  {/* Format options - simplified for emergency */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Sets per Game</Label>
                      <Select value={format.sets_per_game.toString()} onValueChange={(value) => setFormat(prev => ({...prev, sets_per_game: parseInt(value)}))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">1 Set (Fastest)</SelectItem>
                          <SelectItem value="3">Best of 3</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label>Points per Set</Label>
                      <Select value={format.points_per_set.toString()} onValueChange={(value) => setFormat(prev => ({...prev, points_per_set: parseInt(value)}))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="15">15 Points (Quick)</SelectItem>
                          <SelectItem value="21">21 Points (Fast)</SelectItem>
                          <SelectItem value="25">25 Points (Standard)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="bg-accent/50 p-3 rounded">
                    <div className="text-sm">
                      <strong>Time Saved:</strong> ~{Math.abs(timeDifference)} minutes per remaining match
                    </div>
                  </div>

                  <Button
                    onClick={() => handleFormatUpdate(true)}
                    disabled={!emergencyChangeReason.trim() || isUpdating}
                    className="w-full"
                    variant="destructive"
                  >
                    {isUpdating ? "Applying Change..." : "Apply Emergency Change"}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardContent>
        </Card>
      )}
    </div>
  );
}