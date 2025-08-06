-- Add players_per_team field to tournaments table
ALTER TABLE public.tournaments 
ADD COLUMN players_per_team integer NOT NULL DEFAULT 5;

-- Create players table for individual player information
CREATE TABLE public.players (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  team_id UUID NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  position TEXT,
  jersey_number INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;

-- Create policies for players table
CREATE POLICY "Players are viewable by everyone" 
ON public.players 
FOR SELECT 
USING (true);

CREATE POLICY "Team captains can manage their players" 
ON public.players 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM teams 
  WHERE teams.id = players.team_id 
  AND teams.captain_id = auth.uid()
));

-- Add trigger for automatic timestamp updates
CREATE TRIGGER update_players_updated_at
BEFORE UPDATE ON public.players
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();