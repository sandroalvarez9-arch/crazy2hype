-- Add check-in functionality to teams table
ALTER TABLE public.teams 
ADD COLUMN check_in_status text DEFAULT 'pending',
ADD COLUMN check_in_time timestamp with time zone,
ADD COLUMN is_backup boolean DEFAULT false;

-- Create backup teams waitlist table
CREATE TABLE public.backup_teams (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id uuid NOT NULL,
  name text NOT NULL,
  captain_id uuid NOT NULL,
  contact_email text,
  contact_phone text,
  players_count integer DEFAULT 1,
  priority_order integer,
  promoted_to_main boolean DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on backup_teams
ALTER TABLE public.backup_teams ENABLE ROW LEVEL SECURITY;

-- RLS policies for backup teams
CREATE POLICY "Backup teams are viewable by everyone" 
ON public.backup_teams 
FOR SELECT 
USING (true);

CREATE POLICY "Authenticated users can register backup teams" 
ON public.backup_teams 
FOR INSERT 
WITH CHECK (auth.uid() = captain_id);

CREATE POLICY "Backup team captains can update their teams" 
ON public.backup_teams 
FOR UPDATE 
USING (auth.uid() = captain_id);

CREATE POLICY "Tournament organizers can manage backup teams" 
ON public.backup_teams 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM tournaments 
  WHERE tournaments.id = backup_teams.tournament_id 
  AND tournaments.organizer_id = auth.uid()
));

-- Add tournament management fields
ALTER TABLE public.tournaments 
ADD COLUMN check_in_deadline timestamp with time zone,
ADD COLUMN bracket_version integer DEFAULT 1,
ADD COLUMN allow_backup_teams boolean DEFAULT true;

-- Create tournament management log table
CREATE TABLE public.tournament_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id uuid NOT NULL,
  action text NOT NULL,
  details jsonb,
  performed_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS on tournament logs
ALTER TABLE public.tournament_logs ENABLE ROW LEVEL SECURITY;

-- RLS policies for tournament logs
CREATE POLICY "Tournament logs viewable by organizers" 
ON public.tournament_logs 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM tournaments 
  WHERE tournaments.id = tournament_logs.tournament_id 
  AND tournaments.organizer_id = auth.uid()
));

CREATE POLICY "System can insert tournament logs" 
ON public.tournament_logs 
FOR INSERT 
WITH CHECK (true);

-- Create function to update tournament logs
CREATE OR REPLACE FUNCTION public.log_tournament_action(
  tournament_id uuid,
  action text,
  details jsonb DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.tournament_logs (tournament_id, action, details, performed_by)
  VALUES (tournament_id, action, details, auth.uid());
END;
$$;

-- Add trigger for updated_at on backup_teams
CREATE TRIGGER update_backup_teams_updated_at
BEFORE UPDATE ON public.backup_teams
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();