-- Add Stripe Connect fields to profiles for organizer payouts
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS stripe_account_id TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS stripe_connected BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_charges_enabled BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS stripe_details_submitted BOOLEAN NOT NULL DEFAULT false;

-- Helpful index for quick lookups by user_id already exists via unique; add index on stripe_account_id if not added by unique constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE schemaname = 'public' AND indexname = 'idx_profiles_stripe_account_id'
  ) THEN
    CREATE INDEX idx_profiles_stripe_account_id ON public.profiles (stripe_account_id);
  END IF;
END $$;