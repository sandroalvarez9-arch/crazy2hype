import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { CalendarDays, Users, MapPin, Trophy, Star } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface Tournament {
  id: string;
  title: string;
  description: string;
  location: string;
  start_date: string;
  registration_deadline: string;
  max_teams: number;
  entry_fee: number;
  status: string;
  organizer: {
    username: string;
  };
  teams: { count: number }[];
}

interface TournamentCardProps {
  tournament: Tournament;
  featured?: boolean;
  className?: string;
}

const TournamentCard = ({ tournament, featured = false, className = '' }: TournamentCardProps) => {
  const isMobile = useIsMobile();
  const teamCount = tournament.teams?.[0]?.count || 0;
  const isAlmostFull = teamCount / tournament.max_teams > 0.8;
  const isPremium = tournament.entry_fee > 50;

  return (
    <Card 
      className={`
        hover:shadow-elegant transition-all duration-300 shadow-card hover-scale animate-fade-in
        ${featured ? 'ring-2 ring-primary/20 gradient-card' : ''}
        ${className}
      `}
    >
      <CardHeader className="pb-3 relative">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className={`${isMobile ? 'text-lg' : 'text-xl'} line-clamp-2 flex items-center gap-2`}>
              {tournament.title}
              {featured && <Star className="h-4 w-4 text-volleyball-yellow fill-current" />}
              {isPremium && <Trophy className="h-4 w-4 text-volleyball-orange" />}
            </CardTitle>
            <CardDescription className="flex items-center gap-1 text-sm mt-1">
              <Users className="h-3 w-3" />
              by {tournament.organizer?.username}
            </CardDescription>
          </div>
          <div className="flex flex-col gap-1">
            <Badge 
              variant={tournament.status === 'open' ? 'default' : 'secondary'} 
              className="shrink-0"
            >
              {tournament.status}
            </Badge>
            {isAlmostFull && (
              <Badge variant="outline" className="text-xs bg-volleyball-orange/10 border-volleyball-orange/30">
                Almost Full
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="space-y-3">
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <MapPin className="h-4 w-4 mt-0.5 shrink-0" />
            <span className="line-clamp-2">{tournament.location}</span>
          </div>
          
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <CalendarDays className="h-4 w-4 shrink-0" />
            <span>{new Date(tournament.start_date).toLocaleDateString('en-US', {
              weekday: 'short',
              month: 'short', 
              day: 'numeric'
            })}</span>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="text-sm">
                <span className="text-muted-foreground">Teams: </span>
                <span className={`font-medium ${isAlmostFull ? 'text-volleyball-orange' : ''}`}>
                  {teamCount}/{tournament.max_teams}
                </span>
              </div>
              {tournament.entry_fee > 0 && (
                <div className="text-sm">
                  <span className="text-muted-foreground">Fee: </span>
                  <span className={`font-medium ${isPremium ? 'text-volleyball-orange' : ''}`}>
                    ${tournament.entry_fee}
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="pt-2">
            <Link to={`/tournament/${tournament.id}`} className="block">
              <Button 
                variant={featured ? "premium" : "outline"} 
                size={isMobile ? "sm" : "default"} 
                className="w-full"
              >
                {featured ? 'Join Premium Tournament' : 'View Details'}
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TournamentCard;