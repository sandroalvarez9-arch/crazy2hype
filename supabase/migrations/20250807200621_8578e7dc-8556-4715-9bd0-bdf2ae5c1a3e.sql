-- Add max_teams_per_skill_level field to tournaments table
ALTER TABLE tournaments ADD COLUMN max_teams_per_skill_level JSONB DEFAULT '{}'::jsonb;

-- Migrate existing tournaments to use per-skill-level limits
-- Distribute the current max_teams evenly across skill levels
UPDATE tournaments 
SET max_teams_per_skill_level = (
  SELECT jsonb_object_agg(skill_level, max_teams / array_length(skill_levels, 1))
  FROM unnest(skill_levels) AS skill_level
)
WHERE skill_levels IS NOT NULL AND array_length(skill_levels, 1) > 0;

-- For tournaments with no skill levels, set a default
UPDATE tournaments 
SET max_teams_per_skill_level = '{"open": 16}'::jsonb
WHERE skill_levels IS NULL OR array_length(skill_levels, 1) = 0;