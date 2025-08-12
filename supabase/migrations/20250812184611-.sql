-- 1) Create table to hold sensitive payment info per tournament
CREATE TABLE IF NOT EXISTS public.tournament_payment_info (
  tournament_id UUID PRIMARY KEY REFERENCES public.tournaments(id) ON DELETE CASCADE,
  payment_instructions TEXT,
  venmo_username TEXT,
  paypal_email TEXT,
  bank_details TEXT,
  cashapp_info TEXT,
  other_payment_methods TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on the new table
ALTER TABLE public.tournament_payment_info ENABLE ROW LEVEL SECURITY;

-- 2) Policies: Restrict access to organizers and registered captains only
-- Organizers can view
CREATE POLICY IF NOT EXISTS "Organizers can view payment info"
ON public.tournament_payment_info
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_id AND t.organizer_id = auth.uid()
  )
);

-- Team captains can view
CREATE POLICY IF NOT EXISTS "Captains can view payment info"
ON public.tournament_payment_info
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.teams tm
    WHERE tm.tournament_id = tournament_id AND tm.captain_id = auth.uid()
  )
);

-- Organizers can insert
CREATE POLICY IF NOT EXISTS "Organizers can insert payment info"
ON public.tournament_payment_info
FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_id AND t.organizer_id = auth.uid()
  )
);

-- Organizers can update
CREATE POLICY IF NOT EXISTS "Organizers can update payment info"
ON public.tournament_payment_info
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_id AND t.organizer_id = auth.uid()
  )
);

-- Organizers can delete
CREATE POLICY IF NOT EXISTS "Organizers can delete payment info"
ON public.tournament_payment_info
FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.tournaments t
    WHERE t.id = tournament_id AND t.organizer_id = auth.uid()
  )
);

-- 3) Trigger to maintain updated_at
DROP TRIGGER IF EXISTS update_tournament_payment_info_updated_at ON public.tournament_payment_info;
CREATE TRIGGER update_tournament_payment_info_updated_at
BEFORE UPDATE ON public.tournament_payment_info
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4) Migrate existing data from tournaments to the new table
INSERT INTO public.tournament_payment_info (
  tournament_id,
  payment_instructions,
  venmo_username,
  paypal_email,
  bank_details,
  cashapp_info,
  other_payment_methods,
  created_at,
  updated_at
)
SELECT
  id AS tournament_id,
  payment_instructions,
  venmo_username,
  paypal_email,
  bank_details,
  cashapp_info,
  other_payment_methods,
  now(),
  now()
FROM public.tournaments
WHERE payment_instructions IS NOT NULL
   OR venmo_username IS NOT NULL
   OR paypal_email IS NOT NULL
   OR bank_details IS NOT NULL
   OR cashapp_info IS NOT NULL
   OR other_payment_methods IS NOT NULL
ON CONFLICT (tournament_id) DO UPDATE SET
  payment_instructions = EXCLUDED.payment_instructions,
  venmo_username = EXCLUDED.venmo_username,
  paypal_email = EXCLUDED.paypal_email,
  bank_details = EXCLUDED.bank_details,
  cashapp_info = EXCLUDED.cashapp_info,
  other_payment_methods = EXCLUDED.other_payment_methods,
  updated_at = now();

-- 5) Drop sensitive columns from tournaments to prevent public exposure
ALTER TABLE public.tournaments
  DROP COLUMN IF EXISTS payment_instructions,
  DROP COLUMN IF EXISTS venmo_username,
  DROP COLUMN IF EXISTS paypal_email,
  DROP COLUMN IF EXISTS bank_details,
  DROP COLUMN IF EXISTS cashapp_info,
  DROP COLUMN IF EXISTS other_payment_methods;
