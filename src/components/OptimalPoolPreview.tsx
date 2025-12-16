import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { calculateOptimalPoolConfiguration } from "@/utils/poolPlayGenerator";
import { formatSkillLevel, type SkillLevel } from "@/utils/skillLevels";
import { Users, Timer, MapPin, Trophy, Settings, AlertTriangle } from "lucide-react";
import { PoolConfigurationDialog } from "./PoolConfigurationDialog";

interface TeamWithSkill {
  id: string;
  name: string;
  skill_level?: string;
}

interface OptimalPoolPreviewProps {
  checkedInTeams: TeamWithSkill[];
  skillLevels: string[];
  estimatedGameDuration: number;
  customConfigs?: Record<string, number[]>;
  onConfigChange?: (skillLevel: string, teamsPerPool: number[]) => void;
}

export function OptimalPoolPreview({ 
  checkedInTeams, 
  skillLevels, 
  estimatedGameDuration,
  customConfigs,
  onConfigChange
}: OptimalPoolPreviewProps) {
  const [editingSkillLevel, setEditingSkillLevel] = useState<string | null>(null);

  const breakdown = useMemo(() => {
    // Group teams by skill level
    const teamsBySkill = checkedInTeams.reduce((acc, team) => {
      const level = team.skill_level || skillLevels[0] || 'open';
      if (!acc[level]) acc[level] = [];
      acc[level].push(team);
      return acc;
    }, {} as Record<string, TeamWithSkill[]>);

    let totalCourts = 0;
    let totalMatches = 0;
    const skillBreakdown: Record<string, { teams: TeamWithSkill[]; pools: number; matches: number; teamsPerPool: number[]; hasWarning: boolean }> = {};

    Object.entries(teamsBySkill).forEach(([skill, teams]) => {
      // Use custom config if available, otherwise calculate optimal
      const teamsPerPool = customConfigs?.[skill] || calculateOptimalPoolConfiguration(teams.length).teamsPerPool;
      const matches = teamsPerPool.reduce((sum, count) => sum + Math.floor((count * (count - 1)) / 2), 0);
      const hasWarning = teamsPerPool.some(count => count < 3 || count > 6);
      
      skillBreakdown[skill] = {
        teams,
        pools: teamsPerPool.length,
        matches,
        teamsPerPool,
        hasWarning
      };
      
      totalCourts += teamsPerPool.length;
      totalMatches += matches;
    });

    return { skillBreakdown, totalCourts, totalMatches, teamsBySkill };
  }, [checkedInTeams, skillLevels, customConfigs]);

  const estimatedDuration = useMemo(() => {
    if (breakdown.totalCourts === 0) return 0;
    // Estimate pool play duration: matches divided by courts, times game duration plus breaks
    const matchesPerCourt = Math.ceil(breakdown.totalMatches / breakdown.totalCourts);
    return matchesPerCourt * (estimatedGameDuration + 12); // 7min warmup + 5min transition
  }, [breakdown.totalCourts, breakdown.totalMatches, estimatedGameDuration]);

  const editingTeams = editingSkillLevel ? breakdown.teamsBySkill[editingSkillLevel] || [] : [];

  if (checkedInTeams.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Pool Play Preview
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-center py-4">
            No teams checked in yet. Preview will appear once teams check in.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Optimal Pool Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">{checkedInTeams.length} Teams</div>
                <div className="text-sm text-muted-foreground">Checked in</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">{breakdown.totalCourts} Courts Required</div>
                <div className="text-sm text-muted-foreground">Calculated optimally</div>
              </div>
            </div>
            
            <div className="flex items-center gap-2">
              <Timer className="h-4 w-4 text-muted-foreground" />
              <div>
                <div className="font-medium">~{Math.round(estimatedDuration / 60)}h {estimatedDuration % 60}m</div>
                <div className="text-sm text-muted-foreground">Pool play duration</div>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-medium">Configuration by Skill Level:</h4>
            {Object.entries(breakdown.skillBreakdown).map(([skill, data]) => (
              <div key={skill} className={`p-3 rounded-lg ${data.hasWarning ? 'bg-orange-50 dark:bg-orange-950 border border-orange-200 dark:border-orange-800' : 'bg-muted'}`}>
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-medium">
                      {formatSkillLevel(skill as SkillLevel)}
                    </Badge>
                    {data.hasWarning && (
                      <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">
                      {data.teams.length} teams → {data.pools} pools
                    </span>
                    {onConfigChange && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => setEditingSkillLevel(skill)}
                      >
                        <Settings className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    )}
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div>
                    <span className="font-medium">Pool sizes:</span> {data.teamsPerPool.join(', ')} teams
                  </div>
                  <div>
                    <span className="font-medium">Total matches:</span> {data.matches}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
            <h4 className="font-medium text-green-800 dark:text-green-200 mb-1">Optimization Benefits</h4>
            <p className="text-sm text-green-700 dark:text-green-300">
              Prioritizing 4-team pools (6 games) over 5-team pools (10 games) reduces tournament duration by ~40%.
            </p>
          </div>
        </CardContent>
      </Card>

      {editingSkillLevel && (
        <PoolConfigurationDialog
          open={!!editingSkillLevel}
          onOpenChange={(open) => !open && setEditingSkillLevel(null)}
          skillLevel={editingSkillLevel}
          teams={editingTeams}
          currentConfig={customConfigs?.[editingSkillLevel]}
          onApply={(teamsPerPool) => {
            onConfigChange?.(editingSkillLevel, teamsPerPool);
            setEditingSkillLevel(null);
          }}
        />
      )}
    </>
  );
}