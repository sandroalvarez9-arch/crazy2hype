-- Add category column to teams table to classify teams like "Men's A", "Men's B", "Women's A", "Women's B"
ALTER TABLE public.teams 
ADD COLUMN IF NOT EXISTS category text;

-- Add index for better query performance when filtering by category
CREATE INDEX IF NOT EXISTS idx_teams_category ON public.teams(category);

-- Add comment to document the purpose of this column
COMMENT ON COLUMN public.teams.category IS 'Team category classification (e.g., "Men''s A", "Men''s B", "Women''s A", "Women''s B")';