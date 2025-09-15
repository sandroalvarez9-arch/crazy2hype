-- Fix security issue: Restrict access to sensitive profile information
-- The current "Profiles are viewable by everyone" policy exposes sensitive data like emails

-- First, drop the overly permissive policy
DROP POLICY IF EXISTS "Profiles are viewable by everyone" ON public.profiles;

-- Create secure policies for profile access
-- Policy 1: Users can view their own complete profile data
CREATE POLICY "Users can view their own profile" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (auth.uid() = user_id);

-- Policy 2: Create a public view with only safe profile data for public queries
-- This excludes sensitive information like email addresses
CREATE OR REPLACE VIEW public.profiles_public 
WITH (security_invoker = true)
AS
SELECT 
  user_id,
  id,
  username,
  first_name,
  last_name,
  role,
  created_at,
  -- Exclude sensitive fields: email, stripe_*, avatar_url, shirt_size, position
  avatar_url  -- Avatar can be public for display purposes
FROM public.profiles;

-- Set proper ownership and permissions for the public view
ALTER VIEW public.profiles_public OWNER TO postgres;
GRANT SELECT ON public.profiles_public TO anon, authenticated;