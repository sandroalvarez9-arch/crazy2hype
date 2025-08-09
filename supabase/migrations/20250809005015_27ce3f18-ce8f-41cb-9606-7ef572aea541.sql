
-- 1) Add divisions to tournaments (values limited to men, women, coed)
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS divisions text[] NOT NULL DEFAULT '{}'::text[];

-- Ensure any chosen divisions are from the allowed set
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'tournaments_divisions_valid'
      AND conrelid = 'public.tournaments'::regclass
  ) THEN
    ALTER TABLE public.tournaments
      ADD CONSTRAINT tournaments_divisions_valid
      CHECK (divisions <@ ARRAY['men','women','coed']::text[]);
  END IF;
END$$;

-- 2) Add per-division skill levels and capacity maps
ALTER TABLE public.tournaments
  ADD COLUMN IF NOT EXISTS skill_levels_by_division jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS max_teams_per_division_skill jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.tournaments.skill_levels_by_division IS
  'JSON mapping of division -> array of skill levels, e.g. {"men":["a","bb"],"women":["b"],"coed":["open"]}';

COMMENT ON COLUMN public.tournaments.max_teams_per_division_skill IS
  'JSON mapping of division -> skill level -> capacity, e.g. {"men":{"a":8,"bb":12},"coed":{"open":16}}';

-- 3) Backfill existing tournaments to "coed" so older data continues to work
UPDATE public.tournaments
SET divisions = ARRAY['coed']::text[]
WHERE divisions = '{}'::text[]
  AND COALESCE(array_length(skill_levels, 1), 0) > 0;

UPDATE public.tournaments
SET skill_levels_by_division = jsonb_build_object('coed', to_jsonb(skill_levels))
WHERE (skill_levels_by_division = '{}'::jsonb OR skill_levels_by_division IS NULL)
  AND COALESCE(array_length(skill_levels, 1), 0) > 0;

UPDATE public.tournaments
SET max_teams_per_division_skill = jsonb_build_object('coed', max_teams_per_skill_level)
WHERE (max_teams_per_division_skill = '{}'::jsonb OR max_teams_per_division_skill IS NULL)
  AND max_teams_per_skill_level IS NOT NULL;

-- 4) Add division to teams
ALTER TABLE public.teams
  ADD COLUMN IF NOT EXISTS division text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'teams_division_valid'
      AND conrelid = 'public.teams'::regclass
  ) THEN
    ALTER TABLE public.teams
      ADD CONSTRAINT teams_division_valid
      CHECK (division IS NULL OR division IN ('men','women','coed'));
  END IF;
END$$;

-- Optional comments for clarity
COMMENT ON COLUMN public.teams.division IS 'Division for the team: men | women | coed';
