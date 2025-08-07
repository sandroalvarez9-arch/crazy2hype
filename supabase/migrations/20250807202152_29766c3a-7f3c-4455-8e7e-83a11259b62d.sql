-- Add game format fields to tournaments table
ALTER TABLE public.tournaments 
ADD COLUMN sets_per_game integer DEFAULT 3,
ADD COLUMN points_per_set integer DEFAULT 25,
ADD COLUMN must_win_by integer DEFAULT 2,
ADD COLUMN deciding_set_points integer DEFAULT 15,
ADD COLUMN game_format_locked boolean DEFAULT false;

-- Add detailed scoring fields to matches table
ALTER TABLE public.matches 
ADD COLUMN set_scores jsonb DEFAULT '{}',
ADD COLUMN sets_won_team1 integer DEFAULT 0,
ADD COLUMN sets_won_team2 integer DEFAULT 0,
ADD COLUMN current_set integer DEFAULT 1;

-- Add comment for clarity
COMMENT ON COLUMN tournaments.sets_per_game IS 'Number of sets per match (1, 3, or 5)';
COMMENT ON COLUMN tournaments.points_per_set IS 'Points needed to win a regular set';
COMMENT ON COLUMN tournaments.deciding_set_points IS 'Points needed to win the deciding set';
COMMENT ON COLUMN tournaments.game_format_locked IS 'Prevents format changes once matches begin';
COMMENT ON COLUMN matches.set_scores IS 'JSON object storing individual set scores: {"set1": {"team1": 25, "team2": 23}}';
COMMENT ON COLUMN matches.current_set IS 'Which set is currently being played (for live scoring)';

-- Create function to log tournament format changes
CREATE OR REPLACE FUNCTION public.log_format_change(
  tournament_id uuid,
  old_format jsonb,
  new_format jsonb,
  change_reason text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $function$
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
$function$;