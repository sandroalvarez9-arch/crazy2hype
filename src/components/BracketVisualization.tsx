import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';

interface BracketMatch {
  id: string;
  team1_name?: string;
  team2_name?: string;
  team1_score: number;
  team2_score: number;
  winner_name?: string;
  bracket_position: string;
  status: string;
  round_number: number;
}

interface BracketVisualizationProps {
  matches: BracketMatch[];
  title?: string;
}

const BracketVisualization: React.FC<BracketVisualizationProps> = ({ 
  matches, 
  title = "Tournament Bracket" 
}) => {
  // Group matches by round and organize for bracket display
  const organizeMatches = () => {
    const matchesByRound: { [round: number]: BracketMatch[] } = {};
    
    matches.forEach(match => {
      if (!matchesByRound[match.round_number]) {
        matchesByRound[match.round_number] = [];
      }
      matchesByRound[match.round_number].push(match);
    });

    // Sort matches within each round by bracket position
    Object.keys(matchesByRound).forEach(round => {
      matchesByRound[parseInt(round)].sort((a, b) => {
        const aNum = parseInt(a.bracket_position.split(' ')[1] || '0');
        const bNum = parseInt(b.bracket_position.split(' ')[1] || '0');
        return aNum - bNum;
      });
    });

    return matchesByRound;
  };

  const getRoundName = (roundNumber: number, totalRounds: number) => {
    const roundsFromEnd = totalRounds - roundNumber + 1;
    switch (roundsFromEnd) {
      case 1: return 'Final';
      case 2: return 'Semifinal';
      case 3: return 'Quarterfinal';
      case 4: return 'Round of 16';
      default: return `Round ${roundNumber}`;
    }
  };

  const getTeamDisplay = (teamName?: string, score?: number, isWinner?: boolean) => {
    if (!teamName) {
      return (
        <div className="text-muted-foreground italic text-sm">
          TBD
        </div>
      );
    }
    
    return (
      <div className={`flex justify-between items-center p-2 rounded ${
        isWinner ? 'bg-green-50 border-l-4 border-l-green-500 font-semibold' : 'bg-gray-50'
      }`}>
        <span className="text-sm">{teamName}</span>
        {score !== undefined && score > 0 && (
          <Badge variant="outline" className="text-xs">
            {score}
          </Badge>
        )}
      </div>
    );
  };

  const organizedMatches = organizeMatches();
  const rounds = Object.keys(organizedMatches).map(Number).sort((a, b) => a - b);
  const totalRounds = rounds.length;

  if (matches.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            No bracket matches available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold">{title}</h2>
        <p className="text-muted-foreground">
          Playoff bracket showing current matchups and advancement paths
        </p>
      </div>

      <div className="overflow-x-auto">
        <div className="flex gap-8 min-w-fit p-4">
          {rounds.map((roundNumber, roundIndex) => (
            <div key={roundNumber} className="flex flex-col gap-4 min-w-[280px]">
              <div className="text-center">
                <h3 className="font-semibold text-lg">
                  {getRoundName(roundNumber, totalRounds)}
                </h3>
                <Badge variant="secondary" className="text-xs">
                  Round {roundNumber}
                </Badge>
              </div>
              
              <div className="space-y-6">
                {organizedMatches[roundNumber].map((match, matchIndex) => (
                  <Card key={match.id} className="w-full">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium text-center">
                        {match.bracket_position}
                      </CardTitle>
                      <div className="text-center">
                        <Badge 
                          variant={match.status === 'completed' ? 'default' : 'secondary'}
                          className="text-xs"
                        >
                          {match.status === 'completed' ? 'Complete' : 'Upcoming'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      {getTeamDisplay(
                        match.team1_name, 
                        match.team1_score,
                        match.status === 'completed' && match.winner_name === match.team1_name
                      )}
                      
                      <div className="text-center text-xs text-muted-foreground">vs</div>
                      
                      {getTeamDisplay(
                        match.team2_name, 
                        match.team2_score,
                        match.status === 'completed' && match.winner_name === match.team2_name
                      )}
                      
                      {match.status === 'completed' && match.winner_name && (
                        <div className="text-center pt-2 border-t">
                          <Badge className="bg-green-600 text-white text-xs">
                            Winner: {match.winner_name}
                          </Badge>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Connector lines for next round */}
              {roundIndex < rounds.length - 1 && (
                <div className="flex items-center justify-center">
                  <div className="w-8 h-0.5 bg-border"></div>
                  <div className="text-xs text-muted-foreground mx-2">→</div>
                  <div className="w-8 h-0.5 bg-border"></div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <Card className="bg-muted/50">
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 justify-center text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-50 border-l-4 border-l-green-500 rounded-sm"></div>
              <span>Winner</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-gray-50 rounded-sm"></div>
              <span>Team</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-xs">Complete</Badge>
              <span>Match finished</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">Upcoming</Badge>
              <span>Match pending</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BracketVisualization;