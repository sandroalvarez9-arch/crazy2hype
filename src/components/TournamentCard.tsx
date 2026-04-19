import { Link } from 'react-router-dom';
import { CalendarDays, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatSkillLevel } from '@/utils/skillLevels';

interface Tournament {
  id: string;
  title: string;
  description?: string;
  location: string;
  start_date: string;
  registration_deadline?: string;
  max_teams: number;
  entry_fee: number;
  status: string;
  skill_levels?: string[];
  organizer?: { username?: string };
  teams?: { count: number }[] | { id: string }[];
}

interface TournamentCardProps {
  tournament: Tournament;
  featured?: boolean;
  className?: string;
}

const getTeamCount = (t: Tournament) => {
  const teams = t.teams as any;
  if (!teams || teams.length === 0) return 0;
  if ('count' in teams[0]) return teams[0].count as number;
  return teams.length;
};

const TournamentCard = ({ tournament, featured = false, className = '' }: TournamentCardProps) => {
  const teamCount = getTeamCount(tournament);
  const fillPct = Math.min(100, Math.round((teamCount / Math.max(1, tournament.max_teams)) * 100));

  // Status pill: derive from fill + status
  let statusKey: 'live' | 'filling' | 'open' | 'full' = 'open';
  if (tournament.status === 'in_progress' || tournament.status === 'live') statusKey = 'live';
  else if (fillPct >= 100) statusKey = 'full';
  else if (fillPct >= 80) statusKey = 'filling';

  const statusStyles: Record<typeof statusKey, string> = {
    live: 'bg-accent/15 text-accent border-accent/40',
    filling: 'bg-primary/15 text-primary border-primary/40',
    full: 'bg-white/10 text-foreground border-white/20',
    open: 'bg-white/5 text-muted-foreground border-white/10',
  };
  const statusLabel: Record<typeof statusKey, string> = {
    live: 'Live now',
    filling: 'Filling fast',
    full: 'Waitlist',
    open: 'Open',
  };

  const fillBar =
    statusKey === 'live'
      ? 'bg-accent'
      : statusKey === 'filling' || statusKey === 'full'
      ? 'bg-primary'
      : 'bg-muted-foreground';

  const dateStr = new Date(tournament.start_date).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });

  const skills = (tournament.skill_levels || []).slice(0, 3);

  return (
    <Link
      to={`/tournament/${tournament.id}`}
      className={`group block bg-surface-raised border border-border rounded-2xl p-5 transition-all duration-300 hover:border-white/20 hover:-translate-y-0.5 shadow-card animate-fade-in relative overflow-hidden ${
        featured ? 'ring-1 ring-primary/40' : ''
      } ${className}`}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-5">
        <span
          className={`inline-flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded border ${statusStyles[statusKey]}`}
        >
          {statusKey === 'live' && (
            <span className="size-1.5 rounded-full bg-accent animate-pulse-dot" />
          )}
          {statusLabel[statusKey]}
        </span>
        <div className="flex items-center gap-1 text-xs font-medium text-muted-foreground tabular-nums">
          <CalendarDays className="h-3.5 w-3.5" />
          {dateStr}
        </div>
      </div>

      {/* Title + location */}
      <h3 className="font-display font-bold text-xl tracking-tight text-foreground leading-tight mb-1 line-clamp-2 group-hover:text-primary transition-colors">
        {tournament.title}
      </h3>
      <div className="flex items-center gap-1.5 text-sm text-muted-foreground mb-4">
        <MapPin className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{tournament.location || 'Location TBD'}</span>
      </div>

      {/* Skill chips */}
      {skills.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-5">
          {skills.map((s) => (
            <span
              key={s}
              className="px-2 py-0.5 text-[11px] font-medium bg-white/5 border border-white/10 rounded text-foreground/80"
            >
              {formatSkillLevel(s as any)}
            </span>
          ))}
        </div>
      )}

      {/* Fill bar */}
      <div className="mb-5">
        <div className="flex justify-between text-[11px] uppercase tracking-wider font-semibold mb-2">
          <span className="text-muted-foreground">Capacity</span>
          <span className="text-foreground tabular-nums">
            {teamCount}/{tournament.max_teams} teams
          </span>
        </div>
        <div className="h-1 w-full bg-background rounded-full overflow-hidden">
          <div
            className={`h-full ${fillBar} rounded-full transition-all`}
            style={{ width: `${fillPct}%` }}
          />
        </div>
      </div>

      {/* Footer actions */}
      <div className="flex items-center justify-between pt-4 border-t border-white/5">
        <div className="text-sm font-bold text-foreground">
          {tournament.entry_fee > 0 ? (
            <>
              ${tournament.entry_fee}
              <span className="text-muted-foreground font-normal text-xs"> /team</span>
            </>
          ) : (
            <span className="text-muted-foreground font-medium text-xs">Free entry</span>
          )}
        </div>
        <Button
          size="sm"
          className="rounded-full bg-foreground text-background hover:bg-foreground/90 text-xs font-bold px-4"
        >
          {statusKey === 'live' ? 'Watch' : statusKey === 'full' ? 'View' : 'Register'}
        </Button>
      </div>
    </Link>
  );
};

export default TournamentCard;
