-- Add payment tracking fields to teams table
ALTER TABLE public.teams 
ADD COLUMN payment_status TEXT DEFAULT 'pending',
ADD COLUMN payment_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN payment_method TEXT,
ADD COLUMN payment_notes TEXT;

-- Add check constraint for payment_status
ALTER TABLE public.teams 
ADD CONSTRAINT payment_status_check 
CHECK (payment_status IN ('pending', 'paid', 'refunded'));

-- Create index for faster payment status queries
CREATE INDEX idx_teams_payment_status ON public.teams(payment_status);

-- Log this schema change
INSERT INTO public.tournament_logs (tournament_id, action, details, performed_by)
SELECT 
  t.id,
  'payment_tracking_enabled',
  jsonb_build_object(
    'fields_added', ARRAY['payment_status', 'payment_date', 'payment_method', 'payment_notes'],
    'timestamp', now()
  ),
  NULL
FROM public.tournaments t
WHERE t.organizer_id IS NOT NULL;