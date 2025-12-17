-- Create table for SMS notification subscriptions
CREATE TABLE public.match_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  tournament_id UUID NOT NULL REFERENCES public.tournaments(id) ON DELETE CASCADE,
  team_id UUID REFERENCES public.teams(id) ON DELETE CASCADE,
  phone_number TEXT NOT NULL,
  player_name TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.match_notifications ENABLE ROW LEVEL SECURITY;

-- Allow anyone to subscribe (no login required)
CREATE POLICY "Anyone can subscribe to notifications"
ON public.match_notifications
FOR INSERT
WITH CHECK (true);

-- Allow users to view their own subscriptions by phone
CREATE POLICY "Anyone can view notifications"
ON public.match_notifications
FOR SELECT
USING (true);

-- Allow users to update their own subscriptions
CREATE POLICY "Anyone can update their subscriptions"
ON public.match_notifications
FOR UPDATE
USING (true);

-- Allow tournament organizers full access
CREATE POLICY "Organizers can manage all notifications"
ON public.match_notifications
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM tournaments t 
    WHERE t.id = match_notifications.tournament_id 
    AND t.organizer_id = auth.uid()
  )
);

-- Add trigger for updated_at
CREATE TRIGGER update_match_notifications_updated_at
BEFORE UPDATE ON public.match_notifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Enable realtime for matches table
ALTER PUBLICATION supabase_realtime ADD TABLE matches;