import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

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
  referee_team_name?: string;
}

interface TraditionalBracketViewProps {
  matches: BracketMatch[];
  title?: string;
  onFormatChange?: (format: 'simple' | 'detailed') => void;
  bracketFormat?: 'simple' | 'detailed';
}

const TraditionalBracketView: React.FC<TraditionalBracketViewProps> = ({ 
  matches, 
  title = "Tournament Bracket",
  onFormatChange,
  bracketFormat = 'simple'
}) => {
  // Organize matches by round
  const organizeMatches = () => {
    const matchesByRound: { [round: number]: BracketMatch[] } = {};
    
    matches.forEach(match => {
      if (!matchesByRound[match.round_number]) {
        matchesByRound[match.round_number] = [];
      }
      matchesByRound[match.round_number].push(match);
    });

    // Sort matches within each round
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
      case 1: return 'CHAMPION';
      case 2: return 'FINAL';
      case 3: return 'SEMIFINALS';
      case 4: return 'QUARTERFINALS';
      case 5: return 'ROUND OF 16';
      default: return `ROUND ${roundNumber}`;
    }
  };

  const TeamBox: React.FC<{ 
    teamName?: string; 
    isWinner?: boolean; 
    score?: number;
    format: 'simple' | 'detailed';
    seedNumber?: number;
  }> = ({ teamName, isWinner, score, format, seedNumber }) => {
    if (!teamName && !seedNumber) {
      return (
        <div className={`
          ${format === 'simple' ? 'h-12 w-32' : 'h-10 w-40'} 
          border border-gray-300 bg-gray-50 
          flex items-center justify-center text-xs text-gray-400
          ${format === 'simple' ? 'rounded-md' : 'rounded-sm'}
        `}>
          TBD
        </div>
      );
    }

    const displayName = format === 'simple' && seedNumber 
      ? `Seed ${seedNumber}` 
      : teamName || `Seed ${seedNumber}`;

    return (
      <div className={`
        ${format === 'simple' ? 'h-12 w-32' : 'h-10 w-40'}
        border-2 flex items-center justify-between px-3
        ${format === 'simple' ? 'rounded-md' : 'rounded-sm'}
        ${isWinner 
          ? 'border-yellow-400 bg-yellow-50 font-semibold shadow-md' 
          : 'border-blue-300 bg-blue-50'
        }
        transition-all duration-200 hover:shadow-sm
      `}>
        <span className={`text-xs ${isWinner ? 'text-yellow-800' : 'text-blue-800'} truncate`}>
          {displayName}
        </span>
        {score !== undefined && score > 0 && (
          <span className={`text-xs font-bold ml-2 ${isWinner ? 'text-yellow-800' : 'text-blue-600'}`}>
            {score}
          </span>
        )}
      </div>
    );
  };

  const BracketConnector: React.FC<{ orientation: 'right' | 'left'; length?: number }> = ({ 
    orientation, 
    length = 40 
  }) => (
    <div className="flex items-center justify-center">
      <div 
        className={`
          border-t-2 border-gray-400
          ${orientation === 'right' ? 'border-r-2 border-b-2' : 'border-l-2 border-b-2'}
        `}
        style={{ 
          width: `${length}px`, 
          height: '20px',
          borderTopRightRadius: orientation === 'right' ? '0' : '0',
          borderBottomRightRadius: orientation === 'right' ? '8px' : '0',
          borderTopLeftRadius: orientation === 'left' ? '0' : '0',
          borderBottomLeftRadius: orientation === 'left' ? '8px' : '0',
        }}
      />
    </div>
  );

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

  // Calculate if this is a large tournament (>16 teams)
  const totalTeams = Math.pow(2, totalRounds);
  const isLargeTournament = totalTeams > 16;
  const recommendedFormat = isLargeTournament ? 'detailed' : 'simple';

  return (
    <div className="space-y-6">
      {/* Header and Controls */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-center">{title}</h2>
          {totalTeams > 0 && (
            <p className="text-sm text-muted-foreground text-center">
              {totalTeams} Team Single Elimination
            </p>
          )}
        </div>
        
        {onFormatChange && (
          <div className="flex items-center gap-4">
            <div className="text-sm">
              <span className="text-muted-foreground">Recommended: </span>
              <Badge variant={bracketFormat === recommendedFormat ? 'default' : 'secondary'}>
                {recommendedFormat === 'simple' ? 'Simple' : 'Detailed'}
              </Badge>
            </div>
            <Select value={bracketFormat} onValueChange={(value: 'simple' | 'detailed') => onFormatChange(value)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="simple">Simple</SelectItem>
                <SelectItem value="detailed">Detailed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )}
      </div>

      {/* Bracket Display */}
      <div className="overflow-x-auto bg-white p-8 rounded-lg border">
        <div className="flex justify-center">
          <div className={`flex items-center gap-${bracketFormat === 'simple' ? '12' : '8'} min-w-fit`}>
            {rounds.map((roundNumber, roundIndex) => {
              const isLeftSide = roundIndex < Math.ceil(rounds.length / 2);
              const isRightSide = roundIndex >= Math.ceil(rounds.length / 2);
              const isFinal = roundNumber === totalRounds;
              
              return (
                <div key={roundNumber} className="flex flex-col items-center gap-6">
                  {/* Round Title */}
                  <div className="text-center mb-4">
                    <h3 className={`font-bold ${bracketFormat === 'simple' ? 'text-base' : 'text-sm'}`}>
                      {getRoundName(roundNumber, totalRounds)}
                    </h3>
                  </div>
                  
                  {/* Matches in this round */}
                  <div className={`flex flex-col gap-${isFinal ? '0' : '8'}`}>
                    {organizedMatches[roundNumber].map((match, matchIndex) => {
                      const team1Winner = match.status === 'completed' && match.winner_name === match.team1_name;
                      const team2Winner = match.status === 'completed' && match.winner_name === match.team2_name;
                      
                      if (isFinal) {
                        // Special layout for final/champion
                        return (
                          <div key={match.id} className="flex flex-col items-center gap-4">
                            <TeamBox 
                              teamName={match.team1_name}
                              isWinner={team1Winner}
                              score={match.team1_score}
                              format={bracketFormat}
                            />
                            <div className="text-xs text-muted-foreground">vs</div>
                            <TeamBox 
                              teamName={match.team2_name}
                              isWinner={team2Winner}
                              score={match.team2_score}
                              format={bracketFormat}
                            />
                            {match.referee_team_name && (
                              <div className="text-xs text-center text-muted-foreground mt-2 px-2 py-1 bg-orange-50 border border-orange-200 rounded">
                                📋 Ref: {match.referee_team_name}
                              </div>
                            )}
                            {match.winner_name && (
                              <div className="mt-4 p-3 bg-yellow-400 text-yellow-900 font-bold text-center rounded-md">
                                🏆 CHAMPION 🏆<br/>
                                <span className="text-sm">{match.winner_name}</span>
                              </div>
                            )}
                          </div>
                        );
                      }
                      
                      return (
                        <div key={match.id} className="flex items-center gap-2">
                          {isLeftSide && (
                            <>
                              <div className="flex flex-col gap-1">
                                <div className="flex flex-col gap-1">
                                  <TeamBox 
                                    teamName={match.team1_name}
                                    isWinner={team1Winner}
                                    score={match.team1_score}
                                    format={bracketFormat}
                                  />
                                  <TeamBox 
                                    teamName={match.team2_name}
                                    isWinner={team2Winner}
                                    score={match.team2_score}
                                    format={bracketFormat}
                                  />
                                </div>
                                {match.referee_team_name && (
                                  <div className="text-xs text-center text-muted-foreground mt-1 px-2 py-1 bg-orange-50 border border-orange-200 rounded">
                                    📋 Ref: {match.referee_team_name}
                                  </div>
                                )}
                              </div>
                              {roundIndex < rounds.length - 1 && (
                                <BracketConnector 
                                  orientation="right" 
                                  length={bracketFormat === 'simple' ? 40 : 30}
                                />
                              )}
                            </>
                          )}
                          
                          {isRightSide && !isFinal && (
                            <>
                              {roundIndex > 0 && (
                                <BracketConnector 
                                  orientation="left" 
                                  length={bracketFormat === 'simple' ? 40 : 30}
                                />
                              )}
                              <div className="flex flex-col gap-1">
                                <div className="flex flex-col gap-1">
                                  <TeamBox 
                                    teamName={match.team1_name}
                                    isWinner={team1Winner}
                                    score={match.team1_score}
                                    format={bracketFormat}
                                  />
                                  <TeamBox 
                                    teamName={match.team2_name}
                                    isWinner={team2Winner}
                                    score={match.team2_score}
                                    format={bracketFormat}
                                  />
                                </div>
                                {match.referee_team_name && (
                                  <div className="text-xs text-center text-muted-foreground mt-1 px-2 py-1 bg-orange-50 border border-orange-200 rounded">
                                    📋 Ref: {match.referee_team_name}
                                  </div>
                                )}
                              </div>
                            </>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Legend */}
      <Card className="bg-muted/50">
        <CardContent className="pt-4">
          <div className="flex flex-wrap gap-4 justify-center text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-yellow-50 border-2 border-yellow-400 rounded-sm"></div>
              <span>Winner</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-50 border-2 border-blue-300 rounded-sm"></div>
              <span>Team</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-gray-50 border border-gray-300 rounded-sm"></div>
              <span>TBD</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TraditionalBracketView;