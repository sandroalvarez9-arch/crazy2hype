-- Fix Security Definer View warnings - recreate views with SECURITY INVOKER

-- 1. Recreate profiles_public with SECURITY INVOKER
DROP VIEW IF EXISTS public.profiles_public;
CREATE VIEW public.profiles_public 
WITH (security_invoker = on)
AS
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

-- 2. Recreate players_public with SECURITY INVOKER
DROP VIEW IF EXISTS public.players_public;
CREATE VIEW public.players_public 
WITH (security_invoker = on)
AS
SELECT 
  id,
  team_id,
  name,
  position,
  jersey_number,
  created_at,
  updated_at
FROM public.players;

-- 3. Recreate players_tournament_view with SECURITY INVOKER
DROP VIEW IF EXISTS public.players_tournament_view;
CREATE VIEW public.players_tournament_view 
WITH (security_invoker = on)
AS
SELECT 
  id,
  team_id,
  name,
  position,
  jersey_number,
  created_at
FROM public.players;

-- 4. Recreate teams_public with SECURITY INVOKER
DROP VIEW IF EXISTS public.teams_public;
CREATE VIEW public.teams_public 
WITH (security_invoker = on)
AS
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

-- 5. Recreate tournaments_public with SECURITY INVOKER (it was already existing)
DROP VIEW IF EXISTS public.tournaments_public;
CREATE VIEW public.tournaments_public
WITH (security_invoker = on)
AS
SELECT 
  id,
  title,
  description,
  location,
  start_date,
  end_date,
  registration_deadline,
  max_teams,
  players_per_team,
  entry_fee,
  status,
  published,
  tournament_format,
  skill_levels,
  divisions,
  skill_levels_by_division,
  max_teams_per_skill_level,
  max_teams_per_division_skill,
  pools_per_skill_level,
  pool_play_format,
  playoff_format,
  uses_phase_formats,
  sets_per_game,
  points_per_set,
  deciding_set_points,
  must_win_by,
  number_of_courts,
  calculated_courts,
  estimated_game_duration,
  warm_up_duration,
  first_game_time,
  check_in_deadline,
  brackets_generated,
  bracket_version,
  game_format_locked,
  allow_backup_teams,
  created_at,
  updated_at
FROM public.tournaments
WHERE published = true;