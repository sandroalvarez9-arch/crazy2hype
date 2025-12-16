-- Fix OAuth states policy - restrict to user's own states only
DROP POLICY IF EXISTS "System can manage OAuth states" ON public.stripe_oauth_states;

-- Keep the existing user policy, it's correct

-- Fix team_stats policy - only allow tournament organizers to manage
DROP POLICY IF EXISTS "System can manage team stats" ON public.team_stats;

CREATE POLICY "Tournament organizers can manage team stats"
ON public.team_stats
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = team_stats.tournament_id
    AND t.organizer_id = auth.uid()
  )
);

-- Fix tournament_logs insert policy - validate organizer before allowing inserts
DROP POLICY IF EXISTS "System can insert tournament logs" ON public.tournament_logs;

CREATE POLICY "Organizers can insert tournament logs"
ON public.tournament_logs
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_logs.tournament_id
    AND t.organizer_id = auth.uid()
  )
);

-- Create a view for teams_public that excludes sensitive contact info
-- First drop if exists to recreate
DROP VIEW IF EXISTS public.teams_public;

CREATE VIEW public.teams_public
WITH (security_invoker = true) AS
SELECT 
  id,
  name,
  tournament_id,
  captain_id,
  skill_level,
  division,
  players_count,
  seed_number,
  is_backup,
  is_registered,
  check_in_status,
  check_in_time,
  payment_status,
  created_at,
  updated_at
FROM public.teams;

-- Grant SELECT on teams_public view
GRANT SELECT ON public.teams_public TO anon, authenticated;

-- Update the log_tournament_action function to validate tournament organizer access
CREATE OR REPLACE FUNCTION public.log_tournament_action(tournament_id uuid, action text, details jsonb DEFAULT NULL::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate that the caller is the tournament organizer
  IF NOT EXISTS (
    SELECT 1 FROM public.tournaments t 
    WHERE t.id = tournament_id 
    AND t.organizer_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied: only tournament organizer can log actions';
  END IF;

  INSERT INTO public.tournament_logs (tournament_id, action, details, performed_by)
  VALUES (tournament_id, action, details, auth.uid());
END;
$$;

-- Update the log_format_change function to validate tournament organizer access
CREATE OR REPLACE FUNCTION public.log_format_change(tournament_id uuid, old_format jsonb, new_format jsonb, change_reason text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate that the caller is the tournament organizer
  IF NOT EXISTS (
    SELECT 1 FROM public.tournaments t 
    WHERE t.id = tournament_id 
    AND t.organizer_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'Access denied: only tournament organizer can log format changes';
  END IF;

  INSERT INTO public.tournament_logs (tournament_id, action, details, performed_by)
  VALUES (
    tournament_id, 
    'format_changed', 
    jsonb_build_object(
      'old_format', old_format,
      'new_format', new_format,
      'reason', change_reason,
      'timestamp', now()
    ), 
    auth.uid()
  );
END;
$$;