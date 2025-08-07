-- Add referee and scheduling fields to tournaments table
ALTER TABLE public.tournaments 
ADD COLUMN tournament_format text DEFAULT 'pool_play',
ADD COLUMN estimated_game_duration integer DEFAULT 30,
ADD COLUMN number_of_courts integer DEFAULT 1,
ADD COLUMN first_game_time timestamp with time zone;

-- Add referee and court fields to matches table
ALTER TABLE public.matches 
ADD COLUMN referee_team_id uuid,
ADD COLUMN court_number integer DEFAULT 1,
ADD COLUMN pool_name text;

-- Add check constraints for valid tournament formats
ALTER TABLE public.tournaments 
ADD CONSTRAINT valid_tournament_format 
CHECK (tournament_format IN ('pool_play', 'single_elimination', 'double_elimination', 'round_robin'));

-- Add check constraint for positive game duration
ALTER TABLE public.tournaments 
ADD CONSTRAINT positive_game_duration 
CHECK (estimated_game_duration > 0);

-- Add check constraint for positive court count
ALTER TABLE public.tournaments 
ADD CONSTRAINT positive_court_count 
CHECK (number_of_courts > 0);