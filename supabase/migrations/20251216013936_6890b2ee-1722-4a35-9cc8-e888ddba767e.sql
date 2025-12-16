-- Create a public view for tournaments that excludes sensitive payment information
CREATE OR REPLACE VIEW public.tournaments_public AS
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

-- Grant SELECT on the public view to authenticated and anon users
GRANT SELECT ON public.tournaments_public TO anon, authenticated;

-- Drop the existing overly permissive SELECT policy
DROP POLICY IF EXISTS "Tournaments are viewable by everyone" ON public.tournaments;

-- Create new SELECT policies for the tournaments table
-- Organizers can view their own tournaments (with all data including payment info)
CREATE POLICY "Organizers can view their own tournaments"
ON public.tournaments
FOR SELECT
USING (auth.uid() = organizer_id);

-- Participants can view tournaments they have teams in (limited view through the public view)
-- For general public access, they should use the tournaments_public view