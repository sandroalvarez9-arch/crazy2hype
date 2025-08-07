import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { generatePoolPlaySchedule } from "@/utils/poolPlayGenerator";
import { format } from "date-fns";
import { Trophy, Users, Clock, MapPin } from "lucide-react";

interface Team {
  id: string;
  name: string;
  check_in_status: string;
}

interface Tournament {
  id: string;
  title: string;
  first_game_time: string;
  estimated_game_duration: number;
  warm_up_duration?: number;
  number_of_courts: number;
  tournament_format: string;
  brackets_generated: boolean;
}

interface PoolPlayManagerProps {
  tournament: Tournament;
  teams: Team[];
  onBracketsGenerated: () => void;
}

export function PoolPlayManager({ tournament, teams, onBracketsGenerated }: PoolPlayManagerProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const checkedInTeams = teams.filter(team => team.check_in_status === 'checked_in');
  const canGenerateBrackets = checkedInTeams.length >= 4 && !tournament.brackets_generated;

  const handleGeneratePoolPlay = async () => {
    if (!canGenerateBrackets) return;

    setIsGenerating(true);
    try {
      const firstGameTime = new Date(tournament.first_game_time);
      
      // Generate pools and matches
      const { pools, matches } = generatePoolPlaySchedule(
        checkedInTeams,
        firstGameTime,
        tournament.estimated_game_duration,
        tournament.number_of_courts,
        6, // maxTeamsPerPool
        tournament.warm_up_duration || 7
      );

      // Insert all matches into the database
      const matchInserts = matches.map(match => ({
        tournament_id: tournament.id,
        team1_id: match.team1_id,
        team2_id: match.team2_id,
        referee_team_id: match.referee_team_id || null,
        round_number: match.round_number,
        match_number: match.match_number,
        pool_name: match.pool_name,
        court_number: match.court_number,
        scheduled_time: match.scheduled_time,
        status: 'scheduled'
      }));

      const { error: matchError } = await supabase
        .from('matches')
        .insert(matchInserts);

      if (matchError) throw matchError;

      // Update tournament to mark brackets as generated
      const { error: tournamentError } = await supabase
        .from('tournaments')
        .update({ brackets_generated: true })
        .eq('id', tournament.id);

      if (tournamentError) throw tournamentError;

      // Log the action
      await supabase.rpc('log_tournament_action', {
        tournament_id: tournament.id,
        action: 'Pool play generated',
        details: {
          num_pools: pools.length,
          num_matches: matches.length,
          num_teams: checkedInTeams.length
        }
      });

      toast({
        title: "Pool play generated successfully!",
        description: `Created ${pools.length} pools with ${matches.length} matches scheduled.`,
      });

      onBracketsGenerated();
    } catch (error) {
      console.error('Error generating pool play:', error);
      toast({
        title: "Error generating pool play",
        description: "There was an error creating the tournament schedule. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const getMaxTeamsPerPool = () => {
    const numTeams = checkedInTeams.length;
    if (numTeams <= 12) return 6;
    if (numTeams <= 16) return 8;
    return 8; // Max 8 teams per pool
  };

  const estimatedPools = Math.ceil(checkedInTeams.length / getMaxTeamsPerPool());
  const estimatedMatches = estimatedPools * Math.floor((getMaxTeamsPerPool() * (getMaxTeamsPerPool() - 1)) / 2);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Pool Play Generation
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {!tournament.brackets_generated ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{checkedInTeams.length} Teams Checked In</div>
                    <div className="text-sm text-muted-foreground">Ready for pool play</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">
                      {format(new Date(tournament.first_game_time), "MMM dd, h:mm a")}
                    </div>
                    <div className="text-sm text-muted-foreground">First game starts</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <div className="font-medium">{tournament.number_of_courts} Courts</div>
                    <div className="text-sm text-muted-foreground">Available for matches</div>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-muted rounded-lg">
                <h4 className="font-medium mb-2">Projected Pool Play Setup</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Estimated Pools:</span> {estimatedPools}
                  </div>
                  <div>
                    <span className="font-medium">Estimated Matches:</span> ~{estimatedMatches}
                  </div>
                  <div>
                    <span className="font-medium">Teams per Pool:</span> {Math.floor(checkedInTeams.length / estimatedPools)}-{Math.ceil(checkedInTeams.length / estimatedPools)}
                  </div>
                  <div>
                    <span className="font-medium">Game Duration:</span> {tournament.estimated_game_duration} minutes
                  </div>
                </div>
              </div>

              <Button
                onClick={handleGeneratePoolPlay}
                disabled={!canGenerateBrackets || isGenerating}
                className="w-full"
                size="lg"
              >
                {isGenerating ? 'Generating Pool Play...' : 'Generate Pool Play & Assign Referees'}
              </Button>

              {!canGenerateBrackets && checkedInTeams.length < 4 && (
                <p className="text-sm text-muted-foreground text-center">
                  Need at least 4 checked-in teams to generate pool play
                </p>
              )}
            </>
          ) : (
            <div className="text-center">
              <Badge className="mb-2">Pool Play Generated</Badge>
              <p className="text-muted-foreground">
                Pool play has been created with referee assignments. Check the matches tab to view the schedule.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Checked-In Teams</CardTitle>
        </CardHeader>
        <CardContent>
          {checkedInTeams.length === 0 ? (
            <p className="text-muted-foreground text-center py-4">
              No teams have checked in yet.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Team Name</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {checkedInTeams.map((team) => (
                  <TableRow key={team.id}>
                    <TableCell className="font-medium">{team.name}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">Checked In</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}