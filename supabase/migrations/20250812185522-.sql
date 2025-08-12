-- Add optional shirt_size to profiles with allowed values
DO $$ BEGIN
  ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS shirt_size text CHECK (shirt_size IN ('XS','S','M','L','XL','XXL'));
EXCEPTION WHEN undefined_table THEN
  RAISE NOTICE 'Table public.profiles does not exist.';
END $$;
