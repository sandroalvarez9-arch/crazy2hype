-- Drop and recreate log_tournament_action with enhanced validation
CREATE OR REPLACE FUNCTION public.log_tournament_action(tournament_id uuid, action text, details jsonb DEFAULT NULL::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $$
DECLARE
  _organizer_id uuid;
BEGIN
  -- Validate input parameters
  IF tournament_id IS NULL THEN
    RAISE EXCEPTION 'tournament_id cannot be null';
  END IF;
  
  IF action IS NULL OR action = '' THEN
    RAISE EXCEPTION 'action cannot be null or empty';
  END IF;

  -- Get the organizer_id and validate access in one query
  SELECT organizer_id INTO _organizer_id
  FROM public.tournaments t
  WHERE t.id = tournament_id;
  
  -- Check if tournament exists
  IF _organizer_id IS NULL THEN
    RAISE EXCEPTION 'Tournament not found: %', tournament_id;
  END IF;
  
  -- Validate that the caller is the tournament organizer
  IF _organizer_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: only tournament organizer can log actions';
  END IF;

  -- Insert the log entry
  INSERT INTO public.tournament_logs (tournament_id, action, details, performed_by)
  VALUES (tournament_id, action, details, auth.uid());
END;
$$;

-- Drop and recreate log_format_change with enhanced validation
CREATE OR REPLACE FUNCTION public.log_format_change(tournament_id uuid, old_format jsonb, new_format jsonb, change_reason text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = public
AS $$
DECLARE
  _organizer_id uuid;
BEGIN
  -- Validate input parameters
  IF tournament_id IS NULL THEN
    RAISE EXCEPTION 'tournament_id cannot be null';
  END IF;
  
  IF old_format IS NULL OR new_format IS NULL THEN
    RAISE EXCEPTION 'old_format and new_format cannot be null';
  END IF;

  -- Get the organizer_id and validate access in one query
  SELECT organizer_id INTO _organizer_id
  FROM public.tournaments t
  WHERE t.id = tournament_id;
  
  -- Check if tournament exists
  IF _organizer_id IS NULL THEN
    RAISE EXCEPTION 'Tournament not found: %', tournament_id;
  END IF;
  
  -- Validate that the caller is the tournament organizer
  IF _organizer_id != auth.uid() THEN
    RAISE EXCEPTION 'Access denied: only tournament organizer can log format changes';
  END IF;

  -- Insert the log entry
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