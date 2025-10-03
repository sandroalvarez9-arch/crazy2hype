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
  court_number?: number;
}

interface TraditionalBracketViewProps {
  matches: BracketMatch[];
  title?: string;
  onFormatChange?: (format: 'simple' | 'detailed') => void;
  bracketFormat?: 'simple' | 'detailed';
  onMatchSelect?: (match: BracketMatch) => void;
}

const TraditionalBracketView: React.FC<TraditionalBracketViewProps> = ({ 
  matches, 
  title = "Tournament Bracket",
  onFormatChange,
  bracketFormat = 'simple',
  onMatchSelect
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

  const BracketConnector: React.FC<{ 
    isTopMatch: boolean;
    gapToNextRound: number;
  }> = ({ isTopMatch, gapToNextRound }) => {
    // Calculate the distance the line needs to travel vertically
    const verticalDistance = gapToNextRound / 2;
    
    return (
      <div className="absolute left-full top-1/2 -translate-y-1/2 z-10">
        <svg 
          width="80" 
          height={Math.max(200, verticalDistance * 2 + 50)} 
          className="overflow-visible"
          style={{ transform: 'translateY(-50%)' }}
        >
          {/* Horizontal line from match */}
          <line 
            x1="0" 
            y1="50%" 
            x2="40" 
            y2="50%"
            stroke="hsl(var(--primary))"
            strokeWidth="2"
          />
          {/* Vertical line going to merge point */}
          <line 
            x1="40" 
            y1="50%" 
            x2="40" 
            y2={isTopMatch ? `calc(50% + ${verticalDistance}px)` : `calc(50% - ${verticalDistance}px)`}
            stroke="hsl(var(--primary))"
            strokeWidth="2"
          />
          {/* Horizontal line to next match */}
          <line 
            x1="40" 
            y1={isTopMatch ? `calc(50% + ${verticalDistance}px)` : `calc(50% - ${verticalDistance}px)`}
            x2="80" 
            y2={isTopMatch ? `calc(50% + ${verticalDistance}px)` : `calc(50% - ${verticalDistance}px)`}
            stroke="hsl(var(--primary))"
            strokeWidth="2"
          />
        </svg>
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
          <div className={`flex items-start gap-${bracketFormat === 'simple' ? '20' : '16'} min-w-fit`}>
            {rounds.map((roundNumber, roundIndex) => {
              const isLeftSide = roundIndex < Math.ceil(rounds.length / 2);
              const isRightSide = roundIndex >= Math.ceil(rounds.length / 2);
              const isFinal = roundNumber === totalRounds;
              
              // Calculate vertical spacing - each round doubles the gap from previous
              const baseMatchHeight = bracketFormat === 'simple' ? 120 : 100;
              const baseGap = 60;
              
              // Calculate the gap between matches in THIS round
              // Round 1: baseGap, Round 2: baseGap*2 + matchHeight, Round 3: (baseGap*2 + matchHeight)*2 + matchHeight, etc.
              let gapBetweenMatches = baseGap;
              for (let i = 1; i < roundNumber; i++) {
                gapBetweenMatches = (gapBetweenMatches + baseMatchHeight) * 2;
              }
              
              // For rounds after the first, add top margin to center with previous round
              const initialTopMargin = roundNumber > 1 ? gapBetweenMatches / 2 : 0;
              
              return (
                <div key={roundNumber} className="flex flex-col items-center">
                  {/* Round Title */}
                  <div className="text-center mb-8">
                    <h3 className={`font-bold ${bracketFormat === 'simple' ? 'text-base' : 'text-sm'}`}>
                      {getRoundName(roundNumber, totalRounds)}
                    </h3>
                  </div>
                  
                  {/* Matches in this round */}
                  <div className="flex flex-col">
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
                            <div className="flex flex-col gap-1 mt-2">
                              {match.referee_team_name && (
                                <div className="text-xs text-center text-muted-foreground px-2 py-1 bg-orange-50 border border-orange-200 rounded">
                                  📋 Ref: {match.referee_team_name}
                                </div>
                              )}
                              <div className="text-xs text-center text-muted-foreground px-2 py-1 bg-blue-50 border border-blue-200 rounded">
                                🏟️ Court {match.court_number || 1}
                              </div>
                              {(match.status === 'scheduled' || match.status === 'in_progress') && onMatchSelect && (
                                <Button
                                  size="sm"
                                  variant={match.status === 'in_progress' ? 'default' : 'outline'}
                                  onClick={() => onMatchSelect(match)}
                                >
                                  {match.status === 'in_progress' ? 'Continue' : 'Start Match'}
                                </Button>
                              )}
                            </div>
                            {match.winner_name && (
                              <div className="mt-4 p-3 bg-yellow-400 text-yellow-900 font-bold text-center rounded-md">
                                🏆 CHAMPION 🏆<br/>
                                <span className="text-sm">{match.winner_name}</span>
                              </div>
                            )}
                          </div>
                        );
                      }
                      
                      const isTopMatchOfPair = matchIndex % 2 === 0;
                      const marginTop = matchIndex === 0 ? initialTopMargin : gapBetweenMatches;
                      
                      return (
                        <div 
                          key={match.id} 
                          className="relative flex items-center gap-2"
                          style={{ marginTop: `${marginTop}px` }}
                        >
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
                                <div className="flex flex-col gap-1 mt-1">
                                  {match.referee_team_name && (
                                    <div className="text-xs text-center text-muted-foreground px-2 py-1 bg-orange-50 border border-orange-200 rounded">
                                      📋 Ref: {match.referee_team_name}
                                    </div>
                                  )}
                                  <div className="text-xs text-center text-muted-foreground px-2 py-1 bg-blue-50 border border-blue-200 rounded">
                                    🏟️ Court {match.court_number || 1}
                                  </div>
                                  {(match.status === 'scheduled' || match.status === 'in_progress') && onMatchSelect && (
                                    <Button
                                      size="sm"
                                      variant={match.status === 'in_progress' ? 'default' : 'outline'}
                                      onClick={() => onMatchSelect(match)}
                                    >
                                      {match.status === 'in_progress' ? 'Continue' : 'Start Match'}
                                    </Button>
                                  )}
                                </div>
                              </div>
                              {!isFinal && roundIndex < rounds.length - 1 && (
                                <BracketConnector 
                                  isTopMatch={isTopMatchOfPair}
                                  gapToNextRound={gapBetweenMatches}
                                />
                              )}
                            </>
                          )}
                          
                          {isRightSide && !isFinal && (
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
                                <div className="flex flex-col gap-1 mt-1">
                                  {match.referee_team_name && (
                                    <div className="text-xs text-center text-muted-foreground px-2 py-1 bg-orange-50 border border-orange-200 rounded">
                                      📋 Ref: {match.referee_team_name}
                                    </div>
                                  )}
                                  <div className="text-xs text-center text-muted-foreground px-2 py-1 bg-blue-50 border border-blue-200 rounded">
                                    🏟️ Court {match.court_number || 1}
                                  </div>
                                  {(match.status === 'scheduled' || match.status === 'in_progress') && onMatchSelect && (
                                    <Button
                                      size="sm"
                                      variant={match.status === 'in_progress' ? 'default' : 'outline'}
                                      onClick={() => onMatchSelect(match)}
                                    >
                                      {match.status === 'in_progress' ? 'Continue' : 'Start Match'}
                                    </Button>
                                  )}
                                </div>
                              </div>
                              {roundIndex < rounds.length - 1 && (
                                <BracketConnector 
                                  isTopMatch={isTopMatchOfPair}
                                  gapToNextRound={gapBetweenMatches}
                                />
                              )}
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
