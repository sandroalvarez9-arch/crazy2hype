-- Change tournaments skill_level to skill_levels array
ALTER TABLE tournaments 
ADD COLUMN skill_levels text[] DEFAULT '{}';

-- Migrate existing data from skill_level to skill_levels
UPDATE tournaments 
SET skill_levels = ARRAY[skill_level] 
WHERE skill_level IS NOT NULL;

-- Drop the old skill_level column
ALTER TABLE tournaments 
DROP COLUMN skill_level;

-- Add constraint to ensure at least one skill level is selected
ALTER TABLE tournaments 
ADD CONSTRAINT check_at_least_one_skill_level 
CHECK (array_length(skill_levels, 1) >= 1);

-- Add constraint to ensure team skill_level is valid (teams keep single skill_level)
ALTER TABLE teams 
ADD CONSTRAINT check_valid_skill_level 
CHECK (skill_level IN ('open', 'a', 'bb', 'b', 'c'));

-- Create index for skill level filtering
CREATE INDEX idx_tournaments_skill_levels ON tournaments USING GIN (skill_levels);