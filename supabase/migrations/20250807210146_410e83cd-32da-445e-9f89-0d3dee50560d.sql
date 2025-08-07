-- Add tournament phase column to matches table
ALTER TABLE public.matches 
ADD COLUMN tournament_phase text DEFAULT 'pool_play';

-- Add phase-specific format columns to tournaments table
ALTER TABLE public.tournaments 
ADD COLUMN pool_play_format jsonb DEFAULT NULL,
ADD COLUMN playoff_format jsonb DEFAULT NULL,
ADD COLUMN uses_phase_formats boolean DEFAULT false;