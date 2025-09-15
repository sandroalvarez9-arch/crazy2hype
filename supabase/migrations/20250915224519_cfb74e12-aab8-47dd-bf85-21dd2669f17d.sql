-- Add is_test_data column to teams table to differentiate test teams from real registrations
ALTER TABLE public.teams 
ADD COLUMN is_test_data BOOLEAN NOT NULL DEFAULT false;

-- Create index for efficient querying of test vs real teams
CREATE INDEX idx_teams_is_test_data ON public.teams(is_test_data);

-- Update existing teams to be marked as real data (not test data)
UPDATE public.teams SET is_test_data = false WHERE is_test_data IS NULL;