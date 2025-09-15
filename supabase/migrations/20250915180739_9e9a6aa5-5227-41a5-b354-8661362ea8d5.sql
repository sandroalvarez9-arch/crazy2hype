-- Fix player contact information security vulnerability

-- Drop the overly permissive policy that allows everyone to view all player data
DROP POLICY IF EXISTS "Players are viewable by everyone" ON public.players;

-- Create policy for tournament organizers to view players in their tournaments
CREATE POLICY "Tournament organizers can view players in their tournaments" 
ON public.players 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.teams t
  JOIN public.tournaments tn ON t.tournament_id = tn.id
  WHERE t.id = players.team_id 
  AND tn.organizer_id = auth.uid()
));

-- Create a public view for players that excludes sensitive contact information
CREATE OR REPLACE VIEW public.players_public WITH (security_invoker = true) AS
SELECT 
  id,
  team_id,
  name,
  position,
  jersey_number,
  created_at,
  updated_at
FROM public.players;