-- Create manual_payments table for tracking non-Stripe payments
CREATE TABLE public.manual_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE SET NULL,
  payer_name TEXT NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  payment_method TEXT NOT NULL CHECK (payment_method IN ('cashapp', 'venmo', 'cash', 'paypal', 'bank_transfer', 'other')),
  payment_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'confirmed' CHECK (status IN ('pending', 'confirmed', 'disputed')),
  notes TEXT,
  recorded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create refund_tracking table
CREATE TABLE public.refund_tracking (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  team_name TEXT NOT NULL,
  payment_amount NUMERIC(10,2) NOT NULL,
  payment_method TEXT NOT NULL,
  showed_up BOOLEAN NOT NULL DEFAULT true,
  refund_status TEXT NOT NULL DEFAULT 'no_refund' CHECK (refund_status IN ('no_refund', 'refunded', 'credited_next_event', 'pending')),
  refund_amount NUMERIC(10,2),
  refund_date TIMESTAMP WITH TIME ZONE,
  refund_method TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes
CREATE INDEX idx_manual_payments_tournament ON public.manual_payments(tournament_id);
CREATE INDEX idx_manual_payments_team ON public.manual_payments(team_id);
CREATE INDEX idx_manual_payments_method ON public.manual_payments(payment_method);
CREATE INDEX idx_manual_payments_status ON public.manual_payments(status);
CREATE INDEX idx_refund_tracking_tournament ON public.refund_tracking(tournament_id);
CREATE INDEX idx_refund_tracking_team ON public.refund_tracking(team_id);
CREATE INDEX idx_refund_tracking_status ON public.refund_tracking(refund_status);

-- Enable RLS
ALTER TABLE public.manual_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.refund_tracking ENABLE ROW LEVEL SECURITY;

-- RLS Policies for manual_payments
CREATE POLICY "Tournament organizers can manage manual payments"
ON public.manual_payments
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.tournaments
    WHERE tournaments.id = manual_payments.tournament_id
    AND tournaments.organizer_id = auth.uid()
  )
);

CREATE POLICY "Manual payments are viewable by tournament organizers"
ON public.manual_payments
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tournaments
    WHERE tournaments.id = manual_payments.tournament_id
    AND tournaments.organizer_id = auth.uid()
  )
);

-- RLS Policies for refund_tracking
CREATE POLICY "Tournament organizers can manage refunds"
ON public.refund_tracking
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.tournaments
    WHERE tournaments.id = refund_tracking.tournament_id
    AND tournaments.organizer_id = auth.uid()
  )
);

CREATE POLICY "Refunds are viewable by tournament organizers"
ON public.refund_tracking
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.tournaments
    WHERE tournaments.id = refund_tracking.tournament_id
    AND tournaments.organizer_id = auth.uid()
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_manual_payments_updated_at
BEFORE UPDATE ON public.manual_payments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_refund_tracking_updated_at
BEFORE UPDATE ON public.refund_tracking
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();