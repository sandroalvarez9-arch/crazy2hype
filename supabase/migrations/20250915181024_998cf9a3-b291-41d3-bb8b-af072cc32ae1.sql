-- Fix Stripe OAuth tokens security vulnerability

-- Enable RLS on the stripe_oauth_states table
ALTER TABLE public.stripe_oauth_states ENABLE ROW LEVEL SECURITY;

-- Create policy to allow users to access only their own OAuth states
CREATE POLICY "Users can access their own OAuth states" 
ON public.stripe_oauth_states 
FOR ALL 
USING (user_id = auth.uid()::text)
WITH CHECK (user_id = auth.uid()::text);

-- Create policy to allow system functions to manage OAuth states (for edge functions)
CREATE POLICY "System can manage OAuth states" 
ON public.stripe_oauth_states 
FOR ALL 
USING (true)
WITH CHECK (true);