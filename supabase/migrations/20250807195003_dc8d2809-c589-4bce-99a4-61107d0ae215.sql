-- Make number_of_courts nullable and add calculated courts field
ALTER TABLE tournaments 
ALTER COLUMN number_of_courts DROP NOT NULL,
ADD COLUMN calculated_courts integer,
ADD COLUMN pools_per_skill_level jsonb;