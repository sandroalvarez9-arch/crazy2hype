-- Fix critical security issue: Remove emergency_email from public view
DROP VIEW IF EXISTS public.players_tournament_view;
CREATE VIEW public.players_tournament_view AS
SELECT 
  p.id,
  p.team_id,
  p.jersey_number,
  p.created_at,
  p.name,
  p.position
FROM players p;

-- Fix function search_path for log_tournament_action
CREATE OR REPLACE FUNCTION public.log_tournament_action(tournament_id uuid, action text, details jsonb DEFAULT NULL::jsonb)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.tournament_logs (tournament_id, action, details, performed_by)
  VALUES (tournament_id, action, details, auth.uid());
END;
$$;

-- Fix function search_path for log_format_change
CREATE OR REPLACE FUNCTION public.log_format_change(tournament_id uuid, old_format jsonb, new_format jsonb, change_reason text DEFAULT NULL::text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
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

-- Add audit logging table for sensitive data access
CREATE TABLE IF NOT EXISTS public.contact_access_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  accessed_by uuid NOT NULL REFERENCES auth.users(id),
  accessed_table text NOT NULL,
  accessed_record_id uuid NOT NULL,
  access_reason text,
  created_at timestamp with time zone DEFAULT now()
);

ALTER TABLE public.contact_access_logs ENABLE ROW LEVEL SECURITY;

-- Only tournament organizers can view their own access logs
CREATE POLICY "Tournament organizers can view their access logs"
  ON public.contact_access_logs
  FOR SELECT
  USING (accessed_by = auth.uid());

-- System can insert access logs
CREATE POLICY "System can insert access logs"
  ON public.contact_access_logs
  FOR INSERT
  WITH CHECK (accessed_by = auth.uid());

COMMENT ON TABLE public.contact_access_logs IS 'Audit log for tracking when organizers access sensitive contact information';
COMMENT ON VIEW public.players_tournament_view IS 'Public view of player information for tournaments - emergency contact removed for privacy';