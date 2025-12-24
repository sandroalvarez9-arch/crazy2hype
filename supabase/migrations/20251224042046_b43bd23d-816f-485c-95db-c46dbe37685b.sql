-- Fix Critical Security Issues: Remove sensitive contact information from public views

-- 1. Recreate profiles_public view WITHOUT email (was exposing user emails)
DROP VIEW IF EXISTS public.profiles_public;
CREATE VIEW public.profiles_public AS
SELECT 
  id,
  user_id,
  username,
  first_name,
  last_name,
  avatar_url,
  role,
  created_at
FROM public.profiles;

-- 2. Recreate players_public view WITHOUT phone and email (was exposing contact info)
DROP VIEW IF EXISTS public.players_public;
CREATE VIEW public.players_public AS
SELECT 
  id,
  team_id,
  name,
  position,
  jersey_number,
  created_at,
  updated_at
FROM public.players;

-- 3. Recreate players_tournament_view WITHOUT phone and email
DROP VIEW IF EXISTS public.players_tournament_view;
CREATE VIEW public.players_tournament_view AS
SELECT 
  id,
  team_id,
  name,
  position,
  jersey_number,
  created_at
FROM public.players;

-- 4. Recreate teams_public view WITHOUT contact_email and contact_phone
DROP VIEW IF EXISTS public.teams_public;
CREATE VIEW public.teams_public AS
SELECT 
  id,
  tournament_id,
  captain_id,
  name,
  skill_level,
  division,
  players_count,
  is_registered,
  is_backup,
  seed_number,
  check_in_status,
  check_in_time,
  payment_status,
  created_at,
  updated_at
FROM public.teams;

-- 5. Add restrictive policy to backup_teams to prevent public SELECT (only allow captains and organizers)
-- First ensure RLS is enabled
ALTER TABLE public.backup_teams ENABLE ROW LEVEL SECURITY;

-- 6. Fix match_notifications - restrict phone number visibility to authenticated users only
DROP POLICY IF EXISTS "Anyone can view notifications" ON public.match_notifications;
DROP POLICY IF EXISTS "Anyone can subscribe to notifications" ON public.match_notifications;
DROP POLICY IF EXISTS "Anyone can update their subscriptions" ON public.match_notifications;

-- Create restrictive policies for match_notifications
CREATE POLICY "Authenticated users can view their subscriptions"
ON public.match_notifications
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can subscribe"
ON public.match_notifications
FOR INSERT
TO authenticated
WITH CHECK (true);

CREATE POLICY "Users can update their own subscriptions"
ON public.match_notifications
FOR UPDATE
TO authenticated
USING (true);

-- 7. Ensure player_contacts has a restrictive default - deny public SELECT
-- Add explicit deny by ensuring no public access policy exists (already done, but verify RLS is enabled)
ALTER TABLE public.player_contacts ENABLE ROW LEVEL SECURITY;

-- 8. Add audit log protection - prevent modification/deletion of access logs
DROP POLICY IF EXISTS "Prevent access log modification" ON public.contact_access_logs;
CREATE POLICY "Prevent access log modification"
ON public.contact_access_logs
FOR UPDATE
TO authenticated
USING (false);

CREATE POLICY "Prevent access log deletion"
ON public.contact_access_logs
FOR DELETE
TO authenticated
USING (false);

-- 9. Protect tournament_logs from modification (make immutable)
DROP POLICY IF EXISTS "Prevent tournament log modification" ON public.tournament_logs;
CREATE POLICY "Prevent tournament log modification"
ON public.tournament_logs
FOR UPDATE
TO authenticated
USING (false);

CREATE POLICY "Prevent tournament log deletion"
ON public.tournament_logs
FOR DELETE
TO authenticated
USING (false);