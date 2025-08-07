-- Add warm_up_duration column to tournaments table
ALTER TABLE public.tournaments 
ADD COLUMN warm_up_duration INTEGER DEFAULT 7 CHECK (warm_up_duration >= 3 AND warm_up_duration <= 10);