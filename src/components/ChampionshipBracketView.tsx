import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import { ZoomIn, ZoomOut, Maximize2, RotateCcw, Edit, Trophy } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { BracketTeamSwapDialog } from './BracketTeamSwapDialog';
import blockNationLogo from '@/assets/block-nation-logo.png';

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

interface Team {
  id: string;
  name: string;
}

interface ChampionshipBracketViewProps {
  matches: BracketMatch[];
  title?: string;
  onMatchSelect?: (match: BracketMatch) => void;
  isHost?: boolean;
  allTeams?: Team[];
}

const ZOOM_LEVELS = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

const ChampionshipBracketView: React.FC<ChampionshipBracketViewProps> = ({ 
  matches: initialMatches, 
  title = "PLAYOFFS",
  onMatchSelect,
  isHost = false,
  allTeams = []
}) => {
  const [matches, setMatches] = useState(initialMatches);
  const [zoom, setZoom] = useState(0.75);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0, panX: 0, panY: 0 });
  const [editMode, setEditMode] = useState(false);
  const [selectedMatch, setSelectedMatch] = useState<BracketMatch | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<'team1' | 'team2' | null>(null);
  const [swapDialogOpen, setSwapDialogOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMatches(initialMatches);
  }, [initialMatches]);

  // Subscribe to real-time match updates
  useEffect(() => {
    if (!matches?.length) return;
    const tournamentId = matches[0]?.tournament_id;
    if (!tournamentId) return;

    const channel = supabase
      .channel('championship-bracket-updates')
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'matches',
          filter: `tournament_id=eq.${tournamentId}`
        },
        (payload) => {
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
      case 2: return 'SEMIFINAL';
      case 3: return 'QUARTERFINAL';
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
    setZoom(0.5);
    setPan({ x: 0, y: 0 });
  };

  const handleReset = () => {
    setZoom(0.75);
    setPan({ x: 0, y: 0 });
  };

  // Pan controls
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button === 0 && !editMode) {
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

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1 && !editMode) {
      const touch = e.touches[0];
      setIsDragging(true);
      setDragStart({
        x: touch.clientX,
        y: touch.clientY,
        panX: pan.x,
        panY: pan.y
      });
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (isDragging && e.touches.length === 1) {
      const touch = e.touches[0];
      const deltaX = touch.clientX - dragStart.x;
      const deltaY = touch.clientY - dragStart.y;
      setPan({
        x: dragStart.panX + deltaX,
        y: dragStart.panY + deltaY
      });
      e.preventDefault();
    }
  };

  const handleTouchEnd = () => {
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

  const handleTeamClick = (match: BracketMatch, slot: 'team1' | 'team2') => {
    if (editMode && isHost) {
      setSelectedMatch(match);
      setSelectedSlot(slot);
      setSwapDialogOpen(true);
    }
  };

  const organizedMatches = organizeMatches();
  const rounds = Object.keys(organizedMatches).map(Number).sort((a, b) => a - b);
  const totalRounds = rounds.length;
  const totalTeams = Math.pow(2, totalRounds);

  // Determine layout type
  const layoutType = totalTeams <= 8 ? 'single-sided' : 'dual-sided';

  if (matches.length === 0) {
    return (
      <div className="championship-bracket-empty p-8 text-center">
        <Trophy className="h-16 w-16 mx-auto text-primary/50 mb-4" />
        <p className="text-muted-foreground">No playoff matches available</p>
      </div>
    );
  }

  // Find champion
  const finalMatch = matches.find(m => getRoundName(m.round_number, totalRounds) === 'FINAL');
  const champion = finalMatch?.status === 'completed' ? finalMatch.winner_name : null;

  // Team Box Component with championship styling
  const TeamBox: React.FC<{
    teamName?: string;
    teamId?: string | null;
    score?: number;
    isWinner?: boolean;
    match: BracketMatch;
    slot: 'team1' | 'team2';
  }> = ({ teamName, teamId, score, isWinner, match, slot }) => {
    const canEdit = editMode && isHost && match.status !== 'completed';
    
    return (
      <div 
        className={`
          championship-team-box relative
          ${isWinner ? 'championship-team-winner' : ''}
          ${canEdit ? 'cursor-pointer hover:ring-2 hover:ring-primary' : ''}
        `}
        onClick={() => canEdit && handleTeamClick(match, slot)}
      >
        <div className="championship-team-content">
          <span className="championship-team-name">
            {teamName || 'TBD'}
          </span>
          {score !== undefined && score > 0 && (
            <span className="championship-team-score">
              {score}
            </span>
          )}
        </div>
        {isWinner && (
          <div className="absolute -right-1 -top-1 w-3 h-3 bg-primary rounded-full" />
        )}
      </div>
    );
  };

  // Render single-sided bracket (for smaller tournaments)
  const renderSingleSidedBracket = () => {
    const roundWidth = 280;
    const matchHeight = 140;
    const baseGap = 40;

    return (
      <div className="flex gap-8 p-8">
        {rounds.map((roundNumber, roundIndex) => {
          let gapBetweenMatches = baseGap;
          for (let i = 1; i < roundNumber; i++) {
            gapBetweenMatches = (gapBetweenMatches + matchHeight) * 2;
          }
          const initialTopMargin = roundNumber > 1 ? gapBetweenMatches / 2 : 0;
          const roundName = getRoundName(roundNumber, totalRounds);
          const isFinal = roundName === 'FINAL';

          return (
            <div key={roundNumber} className="flex flex-col" style={{ minWidth: `${roundWidth}px` }}>
              {/* Round Header */}
              <div className="text-center mb-6">
                <div className={`championship-round-label ${isFinal ? 'championship-final-label' : ''}`}>
                  {roundName}
                </div>
              </div>
              
              {/* Matches */}
              <div className="flex flex-col">
                {organizedMatches[roundNumber].map((match, matchIndex) => {
                  const marginTop = matchIndex === 0 ? initialTopMargin : gapBetweenMatches;
                  
                  return (
                    <div 
                      key={match.id}
                      className={`championship-match-card ${isFinal ? 'championship-final-match' : ''}`}
                      style={{ marginTop: `${marginTop}px` }}
                    >
                      <div className="championship-match-header">
                        <span className="text-xs text-primary/80 font-medium">
                          {match.bracket_position?.split(' - ').pop() || `Match ${matchIndex + 1}`}
                        </span>
                        {match.court && (
                          <Badge variant="outline" className="text-xs border-primary/30 text-primary/80">
                            Court {match.court}
                          </Badge>
                        )}
                      </div>

                      <div className="space-y-2">
                        <TeamBox
                          teamName={match.team1_name}
                          teamId={match.team1_id}
                          score={match.team1_score}
                          isWinner={match.status === 'completed' && match.winner_id === match.team1_id}
                          match={match}
                          slot="team1"
                        />
                        
                        <div className="championship-vs">VS</div>
                        
                        <TeamBox
                          teamName={match.team2_name}
                          teamId={match.team2_id}
                          score={match.team2_score}
                          isWinner={match.status === 'completed' && match.winner_id === match.team2_id}
                          match={match}
                          slot="team2"
                        />
                      </div>

                      {match.status !== 'completed' && onMatchSelect && !editMode && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            onMatchSelect(match);
                          }}
                          className="w-full mt-3 championship-action-btn"
                        >
                          {match.status === 'in_progress' ? 'Continue' : 'Start Match'}
                        </Button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}

        {/* Champion Display */}
        {champion && (
          <div className="flex flex-col items-center justify-center" style={{ minWidth: '200px' }}>
            <div className="championship-champion-display">
              <Trophy className="h-12 w-12 text-primary mb-2" />
              <div className="text-lg font-bold text-primary mb-1">CHAMPION</div>
              <div className="text-xl font-bold text-foreground">{champion}</div>
            </div>
          </div>
        )}
      </div>
    );
  };

  // Render dual-sided bracket (for larger tournaments)
  const renderDualSidedBracket = () => {
    const roundWidth = 260;
    const matchHeight = 130;
    const baseGap = 30;
    const midRound = Math.ceil(totalRounds / 2);

    // Split rounds into left and right sides
    const leftRounds = rounds.filter(r => r <= midRound);
    const rightRounds = rounds.filter(r => r > midRound).reverse();

    const renderBracketSide = (sideRounds: number[], isRight: boolean) => {
      return (
        <div className={`flex ${isRight ? 'flex-row-reverse' : 'flex-row'} gap-6`}>
          {sideRounds.map((roundNumber, roundIndex) => {
            let gapBetweenMatches = baseGap;
            for (let i = 1; i < roundNumber; i++) {
              gapBetweenMatches = (gapBetweenMatches + matchHeight) * 2;
            }
            const initialTopMargin = roundNumber > 1 ? gapBetweenMatches / 2 : 0;
            const roundName = getRoundName(roundNumber, totalRounds);

            return (
              <div key={roundNumber} className="flex flex-col" style={{ minWidth: `${roundWidth}px` }}>
                <div className="text-center mb-4">
                  <div className="championship-round-label">
                    {roundName}
                  </div>
                </div>
                
                <div className="flex flex-col">
                  {organizedMatches[roundNumber]
                    .filter((_, idx) => isRight ? idx >= organizedMatches[roundNumber].length / 2 : idx < organizedMatches[roundNumber].length / 2)
                    .map((match, matchIndex) => {
                      const marginTop = matchIndex === 0 ? initialTopMargin : gapBetweenMatches;
                      
                      return (
                        <div 
                          key={match.id}
                          className="championship-match-card"
                          style={{ marginTop: `${marginTop}px` }}
                        >
                          <div className="championship-match-header">
                            <span className="text-xs text-primary/80 font-medium truncate">
                              {match.bracket_position?.split(' - ').pop() || `M${matchIndex + 1}`}
                            </span>
                          </div>

                          <div className="space-y-1.5">
                            <TeamBox
                              teamName={match.team1_name}
                              teamId={match.team1_id}
                              score={match.team1_score}
                              isWinner={match.status === 'completed' && match.winner_id === match.team1_id}
                              match={match}
                              slot="team1"
                            />
                            
                            <div className="championship-vs text-xs">VS</div>
                            
                            <TeamBox
                              teamName={match.team2_name}
                              teamId={match.team2_id}
                              score={match.team2_score}
                              isWinner={match.status === 'completed' && match.winner_id === match.team2_id}
                              match={match}
                              slot="team2"
                            />
                          </div>

                          {match.status !== 'completed' && onMatchSelect && !editMode && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                onMatchSelect(match);
                              }}
                              className="w-full mt-2 championship-action-btn text-xs"
                            >
                              {match.status === 'in_progress' ? 'Continue' : 'Start'}
                            </Button>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            );
          })}
        </div>
      );
    };

    return (
      <div className="flex items-start justify-center gap-8 p-8">
        {/* Left Side */}
        {renderBracketSide(leftRounds, false)}

        {/* Center - Finals */}
        <div className="flex flex-col items-center justify-center min-h-[400px]">
          {finalMatch && (
            <div className="championship-final-match championship-match-card">
              <div className="championship-final-label mb-3">FINAL</div>
              
              <div className="space-y-2">
                <TeamBox
                  teamName={finalMatch.team1_name}
                  teamId={finalMatch.team1_id}
                  score={finalMatch.team1_score}
                  isWinner={finalMatch.status === 'completed' && finalMatch.winner_id === finalMatch.team1_id}
                  match={finalMatch}
                  slot="team1"
                />
                
                <div className="championship-vs">VS</div>
                
                <TeamBox
                  teamName={finalMatch.team2_name}
                  teamId={finalMatch.team2_id}
                  score={finalMatch.team2_score}
                  isWinner={finalMatch.status === 'completed' && finalMatch.winner_id === finalMatch.team2_id}
                  match={finalMatch}
                  slot="team2"
                />
              </div>

              {finalMatch.status !== 'completed' && onMatchSelect && !editMode && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    onMatchSelect(finalMatch);
                  }}
                  className="w-full mt-3 championship-action-btn"
                >
                  {finalMatch.status === 'in_progress' ? 'Continue' : 'Start Final'}
                </Button>
              )}
            </div>
          )}

          {/* Champion */}
          {champion && (
            <div className="championship-champion-display mt-6">
              <Trophy className="h-10 w-10 text-primary mb-2" />
              <div className="text-sm font-bold text-primary">CHAMPION</div>
              <div className="text-lg font-bold text-foreground">{champion}</div>
            </div>
          )}
        </div>

        {/* Right Side */}
        {renderBracketSide(rightRounds, true)}
      </div>
    );
  };

  return (
    <div className="championship-bracket-container space-y-4">
      {/* Header */}
      <div className="championship-header flex justify-between items-center px-4 py-3">
        <div className="flex items-center gap-4">
          <img src={blockNationLogo} alt="Block Nation" className="h-10 w-auto" />
          <div>
            <h2 className="text-xl font-bold text-foreground">{title}</h2>
            <p className="text-sm text-muted-foreground">
              {totalTeams} teams • {totalRounds} rounds
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {isHost && (
            <Button
              variant={editMode ? "default" : "outline"}
              size="sm"
              onClick={() => setEditMode(!editMode)}
              className="gap-2"
            >
              <Edit className="h-4 w-4" />
              {editMode ? 'Done Editing' : 'Edit Bracket'}
            </Button>
          )}
        </div>
      </div>

      {/* Zoom Controls */}
      <div className="flex items-center justify-between px-4 py-2 bg-muted/50 rounded-lg mx-4">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleZoomOut} disabled={zoom <= ZOOM_LEVELS[0]}>
            <ZoomOut className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleZoomIn} disabled={zoom >= ZOOM_LEVELS[ZOOM_LEVELS.length - 1]}>
            <ZoomIn className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleFitToScreen}>
            <Maximize2 className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={handleReset}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>
        
        <Badge variant="secondary">{Math.round(zoom * 100)}%</Badge>
      </div>

      {/* Edit Mode Banner */}
      {editMode && (
        <div className="mx-4 px-4 py-2 bg-primary/10 border border-primary/30 rounded-lg">
          <p className="text-sm text-primary font-medium">
            Edit Mode: Click on any team to swap their position in the bracket.
          </p>
        </div>
      )}

      {/* Bracket Container */}
      <div 
        ref={containerRef}
        className="championship-bracket-viewport relative w-full h-[600px] overflow-hidden cursor-grab active:cursor-grabbing touch-none mx-4 rounded-lg"
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div
          style={{
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: 'top left',
            transition: isDragging ? 'none' : 'transform 0.1s ease-out',
          }}
          className="relative"
        >
          {layoutType === 'single-sided' ? renderSingleSidedBracket() : renderDualSidedBracket()}
        </div>
      </div>

      {/* Legend */}
      <div className="mx-4 px-4 py-3 bg-muted/30 rounded-lg">
        <div className="flex flex-wrap gap-6 justify-center text-sm">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 championship-team-winner rounded" />
            <span>Winner</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 championship-team-box rounded" />
            <span>Team</span>
          </div>
        </div>
        <div className="text-center mt-2 text-xs text-muted-foreground">
          <span className="hidden md:inline">Ctrl/Cmd + Mouse Wheel to zoom • Click and drag to pan</span>
          <span className="md:hidden">Pinch to zoom • Drag to pan</span>
        </div>
      </div>

      {/* Team Swap Dialog */}
      <BracketTeamSwapDialog
        open={swapDialogOpen}
        onOpenChange={setSwapDialogOpen}
        selectedMatch={selectedMatch}
        selectedSlot={selectedSlot}
        allMatches={matches}
        allTeams={allTeams}
        onSwapComplete={() => {
          // Matches will update via real-time subscription
        }}
      />
    </div>
  );
};

export default ChampionshipBracketView;
