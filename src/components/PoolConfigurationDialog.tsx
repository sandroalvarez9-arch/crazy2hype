import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { AlertTriangle, Plus, Minus, RotateCcw, Users, Trophy } from "lucide-react";
import { calculateOptimalPoolConfiguration } from "@/utils/poolPlayGenerator";
import { formatSkillLevel, type SkillLevel } from "@/utils/skillLevels";

interface Team {
  id: string;
  name: string;
  skill_level?: string;
}

interface PoolConfigurationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  skillLevel: string;
  teams: Team[];
  onApply: (teamsPerPool: number[]) => void;
  currentConfig?: number[];
}

export function PoolConfigurationDialog({
  open,
  onOpenChange,
  skillLevel,
  teams,
  onApply,
  currentConfig
}: PoolConfigurationDialogProps) {
  const teamCount = teams.length;
  const recommendedConfig = calculateOptimalPoolConfiguration(teamCount);
  
  const [teamsPerPool, setTeamsPerPool] = useState<number[]>(
    currentConfig || recommendedConfig.teamsPerPool
  );

  // Reset to current or recommended config when dialog opens
  useEffect(() => {
    if (open) {
      setTeamsPerPool(currentConfig || recommendedConfig.teamsPerPool);
    }
  }, [open, currentConfig, recommendedConfig.teamsPerPool]);

  const totalAssigned = teamsPerPool.reduce((sum, count) => sum + count, 0);
  const isValid = totalAssigned === teamCount;
  const hasSmallPools = teamsPerPool.some(count => count < 3);
  const hasLargePools = teamsPerPool.some(count => count > 6);

  const totalMatches = teamsPerPool.reduce((sum, count) => 
    sum + Math.floor((count * (count - 1)) / 2), 0);

  const addPool = () => {
    if (teamsPerPool.length >= teamCount) return;
    // Take one team from the largest pool
    const maxIndex = teamsPerPool.indexOf(Math.max(...teamsPerPool));
    const newConfig = [...teamsPerPool];
    newConfig[maxIndex] -= 1;
    newConfig.push(1);
    setTeamsPerPool(newConfig);
  };

  const removePool = (index: number) => {
    if (teamsPerPool.length <= 1) return;
    const removedTeams = teamsPerPool[index];
    const newConfig = teamsPerPool.filter((_, i) => i !== index);
    // Distribute removed teams to other pools
    for (let i = 0; i < removedTeams; i++) {
      const minIndex = newConfig.indexOf(Math.min(...newConfig));
      newConfig[minIndex] += 1;
    }
    setTeamsPerPool(newConfig);
  };

  const adjustPool = (index: number, delta: number) => {
    const newConfig = [...teamsPerPool];
    const newValue = newConfig[index] + delta;
    
    if (newValue < 1) return;
    
    // Find another pool to balance
    if (delta > 0) {
      // Taking from another pool
      const otherPools = teamsPerPool.map((count, i) => ({ count, i }))
        .filter(p => p.i !== index && p.count > 1)
        .sort((a, b) => b.count - a.count);
      
      if (otherPools.length === 0) return;
      newConfig[otherPools[0].i] -= 1;
    } else {
      // Giving to another pool
      const otherPools = teamsPerPool.map((count, i) => ({ count, i }))
        .filter(p => p.i !== index)
        .sort((a, b) => a.count - b.count);
      
      if (otherPools.length === 0) return;
      newConfig[otherPools[0].i] += 1;
    }
    
    newConfig[index] = newValue;
    setTeamsPerPool(newConfig);
  };

  const resetToRecommended = () => {
    setTeamsPerPool([...recommendedConfig.teamsPerPool]);
  };

  const handleApply = () => {
    onApply(teamsPerPool);
    onOpenChange(false);
  };

  const getPoolMatchCount = (teamCount: number) => Math.floor((teamCount * (teamCount - 1)) / 2);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Configure Pools - {formatSkillLevel(skillLevel as SkillLevel)}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Team count info */}
          <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{teamCount} Teams</span>
            </div>
            <Badge variant="outline">
              Recommended: {recommendedConfig.teamsPerPool.join(', ')} teams
            </Badge>
          </div>

          {/* Warnings */}
          {hasSmallPools && (
            <div className="p-3 bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800 rounded-lg flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400 mt-0.5 shrink-0" />
              <p className="text-sm text-orange-700 dark:text-orange-300">
                Pools with fewer than 3 teams have very few matches. Consider redistributing.
              </p>
            </div>
          )}

          {hasLargePools && (
            <div className="p-3 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded-lg flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-yellow-600 dark:text-yellow-400 mt-0.5 shrink-0" />
              <p className="text-sm text-yellow-700 dark:text-yellow-300">
                Pools with more than 6 teams will significantly increase pool play duration.
              </p>
            </div>
          )}

          {!isValid && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg flex items-start gap-2">
              <AlertTriangle className="h-4 w-4 text-destructive mt-0.5 shrink-0" />
              <p className="text-sm text-destructive">
                Total teams assigned ({totalAssigned}) doesn't match team count ({teamCount}).
              </p>
            </div>
          )}

          {/* Pool configuration */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Pool Configuration</h4>
              <Button variant="outline" size="sm" onClick={resetToRecommended}>
                <RotateCcw className="h-4 w-4 mr-1" />
                Reset
              </Button>
            </div>

            <div className="space-y-2">
              {teamsPerPool.map((count, index) => (
                <Card key={index} className={count < 3 ? 'border-orange-300 dark:border-orange-700' : ''}>
                  <CardContent className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Badge variant="secondary" className="font-mono">
                          Pool {String.fromCharCode(65 + index)}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {getPoolMatchCount(count)} matches
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => adjustPool(index, -1)}
                          disabled={count <= 1}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                        
                        <span className="w-8 text-center font-medium">{count}</span>
                        
                        <Button
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => adjustPool(index, 1)}
                        >
                          <Plus className="h-4 w-4" />
                        </Button>

                        {teamsPerPool.length > 1 && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => removePool(index)}
                          >
                            Remove
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Button
              variant="outline"
              className="w-full"
              onClick={addPool}
              disabled={teamsPerPool.length >= teamCount}
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Pool
            </Button>
          </div>

          {/* Summary */}
          <div className="p-3 bg-muted rounded-lg">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold">{teamsPerPool.length}</div>
                <div className="text-xs text-muted-foreground">Pools</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{totalMatches}</div>
                <div className="text-xs text-muted-foreground">Total Matches</div>
              </div>
              <div>
                <div className="text-2xl font-bold">{teamsPerPool.length}</div>
                <div className="text-xs text-muted-foreground">Courts Needed</div>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleApply} disabled={!isValid}>
            Apply Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}