-- Remove any existing security definer views and recreate properly
-- The linter detected security definer views which can bypass RLS

-- Check if there are any views with security definer and recreate them without it
-- For public views, they should not use security definer as they bypass RLS

-- Recreate players_public view without security issues
DROP VIEW IF EXISTS public.players_public CASCADE;
CREATE VIEW public.players_public AS
SELECT 
  p.id,
  p.team_id,
  p.jersey_number,
  p.created_at,
  p.updated_at,
  p.name,
  p.position
FROM players p;

-- Recreate teams_public view without security issues  
DROP VIEW IF EXISTS public.teams_public CASCADE;
CREATE VIEW public.teams_public AS
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

-- Recreate profiles_public view without security issues
DROP VIEW IF EXISTS public.profiles_public CASCADE;
CREATE VIEW public.profiles_public AS
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

COMMENT ON VIEW public.players_public IS 'Public view of basic player information for tournament displays';
COMMENT ON VIEW public.teams_public IS 'Public view of team information for tournament brackets and standings';
COMMENT ON VIEW public.profiles_public IS 'Public view of user profile information for tournament organizers and participants';