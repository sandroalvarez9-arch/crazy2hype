-- Add team history tracking columns to teams table
ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS total_tournaments_played integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_wins integer DEFAULT 0,
ADD COLUMN IF NOT EXISTS total_losses integer DEFAULT 0;

-- Add player statistics tracking
CREATE TABLE IF NOT EXISTS public.player_statistics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id uuid NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  tournament_id uuid NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  matches_played integer DEFAULT 0,
  points_scored integer DEFAULT 0,
  aces integer DEFAULT 0,
  blocks integer DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(player_id, tournament_id)
);

-- Enable RLS on player_statistics
ALTER TABLE public.player_statistics ENABLE ROW LEVEL SECURITY;

-- Player statistics policies
CREATE POLICY "Player statistics viewable by everyone"
  ON public.player_statistics
  FOR SELECT
  USING (true);

CREATE POLICY "Tournament organizers can manage player statistics"
  ON public.player_statistics
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM public.tournaments t
      WHERE t.id = player_statistics.tournament_id
      AND t.organizer_id = auth.uid()
    )
  );

-- Create function to update team statistics after match completion
CREATE OR REPLACE FUNCTION public.update_team_history_stats()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Only update when match status changes to completed
  IF NEW.status = 'completed' AND (OLD.status IS NULL OR OLD.status != 'completed') THEN
    -- Update team1 stats if exists
    IF NEW.team1_id IS NOT NULL THEN
      UPDATE public.teams
      SET 
        total_tournaments_played = COALESCE(total_tournaments_played, 0),
        total_wins = CASE 
          WHEN NEW.winner_id = NEW.team1_id THEN COALESCE(total_wins, 0) + 1
          ELSE COALESCE(total_wins, 0)
        END,
        total_losses = CASE 
          WHEN NEW.winner_id != NEW.team1_id AND NEW.winner_id IS NOT NULL THEN COALESCE(total_losses, 0) + 1
          ELSE COALESCE(total_losses, 0)
        END
      WHERE id = NEW.team1_id;
    END IF;
    
    -- Update team2 stats if exists
    IF NEW.team2_id IS NOT NULL THEN
      UPDATE public.teams
      SET 
        total_tournaments_played = COALESCE(total_tournaments_played, 0),
        total_wins = CASE 
          WHEN NEW.winner_id = NEW.team2_id THEN COALESCE(total_wins, 0) + 1
          ELSE COALESCE(total_wins, 0)
        END,
        total_losses = CASE 
          WHEN NEW.winner_id != NEW.team2_id AND NEW.winner_id IS NOT NULL THEN COALESCE(total_losses, 0) + 1
          ELSE COALESCE(total_losses, 0)
        END
      WHERE id = NEW.team2_id;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger for updating team history stats
DROP TRIGGER IF EXISTS update_team_history_on_match_complete ON public.matches;
CREATE TRIGGER update_team_history_on_match_complete
  AFTER INSERT OR UPDATE ON public.matches
  FOR EACH ROW
  EXECUTE FUNCTION public.update_team_history_stats();

-- Add updated_at trigger for player_statistics
DROP TRIGGER IF EXISTS update_player_statistics_updated_at ON public.player_statistics;
CREATE TRIGGER update_player_statistics_updated_at
  BEFORE UPDATE ON public.player_statistics
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();