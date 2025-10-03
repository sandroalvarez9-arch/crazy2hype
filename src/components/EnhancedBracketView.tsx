import React, { useState, useRef, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";

interface BracketMatch {
  id: string;
  tournament_id?: string;
  team1_id?: string | null;
  team2_id?: string | null;
  team1_name?: string;
  team2_name?: string;
  team1_score: number;
  team2_score: number;
  winner_id?: string | null;
  winner_name?: string;
  bracket_position: string;
  status: string;
  round_number: number;
  referee_team_name?: string;
  court?: number;
}

interface EnhancedBracketViewProps {
  matches: BracketMatch[];
  title?: string;
  format?: 'simple' | 'detailed';
  onFormatChange?: (format: 'simple' | 'detailed') => void;
  onMatchSelect?: (match: BracketMatch) => void;
}

const ZOOM_LEVELS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

const EnhancedBracketView: React.FC<EnhancedBracketViewProps> = ({ 
  matches: initialMatches, 
  title = "Tournament Bracket",
  format = 'detailed',
  onFormatChange,
  onMatchSelect
}) => {
  const [matches, setMatches] = useState(initialMatches);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, panX: 0, panY: 0 });
  const containerRef = useRef<HTMLDivElement>(null);

  // Update matches when initialMatches changes
  useEffect(() => {
    setMatches(initialMatches);
  }, [initialMatches]);

  // Subscribe to real-time match updates
  useEffect(() => {
    if (!matches?.length) return;

    const tournamentId = matches[0]?.tournament_id;
    if (!tournamentId) return;

    console.log('Setting up real-time updates for bracket matches');

    const channel = supabase
      .channel('bracket-match-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
          filter: `tournament_id=eq.${tournamentId}`
        },
        (payload) => {
          console.log('Real-time bracket match update:', payload);
          
          setMatches(prevMatches => 
            prevMatches.map(match => 
              match.id === payload.new.id 
                ? { ...match, ...payload.new }
                : match
            )
          );
        }
      )
      .subscribe();

    return () => {
      console.log('Cleaning up real-time bracket updates');
      supabase.removeChannel(channel);
    };
  }, [matches]);

  // Organize matches by round
  const organizeMatches = () => {
    const matchesByRound: { [round: number]: BracketMatch[] } = {};
    
    matches.forEach(match => {
      if (!matchesByRound[match.round_number]) {
        matchesByRound[match.round_number] = [];
      }
      matchesByRound[match.round_number].push(match);
    });

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
      case 1: return 'FINAL';
      case 2: return 'SEMIFINALS';
      case 3: return 'QUARTERFINALS';
      case 4: return 'ROUND OF 16';
      default: return `ROUND ${roundNumber}`;
    }
  };

  // Zoom controls
  const handleZoomIn = () => {
    const currentIndex = ZOOM_LEVELS.indexOf(zoom);
    if (currentIndex < ZOOM_LEVELS.length - 1) {
      setZoom(ZOOM_LEVELS[currentIndex + 1]);
    }
  };

  const handleZoomOut = () => {
    const currentIndex = ZOOM_LEVELS.indexOf(zoom);
    if (currentIndex > 0) {
      setZoom(ZOOM_LEVELS[currentIndex - 1]);
    }
  };

  const handleFitToScreen = () => {
    setZoom(0.75);
    setPan({ x: 0, y: 0 });
  };

  const handleReset = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Pan controls
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0) { // Left mouse button
      setIsDragging(true);
      setDragStart({
        x: e.clientX,
        y: e.clientY,
        panX: pan.x,
        panY: pan.y
      });
      e.preventDefault();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      const deltaX = e.clientX - dragStart.x;
      const deltaY = e.clientY - dragStart.y;
      setPan({
        x: dragStart.panX + deltaX,
        y: dragStart.panY + deltaY
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  // Wheel zoom
  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = e.deltaY > 0 ? -1 : 1;
        const currentIndex = ZOOM_LEVELS.indexOf(zoom);
        const newIndex = Math.max(0, Math.min(ZOOM_LEVELS.length - 1, currentIndex + delta));
        setZoom(ZOOM_LEVELS[newIndex]);
      }
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener('wheel', handleWheel, { passive: false });
      return () => container.removeEventListener('wheel', handleWheel);
    }
  }, [zoom]);

  const TeamBox: React.FC<{
    teamName?: string;
    score?: number;
    isWinner?: boolean;
  }> = ({ teamName, score, isWinner }) => {
    if (!teamName) {
      return (
        <div className="bg-muted/50 p-3 rounded border border-dashed text-center">
          <span className="text-muted-foreground text-sm">TBD</span>
        </div>
      );
    }
    
    return (
      <div className={`p-3 rounded border transition-colors ${
        isWinner 
          ? 'bg-green-50 border-green-200 font-semibold text-green-800' 
          : 'bg-background border-border hover:bg-muted/50'
      }`}>
        <div className="flex justify-between items-center">
          <span className="text-sm">{teamName}</span>
          {score !== undefined && score > 0 && (
            <Badge variant="outline" className="text-xs">
              {score}
            </Badge>
          )}
        </div>
      </div>
    );
  };

  // SVG Connection Lines Component
  const ConnectionLines: React.FC<{
    rounds: number[];
    organizedMatches: { [round: number]: BracketMatch[] };
    matchHeight: number;
    roundWidth: number;
  }> = ({ rounds, organizedMatches, matchHeight, roundWidth }) => {
    const lines: JSX.Element[] = [];
    
    rounds.forEach((roundNumber, roundIndex) => {
      if (roundIndex < rounds.length - 1) {
        const currentRoundMatches = organizedMatches[roundNumber];
        const nextRoundMatches = organizedMatches[rounds[roundIndex + 1]];
        
        currentRoundMatches.forEach((match, matchIndex) => {
          const currentY = matchIndex * (matchHeight + 32) + matchHeight / 2;
          const nextMatchIndex = Math.floor(matchIndex / 2);
          const nextY = nextMatchIndex * (matchHeight + 32) + matchHeight / 2;
          
          const startX = roundIndex * roundWidth + 320;
          const endX = (roundIndex + 1) * roundWidth + 40;
          const controlX1 = startX + (endX - startX) * 0.3;
          const controlX2 = startX + (endX - startX) * 0.7;
          
          const pathData = `M ${startX} ${currentY} C ${controlX1} ${currentY}, ${controlX2} ${nextY}, ${endX} ${nextY}`;
          
          lines.push(
            <g key={`connection-${match.id}`}>
              <path
                d={pathData}
                stroke="hsl(var(--border))"
                strokeWidth="2"
                fill="none"
                className="opacity-60"
              />
              <circle
                cx={endX}
                cy={nextY}
                r="3"
                fill="hsl(var(--primary))"
                className="opacity-80"
              />
            </g>
          );
        });
      }
    });
    
    return <>{lines}</>;
  };

  const organizedMatches = organizeMatches();
  const rounds = Object.keys(organizedMatches).map(Number).sort((a, b) => a - b);
  const totalRounds = rounds.length;
  const totalTeams = Math.pow(2, totalRounds);

  if (matches.length === 0) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="text-center text-muted-foreground">
            No playoff matches available
          </div>
        </CardContent>
      </Card>
    );
  }

  const roundWidth = 360;
  const matchHeight = format === 'detailed' ? 180 : 120;
  const svgWidth = rounds.length * roundWidth;
  const svgHeight = Math.max(...rounds.map(r => organizedMatches[r].length)) * (matchHeight + 32);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">{title}</h2>
          <p className="text-muted-foreground">
            {totalTeams} teams • {totalRounds} rounds
          </p>
        </div>
        
        <div className="flex gap-2">
          {onFormatChange && (
            <div className="flex gap-1 border rounded-lg p-1">
              <Button
                variant={format === 'simple' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onFormatChange('simple')}
              >
                Simple
              </Button>
              <Button
                variant={format === 'detailed' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => onFormatChange('detailed')}
              >
                Detailed
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Zoom Controls */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomOut}
                disabled={zoom <= ZOOM_LEVELS[0]}
              >
                <ZoomOut className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleZoomIn}
                disabled={zoom >= ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}
              >
                <ZoomIn className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="sm" onClick={handleFitToScreen}>
                <Maximize2 className="h-4 w-4" />
                Fit
              </Button>
              <Button variant="outline" size="sm" onClick={handleReset}>
                <RotateCcw className="h-4 w-4" />
                Reset
              </Button>
            </div>
            
            <Badge variant="secondary">
              {Math.round(zoom * 100)}%
            </Badge>
          </div>
        </CardContent>
      </Card>

      {/* Bracket Container */}
      <Card className="overflow-hidden">
        <div 
          ref={containerRef}
          className="relative w-full h-[600px] overflow-hidden cursor-grab active:cursor-grabbing bg-muted/20"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div
            style={{
              transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
              transformOrigin: 'top left',
              transition: isDragging ? 'none' : 'transform 0.1s ease-out',
            }}
            className="relative"
          >
            {/* SVG for Connection Lines */}
            <svg
              className="absolute top-0 left-0 pointer-events-none"
              width={svgWidth}
              height={svgHeight}
              style={{ zIndex: 1 }}
            >
              <ConnectionLines
                rounds={rounds}
                organizedMatches={organizedMatches}
                matchHeight={matchHeight}
                roundWidth={roundWidth}
              />
            </svg>

            {/* Matches */}
            <div className="relative" style={{ zIndex: 2 }}>
              <div className="flex gap-8 p-8">
                {rounds.map((roundNumber, roundIndex) => {
                  // Calculate vertical spacing for proper bracket alignment
                  const spacingMultiplier = Math.pow(2, roundNumber - 1);
                  const matchSpacing = matchHeight * spacingMultiplier + 32 * spacingMultiplier;
                  
                  return (
                    <div key={roundNumber} className="flex flex-col" style={{ minWidth: `${roundWidth - 40}px` }}>
                      {/* Round Header */}
                      <div className="text-center space-y-2 mb-8">
                        <h3 className="font-bold text-lg">
                          {getRoundName(roundNumber, totalRounds)}
                        </h3>
                        <Badge variant="secondary">Round {roundNumber}</Badge>
                      </div>
                      
                      {/* Matches in Round */}
                      <div className="flex flex-col">
                        {organizedMatches[roundNumber].map((match, matchIndex) => (
                          <Card 
                            key={match.id} 
                            className="w-full bg-background/95 backdrop-blur-sm shadow-lg"
                            style={{
                              marginTop: matchIndex === 0 ? 0 : matchSpacing,
                            }}
                          >
                          <CardHeader className="pb-3">
                            <div className="flex justify-between items-start">
                              <CardTitle className="text-sm font-medium">
                                {match.bracket_position}
                              </CardTitle>
                              <Badge 
                                variant={match.status === 'completed' ? 'default' : 'secondary'}
                                className="text-xs"
                              >
                                {match.status === 'completed' ? 'Complete' : 'Upcoming'}
                              </Badge>
                            </div>
                          </CardHeader>
                          
                          <CardContent className="space-y-3">
                            {/* Teams */}
                            <TeamBox
                              teamName={match.team1_name}
                              score={match.team1_score}
                              isWinner={match.status === 'completed' && match.winner_name === match.team1_name}
                            />
                            
                            <div className="text-center text-xs text-muted-foreground font-medium">
                              VS
                            </div>
                            
                            <TeamBox
                              teamName={match.team2_name}
                              score={match.team2_score}
                              isWinner={match.status === 'completed' && match.winner_name === match.team2_name}
                            />
                            
                            {/* Winner Display */}
                            {match.status === 'completed' && match.winner_name && (
                              <div className="text-center pt-2 border-t">
                                <Badge className="bg-green-600 text-white">
                                  🏆 {match.winner_name}
                                </Badge>
                              </div>
                            )}
                            
                            {/* Match Details */}
                            {format === 'detailed' && (
                              <div className="pt-3 border-t space-y-2">
                                {match.referee_team_name && (
                                  <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Referee:</span>
                                    <span className="font-medium">{match.referee_team_name}</span>
                                  </div>
                                )}
                                {match.court && (
                                  <div className="flex justify-between text-xs">
                                    <span className="text-muted-foreground">Court:</span>
                                    <Badge variant="outline" className="text-xs">
                                      Court {match.court}
                                    </Badge>
                                  </div>
                                )}
                                {onMatchSelect && match.status !== 'completed' && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      console.log('EnhancedBracketView Start Match clicked:', match);
                                      onMatchSelect(match);
                                    }}
                                    className="w-full mt-2"
                                  >
                                    {match.status === 'in_progress' ? 'Continue Match' : 'Start Match'}
                                  </Button>
                                )}
                              </div>
                            )}
                          </CardContent>
                          </Card>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Legend */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="flex flex-wrap gap-6 justify-center text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-green-50 border-2 border-green-200 rounded"></div>
              <span>Winner</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-background border border-border rounded"></div>
              <span>Team</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-muted/50 border border-dashed rounded"></div>
              <span>TBD</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="default" className="text-xs">Complete</Badge>
              <span>Finished</span>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-xs">Upcoming</Badge>
              <span>Pending</span>
            </div>
          </div>
          <div className="text-center mt-2 text-xs text-muted-foreground">
            Use Ctrl/Cmd + Mouse Wheel to zoom • Click and drag to pan
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EnhancedBracketView;