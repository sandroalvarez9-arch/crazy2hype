-- Fix security definer views by setting security_invoker=on
-- This ensures views respect RLS policies instead of bypassing them

-- Recreate players_public view with security_invoker
DROP VIEW IF EXISTS public.players_public CASCADE;
CREATE VIEW public.players_public 
WITH (security_invoker=on)
AS
SELECT 
  p.id,
  p.team_id,
  p.jersey_number,
  p.created_at,
  p.updated_at,
  p.name,
  p.position
FROM players p;

-- Recreate teams_public view with security_invoker
DROP VIEW IF EXISTS public.teams_public CASCADE;
CREATE VIEW public.teams_public
WITH (security_invoker=on)
AS
SELECT 
  t.id,
  t.tournament_id,
  t.players_count,
  t.is_registered,
  t.is_backup,
  t.check_in_time,
  t.seed_number,
  t.created_at,
  t.updated_at,
  t.captain_id,
  t.name,
  t.skill_level,
  t.division,
  t.check_in_status,
  t.payment_status
FROM teams t;

-- Recreate profiles_public view with security_invoker
DROP VIEW IF EXISTS public.profiles_public CASCADE;
CREATE VIEW public.profiles_public
WITH (security_invoker=on)
AS
SELECT 
  p.user_id,
  p.id,
  p.created_at,
  p.avatar_url,
  p.username,
  p.first_name,
  p.last_name,
  p.role
FROM profiles p;

-- Recreate players_tournament_view with security_invoker
DROP VIEW IF EXISTS public.players_tournament_view CASCADE;
CREATE VIEW public.players_tournament_view
WITH (security_invoker=on)
AS
SELECT 
  p.id,
  p.team_id,
  p.jersey_number,
  p.created_at,
  p.name,
  p.position
FROM players p;

COMMENT ON VIEW public.players_public IS 'Public view of basic player information - respects RLS policies';
COMMENT ON VIEW public.teams_public IS 'Public view of team information - respects RLS policies';
COMMENT ON VIEW public.profiles_public IS 'Public view of user profiles - respects RLS policies';
COMMENT ON VIEW public.players_tournament_view IS 'Tournament player view - respects RLS policies, emergency contact removed';