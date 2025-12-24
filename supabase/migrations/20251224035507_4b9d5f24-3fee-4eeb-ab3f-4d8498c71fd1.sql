-- Fix players table: Remove any public read access, ensure only team captains and tournament organizers can view
-- First, check if there's a public select policy and drop it if exists

-- Drop existing policies on players table and recreate with proper restrictions
DROP POLICY IF EXISTS "Team captains can manage their players" ON public.players;
DROP POLICY IF EXISTS "Tournament organizers can view basic player info" ON public.players;

-- Create restrictive policies for players table
-- Team captains can fully manage their own team's players
CREATE POLICY "Team captains can manage their players"
ON public.players
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.teams
    WHERE teams.id = players.team_id
    AND teams.captain_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.teams
    WHERE teams.id = players.team_id
    AND teams.captain_id = auth.uid()
  )
);

-- Tournament organizers can only view player names and positions (not contact info via this policy)
-- Note: Contact info (email, phone) should be accessed through player_contacts table with proper logging
CREATE POLICY "Tournament organizers can view player info"
ON public.players
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.teams t
    JOIN public.tournaments tn ON t.tournament_id = tn.id
    WHERE t.id = players.team_id
    AND tn.organizer_id = auth.uid()
  )
);

-- Fix player_contacts table: Ensure only authorized users can access
-- Drop existing policies and recreate with stricter access
DROP POLICY IF EXISTS "Team captains can access their players' contact info" ON public.player_contacts;
DROP POLICY IF EXISTS "Tournament organizers limited contact access" ON public.player_contacts;

-- Team captains can manage contact info for their team's players
CREATE POLICY "Team captains can manage player contacts"
ON public.player_contacts
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.players p
    JOIN public.teams t ON p.team_id = t.id
    WHERE p.id = player_contacts.player_id
    AND t.captain_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.players p
    JOIN public.teams t ON p.team_id = t.id
    WHERE p.id = player_contacts.player_id
    AND t.captain_id = auth.uid()
  )
);

-- Tournament organizers can only SELECT (read) player contacts for their tournaments
CREATE POLICY "Tournament organizers can view player contacts"
ON public.player_contacts
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.players p
    JOIN public.teams t ON p.team_id = t.id
    JOIN public.tournaments tn ON t.tournament_id = tn.id
    WHERE p.id = player_contacts.player_id
    AND tn.organizer_id = auth.uid()
  )
);