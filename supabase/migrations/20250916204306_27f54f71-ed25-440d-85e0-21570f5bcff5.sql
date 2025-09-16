-- Add division and skill_level columns to matches table to support separate brackets
ALTER TABLE matches ADD COLUMN division TEXT;
ALTER TABLE matches ADD COLUMN skill_level TEXT;