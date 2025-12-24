-- Add CHECK constraint to ensure valid role values in profiles table
ALTER TABLE public.profiles 
ADD CONSTRAINT valid_role CHECK (role IN ('player', 'host'));