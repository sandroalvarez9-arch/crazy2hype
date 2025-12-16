-- Remove the policy that exposes all fields to public
DROP POLICY IF EXISTS "Anyone can view published tournaments" ON public.tournaments;

-- Create a security definer function to fetch public tournament data
-- This allows public access to non-sensitive fields without exposing the full table
CREATE OR REPLACE FUNCTION public.get_public_tournaments()
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  start_date timestamptz,
  end_date timestamptz,
  registration_deadline timestamptz,
  location text,
  max_teams integer,
  players_per_team integer,
  entry_fee numeric,
  status text,
  published boolean,
  tournament_format text,
  skill_levels text[],
  divisions text[],
  brackets_generated boolean,
  created_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    id, title, description, start_date, end_date, registration_deadline,
    location, max_teams, players_per_team, entry_fee, status, published,
    tournament_format, skill_levels, divisions, brackets_generated, created_at
  FROM public.tournaments
  WHERE published = true;
$$;

-- Grant execute permission to everyone
GRANT EXECUTE ON FUNCTION public.get_public_tournaments() TO anon, authenticated;

-- Create function to get a single public tournament by ID
CREATE OR REPLACE FUNCTION public.get_public_tournament(tournament_id uuid)
RETURNS TABLE (
  id uuid,
  title text,
  description text,
  start_date timestamptz,
  end_date timestamptz,
  registration_deadline timestamptz,
  location text,
  max_teams integer,
  players_per_team integer,
  entry_fee numeric,
  status text,
  published boolean,
  tournament_format text,
  skill_levels text[],
  divisions text[],
  skill_levels_by_division jsonb,
  max_teams_per_skill_level jsonb,
  max_teams_per_division_skill jsonb,
  pools_per_skill_level jsonb,
  pool_play_format jsonb,
  playoff_format jsonb,
  uses_phase_formats boolean,
  sets_per_game integer,
  points_per_set integer,
  deciding_set_points integer,
  must_win_by integer,
  number_of_courts integer,
  calculated_courts integer,
  estimated_game_duration integer,
  warm_up_duration integer,
  first_game_time time,
  check_in_deadline timestamptz,
  brackets_generated boolean,
  bracket_version integer,
  game_format_locked boolean,
  allow_backup_teams boolean,
  created_at timestamptz,
  updated_at timestamptz,
  payment_instructions text,
  venmo_username text,
  paypal_email text,
  cashapp_info text,
  bank_details text,
  other_payment_methods text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    t.id, t.title, t.description, t.start_date, t.end_date, t.registration_deadline,
    t.location, t.max_teams, t.players_per_team, t.entry_fee, t.status, t.published,
    t.tournament_format, t.skill_levels, t.divisions, t.skill_levels_by_division,
    t.max_teams_per_skill_level, t.max_teams_per_division_skill, t.pools_per_skill_level,
    t.pool_play_format, t.playoff_format, t.uses_phase_formats, t.sets_per_game,
    t.points_per_set, t.deciding_set_points, t.must_win_by, t.number_of_courts,
    t.calculated_courts, t.estimated_game_duration, t.warm_up_duration, t.first_game_time,
    t.check_in_deadline, t.brackets_generated, t.bracket_version, t.game_format_locked,
    t.allow_backup_teams, t.created_at, t.updated_at,
    t.payment_instructions, t.venmo_username, t.paypal_email, t.cashapp_info,
    t.bank_details, t.other_payment_methods
  FROM public.tournaments t
  WHERE t.id = tournament_id AND (t.published = true OR t.organizer_id = auth.uid());
$$;

GRANT EXECUTE ON FUNCTION public.get_public_tournament(uuid) TO anon, authenticated;