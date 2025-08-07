-- Add skill_level column to tournaments table
ALTER TABLE public.tournaments 
ADD COLUMN skill_level text NOT NULL DEFAULT 'open';

-- Add skill_level column to teams table
ALTER TABLE public.teams 
ADD COLUMN skill_level text;

-- Create index for better performance on skill level queries
CREATE INDEX idx_tournaments_skill_level ON public.tournaments(skill_level);
CREATE INDEX idx_teams_skill_level ON public.teams(skill_level);

-- Add check constraints to ensure valid skill levels
ALTER TABLE public.tournaments 
ADD CONSTRAINT check_tournaments_skill_level 
CHECK (skill_level IN ('open', 'a', 'bb', 'b', 'c'));

ALTER TABLE public.teams 
ADD CONSTRAINT check_teams_skill_level 
CHECK (skill_level IN ('open', 'a', 'bb', 'b', 'c'));

-- Update existing teams to match their tournament's skill level
UPDATE public.teams 
SET skill_level = (
  SELECT skill_level 
  FROM public.tournaments 
  WHERE tournaments.id = teams.tournament_id
) 
WHERE skill_level IS NULL;