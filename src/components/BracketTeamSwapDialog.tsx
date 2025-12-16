import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { ArrowLeftRight, AlertTriangle } from "lucide-react";

interface Team {
  id: string;
  name: string;
}

interface Match {
  id: string;
  team1_id?: string | null;
  team2_id?: string | null;
  team1_name?: string;
  team2_name?: string;
  bracket_position?: string;
  round_number: number;
  status: string;
}

interface BracketTeamSwapDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  selectedMatch: Match | null;
  selectedSlot: 'team1' | 'team2' | null;
  allMatches: Match[];
  allTeams: Team[];
  onSwapComplete: () => void;
}

export function BracketTeamSwapDialog({
  open,
  onOpenChange,
  selectedMatch,
  selectedSlot,
  allMatches,
  allTeams,
  onSwapComplete
}: BracketTeamSwapDialogProps) {
  const [targetTeamId, setTargetTeamId] = useState<string>('');
  const [isSwapping, setIsSwapping] = useState(false);
  const { toast } = useToast();

  const currentTeamId = selectedSlot === 'team1' ? selectedMatch?.team1_id : selectedMatch?.team2_id;
  const currentTeamName = selectedSlot === 'team1' ? selectedMatch?.team1_name : selectedMatch?.team2_name;

  // Get available teams for swap (teams in the same bracket that aren't in completed matches)
  const getAvailableTeams = () => {
    if (!selectedMatch) return [];
    
    // Get all team IDs currently in the bracket
    const teamsInBracket = new Set<string>();
    allMatches.forEach(match => {
      if (match.team1_id) teamsInBracket.add(match.team1_id);
      if (match.team2_id) teamsInBracket.add(match.team2_id);
    });

    // Filter to only include teams that are in the bracket and not the current team
    return allTeams.filter(team => 
      teamsInBracket.has(team.id) && team.id !== currentTeamId
    );
  };

  const availableTeams = getAvailableTeams();

  const handleSwap = async () => {
    if (!selectedMatch || !selectedSlot || !targetTeamId) return;

    setIsSwapping(true);

    try {
      // Find the target match and slot
      let targetMatch: Match | undefined;
      let targetSlot: 'team1' | 'team2' | null = null;

      for (const match of allMatches) {
        if (match.team1_id === targetTeamId) {
          targetMatch = match;
          targetSlot = 'team1';
          break;
        }
        if (match.team2_id === targetTeamId) {
          targetMatch = match;
          targetSlot = 'team2';
          break;
        }
      }

      if (!targetMatch || !targetSlot) {
        throw new Error('Target team not found in bracket');
      }

      // Perform the swap
      // Update the selected match
      const selectedUpdate: Record<string, string | null> = {};
      if (selectedSlot === 'team1') {
        selectedUpdate.team1_id = targetTeamId;
      } else {
        selectedUpdate.team2_id = targetTeamId;
      }

      // Update the target match
      const targetUpdate: Record<string, string | null> = {};
      if (targetSlot === 'team1') {
        targetUpdate.team1_id = currentTeamId;
      } else {
        targetUpdate.team2_id = currentTeamId;
      }

      // Execute both updates
      const { error: error1 } = await supabase
        .from('matches')
        .update(selectedUpdate)
        .eq('id', selectedMatch.id);

      if (error1) throw error1;

      const { error: error2 } = await supabase
        .from('matches')
        .update(targetUpdate)
        .eq('id', targetMatch.id);

      if (error2) throw error2;

      toast({
        title: "Teams Swapped",
        description: `Successfully swapped team positions in the bracket.`,
      });

      onSwapComplete();
      onOpenChange(false);
      setTargetTeamId('');
    } catch (error) {
      console.error('Error swapping teams:', error);
      toast({
        title: "Swap Failed",
        description: "Failed to swap teams. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSwapping(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowLeftRight className="h-5 w-5 text-primary" />
            Swap Team Position
          </DialogTitle>
          <DialogDescription>
            Swap this team's position with another team in the bracket.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label>Current Team</Label>
            <div className="p-3 bg-muted rounded-lg font-medium">
              {currentTeamName || 'TBD'}
            </div>
          </div>

          <div className="flex items-center justify-center">
            <ArrowLeftRight className="h-6 w-6 text-muted-foreground" />
          </div>

          <div className="space-y-2">
            <Label>Swap With</Label>
            <Select value={targetTeamId} onValueChange={setTargetTeamId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a team to swap with" />
              </SelectTrigger>
              <SelectContent>
                {availableTeams.map(team => (
                  <SelectItem key={team.id} value={team.id}>
                    {team.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {selectedMatch?.status === 'in_progress' && (
            <div className="flex items-start gap-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <AlertTriangle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
              <p className="text-sm text-yellow-800">
                Warning: This match is in progress. Swapping teams may affect the current game state.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSwap} 
            disabled={!targetTeamId || isSwapping}
          >
            {isSwapping ? 'Swapping...' : 'Swap Teams'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
