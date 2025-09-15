-- Fix Security Definer View issue
-- Recreate the teams_public view explicitly as SECURITY INVOKER to ensure it's safe

-- Drop and recreate the view with explicit SECURITY INVOKER
DROP VIEW IF EXISTS public.teams_public;

CREATE VIEW public.teams_public 
WITH (security_invoker = true)
AS
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

-- Set proper ownership and permissions
ALTER VIEW public.teams_public OWNER TO postgres;
GRANT SELECT ON public.teams_public TO anon, authenticated;

-- Enable RLS on the view for additional security
ALTER VIEW public.teams_public SET (security_invoker = true);

-- Create RLS policy for the view to allow public read access
CREATE POLICY "Public can view teams_public" 
ON public.teams_public
FOR SELECT 
TO anon, authenticated
USING (true);