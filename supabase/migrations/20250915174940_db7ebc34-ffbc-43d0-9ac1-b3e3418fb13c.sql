-- Fix security issue: Restrict access to team contact information
-- Replace the overly permissive "Teams are viewable by everyone" policy with more secure policies

-- First, drop the existing overly permissive policy
DROP POLICY IF EXISTS "Teams are viewable by everyone" ON public.teams;

-- Create more restrictive policies for team data access
-- Policy 1: Tournament organizers can view all team data for their tournaments
CREATE POLICY "Tournament organizers can view all team data" 
ON public.teams 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 
    FROM public.tournaments 
    WHERE tournaments.id = teams.tournament_id 
    AND tournaments.organizer_id = auth.uid()
  )
);

-- Policy 2: Team captains can view their own team data (including contact info)
CREATE POLICY "Team captains can view their own team data" 
ON public.teams 
FOR SELECT 
TO authenticated
USING (captain_id = auth.uid());

-- Policy 3: Public users can view basic team information (excluding contact details)
-- This is tricky with RLS as we can't selectively hide columns, so we'll create a view instead

-- Create a public view that excludes sensitive contact information
CREATE OR REPLACE VIEW public.teams_public AS
SELECT 
  id,
  tournament_id,
  name,
  skill_level,
  division,
  players_count,
  is_registered,
  is_backup,
  check_in_status,
  check_in_time,
  payment_status,
  seed_number,
  created_at,
  updated_at,
  captain_id
FROM public.teams;

-- Allow public read access to the sanitized view
ALTER VIEW public.teams_public OWNER TO postgres;
GRANT SELECT ON public.teams_public TO anon, authenticated;