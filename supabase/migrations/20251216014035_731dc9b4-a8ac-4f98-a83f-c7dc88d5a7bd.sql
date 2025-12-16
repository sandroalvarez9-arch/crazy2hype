-- Fix SECURITY DEFINER issue by recreating view with SECURITY INVOKER
DROP VIEW IF EXISTS public.tournaments_public;

CREATE VIEW public.tournaments_public
WITH (security_invoker = true) AS
SELECT 
  id,
  title,
  description,
  start_date,
  end_date,
  registration_deadline,
  location,
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
FROM public.tournaments;

-- Grant SELECT on the public view
GRANT SELECT ON public.tournaments_public TO anon, authenticated;

-- Add a policy that allows anyone to read tournament data through the view
-- by adding a SELECT policy for the tournaments table that allows reading non-sensitive fields
CREATE POLICY "Anyone can view published tournaments"
ON public.tournaments
FOR SELECT
USING (published = true);