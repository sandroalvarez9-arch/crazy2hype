import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { calculateOptimalPoolConfiguration } from "@/utils/poolPlayGenerator";
import { formatSkillLevel } from "@/utils/skillLevels";
import { Users, Timer, MapPin, Trophy } from "lucide-react";

interface TeamWithSkill {
  skill_level?: string;
}

interface OptimalPoolPreviewProps {
  checkedInTeams: TeamWithSkill[];
  skillLevels: string[];
  estimatedGameDuration: number;
}

export function OptimalPoolPreview({ checkedInTeams, skillLevels, estimatedGameDuration }: OptimalPoolPreviewProps) {
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
    const skillBreakdown: Record<string, { teams: number; pools: number; matches: number; teamsPerPool: number[] }> = {};

    Object.entries(teamsBySkill).forEach(([skill, teams]) => {
      const config = calculateOptimalPoolConfiguration(teams.length);
      skillBreakdown[skill] = {
        teams: teams.length,
        pools: config.numPools,
        matches: config.totalMatches,
        teamsPerPool: config.teamsPerPool
      };
      
      totalCourts += config.numPools;
      totalMatches += config.totalMatches;
    });

    return { skillBreakdown, totalCourts, totalMatches };
  }, [checkedInTeams, skillLevels]);

  const estimatedDuration = useMemo(() => {
    if (breakdown.totalCourts === 0) return 0;
    // Estimate pool play duration: matches divided by courts, times game duration plus breaks
    const matchesPerCourt = Math.ceil(breakdown.totalMatches / breakdown.totalCourts);
    return matchesPerCourt * (estimatedGameDuration + 12); // 7min warmup + 5min transition
  }, [breakdown.totalCourts, breakdown.totalMatches, estimatedGameDuration]);

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
            <div key={skill} className="p-3 bg-muted rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <Badge variant="secondary" className="font-medium">
                  {formatSkillLevel(skill as any)}
                </Badge>
                <span className="text-sm text-muted-foreground">
                  {data.teams} teams → {data.pools} pools
                </span>
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
  );
}