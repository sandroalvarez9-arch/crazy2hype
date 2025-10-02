-- Add 'draft' status to tournaments and published field for visibility control
ALTER TABLE public.tournaments 
  DROP CONSTRAINT IF EXISTS tournaments_status_check;

ALTER TABLE public.tournaments 
  ADD CONSTRAINT tournaments_status_check 
  CHECK (status IN ('draft', 'open', 'closed', 'in_progress', 'completed', 'cancelled'));

-- Add published field to control public visibility
ALTER TABLE public.tournaments 
  ADD COLUMN IF NOT EXISTS published boolean NOT NULL DEFAULT false;

-- Update existing tournaments to be published if they're not draft
UPDATE public.tournaments 
SET published = true 
WHERE status != 'draft';

-- Add index for better query performance on published tournaments
CREATE INDEX IF NOT EXISTS idx_tournaments_published_status 
  ON public.tournaments(published, status);

-- Add comment for documentation
COMMENT ON COLUMN public.tournaments.published IS 'Controls whether tournament is visible publicly. Drafts remain unpublished until organizer connects Stripe and explicitly publishes.';