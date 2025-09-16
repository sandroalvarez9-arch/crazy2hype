import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trophy, Users, Target, ArrowRight } from "lucide-react";
import { getAdvancementRecommendation } from "@/utils/poolCompletionDetector";

interface PoolStats {
  poolName: string;
  standings: Array<{
    teamId: string;
    teamName: string;
    wins: number;
    losses: number;
    setsDifferential: number;
    winPercentage: number;
  }>;
}

interface AdvancementConfigurationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  poolStats: PoolStats[];
  onGenerateBrackets: (advancementConfig: { teamsPerPool: number }) => void;
  loading?: boolean;
}

export function AdvancementConfigurationDialog({
  open,
  onOpenChange,
  poolStats,
  onGenerateBrackets,
  loading = false
}: AdvancementConfigurationDialogProps) {
  const totalTeams = poolStats.reduce((sum, pool) => sum + pool.standings.length, 0);
  const recommendation = getAdvancementRecommendation(totalTeams);
  
  const [selectedAdvancement, setSelectedAdvancement] = useState<number>(recommendation.teamsPerPool);

  const calculateBracketSize = (teamsPerPool: number) => {
    return poolStats.length * teamsPerPool;
  };

  const getAdvancingTeams = (teamsPerPool: number) => {
    return poolStats.map(pool => ({
      poolName: pool.poolName,
      advancingTeams: pool.standings.slice(0, teamsPerPool)
    }));
  };

  const handleGenerateBrackets = () => {
    onGenerateBrackets({ teamsPerPool: selectedAdvancement });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Configure Bracket Advancement
          </DialogTitle>
          <DialogDescription>
            Pool play is complete! Configure how many teams advance from each pool to the playoff brackets.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Tournament Overview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Tournament Overview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <div className="text-center">
                  <div className="text-2xl font-bold">{poolStats.length}</div>
                  <div className="text-sm text-muted-foreground">Pools Complete</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{totalTeams}</div>
                  <div className="text-sm text-muted-foreground">Total Teams</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold">{calculateBracketSize(selectedAdvancement)}</div>
                  <div className="text-sm text-muted-foreground">Bracket Teams</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Advancement Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Advancement Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-4">
                <label className="text-sm font-medium">Teams advancing per pool:</label>
                <Select value={selectedAdvancement.toString()} onValueChange={(value) => setSelectedAdvancement(parseInt(value))}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Top 1</SelectItem>
                    <SelectItem value="2">Top 2</SelectItem>
                    <SelectItem value="3">Top 3</SelectItem>
                    <SelectItem value="999">All Teams</SelectItem>
                  </SelectContent>
                </Select>
                {selectedAdvancement === recommendation.teamsPerPool && (
                  <Badge className="bg-green-100 text-green-700">Recommended</Badge>
                )}
              </div>

              <div className="bg-muted p-3 rounded-lg">
                <div className="flex items-start gap-2">
                  <Target className="h-4 w-4 mt-0.5 text-muted-foreground" />
                  <div>
                    <div className="font-medium text-sm">Recommendation: Top {recommendation.teamsPerPool}</div>
                    <div className="text-sm text-muted-foreground">{recommendation.reasoning}</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Pool Results Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <ArrowRight className="h-4 w-4" />
                Advancing Teams Preview
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {getAdvancingTeams(selectedAdvancement).map(({ poolName, advancingTeams }) => (
                  <div key={poolName} className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-3">{poolName}</h4>
                    <div className="space-y-2">
                      {advancingTeams.map((team, index) => (
                        <div key={team.teamId} className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Badge variant={index === 0 ? "default" : "secondary"} className="w-6 h-6 p-0 flex items-center justify-center text-xs">
                              {index + 1}
                            </Badge>
                            <span className="font-medium">{team.teamName}</span>
                          </div>
                          <div className="text-muted-foreground">
                            {team.wins}-{team.losses} ({team.setsDifferential > 0 ? '+' : ''}{team.setsDifferential})
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Bracket Preview */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Bracket Preview</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <Users className="h-5 w-5 text-muted-foreground" />
                  <span className="text-lg font-semibold">{calculateBracketSize(selectedAdvancement)} Team Single Elimination Bracket</span>
                </div>
                <div className="text-sm text-muted-foreground">
                  Teams will be seeded based on pool standings and overall record
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleGenerateBrackets} disabled={loading}>
            {loading ? "Generating Brackets..." : "Generate Brackets"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}