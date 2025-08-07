import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Clock, Users, Coffee, Flag, Timer } from "lucide-react";

interface Match {
  id: string;
  team1_id: string;
  team2_id: string;
  referee_team_id: string;
  scheduled_time: string;
  court_number: number;
  pool_name: string;
  team1_name?: string;
  team2_name?: string;
  referee_team_name?: string;
}

interface TeamScheduleViewProps {
  teamId: string;
  teamName: string;
  matches: Match[];
}

interface ScheduleItem {
  time: string;
  type: 'playing' | 'refereeing' | 'break' | 'warmup';
  details: string;
  court?: number;
  opponent?: string;
  matchId?: string;
}

export function TeamScheduleView({ teamId, teamName, matches }: TeamScheduleViewProps) {
  // Generate schedule for the team
  const generateSchedule = (): ScheduleItem[] => {
    const schedule: ScheduleItem[] = [];
    
    // Add playing matches
    matches
      .filter(match => match.team1_id === teamId || match.team2_id === teamId)
      .forEach(match => {
        const opponent = match.team1_id === teamId ? match.team2_name : match.team1_name;
        schedule.push({
          time: match.scheduled_time,
          type: 'playing',
          details: `vs ${opponent}`,
          court: match.court_number,
          opponent,
          matchId: match.id
        });
      });
    
    // Add referee duties
    matches
      .filter(match => match.referee_team_id === teamId)
      .forEach(match => {
        schedule.push({
          time: match.scheduled_time,
          type: 'refereeing',
          details: `${match.team1_name} vs ${match.team2_name}`,
          court: match.court_number,
          matchId: match.id
        });
      });
    
    // Sort by time
    schedule.sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    
    // Add warm-up periods and breaks between activities
    const scheduleWithBreaks: ScheduleItem[] = [];
    for (let i = 0; i < schedule.length; i++) {
      const currentItem = schedule[i];
      
      // Add warm-up period for playing matches
      if (currentItem.type === 'playing') {
        const warmUpTime = new Date(new Date(currentItem.time).getTime() - 7 * 60000);
        scheduleWithBreaks.push({
          time: warmUpTime.toISOString(),
          type: 'warmup',
          details: 'Warm-up time (7 minutes)',
          court: currentItem.court
        });
      }
      
      scheduleWithBreaks.push(currentItem);
      
      if (i < schedule.length - 1) {
        const currentEnd = new Date(new Date(schedule[i].time).getTime() + 40 * 60000); // Assume 40 min games
        const nextStart = new Date(schedule[i + 1].time);
        let breakDuration = (nextStart.getTime() - currentEnd.getTime()) / (1000 * 60);
        
        // Subtract warm-up time from break if next activity is playing
        if (schedule[i + 1].type === 'playing') {
          breakDuration -= 7;
        }
        
        if (breakDuration >= 10) { // Only show breaks 10+ minutes
          scheduleWithBreaks.push({
            time: currentEnd.toISOString(),
            type: 'break',
            details: `${Math.round(breakDuration)} minute break`
          });
        }
      }
    }
    
    return scheduleWithBreaks;
  };

  const schedule = generateSchedule();

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'playing':
        return <Users className="h-4 w-4" />;
      case 'refereeing':
        return <Flag className="h-4 w-4" />;
      case 'warmup':
        return <Timer className="h-4 w-4" />;
      case 'break':
        return <Coffee className="h-4 w-4" />;
      default:
        return <Clock className="h-4 w-4" />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'playing':
        return 'bg-primary text-primary-foreground';
      case 'refereeing':
        return 'bg-secondary text-secondary-foreground';
      case 'warmup':
        return 'bg-orange-500 text-white';
      case 'break':
        return 'bg-muted text-muted-foreground';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="h-5 w-5" />
          Schedule for {teamName}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {schedule.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">
              No matches scheduled yet. Check back after brackets are generated.
            </p>
          ) : (
            schedule.map((item, index) => (
              <div key={index} className="flex items-center gap-4 p-3 rounded-lg border">
                <div className="flex-shrink-0">
                  <Badge className={getActivityColor(item.type)}>
                    {getActivityIcon(item.type)}
                    <span className="ml-1 capitalize">{item.type}</span>
                  </Badge>
                </div>
                
                <div className="flex-1">
                  <div className="font-medium">{item.details}</div>
                  <div className="text-sm text-muted-foreground">
                    {format(new Date(item.time), "MMM dd, yyyy 'at' h:mm a")}
                    {item.court && ` • Court ${item.court}`}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        {schedule.length > 0 && (
          <div className="mt-6 p-4 bg-muted rounded-lg">
            <h4 className="font-medium mb-2">Schedule Summary</h4>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
              <div>
                <span className="font-medium">Games Playing:</span>
                <div>{schedule.filter(item => item.type === 'playing').length}</div>
              </div>
              <div>
                <span className="font-medium">Referee Duties:</span>
                <div>{schedule.filter(item => item.type === 'refereeing').length}</div>
              </div>
              <div>
                <span className="font-medium">Warm-up Periods:</span>
                <div>{schedule.filter(item => item.type === 'warmup').length}</div>
              </div>
              <div>
                <span className="font-medium">Break Periods:</span>
                <div>{schedule.filter(item => item.type === 'break').length}</div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}